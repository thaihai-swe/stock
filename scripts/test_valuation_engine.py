#!/usr/bin/env python3
"""
scripts/test_valuation_engine.py
Bộ kiểm thử đơn vị (Unit Tests) toàn diện cho Enterprise Stock Valuation Engine
(scripts/lib/valuation_engine.py).
"""

import sys
import math
from pathlib import Path

# Cấu hình đường dẫn import
CURRENT_DIR = Path(__file__).resolve().parent
ROOT_DIR = CURRENT_DIR.parent
sys.path.insert(0, str(CURRENT_DIR))

from lib.valuation_engine import (
    calc_graham,
    calc_ddm,
    calc_pe_target,
    calc_pb_target,
    calc_gordon_pb,
    calc_multi_stage_dcf,
    calc_fcfe,
    calc_rim_eva,
    calc_book_nav_target,
    calc_advanced_multiples,
    calc_implied_fcf_yield,
    calc_ev_ebitda,
    calc_pcf,
    calc_ps_target,
    calc_consensus_fair_value,
    get_method_suitability,
    filter_outliers_and_consensus,
    detect_valuation_traps,
    calc_7_price_zones,
    calc_3_layer_decision,
    calc_historical_valuation_bands,
    calc_dividend_sustainability,
    compute_finval_lab_snapshot,
    calc_dupont,
    calc_tech_score,
    calc_fcf,
    calc_cagr,
    StockValuationEngine
)


def test_calc_graham():
    # 1. Trường hợp mặc định không truyền multiples (Hệ số trần 22.5 legacy)
    val_default = calc_graham(2750, 15344)
    expected_default = round(math.sqrt(22.5 * 2750 * 15344))
    assert val_default == expected_default, f"Graham thất bại: {val_default} != {expected_default}"
    assert val_default == 30812, f"Graham HPG mặc định phải bằng 30812, ra {val_default}"

    # 2. Trường hợp thích ứng động (Dynamic Multiplier < 22.5, ví dụ HPG pe=12.0, pb=1.45)
    val_dyn = calc_graham(2750, 15344, pe_avg=12.0, pb_avg=1.45)
    expected_dyn = round(math.sqrt(17.40 * 2750 * 15344))
    assert val_dyn == expected_dyn == 27096, f"Graham động thất bại: {val_dyn} != 27096"

    # 3. Trường hợp Bảng tính BENJAMIN 1 (Chuẩn tham số tĩnh): EPS=2750, pe_base=7.0, hs=1.0, g=5.0, constant=4.4, y=5.0
    # V = 2750 * (7.0 + 1.0 * 5.0) * (4.4 / 5.0) = 2750 * 12.0 * 0.88 = 29040
    val_b1 = calc_graham(eps=2750, pe_base=7.0, hs=1.0, g=5.0, constant=4.4, y=5.0)
    assert val_b1 == 29040, f"Graham BENJAMIN 1 chuẩn phải bằng 29040, ra {val_b1}"

    # 4. Trường hợp Graham Dynamic 100% Dữ Liệu Thật HPG (pe_median=6.8 < 7.0):
    # EPS=2750, pe_median=6.8, hs=1.0, cagr_ni=5.8%, vn10y=4.47% -> Hằng số=4.47, y=5.0 -> Tỷ số LS=0.894
    # V = 2750 * (6.8 + 1.0 * 5.8) * (4.47 / 5.0) = 2750 * 12.6 * 0.894 = 30977
    val_real_hpg = calc_graham(eps=2750, pe_median=6.8, hs=1.0, cagr_ni=5.8, vn10y=4.47)
    assert val_real_hpg == 30977, f"Graham Dynamic HPG phải bằng 30977, ra {val_real_hpg}"

    # 5. Trường hợp FPT tăng trưởng cao: EPS=4500, pe_median=15.0 -> pe_base=7.0 (trần an toàn Graham), hs=1.0, cagr_ni=18.2% -> g=12.0%, vn10y=4.47%
    # Bội số = 7.0 + 1.0 * 12.0 = 19.0, Tỷ số LS = 4.47 / 5.0 = 0.894
    # V = 4500 * 19.0 * 0.894 = 76437
    val_real_fpt = calc_graham(eps=4500, pe_median=15.0, hs=1.0, cagr_ni=18.2, vn10y=4.47)
    assert val_real_fpt == 76437, f"Graham Dynamic FPT phải bằng 76437, ra {val_real_fpt}"

    # 5b. Trường hợp HPG chu kỳ chuẩn hóa g=5.0%: EPS=2750, pe_median=13.84 -> pe_base=7.0, g=5.0%, vn10y=4.47%
    # Bội số = 7.0 + 1.0 * 5.0 = 12.0, Tỷ số LS = 4.47 / 5.0 = 0.894
    # V = 2750 * 12.0 * 0.894 = 29502
    val_hpg_cycle = calc_graham(eps=2750, pe_median=13.84, hs=1.0, g=5.0, vn10y=4.47)
    assert val_hpg_cycle == 29502, f"Graham HPG chu kỳ phải bằng 29502, ra {val_hpg_cycle}"

    # 6. Trường hợp biên âm hoặc bằng 0
    assert calc_graham(-1000, 15000) is None, "EPS âm phải trả về None"
    assert calc_graham(0, 15000) is None, "EPS = 0 phải trả về None"
    assert calc_graham(None, 15000) is None, "None phải trả về None"
    print("✅ test_calc_graham: PASS")


