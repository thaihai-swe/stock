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
from lib.yield_curve_monitor import compute_yield_curve_monitor
from lib.macro_regime import (
    detect_phase,
    calculate_risk_score_and_layers,
    compute_sector_rotation,
    evaluate_leading_signals,
    calculate_4asset_allocation,
    calculate_scenario_allocation_matrix,
    generate_executive_summary,
    calculate_style_indices,
    recommend_gold,
    analyze_macro_clock,
    analyze_yield_curve_stress,
    detect_scenarios_and_tail_risks,
    compute_lead_lag_divergence,
    compute_macro_confidence,
    calculate_dual_sweet_spot_matrix,
)

try:
    from fetchers.macro_fetcher import MacroFetcher
    from fetchers.tradingeconomics_fetcher import TradingEconomicsFetcher
    from fetchers.market_valuation_history_fetcher import MarketValuationHistoryFetcher
    from fetchers.vietstock_valuation_fetcher import VietstockValuationFetcher
    from fetchers.sector_valuation_fetcher import SectorValuationFetcher
    from lib.market_valuation_analyzer import analyze_market_valuation
except ImportError:
    from scripts.fetchers.macro_fetcher import MacroFetcher
    from scripts.fetchers.tradingeconomics_fetcher import TradingEconomicsFetcher
    from scripts.fetchers.market_valuation_history_fetcher import MarketValuationHistoryFetcher
    from scripts.fetchers.vietstock_valuation_fetcher import VietstockValuationFetcher
    from scripts.fetchers.sector_valuation_fetcher import SectorValuationFetcher
    from scripts.lib.market_valuation_analyzer import analyze_market_valuation

