#!/usr/bin/env python3
"""
scripts/fetch_macro_valuation.py
Script trích xuất độc lập định giá vĩ mô VN-Index, thu thập toàn bộ chỉ số từ TradingEconomics,
tính toán Pha chu kỳ 5 pha, Ma trận xoay vòng 11 nhóm ngành, Risk Score và tư vấn phân bổ 4 tài sản.
Lưu trực tiếp ra các file:
- data/macro_indicators.json (Chi tiết 10 danh mục vĩ mô TradingEconomics)
- data/macro_valuation.json (Bức tranh chu kỳ, định giá VN-Index & xoay vòng ngành)
"""

import sys
import json
import time
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
ROOT_DIR = CURRENT_DIR.parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from lib.macro_advisor import compute_pe_bands_and_zscore
from lib.macro_regime import (
    detect_phase,
    calculate_risk_score_and_layers,
    compute_sector_rotation,
    evaluate_leading_signals,
    calculate_4asset_allocation,
    recommend_gold,
    analyze_macro_clock,
    analyze_yield_curve_stress,
    detect_scenarios_and_tail_risks,
    compute_lead_lag_divergence,
    compute_macro_confidence,
)

try:
    from fetchers.macro_fetcher import MacroFetcher
    from fetchers.tradingeconomics_fetcher import TradingEconomicsFetcher
    from fetchers.market_valuation_history_fetcher import MarketValuationHistoryFetcher
    from fetchers.vietstock_valuation_fetcher import VietstockValuationFetcher
    from lib.market_valuation_analyzer import analyze_market_valuation
except ImportError:
    from scripts.fetchers.macro_fetcher import MacroFetcher
    from scripts.fetchers.tradingeconomics_fetcher import TradingEconomicsFetcher
    from scripts.fetchers.market_valuation_history_fetcher import MarketValuationHistoryFetcher
    from scripts.fetchers.vietstock_valuation_fetcher import VietstockValuationFetcher
    from scripts.lib.market_valuation_analyzer import analyze_market_valuation

DATA_DIR = ROOT_DIR / "data"
MACRO_FILE = DATA_DIR / "macro_valuation.json"
INDICATORS_FILE = DATA_DIR / "macro_indicators.json"