def test_calc_ddm():
    # 1. Doanh nghiệp trả cổ tức (DPS = 455, r = 0.115, g = 0.035)
    val = calc_ddm(455, r=0.115, g=0.035)
    expected = round((455 * 1.035) / 0.08)
    assert val == expected, f"DDM thất bại: {val} != {expected}"
    assert val == 5887, f"DDM phải bằng 5887, ra {val}"

    # 2. Không trả cổ tức hoặc r <= g
    assert calc_ddm(0) is None, "DPS = 0 phải trả về None"
    assert calc_ddm(-500) is None, "DPS âm phải trả về None"
    assert calc_ddm(1000, r=0.03, g=0.04) is None, "r <= g phải trả về None"
    assert calc_ddm(None) is None, "None phải trả về None"
    print("✅ test_calc_ddm: PASS")


def test_calc_pe_target():
    assert calc_pe_target(2750, 11.5) == 31625, "Target PE phải bằng 31625"
    assert calc_pe_target(-500, 11.5) is None, "EPS âm phải trả về None"
    assert calc_pe_target(0, 11.5) is None, "EPS = 0 phải trả về None"
    assert calc_pe_target(None, 11.5) is None, "None phải trả về None"
    print("✅ test_calc_pe_target: PASS")


def test_calc_pb_target():
    assert calc_pb_target(15344, 1.35) == 20714, "Target PB phải bằng 20714"
    assert calc_pb_target(-1000, 1.35) is None, "BVPS âm phải trả về None"
    assert calc_pb_target(0, 1.35) is None, "BVPS = 0 phải trả về None"
    print("✅ test_calc_pb_target: PASS")


def test_calc_ev_ebitda():
    # EBITDA = 35000, NetDebt = 15000, Shares = 1000, Multiple = 7.5
    # Fair EV = 35000 * 7.5 = 262500
    # Fair Market Cap = 262500 - 15000 = 247500
    # Fair Price = 247500 / 1000 = 247.5 -> 248
    val = calc_ev_ebitda(35000, 15000, 1000, 7.5)
    assert val == 248, f"EV/EBITDA thất bại: {val}"

    # Doanh nghiệp nợ vượt quá giá trị (Fair Market Cap <= 0)
    assert calc_ev_ebitda(1000, 20000, 1000, 7.5) is None, "Nợ quá cao phải trả về None"
    assert calc_ev_ebitda(-500, 0, 1000) is None, "EBITDA âm phải trả về None"
    assert calc_ev_ebitda(1000, 0, 0) is None, "Shares = 0 phải trả về None"
    print("✅ test_calc_ev_ebitda: PASS")


def test_calc_pcf():
    assert calc_pcf(25000, 1000, 8.0) == 200, "PCF phải bằng 200"
    assert calc_pcf(-1000, 1000) is None, "CFO âm phải trả về None"
    assert calc_pcf(0, 1000) is None, "CFO = 0 phải trả về None"
    print("✅ test_calc_pcf: PASS")


def test_calc_ps_target():
    assert calc_ps_target(100000, 1000, 1.1) == 110, "Target PS phải bằng 110"
    assert calc_ps_target(-5000, 1000) is None, "Doanh thu âm phải trả về None"
    print("✅ test_calc_ps_target: PASS")


def test_calc_consensus_fair_value():
    # Candidates: [30812, 5887, 31625, 20714, 20776], close = 20100
    candidates = [30812, 5887, 31625, 20714, 20776]
    res = calc_consensus_fair_value(candidates, 20100)
    expected_fair = round(sum(candidates) / len(candidates)) # 21963
    assert res["fairValue"] == expected_fair, f"Fair value sai: {res['fairValue']} != {expected_fair}"
    assert res["validModelsCount"] == 5, "Số lượng mô hình hợp lệ phải là 5"
    assert res["marginOfSafety"] == 8.5, f"Biên an toàn sai: {res['marginOfSafety']}"
    assert res["upside"] == 9.3, f"Upside sai: {res['upside']}"
    assert res["diffPercent"] == 9.3, f"DiffPercent sai: {res['diffPercent']}"
    assert res["rating"] == "ATTRACTIVE", "Rating 8.5% phải là ATTRACTIVE"
    assert "bg-green-100" in res["ratingBadge"], "Badge phải có màu xanh ATTRACTIVE"

    # Danh sách rỗng
    empty_res = calc_consensus_fair_value([], 20100)
    assert empty_res["fairValue"] is None
    assert empty_res["upside"] is None
    assert empty_res["rating"] == "NEUTRAL"
    print("✅ test_calc_consensus_fair_value: PASS")


def test_calc_dupont():
    res = calc_dupont(
        net_income=3500,
        revenue=25000,
        total_assets=100000,
        equity=50000,
        roe=17.5
    )
    assert res["roe"] == 17.5
    assert res["netProfitMargin"] == 14.0
    assert res["assetTurnover"] == 0.25
    assert res["equityMultiplier"] == 2.0
    assert "Chất lượng cao" in res["qualityAssessment"]
    print("✅ test_calc_dupont: PASS")


