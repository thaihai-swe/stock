#!/usr/bin/env python3
"""
scripts/fetchers/vietstock_valuation_fetcher.py
Fetcher chuyên trách thu thập dữ liệu lịch sử định giá P/E, P/B VN-Index từ Vietstock.
Hỗ trợ hơn 25 năm dữ liệu lịch sử (từ 2000 đến nay) với hơn 312 kỳ thống kê hàng tháng.
Sử dụng curl_cffi để xác thực phiên và vượt qua Cloudflare/WAF, có cơ chế cache 24h.
"""

from __future__ import annotations

import json
import math
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
from curl_cffi import requests

CURRENT_DIR = Path(__file__).resolve().parent
ROOT_DIR = CURRENT_DIR.parent.parent
CACHE_DIR = ROOT_DIR / "data" / "vnindex_valuation_cache"
VIETSTOCK_URL = "https://finance.vietstock.vn/dinh-gia-thi-truong"
CHART_ENDPOINT = "https://finance.vietstock.vn/Data/Valuation_GetRatiosMarketIndexForChart"
CACHE_TTL_HOURS = 24


def _clean_nan(obj: Any) -> Any:
    """Loại bỏ giá trị NaN / Inf để JSON serialization an toàn."""
    if isinstance(obj, dict):
        return {k: _clean_nan(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_clean_nan(v) for v in obj]
    if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
        return None
    return obj


def _parse_vietstock_date(ms_str: str) -> datetime:
    """Chuyển đổi chuỗi ngày dạng /Date(964976400000)/ từ Vietstock sang datetime."""
    match = re.search(r"[-]?\d+", str(ms_str))
    if not match:
        return datetime.now(timezone.utc)
    epoch_ms = int(match.group())
    return datetime.fromtimestamp(epoch_ms / 1000, tz=timezone.utc).replace(tzinfo=None)


class VietstockValuationFetcher:
    """Fetcher chuyên thu thập dữ liệu định giá VN-Index từ Vietstock."""

    def __init__(self, cache_dir: Optional[Any] = None):
        self.cache_dir = Path(cache_dir) if cache_dir else CACHE_DIR
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def _get_session(self) -> Tuple[requests.Session, str]:
        """Tạo session curl_cffi giả lập Chrome 120 và trích xuất Verification Token."""
        session = requests.Session(impersonate="chrome120")
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            ),
            "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }
        pg = session.get(VIETSTOCK_URL, headers=headers, timeout=60)
        pg.raise_for_status()
        token_match = re.search(r'name=__RequestVerificationToken[^>]*value=([^"\' >]+)', pg.text)
        token = token_match.group(1) if token_match else ""
        return session, token

    def fetch_vnindex_history(self, duration: str = "ALL", force_refresh: bool = False) -> pd.DataFrame:
        """
        Lấy chuỗi dữ liệu lịch sử P/E và P/B của VN-Index từ Vietstock.
        Trả về DataFrame với các cột: [trading_date, pe, pb].
        """
        cache_path = self.cache_dir / f"vnindex_valuation_{duration}.json"

        # 1. Đọc từ cache nếu chưa quá hạn TTL
        if not force_refresh and cache_path.exists():
            try:
                age = (datetime.now() - datetime.fromtimestamp(cache_path.stat().st_mtime)).total_seconds()
                if age < CACHE_TTL_HOURS * 3600:
                    cached = json.loads(cache_path.read_text(encoding="utf-8"))
                    df = pd.DataFrame(cached)
                    if not df.empty:
                        df["trading_date"] = pd.to_datetime(df["trading_date"])
                        df = df.sort_values("trading_date").reset_index(drop=True)
                        print(f"  [Vietstock] Nạp thành công {len(df)} bản ghi VN-Index từ cache cục bộ.")
                        return df
            except Exception as e:
                print(f"  ⚠️ Lỗi đọc cache Vietstock: {e}")

        # 2. Gọi trực tiếp API Vietstock
        try:
            print("  🌐 Đang kết nối Vietstock API lấy dữ liệu định giá VN-Index...")
            session, token = self._get_session()
            r = session.post(
                CHART_ENDPOINT,
                data={
                    "stockCode": "VNINDEX",
                    "duration": duration,
                    "__RequestVerificationToken": token,
                },
                headers={
                    "X-Requested-With": "XMLHttpRequest",
                    "Referer": VIETSTOCK_URL,
                },
                timeout=60,
            )
            r.raise_for_status()
            payload = r.json()

            raw_list = payload.get("data", []) if isinstance(payload, dict) else payload
            rows: List[Dict[str, Any]] = []
            for item in raw_list:
                dt = _parse_vietstock_date(item.get("TradingDate", ""))
                pe = item.get("PE")
                pb = item.get("PB")
                rows.append({
                    "trading_date": dt,
                    "pe": float(pe) if pe is not None else None,
                    "pb": float(pb) if pb is not None else None,
                })

            df = pd.DataFrame(rows)
            if df.empty:
                print("  ⚠️ Vietstock trả về danh sách rỗng.")
                return self._fallback_from_cache(cache_path)

            df = (
                df.sort_values("trading_date")
                .drop_duplicates(subset=["trading_date"])
                .reset_index(drop=True)
            )

            # Lưu cache an toàn
            try:
                records = []
                for _, row in df.iterrows():
                    records.append({
                        "trading_date": str(row["trading_date"]),
                        "pe": None if pd.isna(row.get("pe")) else float(row["pe"]),
                        "pb": None if pd.isna(row.get("pb")) else float(row["pb"]),
                    })
                cache_path.write_text(json.dumps(_clean_nan(records), ensure_ascii=False, indent=2), encoding="utf-8")
                print(f"  ✅ Đã lưu {len(df)} bản ghi VN-Index vào {cache_path.name}")
            except Exception as e:
                print(f"  ⚠️ Không thể ghi cache Vietstock: {e}")

            return df

        except Exception as e:
            print(f"  ⚠️ Kết nối Vietstock thất bại: {e}")
            return self._fallback_from_cache(cache_path)

    def _fallback_from_cache(self, cache_path: Path) -> pd.DataFrame:
        """Fallback về cache cũ nếu mạng gặp lỗi."""
        if cache_path.exists():
            try:
                cached = json.loads(cache_path.read_text(encoding="utf-8"))
                df = pd.DataFrame(cached)
                if not df.empty:
                    df["trading_date"] = pd.to_datetime(df["trading_date"])
                    return df.sort_values("trading_date").reset_index(drop=True)
            except Exception:
                pass
        return pd.DataFrame()


if __name__ == "__main__":
    fetcher = VietstockValuationFetcher()
    df = fetcher.fetch_vnindex_history()
    print("Tổng số dòng:", len(df))
    if not df.empty:
        print("Dòng mới nhất:", df.iloc[-1].to_dict())