DATA_DIR = ROOT_DIR / "data"
MACRO_FILE = DATA_DIR / "macro_valuation.json"
INDICATORS_FILE = DATA_DIR / "macro_indicators.json"
AI_CACHE_FILE = DATA_DIR / "ai_insights_cache.json"


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

    # 2b. Nạp cache vĩ mô thực tế trước đó để làm fallback an toàn thay vì dùng số tĩnh
    cached_macro = {}
    try:
        cache_file = DATA_DIR / "macro_valuation.json"
        if cache_file.exists():
            with open(cache_file, "r", encoding="utf-8") as f:
                cdata = json.load(f)
                cached_macro = cdata.get("macro", {})
    except Exception:
        pass

    vn10y = macro_live.get("vn10yYield") or cached_macro.get("vn10yYield") or te_core.get("vn10y")
    sbv_refinancing = macro_live.get("sbvRefinancingRate") or cached_macro.get("sbvRefinancingRate") or te_core.get("sbv_refinancing_rate")
    us10y = macro_live.get("us10yYield") or cached_macro.get("us10yYield")
    usdvnd = macro_live.get("usdVndRate") or cached_macro.get("usdVndRate") or te_core.get("usdvnd")
    gold_world = macro_live.get("goldWorld") or cached_macro.get("goldWorld")
    oil_brent = macro_live.get("oilBrent") or cached_macro.get("oilBrent")
    dxy = macro_live.get("dxy") or cached_macro.get("dxy")
    sjc_buy = macro_live.get("sjcGoldBuy") or cached_macro.get("sjcGoldBuy")
    sjc_sell = macro_live.get("sjcGoldSell") or cached_macro.get("sjcGoldSell")
    pnj_buy = macro_live.get("pnjGoldBuy") or cached_macro.get("pnjGoldBuy")
    pnj_sell = macro_live.get("pnjGoldSell") or cached_macro.get("pnjGoldSell")
    pnj_update_date = macro_live.get("pnjUpdateDate") or cached_macro.get("pnjUpdateDate", "")

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

    # 4. Định giá VN-Index & VN30: Thu thập dữ liệu lịch sử chuẩn xác từ Vietstock (316+ tháng)
    vnindex_analysis = None
    vn30_analysis = None
    try:
        vs_fetcher = VietstockValuationFetcher(cache_dir=str(DATA_DIR / "vnindex_valuation_cache"))
        vn_df = vs_fetcher.fetch_vnindex_history()
        if not vn_df.empty:
            vnindex_analysis = analyze_market_valuation(vn_df)

        vn30_df = vs_fetcher.fetch_vn30_history()
        if not vn30_df.empty:
            vn30_analysis = analyze_market_valuation(vn30_df)
    except Exception as e:
        print(f"⚠️ Không thể trích xuất định giá VN-Index / VN30 từ Vietstock: {e}")

    # Xác định giá trị hiện tại và thống kê mặc định (ưu tiên cửa sổ 10 Năm)
    prev_m = {}
    prev_vn30 = {}
    if MACRO_FILE.exists():
        try:
            with open(MACRO_FILE, "r", encoding="utf-8") as f:
                prev_cached_doc = json.load(f)
                prev_m = prev_cached_doc.get("marketIndex", {})
                prev_vn30 = prev_cached_doc.get("vn30", {})
        except Exception:
            pass

    if vnindex_analysis and "current" in vnindex_analysis and vnindex_analysis["current"].get("pe") is not None:
        current_pe = vnindex_analysis["current"]["pe"]
        current_pb = vnindex_analysis["current"]["pb"]
        ten_year_win = vnindex_analysis["windows"].get("ten_year") or {}
        mean_pe = ten_year_win.get("pe", {}).get("mean", 14.2)
        std_pe = ten_year_win.get("pe", {}).get("std", 2.1)
        zscore_val = ten_year_win.get("pe", {}).get("zscore", 0.0)
        pctl_val = ten_year_win.get("pe", {}).get("percentile", 50.0)
    else:
        # Tầng dự phòng: Kế thừa snapshot gần nhất từ macro_valuation.json thay vì gán hằng số
        current_pe = float(prev_m.get("currentPE") or 13.5)
        current_pb = float(prev_m.get("currentPB") or 1.6)
        mean_pe = float(prev_m.get("historicalMeanPE") or 14.2)
        std_pe = float(prev_m.get("historicalStdPE") or 2.1)
        zscore_val = float(prev_m.get("peZScore") or 0.0)
        pctl_val = float(prev_m.get("percentileRank") or 50.0)

    vn30_pe = vn30_analysis["current"]["pe"] if (vn30_analysis and "current" in vn30_analysis and vn30_analysis["current"].get("pe")) else float(prev_vn30.get("pe") or 11.5)
    vn30_pb = vn30_analysis["current"]["pb"] if (vn30_analysis and "current" in vn30_analysis and vn30_analysis["current"].get("pb")) else float(prev_vn30.get("pb") or 1.8)

    advisor_result = compute_pe_bands_and_zscore(current_pe, mean_pe=mean_pe, std_pe=std_pe)

    # Thu thập thị giá đóng cửa và biến động thời gian thực của VN-Index và VN30 từ DNSE Live API
    live_vnindex = macro_fetcher.fetch_live_index_quote("VNINDEX")
    live_vn30 = macro_fetcher.fetch_live_index_quote("VN30")
    current_vnindex_point = float(live_vnindex.get("point") or prev_m.get("currentPoint") or 0.0)

    market_index_data = {
        "symbol": "VNINDEX",
        "name": "Chỉ Số VN-Index",
        "currentPoint": current_vnindex_point,
        "prevPoint": float(live_vnindex.get("prevPoint") or current_vnindex_point),
        "change": float(live_vnindex.get("change") or 0.0),
        "changePercent": float(live_vnindex.get("changePercent") or 0.0),
        "high": float(live_vnindex.get("high") or current_vnindex_point),
        "low": float(live_vnindex.get("low") or current_vnindex_point),
        "volume": int(live_vnindex.get("volume") or 0),
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

    # 4. Phân tích nâng cao vĩ mô theo chuẩn ref-vn-macro-weekly & ref-vn-macro-markets:
    # Macro Clock 4-Quadrant, Yield Curve Stress, Lead-Lag Divergence, Confidence & Scenarios
    macro_clock_data = analyze_macro_clock(macro_combined)
    yield_curve_data = analyze_yield_curve_stress(macro_combined)
    lead_lag_div = compute_lead_lag_divergence(macro_combined)
    confidence_data = compute_macro_confidence(macro_combined)
    scenario_tail_risks = detect_scenarios_and_tail_risks(
        macro=macro_combined,
        risk_score=risk_info["riskScore"],
        regime_phase=regime_phase["phase"],
        current_vnindex=current_vnindex_point
    )

    # 4b. Tạo Ma trận phân bổ 4x3 đa kịch bản (Base / Bull / Bear)
    scenario_alloc_matrix = calculate_scenario_allocation_matrix(risk_info["riskBucket"], risk_info["layers"])

    # 4c. Tạo Khối điều hành chiến lược Executive Summary (Key Risks, Catalysts, Key Takeaways)
    exec_summary = generate_executive_summary(
        macro=macro_combined,
        risk_info=risk_info,
        regime=regime_phase,
        scenarios=scenario_tail_risks["scenarios"],
        active_tail_risks=scenario_tail_risks["tailRisks"],
        market_pe=current_pe
    )

    # 4d. Tạo Danh mục phân khúc phong cách đầu tư (VN-Index, VN30, VN Diamond, VN Midcap, VN100)
    style_indices = calculate_style_indices(
        macro=macro_combined,
        vnindex_pe=current_pe,
        vnindex_pb=current_pb,
        vn30_pe=vn30_pe,
        vn30_pb=vn30_pb
    )

    # 4e. Cào Dữ Liệu Định Giá 10 Nhóm Ngành Thực Tế & Tính Ma Trận Thiên Thời Hội Tụ (Dual Sweet Spot Matrix)
    sector_valuations = []
    dual_matrix = {}
    try:
        sector_fetcher = SectorValuationFetcher()
        sector_valuations = sector_fetcher.fetch_and_cache_sectors(vnindex_pe=current_pe)
        dual_matrix = calculate_dual_sweet_spot_matrix(
            sector_valuations=sector_valuations,
            sector_rotations=sector_rotation,
            vnindex_pe=current_pe
        )
    except Exception as e:
        print(f"⚠️ Lỗi fetch dữ liệu định giá ngành: {e}")

    try:
        from lib.config_loader import get_macro_config
    except ImportError:
        from scripts.lib.config_loader import get_macro_config

    m_cfg = get_macro_config()
    m_fallbacks = m_cfg.get("fallbackIndicators", {})
    fb_cpi = float(m_fallbacks.get("cpiYoY", 3.63))
    fb_interbank = float(m_fallbacks.get("interbankRate", 4.50))

    # 4f. Bảng Giám Sát Đường Cong Lợi Suất & Lãi Suất 17 Dòng (VN vs US Yield Curve Monitor - ref-vn_macro)
    yield_curve_monitor = compute_yield_curve_monitor({
        **macro_live,
        **macro_combined,
        "vn10y": vn10y,
        "sbvRefinancingRate": sbv_refinancing,
        "us10y": us10y,
        "usd": usdvnd,
        "pe": current_pe,
        "cpiYoY": te_core.get("cpi_yoy", fb_cpi),
        "interbankRate": te_core.get("interbank_rate", fb_interbank),
    })

    # 4g. Tổng hợp AI Macro Insight (Bảo lưu aiInsight, weeklyPulse, sectorTransmission hoặc nạp từ ai_insights_cache.json)
    ai_cache_data = {}
    if AI_CACHE_FILE.exists():
        try:
            with open(AI_CACHE_FILE, "r", encoding="utf-8") as f:
                ai_cache_data = json.load(f)
        except Exception:
            ai_cache_data = {}

    ai_insight = prev_cached_doc.get("aiInsight") if MACRO_FILE.exists() else None
    if not ai_insight and ai_cache_data.get("aiInsight"):
        ai_insight = ai_cache_data.get("aiInsight")

    if not ai_insight:
        ai_insight = {
            "status": "ready",
            "model": "offline-cio-heuristic",
            "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "headline": f"Chiến Lược Vĩ Mô: Pha {regime_phase.get('titleVi', '')} — {advisor_result.get('stance', '')}",
            "strategicTakeaways": [
                f"Định giá VN-Index P/E {current_pe:.1f}x (Z-Score: {advisor_result.get('zScore', 0):+.2f}), dải định giá {advisor_result.get('bandText', '')}.",
                f"Tỷ trọng phân bổ khuyến nghị: {advisor_result.get('recommendedEquityPct', 70)}% Cổ phiếu / {advisor_result.get('recommendedCashPct', 30)}% Tiền mặt.",
                f"Chuỗi truyền dẫn rủi ro: {yield_curve_monitor.get('summary', {}).get('transChainStage', 'N/A')} ({yield_curve_monitor.get('summary', {}).get('assetDecisionVi', '')}).",
            ],
            "actionPlan": [
                "Theo dõi sát động thái can thiệp tỷ giá USD/VND và thanh khoản liên ngân hàng.",
                "Tập trung gom cổ phiếu thuộc các nhóm ngành lọt vùng Sweet Spot (Định giá rẻ + Vĩ mô ủng hộ).",
                "Duy trì kỷ luật phân bổ tài sản phòng thủ khi áp lực ngoại biên gia tăng."
            ],
            "riskAlerts": [
                f"Rủi ro vĩ mô tổng hợp: {risk_info.get('riskScore', 0)}/100 ({risk_info.get('riskBucket', '')})."
            ]
        }

    # Bảo lưu weeklyPulse: Ưu tiên tài liệu hiện có, fallback sang ai_insights_cache.json
    weekly_pulse = prev_cached_doc.get("weeklyPulse") if MACRO_FILE.exists() else None
    if not weekly_pulse and ai_cache_data.get("weeklyPulse"):
        weekly_pulse = ai_cache_data.get("weeklyPulse")

    # Bảo lưu sectorTransmission: Dẫn truyền vĩ mô vào ngành
    sector_transmission = prev_cached_doc.get("sectorTransmission") if MACRO_FILE.exists() else None
    if not sector_transmission and ai_cache_data.get("sectorTransmission"):
        sector_transmission = ai_cache_data.get("sectorTransmission")

    # Bảo lưu các phân hệ AI vĩ mô mở rộng (Scenarios, Clock Dynamics, Yield Curve, Multi-Asset, Style, Tail Risks)
    ai_scenarios = prev_cached_doc.get("aiScenarios") if MACRO_FILE.exists() else None
    if not ai_scenarios and ai_cache_data.get("aiScenarios"):
        ai_scenarios = ai_cache_data.get("aiScenarios")

    ai_clock_dynamics = prev_cached_doc.get("aiClockDynamics") if MACRO_FILE.exists() else None
    if not ai_clock_dynamics and ai_cache_data.get("aiClockDynamics"):
        ai_clock_dynamics = ai_cache_data.get("aiClockDynamics")

    ai_yield_curve_diag = prev_cached_doc.get("aiYieldCurveDiagnosis") if MACRO_FILE.exists() else None
    if not ai_yield_curve_diag and ai_cache_data.get("aiYieldCurveDiagnosis"):
        ai_yield_curve_diag = ai_cache_data.get("aiYieldCurveDiagnosis")

    ai_multi_asset = prev_cached_doc.get("aiMultiAssetStrategy") if MACRO_FILE.exists() else None
    if not ai_multi_asset and ai_cache_data.get("aiMultiAssetStrategy"):
        ai_multi_asset = ai_cache_data.get("aiMultiAssetStrategy")

    ai_style_rotation = prev_cached_doc.get("aiStyleRotation") if MACRO_FILE.exists() else None
    if not ai_style_rotation and ai_cache_data.get("aiStyleRotation"):
        ai_style_rotation = ai_cache_data.get("aiStyleRotation")

    ai_tail_risk = prev_cached_doc.get("aiTailRiskAnalysis") if MACRO_FILE.exists() else None
    if not ai_tail_risk and ai_cache_data.get("aiTailRiskAnalysis"):
        ai_tail_risk = ai_cache_data.get("aiTailRiskAnalysis")

    macro_doc = {
        "_meta": {
            "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "source": "Vietstock, HNX, SBV, GICS Vietnam & TradingEconomics",
            "version": "4.0"
        },
        "aiInsight": ai_insight,
        "weeklyPulse": weekly_pulse,
        "yieldCurveMonitor": yield_curve_monitor,
        "marketIndex": market_index_data,
        "vn30Valuation": vn30_analysis,
        "styleIndices": style_indices,
        "sectorValuations": sector_valuations,
        "dualMatrix": dual_matrix,
        "executiveSummary": exec_summary,
        "scenarioAllocation": scenario_alloc_matrix,
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
            "scenarioMatrix": scenario_alloc_matrix,
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

    if sector_transmission:
        macro_doc["sectorTransmission"] = sector_transmission

    if ai_scenarios:
        macro_doc["aiScenarios"] = ai_scenarios
    if ai_clock_dynamics:
        macro_doc["aiClockDynamics"] = ai_clock_dynamics
    if ai_yield_curve_diag:
        macro_doc["aiYieldCurveDiagnosis"] = ai_yield_curve_diag
    if ai_multi_asset:
        macro_doc["aiMultiAssetStrategy"] = ai_multi_asset
    if ai_style_rotation:
        macro_doc["aiStyleRotation"] = ai_style_rotation
    if ai_tail_risk:
        macro_doc["aiTailRiskAnalysis"] = ai_tail_risk

    with open(MACRO_FILE, "w", encoding="utf-8") as f:
        json.dump(macro_doc, f, ensure_ascii=False, indent=2)

    print(f"✅ Đã ghi nhận định giá VN-Index P/E: {current_pe}x (Z-Score: {advisor_result['zScore']})")
    print(f"📊 Pha chu kỳ vĩ mô: {regime_phase['titleVi']} ({regime_phase['phase']})")
    print(f"⚡ Khẩu vị rủi ro: {leading_signals['stance']}")
    print(f"🛡️ Điểm rủi ro vĩ mô: {risk_info['riskScore']}/100 ({risk_info['riskBucket']})")
    print(f"💾 File lưu tại: {MACRO_FILE}\n")


if __name__ == "__main__":
    fetch_and_save_macro()
