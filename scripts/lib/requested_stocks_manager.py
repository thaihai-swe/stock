#!/usr/bin/env python3
"""
scripts/lib/requested_stocks_manager.py
Module quản lý Hàng đợi Mã Cổ Phiếu Được Yêu Cầu (Requested Stocks Queue):
- Lưu trữ đúng 5 trường: symbol, requested_at, status, synced_at, error_message.
- Rà soát tự động các mã PENDING chưa có trong data/financials/.
- Đánh dấu SYNCED và tự động bổ sung vào data/supported_stocks.json sau khi hoàn tất.
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


def _get_db_connection():
    """Tạo kết nối tới SQLite (Local hoặc qua Turso nếu có credentials)."""
    # Nếu có Turso env vars
    turso_url = os.environ.get("TURSO_DATABASE_URL", "").strip()
    turso_token = os.environ.get("TURSO_AUTH_TOKEN", "").strip()
    if turso_url and turso_token:
        try:
            import libsql_experimental as libsql
            return libsql.connect(database=turso_url, auth_token=turso_token)
        except Exception:
            pass

    # Fallback SQLite cục bộ
    if LOCAL_DB_FILE.exists():
        try:
            return sqlite3.connect(str(LOCAL_DB_FILE))
        except Exception:
            pass
    return None


def init_requested_stocks_table():
    """Khởi tạo bảng requested_stocks nếu chưa có."""
    conn = _get_db_connection()
    if not conn:
        return
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS requested_stocks (
                symbol TEXT PRIMARY KEY,
                requested_at TEXT NOT NULL,
                status TEXT DEFAULT 'PENDING',
                synced_at TEXT,
                error_message TEXT
            );
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_requested_stocks_status ON requested_stocks(status);")
        conn.commit()
    except Exception as e:
        print(f"⚠️ [RequestedStocks] Không thể khởi tạo bảng: {e}")
    finally:
        conn.close()


def get_pending_requested_symbols() -> List[str]:
    """
    Lấy danh sách các mã cổ phiếu đang ở trạng thái PENDING.
    Hợp nhất từ cả Database SQLite và file data/requested_stocks.json.
    """
    pending = set()

    # 1. Đọc từ Database SQLite
    conn = _get_db_connection()
    if conn:
        try:
            cur = conn.cursor()
            cur.execute("SELECT symbol FROM requested_stocks WHERE status = 'PENDING';")
            rows = cur.fetchall()
            for r in rows:
                if r and r[0]:
                    pending.add(str(r[0]).strip().upper())
        except Exception:
            pass
        finally:
            conn.close()

    # 2. Đọc từ file JSON snapshot
    if REQUESTED_FILE.exists():
        try:
            with open(REQUESTED_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
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
        except Exception:
            pass

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
            with open(fin_path, "r", encoding="utf-8") as f:
                doc = json.load(f)
            # Kiểm tra xem file đã có chuỗi Quý thực tế chưa
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

    # 1. Cập nhật Database
    conn = _get_db_connection()
    if conn:
        try:
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO requested_stocks (symbol, requested_at, status, synced_at, error_message)
                VALUES (?, ?, 'SYNCED', ?, NULL)
                ON CONFLICT(symbol) DO UPDATE SET status = 'SYNCED', synced_at = excluded.synced_at, error_message = NULL;
            """, (sym, now_iso, now_iso))
            conn.commit()
        except Exception as e:
            print(f"⚠️ [RequestedStocks] Không thể cập nhật DB cho {sym}: {e}")
        finally:
            conn.close()

    # 2. Cập nhật file JSON snapshot
    try:
        data = {}
        if REQUESTED_FILE.exists():
            try:
                with open(REQUESTED_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
            except Exception:
                data = {}
        if not isinstance(data, dict):
            data = {}

        data[sym] = {
            "symbol": sym,
            "requested_at": data.get(sym, {}).get("requested_at", now_iso),
            "status": "SYNCED",
            "synced_at": now_iso,
            "error_message": None
        }

        with open(REQUESTED_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"⚠️ [RequestedStocks] Không thể cập nhật file JSON cho {sym}: {e}")

    # 3. Tự động thêm vào supported_stocks.json
    add_to_supported_stocks(sym)


def mark_symbol_failed(symbol: str, error_message: str):
    """Đánh dấu mã cào dữ liệu thất bại (status='FAILED', error_message)."""
    sym = symbol.strip().upper()
    now_iso = datetime.now().isoformat()

    conn = _get_db_connection()
    if conn:
        try:
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO requested_stocks (symbol, requested_at, status, synced_at, error_message)
                VALUES (?, ?, 'FAILED', NULL, ?)
                ON CONFLICT(symbol) DO UPDATE SET status = 'FAILED', error_message = excluded.error_message;
            """, (sym, now_iso, error_message))
            conn.commit()
        except Exception:
            pass
        finally:
            conn.close()

    try:
        data = {}
        if REQUESTED_FILE.exists():
            try:
                with open(REQUESTED_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
            except Exception:
                data = {}
        if isinstance(data, dict):
            data[sym] = {
                "symbol": sym,
                "requested_at": data.get(sym, {}).get("requested_at", now_iso),
                "status": "FAILED",
                "synced_at": None,
                "error_message": error_message
            }
            with open(REQUESTED_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception:
        pass


def add_to_supported_stocks(symbol: str) -> bool:
    """
    Tự động bổ sung mã cổ phiếu vào data/supported_stocks.json nếu chưa có.
    Bảo toàn định dạng JSON chuẩn.
    """
    sym = symbol.strip().upper()
    if not sym:
        return False

    current_symbols = []
    if SUPPORTED_FILE.exists():
        try:
            with open(SUPPORTED_FILE, "r", encoding="utf-8") as f:
                content = json.load(f)
                if isinstance(content, dict):
                    current_symbols = content.get("symbols", [])
                elif isinstance(content, list):
                    current_symbols = content
        except Exception:
            current_symbols = []

    if sym not in current_symbols:
        current_symbols.append(sym)
        try:
            with open(SUPPORTED_FILE, "w", encoding="utf-8") as f:
                json.dump({"symbols": current_symbols}, f, ensure_ascii=False, indent=2)
            print(f"   🎉 [AUTO-ENROLL] Đã tự động bổ sung mã {sym} vào danh sách theo dõi {SUPPORTED_FILE.name}!")
            return True
        except Exception as e:
            print(f"⚠️ [RequestedStocks] Không thể ghi supported_stocks.json: {e}")
            return False

    return False