def test_calc_tech_score():
    # Đáy 52 tuần + khuyến nghị tích cực
    res = calc_tech_score(
        close=20000,
        high_52=30000,
        low_52=19000,
        rec_score=0.4,
        beta=1.1
    )
    assert res["techScore"] == 3, f"Tech score phải kịch trần 3, ra {res['techScore']}"
    assert "Bullish" in res["techScoreVerdict"]

    # Đỉnh 52 tuần + khuyến nghị tiêu cực
    res_bear = calc_tech_score(
        close=29500,
        high_52=30000,
        low_52=19000,
        rec_score=-0.4,
        beta=1.8
    )
    assert res_bear["techScore"] == -3, f"Tech score phải kịch sàn -3, ra {res_bear['techScore']}"
    assert "Bearish" in res_bear["techScoreVerdict"]
    print("✅ test_calc_tech_score: PASS")


def test_stock_valuation_engine_evaluate():
    engine = StockValuationEngine()
    stock_payload = {
        "symbol": "HPG",
        "close": 20100.0,
        "eps": 2750,
        "pb": 1.31,
        "dps": 455,
        "revenue": 140000000000000,
        "netIncome": 17000000000000,
        "totalAssets": 200000000000000,
        "totalDebt": 98000000000000,
        "ebitda": 28000000000000,
        "cfo": None,
        "shares": 5814785700,
        "high52w": 30500,
        "low52w": 19500,
        "recommendScore": 0.25,
        "beta": 1.15
    }

    eval_result = engine.evaluate(stock_payload)
    assert eval_result["grahamNumber"] is not None
    assert eval_result["grahamDiffPercent"] is not None
    assert eval_result["ddmTarget"] == 6523
    assert eval_result["sectorWacc"] == 10.72
    assert eval_result["ddmDiffPercent"] is not None
    assert eval_result["peTarget"] == 31625
    assert eval_result["peDiffPercent"] == 57.3 # (31625 - 20100) / 20100 * 100 = 57.34%
    assert eval_result["pbTarget"] is not None
    assert eval_result["pbDiffPercent"] is not None
    assert eval_result["fairValue"] is not None
    assert eval_result["marginOfSafety"] is not None
    assert eval_result["upside"] is not None
    assert eval_result["consensusDiffPercent"] is not None
    assert eval_result["valuationRating"] is not None
    assert eval_result["dupont"]["equityMultiplier"] is not None
    assert eval_result["technicals"]["techScore"] is not None
    # Xác thực chuẩn 10 mô hình định lượng và không có fallback ngầm
    assert len(eval_result["models10"]) == 10, f"Phải có đúng 10 mô hình, thực tế: {len(eval_result['models10'])}"
    assert eval_result["validModelsCount"] >= 3, f"Số mô hình hợp lệ phải >= 3, ra {eval_result['validModelsCount']}"

    # Kiểm tra trường hợp thiếu toàn bộ dữ liệu: fairValue phải là None, không fallback về 6 mô hình cũ
    empty_res = engine.evaluate({"symbol": "EMPTY", "close": 10000.0})
    assert empty_res["fairValue"] is None, "Khi thiếu dữ liệu, fairValue phải là None và tuyệt đối không fallback về 6 mô hình cũ"
    assert empty_res["models10"] is not None and len(empty_res["models10"]) == 10

    print("✅ test_stock_valuation_engine_evaluate: PASS")


def test_calc_extended_dupont():
    from lib.financial_analytics_engine import calculate_extended_dupont
    mock_q = {
        "netIncome": 3200,
        "netIncomeParent": 3200,
        "profitBeforeTax": 4000,
        "interestExpense": 800,
        "operatingProfit": 4800,
        "revenue": 30000,
        "totalAssets": 120000,
        "equity": 60000,
        "roe": 12.8
    }
    dupont = calculate_extended_dupont(mock_q)
    assert dupont["taxBurden"] == 0.8
    assert dupont["interestBurden"] == 0.833
    assert dupont["operatingMargin"] == 16.0
    assert dupont["assetTurnover"] == 1.0
    assert dupont["financialLeverage"] == 2.0
    assert len(dupont["components"]) == 5
    assert "qualityAssessment" in dupont
    print("✅ test_calc_extended_dupont: PASS")


def test_calc_overall_health_score():
    from lib.financial_analytics_engine import calculate_overall_health_score
    mock_ratios = {
        "profitability": {"roe": 18.5, "roa": 9.2, "netMargin": 12.0},
        "efficiency": {"assetTurnover": 1.1, "inventoryTurnover": 7.5},
        "leverage": {"debtToEquity": 0.45},
        "liquidity": {"interestCoverage": 6.5, "currentRatio": 2.2, "quickRatio": 1.6}
    }
    health = calculate_overall_health_score(mock_ratios)
    assert 0 <= health["overallScore"] <= 100
    assert health["gradeEn"] in ["excellent", "good", "fair", "weak", "critical"]
    assert "pillars" in health
    assert len(health["pillars"]) == 4
    assert health["overallScore"] >= 75.0
    print("✅ test_calc_overall_health_score: PASS")


