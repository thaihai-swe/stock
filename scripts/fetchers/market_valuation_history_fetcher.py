#!/usr/bin/env python3
"""
scripts/fetchers/market_valuation_history_fetcher.py
Module thu thập và chuẩn hóa chuỗi dữ liệu định giá lịch sử thị trường Việt Nam
từ Google Sheets Simply Wall St (Sheets: 1year, 3year, 5year, 10year).
Bao gồm:
- Absolute PE, PE, PS
- Vốn hóa thị trường (Market Cap)
- Doanh thu (Revenue)
- Lợi nhuận (Earnings)
Lưu trực tiếp ra data/market_valuation_history.json theo triết lý "Local JSON First".
"""

import io
import sys
import json
import math
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
import pandas as pd

CURRENT_DIR = Path(__file__).resolve().parent
SCRIPTS_DIR = CURRENT_DIR.parent
ROOT_DIR = SCRIPTS_DIR.parent
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

try:
    from fetchers.base import BaseFetcher
except ImportError:
    from scripts.fetchers.base import BaseFetcher

DEFAULT_SHEET_ID = "1TdXzsXN_bMQKHLN0Zqc8t4lS-59us02Btr_SLc0AgpQ"
DATA_DIR = ROOT_DIR / "data"
OUTPUT_FILE = DATA_DIR / "market_valuation_history.json"

METRICS_CONFIG = [
    {"id": "absolutePe", "label": "Absolute PE", "unit": "x", "desc": "Hệ số P/E tuyệt đối thị trường"},
    {"id": "pe", "label": "PE", "unit": "x", "desc": "Hệ số P/E chuẩn thị trường"},
    {"id": "ps", "label": "PS", "unit": "x", "desc": "Hệ số P/S (Price to Sales) toàn thị trường"},
    {"id": "marketCap", "label": "Market Cap", "unit": "Nghìn tỷ ₫", "desc": "Tổng vốn hóa toàn thị trường"},
    {"id": "revenue", "label": "Revenue", "unit": "Nghìn tỷ ₫", "desc": "Tổng doanh thu toàn thị trường"},
    {"id": "earnings", "label": "Earnings", "unit": "Nghìn tỷ ₫", "desc": "Tổng lợi nhuận toàn thị trường"},
]


