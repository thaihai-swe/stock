#!/usr/bin/env python3
"""
scripts/lib/requested_stocks_manager.py
Module quản lý Hàng đợi Mã Cổ Phiếu Được Yêu Cầu (Requested Stocks Queue):
- Lưu trữ đúng 5 trường: symbol, requested_at, status, synced_at, error_message.
- Rà soát tự động các mã PENDING chưa có trong data/financials/.
- Đánh dấu SYNCED và tự động bổ sung vào data/supported_stocks.json sau khi hoàn tất.
- Tái sử dụng Universal db_client và atomic_write_json (DRY & Zero Race Condition).
"""

import os
import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional

CURRENT_DIR = Path(__file__).resolve().parent
ROOT_DIR = CURRENT_DIR.parent.parent
DATA_DIR = ROOT_DIR / "data"
FINANCIALS_DIR = DATA_DIR / "financials"
SUPPORTED_FILE = DATA_DIR / "supported_stocks.json"
REQUESTED_FILE = DATA_DIR / "requested_stocks.json"
LOCAL_DB_FILE = DATA_DIR / "stock.db"

# Tái sử dụng Universal db_client và TursoHttpClient từ lib.db_client
try:
    from lib.db_client import TursoHttpClient, db_client
    from lib.io_helper import atomic_write_json, safe_read_json
except Exception:
    from scripts.lib.db_client import TursoHttpClient, db_client
    from scripts.lib.io_helper import atomic_write_json, safe_read_json


def execute_db_query(sql: str, params: Optional[list] = None, is_write: bool = False) -> List[List[Any]]:
    """Thực thi câu lệnh SQL thông qua singleton db_client thống nhất (Turso Cloud / Local SQLite)."""
    return db_client.execute_query(sql, params, is_write=is_write)


def init_requested_stocks_table():
    """Khởi tạo bảng requested_stocks nếu chưa có."""
    sql_create = """
        CREATE TABLE IF NOT EXISTS requested_stocks (
            symbol TEXT PRIMARY KEY,
            requested_at TEXT NOT NULL,
            status TEXT DEFAULT 'PENDING',
            synced_at TEXT,
            error_message TEXT
        );
    """
    sql_index = "CREATE INDEX IF NOT EXISTS idx_requested_stocks_status ON requested_stocks(status);"
    execute_db_query(sql_create, is_write=True)
    execute_db_query(sql_index, is_write=True)


def get_pending_requested_symbols() -> List[str]:
    """
    Lấy danh sách các mã cổ phiếu đang ở trạng thái PENDING.
    Hợp nhất từ cả Database (Turso HTTP API / Local SQLite) và file data/requested_stocks.json.
    """
    pending = set()

    # 1. Đọc từ Database (Turso hoặc SQLite)
    rows = execute_db_query("SELECT symbol FROM requested_stocks WHERE status = 'PENDING';")
    for r in rows:
        if r and r[0]:
            pending.add(str(r[0]).strip().upper())

    # 2. Đọc từ file JSON snapshot
    if REQUESTED_FILE.exists():
        data = safe_read_json(REQUESTED_FILE, fallback={})
        if isinstance(data, dict):
            for sym, item in data.items():
                if isinstance(item, dict) and item.get("status") == "PENDING":
                    pending.add(sym.strip().upper())
        elif isinstance(data, list):
            for item in data:
                if isinstance(item, dict) and item.get("status") == "PENDING":
                    sym = item.get("symbol")
                    if sym:
                        pending.add(sym.strip().upper())

    return sorted(list(pending))


def filter_missing_financials(symbols: List[str]) -> List[str]:
    """
    Kiểm tra danh sách mã, lọc ra những mã CHƯA có file BCTC trong data/financials/
    hoặc file BCTC chưa có dữ liệu kiểm toán hợp lệ.
    """
    missing = []
    for s in symbols:
        sym = s.strip().upper()
        if not sym:
            continue
        fin_path = FINANCIALS_DIR / f"{sym}.json"
        if not fin_path.exists():
            missing.append(sym)
            continue

        try:
            doc = safe_read_json(fin_path, fallback={})
            q_list = doc.get("quarterly", [])
            meta_status = doc.get("_meta", {}).get("status", "")
            if not q_list and meta_status == "NO_AUDITED_DATA":
                missing.append(sym)
        except Exception:
            missing.append(sym)

    return missing