def test_calc_early_warning():
    from lib.financial_analytics_engine import calculate_early_warning
    # Trường hợp lành mạnh
    healthy_quarters = [
        {"revenue": 10000, "equity": 20000, "totalDebt": 5000, "shortTermAssets": 8000, "shortTermDebt": 3000, "cfo": 1200, "netIncome": 1000, "cfoToNetIncome": 1.2, "netMargin": 10},
        {"revenue": 11000, "equity": 21000, "totalDebt": 5200, "shortTermAssets": 8500, "shortTermDebt": 3100, "cfo": 1400, "netIncome": 1150, "cfoToNetIncome": 1.2, "netMargin": 10.5},
        {"revenue": 12000, "equity": 22000, "totalDebt": 5400, "shortTermAssets": 9000, "shortTermDebt": 3200, "cfo": 1600, "netIncome": 1300, "cfoToNetIncome": 1.2, "netMargin": 11.0}
    ]
    ratios = {
        "leverage": {"debtToEquity": 0.25},
        "liquidity": {"currentRatio": 2.8}
    }
    ew_healthy = calculate_early_warning(healthy_quarters, ratios, altman_z=3.5, piotroski_f=8)
    assert ew_healthy["riskScore"] <= 25.0
    assert ew_healthy["riskLevelEn"] == "low"
    assert len(ew_healthy["positiveSignals"]) > 0

    # Trường hợp rủi ro cao (nợ tăng, thanh khoản kiệt quệ, Altman Z thấp)
    distressed_quarters = [
        {"revenue": 10000, "equity": 20000, "totalDebt": 15000, "shortTermAssets": 5000, "shortTermDebt": 6000, "cfo": -500, "netIncome": 300, "cfoToNetIncome": -1.6, "netMargin": 3},
        {"revenue": 9500, "equity": 18000, "totalDebt": 22000, "shortTermAssets": 4500, "shortTermDebt": 6500, "cfo": -800, "netIncome": 200, "cfoToNetIncome": -4.0, "netMargin": 2},
        {"revenue": 9000, "equity": 16000, "totalDebt": 32000, "shortTermAssets": 4000, "shortTermDebt": 7000, "cfo": -1200, "netIncome": 100, "cfoToNetIncome": -12.0, "netMargin": 1}
    ]
    ew_distressed = calculate_early_warning(distressed_quarters, {"leverage": {"debtToEquity": 2.0}, "liquidity": {"currentRatio": 0.6}}, altman_z=1.2, piotroski_f=2)
    assert ew_distressed["riskScore"] > 50.0
    assert ew_distressed["alertsCount"] >= 2
    print("✅ test_calc_early_warning: PASS")


def test_compute_industry_metrics():
    from lib.industry_metrics import compute_industry_metrics
    dummy_q = {"revenue": 40000, "totalAssets": 150000, "equity": 80000, "costOfGoodsSold": 32000, "capex": -4000, "depreciation": 2500}
    dummy_ratios = {"efficiency": {"dso": 50, "dio": 100, "dpo": 40}, "profitability": {"grossMargin": 20.0}}

    # 1. Ngân hàng
    bank_res = compute_industry_metrics("VCB", dummy_q, dummy_ratios, "Ngân hàng Ngoại Thương", "Ngân hàng")
    assert bank_res["category"] == "BANKING"
    assert any(m["id"] == "nim" for m in bank_res["metrics"])
    assert any(m["id"] == "npl" for m in bank_res["metrics"])

    # 2. Bất động sản
    re_res = compute_industry_metrics("VHM", dummy_q, dummy_ratios, "Vinhomes", "Bất động sản")
    assert re_res["category"] == "REAL_ESTATE"
    assert any(m["id"] == "inv_to_assets" for m in re_res["metrics"])

    # 3. Sản xuất
    mfg_res = compute_industry_metrics("HPG", dummy_q, dummy_ratios, "Hòa Phát", "Thép")
    assert mfg_res["category"] == "MANUFACTURING"
    assert any(m["id"] == "ccc" for m in mfg_res["metrics"])
    print("✅ test_compute_industry_metrics: PASS")


def test_calc_dcf_fcff():
    from lib.valuation_engine import calc_dcf_fcff, get_sector_wacc
    # 1. Trường hợp bình thường (HPG: FCF=10481 tỷ, NetDebt=37685 tỷ, Shares=5.8 tỷ CP, WACC=10.5%)
    res = calc_dcf_fcff(
        base_fcff=10481 * 1_000_000_000,
        wacc=0.105,
        terminal_g=0.03,
        net_debt=37685 * 1_000_000_000,
        shares=5_800_000_000
    )
    assert res["status"] == "SUCCESS"
    assert res["basePrice"] is not None and res["basePrice"] > 0
    assert res["bullPrice"] is not None and res["bullPrice"] > res["basePrice"]
    assert res["bearPrice"] is not None and res["bearPrice"] < res["basePrice"]

    # 2. Sanity Check FCF âm (Học từ LC-005)
    neg_res = calc_dcf_fcff(
        base_fcff=-5000 * 1_000_000_000,
        wacc=0.105,
        terminal_g=0.03,
        net_debt=10000 * 1_000_000_000,
        shares=1_000_000_000
    )
    assert neg_res["status"] == "NEGATIVE_FCF"
    assert neg_res["basePrice"] is None
    assert "âm" in neg_res["note"]
    print("✅ test_calc_dcf_fcff: PASS")


def test_calc_reverse_dcf():
    from lib.valuation_engine import calc_reverse_dcf
    # EV = 150.000 tỷ, FCF = 10.000 tỷ, WACC = 10.5%
    implied_g = calc_reverse_dcf(
        current_ev=150_000 * 1_000_000_000,
        base_fcff=10_000 * 1_000_000_000,
        wacc=0.105,
        terminal_g=0.03
    )
    assert implied_g is not None
    assert -20.0 < implied_g < 30.0, f"Implied g phải trong khoảng hợp lý: {implied_g}"
    print("✅ test_calc_reverse_dcf: PASS")


