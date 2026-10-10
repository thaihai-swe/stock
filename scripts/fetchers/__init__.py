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

__all__ = [
    "BaseFetcher",
    "MarketFetcher",
    "FinancialFetcher",
    "MacroFetcher",
    "TradingEconomicsFetcher",
]
