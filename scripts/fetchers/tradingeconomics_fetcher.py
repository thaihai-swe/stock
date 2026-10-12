#!/usr/bin/env python3
"""
TradingEconomicsFetcher — Thu thập và chuẩn hóa toàn bộ các bảng chỉ số vĩ mô Việt Nam từ TradingEconomics.
Hỗ trợ 10 danh mục: Overview, GDP, Lạm phát (Prices), Tiền tệ & Lãi suất (Money),
Lao động (Labour), Ngoại thương (Trade), Doanh nghiệp (Business/PMI), Tiêu dùng (Consumer),
Tài khóa & Nợ công (Government), Thuế (Taxes).
"""

import io
import json
import re
import time
from pathlib import Path
from typing import Any, Dict, List, Optional
from bs4 import BeautifulSoup
import pandas as pd

try:
    from .base import BaseFetcher
except (ImportError, ValueError):
    from base import BaseFetcher

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "data"
RAW_SOURCES_DIR = DATA_DIR / "raw_sources"
INDICATORS_CACHE_FILE = DATA_DIR / "macro_indicators.json"
DEFAULT_URL = "https://tradingeconomics.com/vietnam/indicators"
YIELD_URL = "https://tradingeconomics.com/vietnam/government-bond-yield"


class TradingEconomicsFetcher(BaseFetcher):
    """Fetcher chuyên trách toàn diện các chỉ số vĩ mô TradingEconomics Việt Nam."""

    def __init__(self):
        super().__init__(default_source="TRADINGECONOMICS")

    def _parse_number(self, val_str: str) -> Optional[float]:
        """Làm sạch chuỗi số và chuyển đổi thành float."""
        if not val_str:
            return None
        cleaned = val_str.replace(",", "").replace("%", "").strip()
        try:
            return float(cleaned)
        except ValueError:
            return None

    def extract_indicator_tables(self, html: str) -> Dict[str, List[Dict[str, Any]]]:
        """
        Phân tích HTML từ TradingEconomics và trích xuất tất cả các bảng chỉ báo theo danh mục.
        """
        soup = BeautifulSoup(html, "html.parser")
        tables = soup.select("table")

        category_mapping = [
            ("overview", "Tổng Quan"),
            ("gdp", "Tăng Trưởng GDP"),
            ("labour", "Lao Động & Việc Làm"),
            ("prices", "Giá Cả & Lạm Phát (CPI)"),
            ("money", "Tiền Tệ & Lãi Suất"),
            ("trade", "Thương Mại & Cán Cân XNK"),
            ("government", "Tài Khóa & Nợ Công"),
            ("taxes", "Thuế Suất"),
            ("business", "Sản Xuất & Doanh Nghiệp (PMI)"),
            ("consumer", "Tiêu Dùng & Bán Lẻ"),
        ]

        data_tables = []
        for table in tables:
            header_cells = [cell.get_text(" ", strip=True) for cell in table.select("th")]
            if "Last" in header_cells and "Previous" in header_cells:
                data_tables.append(table)

        categories_result: Dict[str, List[Dict[str, Any]]] = {}

        for idx, table in enumerate(data_tables):
            cat_key, cat_name = category_mapping[idx] if idx < len(category_mapping) else (f"cat_{idx+1}", f"Danh mục {idx+1}")
            indicators = []
            parsed_via_pandas = False

            # 1. Ưu tiên bóc tách bảng chuẩn hóa bằng Pandas read_html
            try:
                dfs = pd.read_html(io.StringIO(str(table)))
                if dfs and not dfs[0].empty:
                    df = dfs[0]
                    for _, row in df.iterrows():
                        if len(row) >= 5 and pd.notna(row.iloc[0]):
                            name = str(row.iloc[0]).strip()
                            raw_last = str(row.iloc[1]).strip() if pd.notna(row.iloc[1]) else ""
                            raw_prev = str(row.iloc[2]).strip() if pd.notna(row.iloc[2]) else ""
                            raw_high = str(row.iloc[3]).strip() if len(row) > 3 and pd.notna(row.iloc[3]) else ""
                            raw_low = str(row.iloc[4]).strip() if len(row) > 4 and pd.notna(row.iloc[4]) else ""
                            unit = str(row.iloc[5]).strip() if len(row) > 5 and pd.notna(row.iloc[5]) else ""
                            period = str(row.iloc[6]).strip() if len(row) > 6 and pd.notna(row.iloc[6]) else ""

                            indicators.append({
                                "name": name,
                                "value": self._parse_number(raw_last),
                                "previous": self._parse_number(raw_prev),
                                "highest": self._parse_number(raw_high),
                                "lowest": self._parse_number(raw_low),
                                "unit": unit,
                                "period": period,
                                "rawLast": raw_last,
                                "rawPrevious": raw_prev
                            })
                    parsed_via_pandas = True
            except Exception as pe:
                print(f"  ⚠️ [TradingEconomics] Không parse được bảng '{cat_name}' qua Pandas: {pe}. Fallback sang BeautifulSoup DOM.")

            # 2. Fallback sang BeautifulSoup DOM nếu Pandas gặp lỗi
            if not parsed_via_pandas or not indicators:
                rows = table.select("tr")
                for r in rows:
                    cells = [td.get_text(" ", strip=True) for td in r.select("td")]
                    if len(cells) >= 5:
                        name = cells[0].strip()
                        indicators.append({
                            "name": name,
                            "value": self._parse_number(cells[1]),
                            "previous": self._parse_number(cells[2]),
                            "highest": self._parse_number(cells[3]),
                            "lowest": self._parse_number(cells[4]),
                            "unit": cells[5].strip() if len(cells) > 5 else "",
                            "period": cells[6].strip() if len(cells) > 6 else "",
                            "rawLast": cells[1],
                            "rawPrevious": cells[2]
                        })

            if indicators:
                categories_result[cat_key] = {
                    "key": cat_key,
                    "title": cat_name,
                    "count": len(indicators),
                    "items": indicators
                }
            else:
                print(f"  ⚠️ [TradingEconomics] Cảnh báo: Danh mục '{cat_name}' không trích xuất được chỉ số nào.")

        return categories_result

    def fetch_vn10y_yield(self) -> float:
        """Cào lợi suất TPCP VN 10 năm từ TradingEconomics bằng BeautifulSoup + Pandas với fallback an toàn."""
        try:
            resp_text = self.http_get(YIELD_URL, timeout=15)
            if resp_text:
                soup = BeautifulSoup(resp_text, "html.parser")
                for table in soup.find_all("table"):
                    try:
                        dfs = pd.read_html(io.StringIO(str(table)))
                        if dfs and not dfs[0].empty:
                            df = dfs[0]
                            for _, row in df.iterrows():
                                if len(row) > 1 and "Vietnam 10Y" in str(row.iloc[0]):
                                    val = float(str(row.iloc[1]).replace(",", "."))
                                    if 0.0 < val < 20.0:
                                        print(f"  [TradingEconomics] Bóc tách thành công lợi suất TPCP VN 10 năm: {val}%")
                                        return val
                    except Exception:
                        pass
        except Exception as e:
            print(f"  ⚠️ [TradingEconomics] Không thể cào lợi suất TPCP VN 10 năm: {e}")
        return 3.45  # Fallback chuẩn theo HNX

    def fetch_all_indicators(self, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Thu thập toàn bộ chỉ số vĩ mô từ TradingEconomics:
        1. Thử cào trực tiếp qua HTTP GET nếu force_refresh
        2. Nếu gặp thử thách mạng WAF (status 202/403) hoặc mặc định, sử dụng raw snapshot cache tại data/raw_sources/
        3. Parse thành cấu trúc dữ liệu JSON phân loại chuẩn hóa.
        """
        html_content = ""
        fetch_source = "NETWORK_LIVE"

        # 1. Thử cào trực tiếp nếu force_refresh
        if force_refresh:
            try:
                headers = {
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
                }
                resp_text = self.http_get(DEFAULT_URL, headers=headers, timeout=15)
                if resp_text and "GDP Annual Growth Rate" in resp_text:
                    html_content = resp_text
                    fetch_source = "TRADINGECONOMICS_LIVE"
                else:
                    print("  ⚠️ [TradingEconomics] Trang cào trực tiếp bị chặn hoặc không có nội dung bảng hợp lệ.")
            except Exception as e:
                print(f"  ⚠️ [TradingEconomics] Thử cào trực tiếp thất bại: {e}")

        # 2. Sử dụng fallback raw cache nếu mạng bị chặn hoặc mặc định
        raw_cache_path = RAW_SOURCES_DIR / "tradingeconomics_vietnam.html"
        if not html_content and raw_cache_path.exists():
            try:
                with open(raw_cache_path, "r", encoding="utf-8") as f:
                    html_content = f.read()
                fetch_source = "LOCAL_RAW_SNAPSHOT_CACHE"
            except Exception as e:
                print(f"  ⚠️ [TradingEconomics] Lỗi đọc raw snapshot cache: {e}")

        if not html_content:
            if INDICATORS_CACHE_FILE.exists():
                try:
                    with open(INDICATORS_CACHE_FILE, "r", encoding="utf-8") as f:
                        print("ℹ️ Dùng cache macro_indicators.json sẵn có.")
                        return json.load(f)
                except Exception as e:
                    print(f"  ⚠️ [TradingEconomics] Lỗi đọc cache macro_indicators.json: {e}")
            raise RuntimeError("Không tìm thấy dữ liệu HTML của TradingEconomics.")

        # 3. Phân tích bảng dữ liệu
        categories = self.extract_indicator_tables(html_content)

        # 4. Trích xuất snapshot các chỉ số cốt lõi phục vụ Regime Engine
        headline_map = {}
        for cat_info in categories.values():
            for it in cat_info.get("items", []):
                headline_map[it["name"]] = it["value"]

        # Fallback động từ snapshot cache sẵn có nếu HTML bị thiếu chỉ số
        prev_macro_core = {}
        if INDICATORS_CACHE_FILE.exists():
            try:
                with open(INDICATORS_CACHE_FILE, "r", encoding="utf-8") as f:
                    prev_macro_core = json.load(f).get("macroCore", {})
            except Exception:
                pass

        cached_stock_idx = 0.0
        try:
            macro_cache_path = DATA_DIR / "macro_valuation.json"
            if macro_cache_path.exists():
                with open(macro_cache_path, "r", encoding="utf-8") as f:
                    mc = json.load(f)
                    cached_stock_idx = float(mc.get("marketIndex", {}).get("currentPoint") or 0.0)
        except Exception:
            pass

        # Trích xuất các macro driver chính
        macro_core = {
            "gdp_growth_yoy": headline_map.get("GDP Annual Growth Rate") if headline_map.get("GDP Annual Growth Rate") is not None else prev_macro_core.get("gdp_growth_yoy"),
            "cpi_yoy": headline_map.get("Inflation Rate") if headline_map.get("Inflation Rate") is not None else prev_macro_core.get("cpi_yoy"),
            "cpi_core": headline_map.get("Core Inflation Rate") if headline_map.get("Core Inflation Rate") is not None else prev_macro_core.get("cpi_core"),
            "sbv_refinancing_rate": headline_map.get("Interest Rate") if headline_map.get("Interest Rate") is not None else prev_macro_core.get("sbv_refinancing_rate", 4.5),
            "interbank_rate": headline_map.get("Interbank Rate") if headline_map.get("Interbank Rate") is not None else prev_macro_core.get("interbank_rate", 4.5),
            "credit_growth_yoy": headline_map.get("Loan Growth") if headline_map.get("Loan Growth") is not None else prev_macro_core.get("credit_growth_yoy", 15.0),
            "pmi": headline_map.get("Manufacturing PMI") if headline_map.get("Manufacturing PMI") is not None else prev_macro_core.get("pmi", 50.0),
            "iip_growth": headline_map.get("Industrial Production") if headline_map.get("Industrial Production") is not None else prev_macro_core.get("iip_growth"),
            "retail_sales_yoy": headline_map.get("Retail Sales YoY") if headline_map.get("Retail Sales YoY") is not None else prev_macro_core.get("retail_sales_yoy"),
            "unemployment_rate": headline_map.get("Unemployment Rate") if headline_map.get("Unemployment Rate") is not None else prev_macro_core.get("unemployment_rate"),
            "trade_balance_bn_usd": headline_map.get("Balance of Trade") if headline_map.get("Balance of Trade") is not None else prev_macro_core.get("trade_balance_bn_usd"),
            "govt_debt_to_gdp": headline_map.get("Government Debt to GDP") if headline_map.get("Government Debt to GDP") is not None else prev_macro_core.get("govt_debt_to_gdp"),
            "usdvnd": headline_map.get("Currency") if headline_map.get("Currency") is not None else prev_macro_core.get("usdvnd", 25400.0),
            "stock_index": headline_map.get("Stock Market") if headline_map.get("Stock Market") is not None else (prev_macro_core.get("stock_index") or cached_stock_idx),
        }

        total_indicators = sum(c["count"] for c in categories.values())

        result = {
            "_meta": {
                "source": "TradingEconomics Vietnam",
                "fetchSource": fetch_source,
                "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "totalCategories": len(categories),
                "totalIndicators": total_indicators
            },
            "macroCore": macro_core,
            "categories": categories
        }

        # Lưu vào cache file
        if not DATA_DIR.exists():
            DATA_DIR.mkdir(parents=True, exist_ok=True)
        with open(INDICATORS_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        return result


if __name__ == "__main__":
    fetcher = TradingEconomicsFetcher()
    data = fetcher.fetch_all_indicators()
    print(f"✅ Hoàn tất trích xuất {data['_meta']['totalIndicators']} chỉ số vĩ mô từ TradingEconomics!")
    print(f"📊 Core macro drivers:", json.dumps(data["macroCore"], indent=2))