def test_calc_dcf_sensitivity_matrix():
    from lib.valuation_engine import calc_dcf_sensitivity_matrix
    mat_res = calc_dcf_sensitivity_matrix(
        base_fcff=10_000 * 1_000_000_000,
        net_debt=20_000 * 1_000_000_000,
        shares=5_000_000_000,
        wacc_list=[0.10, 0.105, 0.11, 0.12],
        g_list=[0.02, 0.03, 0.04]
    )
    assert len(mat_res["waccList"]) == 4
    assert len(mat_res["gList"]) == 3
    assert len(mat_res["matrix"]) == 4
    assert len(mat_res["matrix"][0]) == 3
    # Kiểm tra tính chất: WACC thấp hơn -> Định giá cao hơn
    assert mat_res["matrix"][0][1] > mat_res["matrix"][3][1]
    print("✅ test_calc_dcf_sensitivity_matrix: PASS")


def test_market_profile_engine():
    from lib.market_profile_engine import compute_full_market_profile
    dummy_candles = []
    for i in range(50):
        dummy_candles.append({
            "date": f"2026-05-{i+1:02d}",
            "open": 25000 + i * 50,
            "high": 25500 + i * 50,
            "low": 24800 + i * 50,
            "close": 25200 + i * 50,
            "volume": 2000000 + (i % 5) * 300000
        })
    mp = compute_full_market_profile("HPG", dummy_candles, {"technical": {"beta": 1.2}})
    assert len(mp["volumeAtPrice"]["buckets"]) == 10
    assert mp["volumeAtPrice"]["poc"] is not None
    assert mp["moneyFlow"]["vpci"] > 0
    assert mp["tailRisk"]["var95"] > 0
    assert mp["archetype"]["archetype"] in ["TREND_FOLLOWING", "ACCUMULATION_BREAKOUT", "RANGE_BOUND_CYCLICAL", "TRAP_PRONE"]
    print("✅ test_market_profile_engine: PASS")


def test_news_sentiment_engine():
    from lib.news_sentiment_engine import classify_news_category, calculate_news_sentiment_score, build_news_digest_doc
    # 1. Phân loại danh mục
    assert classify_news_category("Doanh thu quý 1 tăng trưởng kỷ lục") == "biz"
    assert classify_news_category("Đại hội cổ đông chi trả cổ tức 15% tiền mặt") == "disclosure"
    assert classify_news_category("Ngân hàng Nhà nước hạ trần lãi suất huy động") == "macro"
    assert classify_news_category("Chứng khoán SSI khuyến nghị MUA giá mục tiêu 32.000 đ") == "analyst"

    # 2. News Digest Build
    news_doc = build_news_digest_doc("HPG")
    assert len(news_doc["items"]) >= 3
    assert -100.0 <= news_doc["sentiment"]["score"] <= 100.0
    assert news_doc["tldr"]["summary"] is not None
    assert len(news_doc["tldr"]["metricBoxes"]) == 4
    print("✅ test_news_sentiment_engine: PASS")


def test_yield_curve_monitor():
    from lib.yield_curve_monitor import compute_yield_curve_monitor

    mock_macro = {
        "sbvRefinancingRate": 4.5,
        "interbankRate": 6.47,
        "cpiYoY": 5.08,
        "vn02y": 2.45,
        "vn05y": 3.20,
        "vn10y": 3.45,
        "usd": 25881.0,
        "pe": 13.8,
        "usPolicy": 4.85,
        "us02y": 4.65,
        "us05y": 5.02,
        "us10y": 5.24,
        "usCpi": 2.9
    }

    res = compute_yield_curve_monitor(mock_macro)
    assert len(res["rows"]) == 17, f"Phải có 17 dòng, nhận được {len(res['rows'])}"
    assert res["summary"]["vnCurvature"] is not None
    assert res["summary"]["vnYcCode"] in ["YC0", "YC1", "YC2", "YC3", "YC4"]
    assert "links" in res
    assert "linkA" in res["links"]
    assert "linkB" in res["links"]
    assert "linkC" in res["links"]
    assert "assetDecision" in res["summary"]
    print("✅ test_yield_curve_monitor: PASS")


def test_beneish_m_score():
    from lib.financial_analytics_engine import calculate_beneish_m_score

    mock_yearly = [
        {
            "year": 2024, "revenue": 100000, "costOfGoodsSold": 80000, "accountsReceivable": 20000,
            "totalAssets": 150000, "shortTermAssets": 80000, "fixedAssets": 50000,
            "shortTermInvestments": 5000, "depreciation": 4000, "sellingExpense": 2000,
            "adminExpense": 2000, "totalDebt": 50000, "netIncomeParent": 10000, "cfo": 12000
        },
        {
            "year": 2025, "revenue": 120000, "costOfGoodsSold": 93000, "accountsReceivable": 22000,
            "totalAssets": 170000, "shortTermAssets": 90000, "fixedAssets": 58000,
            "shortTermInvestments": 6000, "depreciation": 4800, "sellingExpense": 2200,
            "adminExpense": 2400, "totalDebt": 55000, "netIncomeParent": 13000, "cfo": 16000
        }
    ]

    res = calculate_beneish_m_score(quarterly_data=[], yearly_data=mock_yearly)
    assert res["mScore"] is not None
    assert len(res["indices"]) == 8, f"Phải có 8 chỉ số con Beneish, nhận được {len(res['indices'])}"
    assert res["status"] in ["SAFE", "GREY", "ALERT"]
    assert res["mScore"] < -1.78, "Doanh nghiệp minh bạch phải có M-Score < -1.78"
    print("✅ test_beneish_m_score: PASS")


