#!/usr/bin/env python3
"""
scripts/test_dynamic_data_integrity.py
Unit test kiểm thử tính toàn vẹn dữ liệu động (Data Integrity & Dynamic Logic Verification):
1. Không còn bất kỳ mã giả/hash(sym) nào trong industry_metrics.py.
2. Logic N-Year Rolling Median cho P/E & P/B dải băng định giá:
   - N >= 3: Phân vị bách phân vị thực tế.
   - N = 2: Trung vị 2 năm.
   - N = 1: Sử dụng đúng 1 năm đó.
   - N = 0: Dự phòng bội số ngành/mặc định.
3. Model 6 (FCFF) kết nối với calc_dcf_fcff (3 kịch bản Base, Bull, Bear).
4. _extract_finval_metric không còn đoán mò hệ số 0.65 hay 1.25.
5. macro_advisor.py đọc P/E bands động từ file cấu hình trung tâm.
"""

import sys
import unittest
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
ROOT_DIR = CURRENT_DIR.parent
sys.path.insert(0, str(CURRENT_DIR))

from lib.industry_metrics import compute_industry_metrics
from lib.valuation_engine import (
    calc_historical_valuation_bands,
    StockValuationEngine,
    _extract_finval_metric,
    calc_dcf_fcff
)
from lib.macro_advisor import compute_pe_bands_and_zscore