def fetch_and_save_macro():
    """Tính toán và lưu định giá thị trường VN-Index cùng toàn bộ dữ liệu vĩ mô & chu kỳ."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    print(f"\n========================================================")
    print(f"🌐 TÍNH TOÁN ĐỊNH GIÁ VĨ MÔ THỊ TRƯỜNG & CHU KỲ KINH TẾ")
    print(f"========================================================")

    # 1. Thu thập dữ liệu vĩ mô sống qua MacroFetcher (HNX, SBV, Yahoo, SJC)
    macro_fetcher = MacroFetcher()
    macro_live = macro_fetcher.fetch_all_macro()

    # 2. Thu thập toàn bộ 10 danh mục vĩ mô qua TradingEconomicsFetcher
    te_fetcher = TradingEconomicsFetcher()
    te_data = te_fetcher.fetch_all_indicators()
    te_core = te_data.get("macroCore", {})

    vn10y = macro_live.get("vn10yYield", te_core.get("vn10y", 3.45))
    sbv_refinancing = macro_live.get("sbvRefinancingRate", te_core.get("sbv_refinancing_rate", 4.5))
    us10y = macro_live.get("us10yYield", 4.3)
    usdvnd = macro_live.get("usdVndRate", te_core.get("usdvnd", 25881.0))
    gold_world = macro_live.get("goldWorld", 2650.0)
    oil_brent = macro_live.get("oilBrent", 74.2)
    dxy = macro_live.get("dxy", 104.2)
    sjc_buy = macro_live.get("sjcGoldBuy", 141.8)
    sjc_sell = macro_live.get("sjcGoldSell", 144.8)
    pnj_buy = macro_live.get("pnjGoldBuy", 141.3)
    pnj_sell = macro_live.get("pnjGoldSell", 144.3)
    pnj_update_date = macro_live.get("pnjUpdateDate", "")

    # Tổng hợp các tham số vĩ mô cho Động cơ Regime
    macro_combined = {
        **te_core,
        "vn10yYield": vn10y,
        "sbv_refinancing_rate": sbv_refinancing,
        "us10yYield": us10y,
        "usdVndRate": usdvnd,
        "goldWorld": gold_world,
        "oilBrent": oil_brent,
        "dxy": dxy,
        "sjcGoldBuy": sjc_buy,
        "sjcGoldSell": sjc_sell,
        "pnjGoldBuy": pnj_buy,
        "pnjGoldSell": pnj_sell,
        "pnjUpdateDate": pnj_update_date,
    }

    # 3. Phân định Pha chu kỳ & Risk Score & Xoay vòng ngành
    regime_phase = detect_phase(macro_combined)
    risk_info = calculate_risk_score_and_layers(macro_combined)
    sector_rotation = compute_sector_rotation(regime_phase["phase"], macro_combined)
    leading_signals = evaluate_leading_signals(macro_combined)
    four_asset_alloc = calculate_4asset_allocation(risk_info["riskBucket"], risk_info["layers"])
    gold_rec = recommend_gold(
        gold_world=gold_world,
        usd_vnd=usdvnd,
        sjc_sell=sjc_sell,
        sjc_buy=sjc_buy,
        pnj_sell=pnj_sell,
        pnj_buy=pnj_buy,
        updated_at=pnj_update_date
    )

    # 4. Định giá VN-Index: Thu thập dữ liệu lịch sử chuẩn xác từ Vietstock (316+ tháng)
    vnindex_analysis = None
    try:
        vs_fetcher = VietstockValuationFetcher(cache_dir=str(DATA_DIR / "vnindex_valuation_cache"))
        vn_df = vs_fetcher.fetch_vnindex_history()
        if not vn_df.empty:
            vnindex_analysis = analyze_market_valuation(vn_df)
    except Exception as e:
        print(f"⚠️ Không thể trích xuất định giá VN-Index từ Vietstock: {e}")

    # Xác định giá trị hiện tại và thống kê mặc định (ưu tiên cửa sổ 10 Năm)
    if vnindex_analysis and "current" in vnindex_analysis and vnindex_analysis["current"].get("pe") is not None:
        current_pe = vnindex_analysis["current"]["pe"]
        current_pb = vnindex_analysis["current"]["pb"]
        ten_year_win = vnindex_analysis["windows"].get("ten_year") or {}
        mean_pe = ten_year_win.get("pe", {}).get("mean", 14.2)
        std_pe = ten_year_win.get("pe", {}).get("std", 2.1)
        zscore_val = ten_year_win.get("pe", {}).get("zscore", 0.0)
        pctl_val = ten_year_win.get("pe", {}).get("percentile", 50.0)
    else:
        current_pe = 13.15
        current_pb = 1.54
        mean_pe = 14.2
        std_pe = 2.1
        zscore_val = -0.5
        pctl_val = 32.0

    advisor_result = compute_pe_bands_and_zscore(current_pe, mean_pe=mean_pe, std_pe=std_pe)

    market_index_data = {
        "symbol": "VNINDEX",
        "name": "Chỉ Số VN-Index",
        "currentPE": advisor_result["currentPE"],
        "currentPB": current_pb,
        "historicalMeanPE": advisor_result["historicalMeanPE"],
        "historicalStdPE": advisor_result["historicalStdPE"],
        "zScore": advisor_result["zScore"],
        "percentile": pctl_val,
        "band": advisor_result["band"],
        "bandText": advisor_result["bandText"],
        "bandColor": advisor_result["bandColor"],
        "bands": [
            { "id": "DEEP_VALUE", "name": "Rất rẻ (Đáy lịch sử)", "min": 0, "max": 11.5, "color": "text-emerald-600 bg-emerald-50" },
            { "id": "CHEAP", "name": "Rẻ (Vùng gom mua)", "min": 11.5, "max": 13.5, "color": "text-emerald-500 bg-emerald-50/60" },
            { "id": "FAIR", "name": "Hợp lý (Cân bằng)", "min": 13.5, "max": 16.0, "color": "text-blue-600 bg-blue-50" },
            { "id": "EXPENSIVE", "name": "Đắt (Chốt lời dần)", "min": 16.0, "max": 18.0, "color": "text-amber-600 bg-amber-50" },
            { "id": "OVERHEATED", "name": "Rất đắt (Rủi ro)", "min": 18.0, "max": 30.0, "color": "text-rose-600 bg-rose-50" }
        ],
    }

    if vnindex_analysis:
        market_index_data["derivedMetrics"] = {
            "peXpb": vnindex_analysis["current"].get("peXpb"),
            "roeProxy": vnindex_analysis["current"].get("roeProxy"),
            "dataDate": vnindex_analysis["current"].get("date"),
        }
        market_index_data["defaultWindow"] = vnindex_analysis.get("defaultWindow", "ten_year")
        market_index_data["extremeAlert"] = vnindex_analysis.get("extremeAlert", False)
        market_index_data["extremeAlertText"] = vnindex_analysis.get("extremeAlertText")
        market_index_data["windows"] = vnindex_analysis.get("windows", {})

    # 4. Phân tích nâng cao vĩ mô theo chuẩn ref-vn-macro-weekly:
    # Macro Clock 4-Quadrant, Yield Curve Stress, Lead-Lag Divergence, Confidence & Scenarios
    macro_clock_data = analyze_macro_clock(macro_combined)
    yield_curve_data = analyze_yield_curve_stress(macro_combined)
    lead_lag_div = compute_lead_lag_divergence(macro_combined)
    confidence_data = compute_macro_confidence(macro_combined)
    scenario_tail_risks = detect_scenarios_and_tail_risks(
        macro=macro_combined,
        risk_score=risk_info["riskScore"],
        regime_phase=regime_phase["phase"],
        current_vnindex=1285.0
    )

    macro_doc = {
        "_meta": {
            "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "source": "Vietstock, HNX, SBV & TradingEconomics Vietnam",
            "version": "3.2"
        },
        "marketIndex": market_index_data,
        "macro": {
            "vn10yYield": vn10y,
            "sbvRefinancingRate": sbv_refinancing,
            "us10yYield": us10y,
            "usdVndRate": usdvnd,
            "goldWorld": gold_world,
            "oilBrent": oil_brent,
            "dxy": dxy,
            "sjcGoldBuy": sjc_buy,
            "sjcGoldSell": sjc_sell,
            "pnjGoldBuy": pnj_buy,
            "pnjGoldSell": pnj_sell,
            "pnjUpdateDate": pnj_update_date,
            "inflationCpi": te_core.get("cpi_yoy", 5.08),
            "coreInflation": te_core.get("cpi_core", 4.45),
            "interbankOvernight": te_core.get("interbank_rate", 6.47),
            "gdpGrowthYoY": te_core.get("gdp_growth_yoy", 9.95),
            "pmi": te_core.get("pmi", 51.9),
            "creditGrowthYoY": te_core.get("credit_growth_yoy", 15.08),
            "retailSalesYoY": te_core.get("retail_sales_yoy", 14.1),
            "tradeBalanceBn": te_core.get("trade_balance_bn_usd", 1.27),
            "govtDebtToGdp": te_core.get("govt_debt_to_gdp", 33.6),
        },
        "regime": regime_phase,
        "macroClock": macro_clock_data,
        "yieldCurveAnalysis": yield_curve_data,
        "scenarioMatrix": scenario_tail_risks["scenarios"],
        "tailRisks": scenario_tail_risks["tailRisks"],
        "hasActiveTailRisk": scenario_tail_risks["hasActiveTailRisk"],
        "criticalTailRiskCount": scenario_tail_risks["criticalTailRiskCount"],
        "leadLagDivergence": lead_lag_div,
        "confidence": confidence_data,
        "riskAssessment": risk_info,
        "sectorRotation": sector_rotation,
        "leadingSignals": leading_signals,
        "assetAllocation": {
            "recommendedEquityPct": advisor_result["recommendedEquityPct"],
            "recommendedCashPct": advisor_result["recommendedCashPct"],
            "stance": advisor_result["stance"],
            "rationale": advisor_result["rationale"],
            "fourAssets": four_asset_alloc,
        },
        "goldAdvisor": gold_rec,
        "tradingEconomics": te_data,
    }

    # 5. Đồng bộ chuỗi lịch sử định giá thị trường vào file riêng data/market_valuation_history.json
    # và nhúng làm tầng dự phòng an toàn (zero-downtime fallback) trong macro_valuation.json
    val_data = None
    try:
        val_fetcher = MarketValuationHistoryFetcher()
        val_data = val_fetcher.fetch_all_and_save()
    except Exception as e:
        print(f"⚠️ Không thể cập nhật lịch sử định giá thị trường: {e}")
        history_file = DATA_DIR / "market_valuation_history.json"
        if history_file.exists():
            try:
                with open(history_file, "r", encoding="utf-8") as f:
                    val_data = json.load(f)
            except Exception:
                pass

    if val_data:
        macro_doc["marketValuationHistory"] = val_data

    with open(MACRO_FILE, "w", encoding="utf-8") as f:
        json.dump(macro_doc, f, ensure_ascii=False, indent=2)

    print(f"✅ Đã ghi nhận định giá VN-Index P/E: {current_pe}x (Z-Score: {advisor_result['zScore']})")
    print(f"📊 Pha chu kỳ vĩ mô: {regime_phase['titleVi']} ({regime_phase['phase']})")
    print(f"⚡ Khẩu vị rủi ro: {leading_signals['stance']}")
    print(f"🛡️ Điểm rủi ro vĩ mô: {risk_info['riskScore']}/100 ({risk_info['riskBucket']})")
    print(f"💾 File lưu tại: {MACRO_FILE}\n")


if __name__ == "__main__":
    fetch_and_save_macro()
