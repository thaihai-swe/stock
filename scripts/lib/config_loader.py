#!/usr/bin/env python3
"""
scripts/lib/config_loader.py
Bộ nạp cấu hình hệ thống động (Dynamic Configuration Loader):
- Đọc dữ liệu từ file data/default-constant-value.json
- Tự động nạp fallback an toàn (Deep Merge) nếu file chưa có hoặc thiếu trường
- Cung cấp các hàm truy xuất cấu hình cho Valuation Engine, Macro Regime và Fetchers.
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

CURRENT_DIR = Path(__file__).resolve().parent
ROOT_DIR = CURRENT_DIR.parent.parent
CONFIG_FILE = ROOT_DIR / "data" / "default-constant-value.json"

# BỘ THAM SỐ DỰ PHÒNG CHUẨN (HARDCODED FALLBACKS)
FALLBACK_CONFIG: Dict[str, Any] = {
    "valuation": {
        "wacc": 0.115,
        "growthRate": 0.035,
        "peMultiple": 11.5,
        "pbMultiple": 1.35,
        "evEbitdaMultiple": 7.5,
        "pcfMultiple": 8.0,
        "psMultiple": 1.1,
        "riskFreeRate": 0.045,
        "sectorWaccBenchmarks": {
            "BANKING": 0.100,
            "FINANCIAL_SERVICES": 0.105,
            "INSURANCE": 0.100,
            "HEAVY_INDUSTRY": 0.105,
            "REAL_ESTATE": 0.115,
            "RETAIL": 0.090,
            "CONSUMER": 0.090,
            "TECHNOLOGY": 0.090,
            "ENERGY": 0.100,
            "OIL_GAS": 0.100,
            "GENERAL": 0.105,
        },
        "waccAdjustment": {
            "betaSensitivity": 0.015,
            "minWacc": 0.075,
            "maxWacc": 0.160,
        },
        "valuationTraps": {
            "highRiskThreshold": 4.0,
            "mediumRiskThreshold": 2.0,
            "weights": {
                "valueTrap": 2.5,
                "bookTrap": 2.5,
                "cyclicalPeak": 2.0,
                "debtStress": 2.0,
                "dividendTrap": 1.5,
                "shareDilution": 1.5,
                "wcStress": 1.5,
            },
        },
        "sevenPriceZones": {
            "deepValueRatio": 0.75,
            "buyRatio": 0.85,
            "fairLowRatio": 0.95,
            "fairHighRatio": 1.10,
            "aboveFairRatio": 1.20,
            "expensiveRatio": 1.35,
        },
        "methodSuitability": {
            "finGrahamSuitability": 0.35,
            "nonFinRimSuitability": 0.55,
            "nonFinNavSuitability": 0.85,
            "reDdmSuitability": 0.25,
        },
        "graham": {
            "basePeMax": 7.0,
            "basePeMin": 3.0,
            "defaultBasePe": 7.0,
            "highQualityHs": 1.0,
            "standardHs": 0.8,
            "roeQualityThreshold": 15.0,
            "cyclicalGrowthRate": 5.0,
            "maxNonCyclicalGrowthRate": 12.0,
            "minGrowthRate": 3.0,
            "defaultGrowthRate": 5.0,
            "minBenchmarkConstant": 4.4,
            "minDiscountYield": 5.0,
            "cyclicalSectors": [
                "Thép",
                "Hóa Chất",
                "Dầu Khí",
                "Thủy Sản",
                "Khai Khoáng",
                "Phân Bón",
                "Cao Su"
            ],
            "maxMultiplier": 22.5,
            "minMultiplier": 4.0,
        },
        "outlierFilter": {
            "outlierGapThreshold": 0.60,
            "minModels": 2,
        },
        "marginOfSafety": {
            "strongBuyPct": 15.0,
            "fairValuePct": 0.0,
        },
        "sectorWeights": {
            "Ngân Hàng": {"pe": 0.13, "pb": 0.22, "graham": 0.05, "dcf": 0.00, "fcff": 0.00, "fcfe": 0.00, "rim": 0.18, "nav": 0.17, "evebitda": 0.00, "ddm": 0.25},
            "Chứng Khoán": {"pe": 0.25, "pb": 0.25, "graham": 0.08, "dcf": 0.00, "fcff": 0.00, "fcfe": 0.00, "rim": 0.15, "nav": 0.17, "evebitda": 0.00, "ddm": 0.10},
            "Bảo Hiểm": {"pe": 0.20, "pb": 0.22, "graham": 0.08, "dcf": 0.00, "fcff": 0.00, "fcfe": 0.00, "rim": 0.18, "nav": 0.12, "evebitda": 0.00, "ddm": 0.20},
            "Bất Động Sản": {"pe": 0.10, "pb": 0.18, "graham": 0.05, "dcf": 0.10, "fcff": 0.07, "fcfe": 0.05, "rim": 0.08, "nav": 0.32, "evebitda": 0.00, "ddm": 0.05},
            "Thép": {"pe": 0.20, "pb": 0.10, "graham": 0.05, "dcf": 0.18, "fcff": 0.12, "fcfe": 0.08, "rim": 0.00, "nav": 0.05, "evebitda": 0.22, "ddm": 0.00},
            "Dệt May": {"pe": 0.25, "pb": 0.10, "graham": 0.05, "dcf": 0.15, "fcff": 0.12, "fcfe": 0.08, "rim": 0.00, "nav": 0.05, "evebitda": 0.20, "ddm": 0.00},
            "Dược Phẩm & Y Tế": {"pe": 0.22, "pb": 0.08, "graham": 0.10, "dcf": 0.22, "fcff": 0.12, "fcfe": 0.08, "rim": 0.00, "nav": 0.03, "evebitda": 0.10, "ddm": 0.05},
            "Bán Lẻ": {"pe": 0.25, "pb": 0.08, "graham": 0.05, "dcf": 0.20, "fcff": 0.12, "fcfe": 0.08, "rim": 0.00, "nav": 0.04, "evebitda": 0.18, "ddm": 0.00},
            "Công Nghệ & Viễn Thông": {"pe": 0.22, "pb": 0.05, "graham": 0.05, "dcf": 0.25, "fcff": 0.15, "fcfe": 0.10, "rim": 0.00, "nav": 0.03, "evebitda": 0.15, "ddm": 0.00},
            "Dầu Khí": {"pe": 0.18, "pb": 0.08, "graham": 0.05, "dcf": 0.18, "fcff": 0.14, "fcfe": 0.08, "rim": 0.00, "nav": 0.05, "evebitda": 0.16, "ddm": 0.08},
            "Điện & Tiện Ích": {"pe": 0.18, "pb": 0.08, "graham": 0.05, "dcf": 0.18, "fcff": 0.14, "fcfe": 0.08, "rim": 0.00, "nav": 0.05, "evebitda": 0.16, "ddm": 0.08},
            "Xây Dựng": {"pe": 0.22, "pb": 0.15, "graham": 0.05, "dcf": 0.15, "fcff": 0.10, "fcfe": 0.08, "rim": 0.00, "nav": 0.07, "evebitda": 0.18, "ddm": 0.00},
            "Vật Liệu Xây Dựng": {"pe": 0.22, "pb": 0.15, "graham": 0.05, "dcf": 0.15, "fcff": 0.10, "fcfe": 0.08, "rim": 0.00, "nav": 0.07, "evebitda": 0.18, "ddm": 0.00},
            "Thủy Sản": {"pe": 0.22, "pb": 0.10, "graham": 0.05, "dcf": 0.18, "fcff": 0.12, "fcfe": 0.08, "rim": 0.00, "nav": 0.05, "evebitda": 0.15, "ddm": 0.05},
            "Thực Phẩm & Đồ Uống": {"pe": 0.22, "pb": 0.10, "graham": 0.05, "dcf": 0.18, "fcff": 0.12, "fcfe": 0.08, "rim": 0.00, "nav": 0.05, "evebitda": 0.15, "ddm": 0.05},
            "Khai Khoáng": {"pe": 0.20, "pb": 0.12, "graham": 0.05, "dcf": 0.18, "fcff": 0.12, "fcfe": 0.08, "rim": 0.00, "nav": 0.05, "evebitda": 0.15, "ddm": 0.05},
            "Phân Bón": {"pe": 0.20, "pb": 0.12, "graham": 0.05, "dcf": 0.18, "fcff": 0.12, "fcfe": 0.08, "rim": 0.00, "nav": 0.05, "evebitda": 0.15, "ddm": 0.05},
            "Hóa Chất": {"pe": 0.20, "pb": 0.12, "graham": 0.05, "dcf": 0.18, "fcff": 0.12, "fcfe": 0.08, "rim": 0.00, "nav": 0.05, "evebitda": 0.15, "ddm": 0.05},
            "Logistics & Vận Tải": {"pe": 0.18, "pb": 0.08, "graham": 0.05, "dcf": 0.22, "fcff": 0.14, "fcfe": 0.08, "rim": 0.00, "nav": 0.05, "evebitda": 0.15, "ddm": 0.05},
            "Hàng Không": {"pe": 0.18, "pb": 0.08, "graham": 0.05, "dcf": 0.22, "fcff": 0.14, "fcfe": 0.08, "rim": 0.00, "nav": 0.05, "evebitda": 0.15, "ddm": 0.05},
            "Giáo Dục": {"pe": 0.18, "pb": 0.08, "graham": 0.05, "dcf": 0.22, "fcff": 0.14, "fcfe": 0.08, "rim": 0.00, "nav": 0.05, "evebitda": 0.15, "ddm": 0.05},
            "Nông Nghiệp": {"pe": 0.20, "pb": 0.12, "graham": 0.05, "dcf": 0.18, "fcff": 0.12, "fcfe": 0.08, "rim": 0.00, "nav": 0.05, "evebitda": 0.15, "ddm": 0.05},
            "Cao Su": {"pe": 0.20, "pb": 0.12, "graham": 0.05, "dcf": 0.18, "fcff": 0.12, "fcfe": 0.08, "rim": 0.00, "nav": 0.05, "evebitda": 0.15, "ddm": 0.05},
            "Khác": {"pe": 0.15, "pb": 0.15, "graham": 0.08, "dcf": 0.15, "fcff": 0.12, "fcfe": 0.08, "rim": 0.08, "nav": 0.07, "evebitda": 0.07, "ddm": 0.05},
        },
    },
    "financialAnalytics": {
        "healthScore": {
            "pillarWeightsCorporate": {
                "profitability": 0.30,
                "efficiency": 0.25,
                "leverage": 0.25,
                "liquidity": 0.20,
            },
            "pillarWeightsBanking": {
                "profitability": 0.45,
                "efficiency": 0.20,
                "leverage": 0.35,
                "liquidity": 0.00,
            },
            "gradeThresholds": {
                "excellent": 80,
                "good": 65,
                "fair": 50,
                "weak": 35,
            },
        },
        "beneishMScore": {
            "safeThreshold": -2.22,
            "alertThreshold": -1.78,
        },
        "magicFormula": {
            "minEarningsYieldTopTier": 9.0,
            "minRoicTopTier": 18.0,
            "eyBenchmark": 15.0,
            "roicBenchmark": 30.0,
        },
        "dupontBenchmarks": {
            "taxBurden": 0.80,
            "interestBurden": 0.80,
            "operatingMargin": 0.10,
            "assetTurnover": 0.80,
            "financialLeverage": 2.50,
        },
    },
    "macro": {
        "phaseRules": {
            "sbv_refinancing_rate": {
                "Recovery": (None, 4.5),
                "Expansion": (4.0, 5.5),
                "Overheating": (5.0, 7.0),
                "Slowdown": (6.5, None),
                "Recession": (None, 4.5),
            },
            "interbank_rate": {
                "Recovery": (None, 2.5),
                "Expansion": (2.0, 4.5),
                "Overheating": (4.0, 6.5),
                "Slowdown": (6.0, None),
                "Recession": (None, 3.0),
            },
            "cpi_yoy": {
                "Recovery": (None, 4.0),
                "Expansion": (3.5, 5.5),
                "Overheating": (5.0, 7.5),
                "Slowdown": (7.0, None),
                "Recession": (None, 3.5),
            },
            "credit_growth_yoy": {
                "Recovery": (None, 12.0),
                "Expansion": (12.0, 16.5),
                "Overheating": (16.0, None),
                "Slowdown": (None, 11.0),
                "Recession": (None, 8.0),
            },
            "pmi": {
                "Recovery": (50.0, 52.5),
                "Expansion": (51.5, 55.0),
                "Overheating": (53.0, None),
                "Slowdown": (48.0, 50.5),
                "Recession": (None, 48.5),
            },
            "usdvnd": {
                "Recovery": (None, 24800),
                "Expansion": (24500, 25500),
                "Overheating": (25200, 26200),
                "Slowdown": (25800, None),
                "Recession": (25000, None),
            },
        },
        "riskScoreWeights": {
            "monetary": 0.35,
            "growth": 0.25,
            "price": 0.20,
            "external": 0.20,
        },
        "goldArbitrage": {
            "domesticTaxesAndFeesPct": 1.5,
            "premiumThresholdHigh": 10.0,
            "premiumThresholdLow": 3.0,
        },
        "marketValuationBands": {
            "zScoreExtremeThreshold": 2.0,
            "grahamPePbThreshold": 22.5,
        },
        "fallbackIndicators": {
            "cpiYoY": 3.63,
            "interbankRate": 4.50,
            "sbvRefinancingRate": 4.50,
            "vn10yYield": 4.47,
            "us10yYield": 4.30,
            "usdvnd": 25400,
            "oilBrent": 75.0,
            "pmi": 50.5,
            "creditGrowthYoY": 14.0,
            "gdpGrowthYoY": 6.5,
        },
    },
    "tradingAndFees": {
        "personalIncomeTaxRate": 0.001,
        "defaultBrokerFeeRate": 0.0015,
        "brokerFeePresets": [0.0, 0.001, 0.0015],
        "dividendCashTaxRate": 0.05,
        "riskFreeRateAnnual": 0.045,
        "vnindexAnnualVolatility": 18.0,
        "defaultBankInterestRate": 5.0,
        "tradingDaysPerYear": 252,
        "defaultTags": ["Dài hạn", "Lướt sóng", "Bắt đáy", "Cơ bản", "Kỹ thuật", "Cổ tức"],
    },
    "systemAndNetwork": {
        "serverPort": 3001,
        "inSessionTtlMs": 3600000,
        "fundamentalsTtlMs": 43200000,
        "httpTimeoutSeconds": 30,
        "httpMaxRetries": 2,
        "rateLimitsPerMinute": {
            "VCI": 45,
            "TCBS": 45,
            "TRADINGVIEW": 60,
            "DEFAULT": 45,
        },
    },
}

_CACHED_CONFIG: Optional[Dict[str, Any]] = None


def _deep_merge(target: Dict[str, Any], source: Dict[str, Any]) -> Dict[str, Any]:
    """Hợp nhất đệ quy 2 dictionaries, ưu tiên giá trị từ source."""
    result = dict(target)
    for k, v in source.items():
        if k in result and isinstance(result[k], dict) and isinstance(v, dict):
            result[k] = _deep_merge(result[k], v)
        else:
            result[k] = v
    return result


def load_system_constants(reload: bool = False) -> Dict[str, Any]:
    """Nạp toàn bộ cấu hình từ data/default-constant-value.json với cơ chế fallback."""
    global _CACHED_CONFIG
    if _CACHED_CONFIG is not None and not reload:
        return _CACHED_CONFIG

    merged = dict(FALLBACK_CONFIG)

    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                user_data = json.load(f)
            if isinstance(user_data, dict):
                merged = _deep_merge(merged, user_data)
        except Exception as e:
            logger.warning(f"⚠️ Không thể đọc {CONFIG_FILE}: {e}. Dùng giá trị mặc định dự phòng.")
    else:
        logger.info(f"ℹ️ {CONFIG_FILE} chưa tồn tại. Dùng giá trị mặc định dự phòng.")

    # Chuẩn hoá phaseRules sang dạng tuple (min, max) nếu từ JSON là list
    if "macro" in merged and "phaseRules" in merged["macro"]:
        rules = merged["macro"]["phaseRules"]
        normalized_rules = {}
        for driver, phases in rules.items():
            normalized_rules[driver] = {}
            for phase, bounds in phases.items():
                if isinstance(bounds, list) or isinstance(bounds, tuple):
                    normalized_rules[driver][phase] = (bounds[0], bounds[1])
                else:
                    normalized_rules[driver][phase] = bounds
        merged["macro"]["phaseRules"] = normalized_rules

    _CACHED_CONFIG = merged
    return _CACHED_CONFIG


def get_valuation_config() -> Dict[str, Any]:
    """Lấy cấu hình cho phân hệ định giá doanh nghiệp & cổ phiếu."""
    cfg = load_system_constants()
    return cfg.get("valuation", FALLBACK_CONFIG["valuation"])


def get_financial_analytics_config() -> Dict[str, Any]:
    """Lấy cấu hình cho phân hệ phân tích BCTC, health score, fraud detection và magic formula."""
    cfg = load_system_constants()
    return cfg.get("financialAnalytics", FALLBACK_CONFIG["financialAnalytics"])


def get_macro_config() -> Dict[str, Any]:
    """Lấy cấu hình cho phân hệ vĩ mô, chu kỳ và nhiệt kế thị trường."""
    cfg = load_system_constants()
    return cfg.get("macro", FALLBACK_CONFIG["macro"])


def get_trading_config() -> Dict[str, Any]:
    """Lấy cấu hình thuế, phí giao dịch và lãi suất tham chiếu."""
    cfg = load_system_constants()
    return cfg.get("tradingAndFees", FALLBACK_CONFIG["tradingAndFees"])


def get_system_config() -> Dict[str, Any]:
    """Lấy cấu hình hệ thống, timeout và rate limiter."""
    cfg = load_system_constants()
    return cfg.get("systemAndNetwork", FALLBACK_CONFIG["systemAndNetwork"])