class TestDynamicDataIntegrity(unittest.TestCase):

    def test_industry_metrics_no_synthetic_data(self):
        """Kiểm tra không tạo dữ liệu giả lập/hash(sym), trả về None khi thiếu thuyết minh."""
        # Test case: Ngân hàng với số liệu rỗng
        empty_q = {}
        empty_ratios = {}
        res = compute_industry_metrics("VCB", empty_q, empty_ratios, "Vietcombank", "Ngân hàng")
        self.assertEqual(res["category"], "BANKING")
        m_map = {m["id"]: m for m in res["metrics"]}
        self.assertIsNone(m_map["nim"]["value"])
        self.assertIn("Cần bổ sung", m_map["nim"]["rating"])

        # Test case: Bất động sản với số liệu rỗng
        res_re = compute_industry_metrics("NVL", empty_q, empty_ratios, "Novaland", "Bất động sản")
        self.assertEqual(res_re["category"], "REAL_ESTATE")
        re_map = {m["id"]: m for m in res_re["metrics"]}
        self.assertIsNone(re_map["unearned_revenue"]["value"])

        # Test case: Cung cấp số liệu thật cho Ngân hàng
        real_q = {
            "netInterestIncome": 15000,
            "earningAssets": 1500000,
            "operatingExpense": 5000,
            "operatingIncome": 20000,
        }
        res_real = compute_industry_metrics("VCB", real_q, empty_ratios, "Vietcombank", "Ngân hàng")
        real_map = {m["id"]: m for m in res_real["metrics"]}
        self.assertIsNotNone(real_map["nim"]["value"])
        self.assertEqual(real_map["cir"]["value"], 25.0)  # (5000 / 20000) * 100 = 25.0%

    def test_historical_pe_pb_bands_rolling_n_years(self):
        """Kiểm tra logic trung vị số năm hiện có (Rolling N-Year Median) cho P/E & P/B."""
        # 1. Đủ 5 năm
        pe_5y = [8.0, 9.5, 11.0, 13.0, 15.0]
        pb_5y = [1.1, 1.3, 1.5, 1.8, 2.1]
        b5 = calc_historical_valuation_bands(
            close=25000, eps=2500, bvps=18000,
            pe_history=pe_5y, pb_history=pb_5y
        )
        self.assertEqual(b5["peYearsUsed"], 5)
        self.assertEqual(b5["pbYearsUsed"], 5)
        self.assertFalse(b5["isFallbackToSector"])
        self.assertEqual(b5["peBand"]["p50"], 11.0)
        self.assertEqual(b5["pbBand"]["p50"], 1.5)

        # 2. Chỉ có 3 năm
        pe_3y = [10.0, 12.0, 14.0]
        pb_3y = [1.2, 1.5, 1.8]
        b3 = calc_historical_valuation_bands(
            close=25000, eps=2500, bvps=18000,
            pe_history=pe_3y, pb_history=pb_3y
        )
        self.assertEqual(b3["peYearsUsed"], 3)
        self.assertEqual(b3["peBand"]["p50"], 12.0)
        self.assertFalse(b3["isFallbackToSector"])

        # 3. Chỉ có 2 năm
        pe_2y = [10.0, 14.0]
        pb_2y = [1.2, 1.6]
        b2 = calc_historical_valuation_bands(
            close=25000, eps=2500, bvps=18000,
            pe_history=pe_2y, pb_history=pb_2y
        )
        self.assertEqual(b2["peYearsUsed"], 2)
        self.assertEqual(b2["peBand"]["p50"], 12.0)  # (10 + 14) / 2
        self.assertEqual(b2["pbBand"]["p50"], 1.4)  # (1.2 + 1.6) / 2
        self.assertFalse(b2["isFallbackToSector"])

        # 4. Chỉ có 1 năm
        pe_1y = [11.5]
        pb_1y = [1.4]
        b1 = calc_historical_valuation_bands(
            close=25000, eps=2500, bvps=18000,
            pe_history=pe_1y, pb_history=pb_1y
        )
        self.assertEqual(b1["peYearsUsed"], 1)
        self.assertEqual(b1["peBand"]["p50"], 11.5)
        self.assertEqual(b1["pbBand"]["p50"], 1.4)
        self.assertFalse(b1["isFallbackToSector"])

        # 5. Hoàn toàn không có năm nào (N = 0) -> fallback sang sector/default
        b0 = calc_historical_valuation_bands(
            close=25000, eps=2500, bvps=18000,
            pe_history=[], pb_history=[],
            default_pe=12.5, default_pb=1.65
        )
        self.assertEqual(b0["peYearsUsed"], 0)
        self.assertEqual(b0["pbYearsUsed"], 0)
        self.assertTrue(b0["isFallbackToSector"])
        self.assertEqual(b0["peBand"]["p50"], 12.5)
        self.assertEqual(b0["pbBand"]["p50"], 1.65)

    def test_stock_valuation_engine_models_and_fcff(self):
        """Kiểm tra engine định giá sử dụng đúng rolling median và kết nối FCFF."""
        engine = StockValuationEngine()
        data = {
            "close": 25000,
            "eps": 2500,
            "bvps": 18000,
            "dps": 1200,
            "shares": 100_000_000,
            "cfo": 300_000_000_000,
            "capex": 50_000_000_000,
            "totalDebt": 100_000_000_000,
            "peHistory": [9.0, 10.5, 12.0],  # N = 3, median = 10.5
            "pbHistory": [1.1, 1.3, 1.5],   # N = 3, median = 1.3
            "sector": "Thực Phẩm & Đồ Uống"
        }
        res = engine.evaluate(data)

        # 1. Model 2 (P/E) phải dùng đúng median 10.5x và tính đủ peAvg
        models_dict = {m["id"]: m for m in res["models10"]}
        pe_model = models_dict["pe"]
        self.assertEqual(pe_model["parameters"]["targetPe"], 10.5)
        self.assertEqual(pe_model["parameters"]["peMedian"], 10.5)
        self.assertEqual(pe_model["parameters"]["peAvg"], 10.5)
        self.assertEqual(pe_model["parameters"]["yearsUsed"], 3)
        self.assertFalse(pe_model["parameters"]["isFallback"])
        self.assertEqual(pe_model["value"], 2500 * 10.5)
        self.assertEqual(pe_model["formula"], "EPS × P/E Chuẩn Hóa (P50 Chu Kỳ)")

        # 2. Model 3 (P/B) phải dùng đúng median 1.3x và tính đủ pbAvg
        pb_model = models_dict["pb"]
        self.assertEqual(pb_model["parameters"]["targetPb"], 1.3)
        self.assertEqual(pb_model["parameters"]["pbMedian"], 1.3)
        self.assertEqual(pb_model["parameters"]["pbAvg"], 1.3)
        self.assertEqual(pb_model["parameters"]["yearsUsed"], 3)
        self.assertFalse(pb_model["parameters"]["isFallback"])
        self.assertEqual(pb_model["value"], 18000 * 1.3)
        self.assertEqual(pb_model["formula"], "BVPS × P/B Chuẩn Hóa (P50 Chu Kỳ)")

        # 3. Model 6 (FCFF) phải kết nối với calc_dcf_fcff và trả về dcfScenarios
        fcff_model = models_dict["fcff"]
        self.assertIsNotNone(fcff_model["value"])
        self.assertIn("dcfScenarios", res)
        self.assertIsNotNone(res["dcfScenarios"].get("basePrice"))
        self.assertEqual(fcff_model["value"], res["dcfScenarios"]["fairPrice"])

    def test_extract_finval_metric_no_guessing(self):
        """Kiểm tra _extract_finval_metric không tự ý đoán mò khi thiếu khoản mục."""
        # Chỉ có assets và debt, nhưng không có shortTermDebt -> currentRatio phải là None
        d = {"totalAssets": 100000, "totalDebt": 40000}
        self.assertIsNone(_extract_finval_metric(d, "currentRatio"))
        self.assertIsNone(_extract_finval_metric(d, "cashRatio"))

        # EBITDA: chỉ có netIncome, không có interestExpense hoặc deprec -> None (không nhân 1.25)
        d_inc = {"netIncome": 10000}
        self.assertIsNone(_extract_finval_metric(d_inc, "ebitda"))

        # Đúng và đủ số liệu:
        d_full = {
            "currentAssets": 60000,
            "currentLiabilities": 30000,
            "cash": 15000,
            "netIncome": 10000,
            "interestExpense": 2000,
            "depreciation": 3000
        }
        self.assertEqual(_extract_finval_metric(d_full, "currentRatio"), 2.0)
        self.assertEqual(_extract_finval_metric(d_full, "cashRatio"), 0.5)
        self.assertEqual(_extract_finval_metric(d_full, "ebitda"), 15000)

    def test_macro_advisor_dynamic_pe_bands(self):
        """Kiểm tra macro_advisor tính toán đúng 5 dải P/E theo cấu hình."""
        res_deep = compute_pe_bands_and_zscore(10.5)
        self.assertEqual(res_deep["band"], "DEEP_VALUE")

        res_cheap = compute_pe_bands_and_zscore(12.5)
        self.assertEqual(res_cheap["band"], "CHEAP")

        res_fair = compute_pe_bands_and_zscore(15.0)
        self.assertEqual(res_fair["band"], "FAIR")

        res_exp = compute_pe_bands_and_zscore(17.0)
        self.assertEqual(res_exp["band"], "EXPENSIVE")

        res_over = compute_pe_bands_and_zscore(19.0)
        self.assertEqual(res_over["band"], "OVERHEATED")


if __name__ == "__main__":
    unittest.main()