class MarketValuationHistoryFetcher(BaseFetcher):
    """Fetcher chuyên trách chuỗi dữ liệu định giá lịch sử thị trường đa chu kỳ."""

    def __init__(self, sheet_id: str = DEFAULT_SHEET_ID):
        super().__init__(default_source="GSHEET_VALUATION")
        self.sheet_id = sheet_id

    def _parse_num(self, val: Any) -> Optional[float]:
        """Chuẩn hóa chuỗi số hoặc giá trị tiền tệ/hệ số thành float."""
        if val is None:
            return None
        if isinstance(val, (int, float)):
            return float(val) if math.isfinite(val) else None
        
        s = str(val).strip().replace(",", "")
        if not s:
            return None
        
        # Bỏ các ký hiệu đơn vị tiếng Việt/Quốc tế: ₫, t (nghìn tỷ), x (lần), %
        s = s.replace("₫", "").replace("t", "").replace("x", "").replace("%", "").strip()
        try:
            num = float(s)
            return round(num, 4) if math.isfinite(num) else None
        except (ValueError, TypeError):
            return None

    def _calc_stats(self, values: List[Optional[float]]) -> Dict[str, Any]:
        """Tính toán thống kê: Mean, Sample Std Dev, Min, Max, Current, Observations."""
        valid = [v for v in values if v is not None and math.isfinite(v)]
        if not valid:
            return {
                "observations": 0,
                "current": None,
                "mean": None,
                "stdDev": None,
                "min": None,
                "max": None
            }

        n = len(valid)
        mean_val = sum(valid) / n
        current_val = valid[-1]  # Điểm gần nhất trong chuỗi thời gian (chronological)

        if n > 1:
            variance = sum((x - mean_val) ** 2 for x in valid) / (n - 1)
            std_dev = math.sqrt(variance)
        else:
            std_dev = 0.0

        return {
            "observations": n,
            "current": round(current_val, 2),
            "mean": round(mean_val, 2),
            "stdDev": round(std_dev, 2),
            "min": round(min(valid), 2),
            "max": round(max(valid), 2)
        }

    def fetch_period_data(self, period: str) -> Optional[Dict[str, Any]]:
        """Lấy và chuẩn hóa dữ liệu 1 sheet theo chu kỳ (1year, 3year, 5year, 10year) bằng Pandas."""
        url = (
            f"https://docs.google.com/spreadsheets/d/{self.sheet_id}/gviz/tq"
            f"?tqx=out:csv&sheet={period}"
        )
        print(f"📥 Đang tải chu kỳ [{period}] từ Google Sheets qua Pandas...")

        try:
            raw_csv = self.http_get(url, timeout=15, verify_ssl=False)
            if not raw_csv or len(raw_csv) < 50:
                print(f"⚠️ Chu kỳ [{period}]: Không nhận được phản hồi CSV hợp lệ từ Google Sheets.")
                return None

            df = pd.read_csv(io.StringIO(raw_csv))
            if df.empty or "Date" not in df.columns:
                print(f"⚠️ Chu kỳ [{period}]: Bảng không chứa cột 'Date' hợp lệ.")
                return None

            target_cols = ['Date', 'Market Cap', 'Revenue', 'Earnings', 'PE', 'Absolute PE', 'PS']
            existing_cols = [c for c in target_cols if c in df.columns]
            df = df[existing_cols].dropna(subset=['Date'])
            if len(df) < 2:
                print(f"⚠️ Chu kỳ [{period}]: Sheet không có đủ dữ liệu (dưới 2 dòng).")
                return None

            col_mapping = {
                'Market Cap': 'marketCap',
                'Revenue': 'revenue',
                'Earnings': 'earnings',
                'PE': 'pe',
                'Absolute PE': 'absolutePe',
                'PS': 'ps'
            }

            for orig_col, new_col in col_mapping.items():
                if orig_col in df.columns:
                    df[new_col] = df[orig_col].apply(self._parse_num)
                else:
                    df[new_col] = None

            # Đảo ngược thứ tự thành tăng dần theo thời gian (chronological) để vẽ biểu đồ từ trái qua phải
            df_chrono = df.iloc[::-1].reset_index(drop=True)

            # Tính toán thống kê bằng vector hóa Pandas
            stats = {}
            for m in col_mapping.values():
                s = df_chrono[m].dropna()
                if not s.empty:
                    stats[m] = {
                        "observations": int(len(s)),
                        "current": round(float(s.iloc[-1]), 2),
                        "mean": round(float(s.mean()), 2),
                        "stdDev": round(float(s.std(ddof=1)), 2) if len(s) > 1 else 0.0,
                        "min": round(float(s.min()), 2),
                        "max": round(float(s.max()), 2)
                    }
                else:
                    stats[m] = {
                        "observations": 0,
                        "current": None,
                        "mean": None,
                        "stdDev": None,
                        "min": None,
                        "max": None
                    }

            # Chuẩn hóa chuỗi thời gian series
            points = []
            for _, row in df_chrono.iterrows():
                pt = {"date": str(row["Date"]).strip()}
                for orig_col, m_name in col_mapping.items():
                    val = row[m_name]
                    orig_val = row[orig_col] if orig_col in row else ""
                    pt[m_name] = round(float(val), 4) if pd.notna(val) else None
                    pt[f"{m_name}Raw"] = str(orig_val).strip() if pd.notna(orig_val) else ""
                points.append(pt)

            print(f"✅ Chu kỳ [{period}]: Thành công {len(points)} mốc quan sát qua Pandas. Absolute PE hiện tại: {stats.get('absolutePe', {}).get('current')}x.")
            return {
                "period": period,
                "observationsCount": len(points),
                "stats": stats,
                "series": points
            }

        except Exception as e:
            print(f"❌ Lỗi tải chu kỳ [{period}] bằng Pandas: {e}")
            return None

    def fetch_all_and_save(self) -> Dict[str, Any]:
        """Tải toàn bộ 4 chu kỳ và lưu vào file local JSON."""
        periods_keys = ["1year", "3year", "5year", "10year"]
        periods_data = {}

        for p in periods_keys:
            data = self.fetch_period_data(p)
            if data:
                periods_data[p] = data

        if not periods_data:
            if OUTPUT_FILE.exists():
                print(f"🛡️ [FALLBACK] Không tải được dữ liệu mới từ Google Sheets. Bảo toàn cache hiện có: {OUTPUT_FILE}")
                try:
                    with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
                        return json.load(f)
                except Exception:
                    pass

        result = {
            "_meta": {
                "updatedAt": datetime.now().isoformat(),
                "sheetId": self.sheet_id,
                "source": "Google Sheets (Simply Wall St Vietnam)",
                "periods": list(periods_data.keys()),
                "totalObservations": {k: v["observationsCount"] for k, v in periods_data.items()}
            },
            "metrics": METRICS_CONFIG,
            "periods": periods_data
        }

        DATA_DIR.mkdir(parents=True, exist_ok=True)
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        print(f"\n🎉 Đã lưu thành công dữ liệu lịch sử định giá vào: {OUTPUT_FILE}")
        return result


if __name__ == "__main__":
    fetcher = MarketValuationHistoryFetcher()
    res = fetcher.fetch_all_and_save()
    print(f"Số chu kỳ hoàn tất: {len(res.get('periods', {}))}")
