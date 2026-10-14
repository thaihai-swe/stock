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


class TursoHttpClient:
    """
    Client kết nối tới Turso Cloud SQLite qua HTTP Pipeline API v2 (sử dụng requests).
    Hoạt động 100% bằng thư viện requests chuẩn, không yêu cầu cài đặt binary C-extension.
    """
    def __init__(self, database_url: str, auth_token: str, timeout: int = 15):
        self.database_url = database_url.strip()
        self.auth_token = auth_token.strip()
        self.timeout = timeout

        clean_url = self.database_url
        if clean_url.startswith("libsql://"):
            clean_url = "https://" + clean_url[len("libsql://"):]
        elif not clean_url.startswith("http://") and not clean_url.startswith("https://"):
            clean_url = "https://" + clean_url
        self.base_url = clean_url.rstrip("/")
        self.pipeline_url = f"{self.base_url}/v2/pipeline"

    @classmethod
    def from_env(cls) -> Optional["TursoHttpClient"]:
        url = os.environ.get("TURSO_DATABASE_URL", "").strip()
        token = os.environ.get("TURSO_AUTH_TOKEN", "").strip()
        if url and token:
            return cls(url, token)
        return None

    def execute(self, sql: str, params: Optional[list] = None) -> List[List[Any]]:
        import requests

        args = []
        if params:
            for p in params:
                args.append(self._to_arg(p))

        stmt = {"sql": sql}
        if args:
            stmt["args"] = args

        payload = {
            "requests": [
                {"type": "execute", "stmt": stmt},
                {"type": "close"}
            ]
        }

        headers = {
            "Authorization": f"Bearer {self.auth_token}",
            "Content-Type": "application/json"
        }

        resp = requests.post(self.pipeline_url, json=payload, headers=headers, timeout=self.timeout)
        resp.raise_for_status()
        data = resp.json()

        results = data.get("results", [])
        if not results:
            return []

        first_res = results[0]
        if first_res.get("type") == "error":
            err = first_res.get("error", {})
            raise RuntimeError(f"Turso SQL Error [{err.get('code')}]: {err.get('message')}")

        res_exec = first_res.get("response", {}).get("result", {})
        raw_rows = res_exec.get("rows", [])

        parsed_rows = []
        for r in raw_rows:
            parsed_rows.append([self._from_col(c) for c in r])

        return parsed_rows

    def _to_arg(self, val: Any) -> dict:
        if val is None:
            return {"type": "null"}
        elif isinstance(val, bool):
            return {"type": "integer", "value": "1" if val else "0"}
        elif isinstance(val, int):
            return {"type": "integer", "value": str(val)}
        elif isinstance(val, float):
            return {"type": "float", "value": float(val)}
        else:
            return {"type": "text", "value": str(val)}

    def _from_col(self, col: Any) -> Any:
        if not isinstance(col, dict):
            return col
        ctype = col.get("type")
        if ctype == "null":
            return None
        val = col.get("value")
        if ctype == "integer" and val is not None:
            try:
                return int(val)
            except Exception:
                return val
        elif ctype == "float" and val is not None:
            try:
                return float(val)
            except Exception:
                return val
        return val


def execute_db_query(sql: str, params: Optional[list] = None, is_write: bool = False) -> List[List[Any]]:
    """
    Thực thi câu lệnh SQL với cơ chế ưu tiên:
    1. Ưu tiên gọi Turso Cloud DB qua HTTP API v2 (nếu có TURSO_DATABASE_URL và TURSO_AUTH_TOKEN).
    2. Fallback sang SQLite cục bộ data/stock.db nếu Turso không được cấu hình hoặc gặp sự cố.
    """
    # 1. Thử Turso HTTP Client
    turso_client = TursoHttpClient.from_env()
    if turso_client:
        try:
            return turso_client.execute(sql, params)
        except Exception as e:
            print(f"⚠️ [RequestedStocks] Lỗi Turso HTTP API: {e}")

    # 2. Fallback sang Local SQLite
    if LOCAL_DB_FILE.exists():
        try:
            conn = sqlite3.connect(str(LOCAL_DB_FILE))
            cur = conn.cursor()
            if params:
                cur.execute(sql, params)
            else:
                cur.execute(sql)
            if is_write:
                conn.commit()
                rows = []
            else:
                rows = [list(r) for r in cur.fetchall()]
            conn.close()
            return rows
        except Exception as e:
            print(f"⚠️ [RequestedStocks] Lỗi SQLite local: {e}")

    return []


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

    # 1. Cập nhật Database (Turso HTTP API hoặc Local SQLite)
    sql_update = """
        INSERT INTO requested_stocks (symbol, requested_at, status, synced_at, error_message)
        VALUES (?, ?, 'SYNCED', ?, NULL)
        ON CONFLICT(symbol) DO UPDATE SET status = 'SYNCED', synced_at = excluded.synced_at, error_message = NULL;
    """
    execute_db_query(sql_update, [sym, now_iso, now_iso], is_write=True)

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

    # 1. Cập nhật Database (Turso HTTP API hoặc Local SQLite)
    sql_failed = """
        INSERT INTO requested_stocks (symbol, requested_at, status, synced_at, error_message)
        VALUES (?, ?, 'FAILED', NULL, ?)
        ON CONFLICT(symbol) DO UPDATE SET status = 'FAILED', error_message = excluded.error_message;
    """
    execute_db_query(sql_failed, [sym, now_iso, error_message], is_write=True)

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
        data = {}
        if REQUESTED_FILE.exists():
            try:
                with open(REQUESTED_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
            except Exception:
                data = {}
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
            with open(REQUESTED_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception:
        pass

    return True


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