def test_magic_formula():
    from lib.financial_analytics_engine import calculate_magic_formula

    mock_quarter = {
        "close": 28000, "operatingProfit": 4000, "totalDebt": 30000,
        "cashAndEquivalents": 15000, "shortTermInvestments": 5000,
        "shortTermAssets": 60000, "shortTermDebt": 18000, "fixedAssets": 45000, "equity": 75000
    }
    mock_stock = {
        "close": 28000,
        "scale": {"sharesOutstanding": 4_000_000_000, "marketCap": 112_000_000_000_000}
    }

    res = calculate_magic_formula(mock_quarter, mock_stock)
    assert res["earningsYield"] > 0
    assert res["roic"] > 0
    assert 0 <= res["compositeScore"] <= 100
    assert res["tier"] in ["TOP_TIER", "QUALITY_GROWTH", "VALUE_PLAY", "UNDERPERFORM"]
    print("✅ test_magic_formula: PASS")


def test_fcf_inflection_point():
    from lib.financial_analytics_engine import analyze_fcf_inflection_point

    mock_quarters = [
        {"period": "2024-Q1", "cfo": 3000, "capex": -2000, "revenue": 30000, "netIncome": 2500, "totalAssets": 150000, "constructionInProgress": 25000},
        {"period": "2024-Q2", "cfo": 3200, "capex": -2500, "revenue": 32000, "netIncome": 2600, "totalAssets": 155000, "constructionInProgress": 28000},
        {"period": "2024-Q3", "cfo": 3500, "capex": -3000, "revenue": 34000, "netIncome": 2800, "totalAssets": 160000, "constructionInProgress": 32000},
        {"period": "2024-Q4", "cfo": 4200, "capex": -5000, "revenue": 38000, "netIncome": 3000, "totalAssets": 170000, "constructionInProgress": 40000}
    ]

    res = analyze_fcf_inflection_point(mock_quarters)
    assert res["cfoToNiRatio"] >= 1.0, "CFO/NI phải >= 1.0"
    assert res["signal"] in ["EXPANSION_CAPEX_INFLECTION", "CASH_COW_GENERATION", "REINVESTMENT_GROWTH", "CASH_DRAIN_ALERT"]
    assert res["accrualsRatio"] is not None
    assert res["accrualsRating"] is not None
    print("✅ test_fcf_inflection_point: PASS")


def test_calc_gordon_pb():
    # BVPS = 18000, ROE = 19.5%, CoE = 11.5%, g = 3.0%
    # PB_fair = (0.195 - 0.03) / (0.115 - 0.03) = 0.165 / 0.085 = 1.941
    # Fair Price = 18000 * 1.941 = 34941
    val = calc_gordon_pb(18000, 19.5, coe=0.115, terminal_g=0.03)
    assert val is not None and val > 18000, f"Gordon P/B ngân hàng sinh lời cao phải lớn hơn BVPS: {val}"
    assert val == 34941, f"Gordon P/B phải ra 34941, ra {val}"
    # Trường hợp ROE thấp hơn g
    assert calc_gordon_pb(15000, 2.0, coe=0.115, terminal_g=0.03) is not None
    print("✅ test_calc_gordon_pb: PASS")


def test_calc_multi_stage_dcf():
    # FCF = 5000 tỷ, 1000 triệu CP, CoE = 11.5%, g1 = 8.0%, g_term = 3.0%
    val = calc_multi_stage_dcf(5000, 1000, coe=0.115, g1=0.08, stage1_years=3, stage2_years=2, terminal_g=0.03)
    assert val is not None and val > 0, "Multi-stage DCF phải trả về giá trị dương"
    assert calc_multi_stage_dcf(-100, 1000) is None, "FCF âm phải trả về None"
    print("✅ test_calc_multi_stage_dcf: PASS")


def test_calc_fcfe():
    # CFO = 4000, CapEx = 1500, Borrowing = 500 -> FCFE = 3000
    val = calc_fcfe(4000, 1500, 500, 1000, coe=0.115, g=0.04, terminal_g=0.03)
    assert val is not None and val > 0, "FCFE phải trả về giá trị dương"
    assert calc_fcfe(1000, 3000, 0, 1000) is None, "FCFE âm phải trả về None"
    print("✅ test_calc_fcfe: PASS")


def test_calc_rim_eva():
    # Equity = 100000, ROE = 18.0%, Shares = 1000, CoE = 11.5% (Tạo giá trị thặng dư > BVPS)
    val = calc_rim_eva(100000, 18.0, 1000, coe=0.115, forecast_years=5, terminal_g=0.03)
    bvps = 100000 / 1000 # 100
    assert val is not None and val > bvps, f"RIM khi ROE > CoE phải lớn hơn BVPS: {val} > {bvps}"
    print("✅ test_calc_rim_eva: PASS")


def test_calc_book_nav_target():
    # BVPS = 25000, Target PB = 1.2 => 30000
    val = calc_book_nav_target(25000, 1.2)
    assert val == 30000, f"Expected 30000, got {val}"

    # Fallback to pure Book NAV if pb is None: BVPS = 25000 => 25000
    val_pure = calc_book_nav_target(25000, None)
    assert val_pure == 25000, f"Expected 25000, got {val_pure}"

    # Calculate from equity and shares if BVPS missing: Equity = 50e9, Shares = 2e6 => 25000
    val_eq = calc_book_nav_target(None, 1.0, shares=2_000_000, equity=50_000_000_000)
    assert val_eq == 25000, f"Expected 25000, got {val_eq}"

    # Negative BVPS returns None
    assert calc_book_nav_target(-100, 1.2) is None
    print("✅ test_calc_book_nav_target: PASS")


