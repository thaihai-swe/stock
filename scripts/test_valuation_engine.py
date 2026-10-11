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
    calc_ev_ebitda,
    calc_pcf,
    calc_ps_target,
    calc_consensus_fair_value,
    calc_dupont,
    calc_tech_score,
    calc_fcf,
    calc_cagr,
    StockValuationEngine
)


def test_calc_graham():
    # 1. Trường hợp bình thường (HPG thực tế: EPS=2750, BVPS=15344)
    val = calc_graham(2750, 15344)
    expected = round(math.sqrt(22.5 * 2750 * 15344))
    assert val == expected, f"Graham thất bại: {val} != {expected}"
    assert val == 30812, f"Graham HPG phải bằng 30812, ra {val}"

    # 2. Trường hợp biên âm hoặc bằng 0
    assert calc_graham(-1000, 15000) is None, "EPS âm phải trả về None"
    assert calc_graham(1000, -5000) is None, "BVPS âm phải trả về None"
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
    assert eval_result["ddmTarget"] == 5887
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
    print("\n🎉 TẤT CẢ 24 TEST CASE ĐÃ VƯỢT QUA 100% THÀNH CÔNG!\n")
