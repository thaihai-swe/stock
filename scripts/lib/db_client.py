#!/usr/bin/env python3
"""
scripts/lib/db_client.py
Module quản trị và kết nối cơ sở dữ liệu thống nhất (Universal DB Client):
Hỗ trợ chuyển đổi liền mạch giữa Turso Cloud SQLite (HTTP Pipeline API v2) và Local SQLite (data/stock.db).
Được thiết kế cho toàn bộ các script Python chạy nền và on-demand.
"""

import os
import sys
import json
import sqlite3
import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple, Set

CURRENT_DIR = Path(__file__).resolve().parent
ROOT_DIR = CURRENT_DIR.parent.parent
DATA_DIR = ROOT_DIR / "data"
LOCAL_DB_FILE = DATA_DIR / "stock.db"
FUNDAMENTALS_FILE = DATA_DIR / "fundamentals_cache.json"

try:
    from lib.io_helper import load_project_env, safe_read_json, atomic_write_json
    load_project_env()
except Exception:
    try:
        from scripts.lib.io_helper import load_project_env, safe_read_json, atomic_write_json
        load_project_env()
    except Exception:
        pass


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


class DatabaseClient:
    """
    Client cơ sở dữ liệu thông minh:
    Tự động nhận diện chế độ DB_MODE:
    - Nếu DB_MODE=turso và có TURSO_DATABASE_URL -> Kết nối Turso Cloud qua HTTP Pipeline.
    - Ngược lại -> Kết nối file SQLite cục bộ data/stock.db.
    """
    def __init__(self):
        self.db_mode = os.environ.get("DB_MODE", "").strip().lower()
        self.turso_url = os.environ.get("TURSO_DATABASE_URL", "").strip()
        self.turso_token = os.environ.get("TURSO_AUTH_TOKEN", "").strip()

        self.is_turso = bool(
            (self.db_mode == "turso" or (self.turso_url and self.db_mode != "local"))
            and self.turso_url
        )
        self._turso_client = None
        if self.is_turso:
            try:
                self._turso_client = TursoHttpClient(self.turso_url, self.turso_token)
            except Exception as e:
                print(f"⚠️ [db_client] Không thể khởi tạo Turso client: {e}")
                self.is_turso = False

    def execute_query(self, sql: str, params: Optional[list] = None, is_write: bool = False) -> List[List[Any]]:
        """Thực thi truy vấn SQL với cơ chế ưu tiên Turso Cloud hoặc Local SQLite."""
        if self.is_turso and self._turso_client:
            try:
                return self._turso_client.execute(sql, params)
            except Exception as e:
                print(f"⚠️ [db_client] Lỗi Turso execute ({e}), thử fallback local...")

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
                print(f"⚠️ [db_client] Lỗi Local SQLite: {e}")

        return []

    def get_user_portfolio_and_cash(self, user_id: str = "demo") -> Tuple[List[Dict[str, Any]], float]:
        """
        Đọc danh mục cổ phiếu còn nắm giữ (remaining_qty > 0) và số dư tiền mặt của user_id.
        Hỗ trợ cả Turso Cloud và Local SQLite.
        """
        sql_orders = """
            SELECT symbol, SUM(remaining_qty), SUM(remaining_qty * cost_per_share)
            FROM buy_orders
            WHERE remaining_qty > 0 AND (user_id = ? OR (? = 'demo' AND (user_id IS NULL OR user_id = '')))
            GROUP BY symbol
        """
        rows = self.execute_query(sql_orders, [user_id, user_id])

        prices_map = {}
        if FUNDAMENTALS_FILE.exists():
            try:
                with open(FUNDAMENTALS_FILE, "r", encoding="utf-8") as f:
                    prices_map = json.load(f)
            except Exception:
                pass

        holdings = []
        total_mkt_val = 0.0

        for r in rows:
            if not r or len(r) < 3:
                continue
            sym = str(r[0]).strip().upper()
            qty = int(r[1] or 0)
            cost = float(r[2] or 0.0)
            if qty <= 0:
                continue

            avg_cost = round(cost / qty) if qty > 0 else 0
            f_info = prices_map.get(sym, {})
            cur_price = f_info.get("close") or f_info.get("price") or avg_cost
            mkt_val = qty * cur_price
            total_mkt_val += mkt_val

            holdings.append({
                "symbol": sym,
                "holdingQty": qty,
                "shares": qty,
                "avgCost": avg_cost,
                "totalCost": cost,
                "currentPrice": cur_price,
                "marketValue": mkt_val,
                "beta": f_info.get("beta") or 1.05,
                "sector": f_info.get("sector") or "Khác"
            })

        for h in holdings:
            h["weightPct"] = round((h["marketValue"] / total_mkt_val * 100), 1) if total_mkt_val > 0 else 0.0
            h["unrealizedPLPct"] = round(((h["currentPrice"] - h["avgCost"]) / h["avgCost"] * 100), 2) if h["avgCost"] > 0 else 0.0

        # Đọc số dư tiền mặt từ app_settings
        cash_balance = 0.0
        try:
            sql_cash = """
                SELECT value FROM app_settings 
                WHERE key = 'cash_balance' AND (user_id = ? OR (? = 'demo' AND (user_id IS NULL OR user_id = '')))
                LIMIT 1
            """
            c_rows = self.execute_query(sql_cash, [user_id, user_id])
            if c_rows and len(c_rows) > 0 and c_rows[0][0]:
                cash_balance = float(c_rows[0][0])
            else:
                # Fallback sang key 'settings' JSON nếu có
                sql_settings = """
                    SELECT value FROM app_settings 
                    WHERE key = 'settings' AND (user_id = ? OR (? = 'demo' AND (user_id IS NULL OR user_id = '')))
                    LIMIT 1
                """
                s_rows = self.execute_query(sql_settings, [user_id, user_id])
                if s_rows and len(s_rows) > 0 and s_rows[0][0]:
                    s_data = json.loads(s_rows[0][0])
                    cash_balance = float(s_data.get("cashBalance") or 0.0)
        except Exception as e:
            print(f"⚠️ [db_client] Lỗi đọc cash balance cho {user_id}: {e}")

        return holdings, cash_balance

    def save_user_portfolio_ai_insight(self, user_id: str, report: Dict[str, Any], status: str = "success") -> bool:
        """Lưu báo cáo phân tích rủi ro danh mục vào bảng portfolio_ai_insights."""
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        report_json = json.dumps(report, ensure_ascii=False)
        health_score = str(report.get("healthScore") or "B+")
        health_verdict = str(report.get("healthVerdict") or "")
        portfolio_beta = float(report.get("portfolioBeta") or 1.0)
        cash_weight_pct = float(report.get("cashWeightPct") or 0.0)

        sql = """
            INSERT OR REPLACE INTO portfolio_ai_insights 
            (user_id, health_score, health_verdict, portfolio_beta, cash_weight_pct, report_json, status, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """
        params = [user_id, health_score, health_verdict, portfolio_beta, cash_weight_pct, report_json, status, now]

        try:
            self.execute_query(sql, params, is_write=True)
            # Đồng bộ thêm file cục bộ nguyên tử nếu là demo
            if user_id == "demo":
                out_file = DATA_DIR / "portfolio_ai_insights.json"
                try:
                    from lib.io_helper import atomic_write_json
                    atomic_write_json(out_file, report)
                except Exception:
                    try:
                        with open(out_file, "w", encoding="utf-8") as f:
                            json.dump(report, f, ensure_ascii=False, indent=2)
                    except Exception:
                        pass
            return True
        except Exception as e:
            print(f"⚠️ [db_client] Lỗi lưu portfolio_ai_insights cho {user_id}: {e}")
            return False

    def get_user_portfolio_ai_updated_at(self, user_id: str) -> Optional[str]:
        """Lấy mốc thời gian cập nhật gần nhất của báo cáo AI."""
        sql = "SELECT updated_at FROM portfolio_ai_insights WHERE user_id = ? LIMIT 1;"
        rows = self.execute_query(sql, [user_id])
        if rows and len(rows) > 0 and rows[0][0]:
            return str(rows[0][0])
        return None

    def get_pending_portfolio_user_ids(self) -> List[str]:
        """Lấy danh sách các user_id đang có trạng thái PENDING chờ batch job xử lý."""
        sql = "SELECT DISTINCT user_id FROM portfolio_ai_insights WHERE status = 'PENDING';"
        rows = self.execute_query(sql)
        users = []
        for r in rows:
            if r and r[0]:
                users.append(str(r[0]).strip())
        return users

    def get_all_active_user_ids(self) -> List[str]:
        """Lấy toàn bộ danh sách người dùng có phát sinh giao dịch nắm giữ."""
        sql = "SELECT DISTINCT user_id FROM buy_orders WHERE remaining_qty > 0;"
        rows = self.execute_query(sql)
        users = set()
        for r in rows:
            if r and r[0]:
                u = str(r[0]).strip()
                if u:
                    users.add(u)
        if not users:
            users.add("demo")
        return sorted(list(users))

    def get_priority_symbols_from_db(self) -> Tuple[Set[str], Set[str]]:
        """Lấy danh sách các mã cổ phiếu đang nắm giữ và có trong watchlist."""
        holdings_syms = set()
        watchlist_syms = set()

        rows_h = self.execute_query("SELECT DISTINCT symbol FROM buy_orders WHERE remaining_qty > 0;")
        for r in rows_h:
            if r and r[0]:
                holdings_syms.add(str(r[0]).strip().upper())

        rows_w = self.execute_query("SELECT DISTINCT symbol FROM watchlist;")
        for r in rows_w:
            if r and r[0]:
                watchlist_syms.add(str(r[0]).strip().upper())

        return holdings_syms, watchlist_syms


# Singleton instance toàn cục
db_client = DatabaseClient()