def test_calc_advanced_multiples():
    # EBITDA = 8000, Revenue = 50000, NetDebt = 5000, Shares = 1000
    val = calc_advanced_multiples(8000, 50000, 5000, 1000, target_ev_ebitda=7.5, target_ev_sales=1.1)
    assert val is not None and val > 0, "Advanced Multiples phải tính ra giá trị dương"
    print("✅ test_calc_advanced_multiples: PASS")


def test_sector_weights_and_outlier_filtering():
    # 1. Kiểm tra ma trận phù hợp: Ngân hàng phải tắt DCF / FCFF / EV-EBITDA
    suit_dcf, note_dcf = get_method_suitability("DCF", "Ngân Hàng", 1000)
    assert suit_dcf == 0.0 and "N/A ngành TC" in note_dcf
    suit_pb, note_pb = get_method_suitability("PB", "Ngân Hàng", 1000)
    assert suit_pb == 1.0

    # 2. Kiểm tra bộ lọc ngoại lai ±60%
    models = [
        {"id": "m1", "name": "Mô hình 1", "value": 24000, "weight": 0.25},
        {"id": "m2", "name": "Mô hình 2", "value": 25000, "weight": 0.25},
        {"id": "m3", "name": "Mô hình 3", "value": 26000, "weight": 0.25},
        {"id": "m4", "name": "Mô hình ngoại lai", "value": 90000, "weight": 0.25} # Lệch > 60% so với median ~25500
    ]
    res = filter_outliers_and_consensus(models, close=22000)
    assert res["modelsUsed"] == 3, f"Phải loại bỏ 1 mô hình ngoại lai, còn 3: {res['modelsUsed']}"
    assert "m4" in res["excludedOutliers"] or "Mô hình ngoại lai" in res["excludedOutliers"]
    assert 24000 <= res["fairValue"] <= 26000, f"Consensus sau khi lọc phải nằm trong dải chuẩn: {res['fairValue']}"
    print("✅ test_sector_weights_and_outlier_filtering: PASS")


def test_detect_valuation_traps():
    # 1. Kiểm tra phát hiện Value Trap & Cyclical Peak
    res_trap = detect_valuation_traps(
        pe=6.0, # Rất thấp
        pb=0.8, # Rất thấp
        roe=8.0,
        coe_pct=11.5, # ROE < CoE -> Book trap
        fcf=-1000, # FCF âm -> Cyclical peak & debt stress
        de=2.2, # Đòn bẩy cao
        rev_cagr=-5.0, # Tăng trưởng âm -> Value trap
        eps_cagr=-8.0,
        dps=500, # Có cổ tức nhưng FCF âm -> Dividend trap
        sector="Thép"
    )
    assert res_trap["trapLabel"] == "CAO", f"Rủi ro tổng hợp cao phải gán nhãn CAO: {res_trap['trapLabel']}"
    assert res_trap["isCapPenalized"] is True, "Bẫy CAO phải kích hoạt phạt trần điểm"
    assert len(res_trap["trapsList"]) == 7, "Phải kiểm tra đủ 7 bẫy"

    # 2. Doanh nghiệp lành mạnh không có bẫy
    res_clean = detect_valuation_traps(
        pe=12.0, pb=1.8, roe=20.0, coe_pct=11.5, fcf=5000, de=0.4,
        rev_cagr=15.0, eps_cagr=18.0, dps=1000, sector="Công Nghệ & Viễn Thông"
    )
    assert res_clean["trapLabel"] == "THẤP"
    assert res_clean["isCapPenalized"] is False
    print("✅ test_detect_valuation_traps: PASS")


def test_calc_7_price_zones_and_3_layer_decision():
    # 1. 7 Vùng Giá
    zones = calc_7_price_zones(
        close=18000,
        consensus_fv=25000,
        safe_buy=20000,
        buy_price_base=22000
    )
    assert zones["currentZone"] in ["Deep Value", "Buy Zone"]
    assert zones["boundaries"]["deepValue"] < zones["boundaries"]["safeBuy"]

    # 2. Khung Quyết Định 3 Tầng Gated
    dec = calc_3_layer_decision(
        close=18000,
        consensus_fv=25000,
        margin_of_safety=28.0,
        risk_adjusted_mos=20.0,
        models_used=5,
        coverage_pct=80.0,
        confidence_score=75.0,
        dispersion_pct=12.0,
        trap_label="THẤP",
        roe=18.0,
        coe_pct=11.5,
        cfo=4000,
        net_income=3000,
        altman_z=3.2,
        tech_score=2
    )
    assert dec["isGateOpen"] is True
    assert "STRONG BUY" in dec["buyRecommendation"] or "BUY" in dec["buyRecommendation"]
    assert dec["roeCoeSpread"] == 6.5
    print("✅ test_calc_7_price_zones_and_3_layer_decision: PASS")