def mark_symbol_synced(symbol: str):
    """Đánh dấu mã đã hoàn tất thu thập dữ liệu (status='SYNCED', synced_at=now)."""
    sym = symbol.strip().upper()
    now_iso = datetime.now().isoformat()

    # 1. Cập nhật Database (Turso HTTP API hoặc Local SQLite)
    sql_update = """
        INSERT INTO requested_stocks (symbol, requested_at, status, synced_at, error_message)
        VALUES (?, ?, 'SYNCED', ?, NULL)
        ON CONFLICT(symbol) DO UPDATE SET status = 'SYNCED', synced_at = excluded.synced_at, error_message = NULL;
    """
    execute_db_query(sql_update, [sym, now_iso, now_iso], is_write=True)

    # 2. Cập nhật file JSON snapshot nguyên tử
    try:
        data = safe_read_json(REQUESTED_FILE, fallback={})
        if not isinstance(data, dict):
            data = {}

        data[sym] = {
            "symbol": sym,
            "requested_at": data.get(sym, {}).get("requested_at", now_iso),
            "status": "SYNCED",
            "synced_at": now_iso,
            "error_message": None
        }
        atomic_write_json(REQUESTED_FILE, data)
    except Exception as e:
        print(f"⚠️ [RequestedStocks] Không thể cập nhật file JSON cho {sym}: {e}")

    # 3. Tự động thêm vào supported_stocks.json
    add_to_supported_stocks(sym)


def mark_symbol_failed(symbol: str, error_message: str):
    """Đánh dấu mã cào dữ liệu thất bại (status='FAILED', error_message)."""
    sym = symbol.strip().upper()
    now_iso = datetime.now().isoformat()

    # 1. Cập nhật Database (Turso HTTP API hoặc Local SQLite)
    sql_failed = """
        INSERT INTO requested_stocks (symbol, requested_at, status, synced_at, error_message)
        VALUES (?, ?, 'FAILED', NULL, ?)
        ON CONFLICT(symbol) DO UPDATE SET status = 'FAILED', error_message = excluded.error_message;
    """
    execute_db_query(sql_failed, [sym, now_iso, error_message], is_write=True)

    try:
        data = safe_read_json(REQUESTED_FILE, fallback={})
        if isinstance(data, dict):
            data[sym] = {
                "symbol": sym,
                "requested_at": data.get(sym, {}).get("requested_at", now_iso),
                "status": "FAILED",
                "synced_at": None,
                "error_message": error_message
            }
            atomic_write_json(REQUESTED_FILE, data)
    except Exception:
        pass


def add_requested_symbol(symbol: str) -> bool:
    """Thêm một mã cổ phiếu mới vào hàng đợi (status='PENDING')."""
    sym = symbol.strip().upper()
    if not sym or len(sym) < 2 or len(sym) > 8:
        return False
    now_iso = datetime.now().isoformat()

    sql_insert = """
        INSERT OR IGNORE INTO requested_stocks (symbol, requested_at, status, synced_at, error_message)
        VALUES (?, ?, 'PENDING', NULL, NULL);
    """
    execute_db_query(sql_insert, [sym, now_iso], is_write=True)

    try:
        data = safe_read_json(REQUESTED_FILE, fallback={})
        if not isinstance(data, dict):
            data = {}

        if sym not in data:
            data[sym] = {
                "symbol": sym,
                "requested_at": now_iso,
                "status": "PENDING",
                "synced_at": None,
                "error_message": None
            }
            atomic_write_json(REQUESTED_FILE, data)
    except Exception:
        pass

    return True


def add_to_supported_stocks(symbol: str) -> bool:
    """
    Tự động bổ sung mã cổ phiếu vào data/supported_stocks.json nếu chưa có.
    Bảo toàn định dạng JSON chuẩn qua atomic_write_json.
    """
    sym = symbol.strip().upper()
    if not sym:
        return False

    current_symbols = []
    if SUPPORTED_FILE.exists():
        try:
            content = safe_read_json(SUPPORTED_FILE, fallback={})
            if isinstance(content, dict):
                current_symbols = content.get("symbols", [])
            elif isinstance(content, list):
                current_symbols = content
        except Exception:
            current_symbols = []

    if sym not in current_symbols:
        current_symbols.append(sym)
        try:
            atomic_write_json(SUPPORTED_FILE, {"symbols": current_symbols})
            print(f"   🎉 [AUTO-ENROLL] Đã tự động bổ sung mã {sym} vào danh sách theo dõi {SUPPORTED_FILE.name}!")
            return True
        except Exception as e:
            print(f"⚠️ [RequestedStocks] Không thể ghi supported_stocks.json: {e}")
            return False

    return False
