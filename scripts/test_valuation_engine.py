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


if __name__ == "__main__":
    print("\n=======================================================")
    print("🧪 CHẠY UNIT TEST BỘ ĐỘNG CƠ ĐỊNH GIÁ (VALUATION ENGINE)")
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
    print("\n🎉 TẤT CẢ 11 TEST CASE ĐÃ VƯỢT QUA 100% THÀNH CÔNG!\n")