def test_historical_bands_and_dividend_sustainability():
    # 1. Dải băng P25-P75
    bands = calc_historical_valuation_bands(
        close=21000,
        eps=2500,
        bvps=16000,
        pe_history=[8.0, 10.0, 12.0, 15.0, 18.0],
        pb_history=[1.0, 1.2, 1.4, 1.8, 2.2]
    )
    assert bands["band25"] is not None and bands["band75"] is not None
    assert bands["band25"] < bands["band50"] < bands["band75"]
    assert "P25" in bands["bandPosition"] or "P50" in bands["bandPosition"]

    # 2. Độ an toàn cổ tức
    div = calc_dividend_sustainability(
        dps=1000,
        eps=2500, # Payout = 40% < 70% -> tốt
        fcf=2_500_000, # 2.5 triệu vs tổng cổ tức 1.0 triệu -> fcf_payout = 40% < 80%
        shares=1000,
        dps_history=[1000, 1000, 1000, 1000] # Consistency 100%
    )
    assert div["score"] >= 4.0
    assert "Rất an toàn" in div["status"]
    print("✅ test_historical_bands_and_dividend_sustainability: PASS")


def test_method_suitability_normalization():
    # Kiểm tra chuẩn hóa tên phương pháp: EV/EBITDA vs EVEBITDA vs evebitda
    mult1, note1 = get_method_suitability("EVEBITDA", "Ngân Hàng")
    mult2, note2 = get_method_suitability("EV/EBITDA", "Ngân Hàng")
    mult3, note3 = get_method_suitability("evebitda", "Ngân Hàng")
    assert mult1 == mult2 == mult3 == 0.0, f"EV/EBITDA cho Ngân Hàng phải bằng 0.0, ra {mult1}, {mult2}, {mult3}"
    assert "N/A ngành TC" in note1

    # Graham cho Ngân Hàng
    g_mult, g_note = get_method_suitability("graham", "Ngân Hàng")
    assert g_mult == 0.35, f"Graham cho Ngân Hàng phải có trọng số 0.35, ra {g_mult}"
    assert "Ít phù hợp NH/CK" in g_note

    # DDM khi dps = 0
    d_mult, d_note = get_method_suitability("DDM", "Bất động sản", dps=0)
    assert d_mult == 0.0, f"DDM dps=0 phải có trọng số 0.0, ra {d_mult}"
    assert "Không có DPS" in d_note
    print("✅ test_method_suitability_normalization: PASS")


def test_bvps_hierarchy_and_accounting_integrity():
    engine = StockValuationEngine()

    # Case 1: Equity tính bằng Tỷ đồng (< 100M), shares = 100M
    res1 = engine.evaluate({
        "close": 30000,
        "equity": 5000, # 5,000 Tỷ VNĐ
        "shares": 100_000_000
    })
    # BVPS = 5,000 * 1e9 / 100M = 50,000
    assert res1["bvps"] == 50_000, f"BVPS Case 1 mong đợi 50,000, ra {res1['bvps']}"

    # Case 2: Equity đã là VNĐ chuẩn
    res2 = engine.evaluate({
        "close": 30000,
        "equity": 5_000_000_000_000, # 5,000 Tỷ VNĐ
        "shares": 100_000_000
    })
    assert res2["bvps"] == 50_000, f"BVPS Case 2 mong đợi 50,000, ra {res2['bvps']}"

    # Case 3: Không có equity, nhưng có close=30000 và pb=1.5
    res3 = engine.evaluate({
        "close": 30000,
        "pb": 1.5
    })
    assert res3["bvps"] == 20_000, f"BVPS Case 3 mong đợi 20,000, ra {res3['bvps']}"

    # Case 4: Đã truyền trực tiếp bvps
    res4 = engine.evaluate({
        "close": 30000,
        "bvps": 25000,
        "equity": 5000,
        "shares": 100_000_000
    })
    assert res4["bvps"] == 25000, f"BVPS Case 4 mong đợi 25,000, ra {res4['bvps']}"
    print("✅ test_bvps_hierarchy_and_accounting_integrity: PASS")


if __name__ == "__main__":
    print("\n=======================================================")
    print("🧪 CHẠY UNIT TEST BỘ ĐỘNG CƠ ĐỊNH GIÁ & PHÂN TÍCH TÀI CHÍNH")
    print("=======================================================\n")
    test_calc_graham()
    test_calc_ddm()
    test_calc_pe_target()
    test_calc_pb_target()
    test_calc_ev_ebitda()
    test_calc_pcf()
    test_calc_ps_target()
    test_calc_consensus_fair_value()
    test_calc_dupont()
    test_calc_tech_score()
    test_stock_valuation_engine_evaluate()
    test_calc_extended_dupont()
    test_calc_overall_health_score()
    test_calc_early_warning()
    test_compute_industry_metrics()
    test_calc_dcf_fcff()
    test_calc_reverse_dcf()
    test_calc_dcf_sensitivity_matrix()
    test_market_profile_engine()
    test_news_sentiment_engine()
    test_yield_curve_monitor()
    test_beneish_m_score()
    test_magic_formula()
    test_fcf_inflection_point()
    test_calc_gordon_pb()
    test_calc_multi_stage_dcf()
    test_calc_fcfe()
    test_calc_rim_eva()
    test_calc_book_nav_target()
    test_calc_advanced_multiples()
    test_sector_weights_and_outlier_filtering()
    test_detect_valuation_traps()
    test_calc_7_price_zones_and_3_layer_decision()
    test_historical_bands_and_dividend_sustainability()
    test_method_suitability_normalization()
    test_bvps_hierarchy_and_accounting_integrity()
    print("\n🎉 TẤT CẢ 36 TEST CASE ĐÃ VƯỢT QUA 100% THÀNH CÔNG!\n")

