#!/usr/bin/env python3
"""
scripts/fetchers/__init__.py
Package thu thập dữ liệu độc lập cho toàn bộ hệ thống.
"""

from .base import BaseFetcher
from .market_fetcher import MarketFetcher
from .financial_fetcher import FinancialFetcher
from .macro_fetcher import MacroFetcher
from .tradingeconomics_fetcher import TradingEconomicsFetcher
from .market_valuation_history_fetcher import MarketValuationHistoryFetcher
from .vietstock_valuation_fetcher import VietstockValuationFetcher
from .sector_valuation_fetcher import SectorValuationFetcher

__all__ = [
    "BaseFetcher",
    "MarketFetcher",
    "FinancialFetcher",
    "MacroFetcher",
    "TradingEconomicsFetcher",
    "MarketValuationHistoryFetcher",
    "VietstockValuationFetcher",
    "SectorValuationFetcher",
]
