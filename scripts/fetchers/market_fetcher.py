#!/usr/bin/env python3
"""
scripts/fetchers/market_fetcher.py
Module lấy dữ liệu thị trường và chỉ báo kỹ thuật thời gian thực từ TradingView Scanner API.
"""

from typing import Dict, List, Any, Optional
from .base import BaseFetcher

TRADINGVIEW_SCANNER_URL = "https://scanner.tradingview.com/vietnam/scan"

# Danh mục 52 trường số liệu chuẩn hóa từ TradingView Scanner
TRADINGVIEW_COLUMNS = [
    "name", "description", "close", "change", "change_abs", "volume",
    "sector.tr", "industry.tr",
    "price_earnings_ttm", "price_book_ratio", "price_sales_ratio", "enterprise_value_to_ebitda_ratio",
    "return_on_equity_fq", "return_on_equity_fy", "return_on_assets_fq", "return_on_assets_fy",
    "earnings_per_share_basic_ttm", "gross_margin_ttm", "operating_margin_ttm", "net_margin_ttm",
    "dividends_yield", "dps_common_stock_prim_issue_fy", "free_cash_flow_ttm", "free_cash_flow_margin_ttm",
    "total_debt_fq", "total_assets_fq", "debt_to_equity_fq", "current_ratio_fq", "quick_ratio_fq", "ebitda_ttm",
    "total_revenue_ttm", "net_income_ttm", "market_cap_basic", "total_shares_outstanding_fundamental",
    "Perf.W", "Perf.1M", "Perf.3M", "Perf.6M", "Perf.YTD", "Perf.Y", "Perf.5Y",
    "price_52_week_high", "price_52_week_low",
    "average_volume_10d_calc", "average_volume_30d_calc", "Volatility.W", "Volatility.M",
    "Recommend.All", "beta_1_year"
]


class MarketFetcher(BaseFetcher):
    """Fetcher chuyên trách thị giá & chỉ báo kỹ thuật."""

    def __init__(self):
        super().__init__(default_source="TRADINGVIEW")

    def fetch_tradingview_raw(self, symbols: List[str]) -> Dict[str, Any]:
        """Lấy raw payload từ TradingView Scanner API dạng {'totalCount': N, 'data': [...]}"""
        clean_symbols = [s.strip().upper() for s in symbols if s and s.strip()]
        if not clean_symbols:
            return {"data": []}

        payload = {
            "filter": [{"left": "name", "operation": "in_range", "right": clean_symbols}],
            "columns": TRADINGVIEW_COLUMNS
        }
        return self.http_post_json(TRADINGVIEW_SCANNER_URL, payload)

    def fetch_tradingview_scanner(self, symbols: List[str]) -> Dict[str, Dict[str, Any]]:
        """
        Lấy 52 chỉ số định giá và xung lực kỹ thuật từ TradingView Scanner API.
        Trả về dictionary dạng { SYMBOL: { col_name: value } }
        """
        clean_symbols = [s.strip().upper() for s in symbols if s and s.strip()]
        if not clean_symbols:
            return {}

        try:
            res_json = self.fetch_tradingview_raw(clean_symbols)
            data_items = res_json.get("data", [])

            results: Dict[str, Dict[str, Any]] = {}
            for item in data_items:
                raw_d = item.get("d", [])
                if not raw_d:
                    continue

                row = dict(zip(TRADINGVIEW_COLUMNS, raw_d))
                sym = str(row.get("name", "")).strip().upper()
                if sym:
                    results[sym] = row

            return results
        except Exception as e:
            print(f"⚠️ Lỗi fetch TradingView Scanner cho {clean_symbols}: {e}")
            return {}

    def fetch_realtime_quotes(self, symbols: List[str]) -> Dict[str, float]:
        """
        Lấy nhanh thị giá khớp lệnh gần nhất cho danh sách mã.
        Trả về { 'HPG': 26800.0, 'VNM': 67500.0 }
        """
        scanner_data = self.fetch_tradingview_scanner(symbols)
        quotes: Dict[str, float] = {}
        for sym, row in scanner_data.items():
            close_price = row.get("close")
            if close_price is not None:
                try:
                    quotes[sym] = float(close_price)
                except (ValueError, TypeError):
                    pass
        return quotes
