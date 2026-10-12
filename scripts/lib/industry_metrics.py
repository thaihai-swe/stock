#!/usr/bin/env python3
"""
scripts/lib/industry_metrics.py
Module phân tích Báo Cáo Tài Chính theo đặc thù từng ngành nghề (Industry-Specific Metrics Router):
- Ngân hàng (Banking): NIM, NPL, LLR, LDR, CIR, CASA.
- Bất động sản (Real Estate): Tồn kho dự án, Người mua trả tiền trước, Nợ ròng/VCSH, Tiền mặt/Nợ ngắn hạn.
- Sản xuất (Manufacturing): Chu kỳ chuyển đổi tiền mặt CCC (DSO + DIO - DPO), CapEx/D&A, Biên gộp.
- Bán lẻ (Retail): Vòng quay tồn kho, DIO, Biên lãi gộp chuỗi.
- Công nghệ (Technology): Tiền mặt ròng/Vốn hóa, Biên EBIT hoạt động, Tăng trưởng doanh thu.
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional


BANKING_TICKERS = {
    "VCB", "BID", "CTG", "TCB", "MBB", "VPB", "ACB", "HDB", "STB", "SHB",
    "VIB", "TPB", "LPB", "MSB", "OCB", "EIB", "NAB", "BAB", "BVB", "KLB",
    "NVB", "PGB", "VBB", "SSB"
}

REAL_ESTATE_TICKERS = {
    "VIC", "VHM", "VRE", "NVL", "KDH", "NLG", "PDR", "DXG", "DIG", "CEO",
    "KBC", "SZC", "IDC", "BCM", "VPI", "HDG", "DXS", "TCH", "HQC", "SCR",
    "AGG", "IJC", "CRE", "NBB", "D2D", "NHA"
}

MANUFACTURING_TICKERS = {
    "HPG", "HSG", "NKG", "VNM", "DCM", "DPM", "BMP", "NTP", "HT1", "BCC",
    "GVR", "DRC", "CSM", "SMC", "TLH", "POM", "VGS", "DHA", "KSB", "VCS",
    "MSR", "AAA", "PLX", "BSR", "POW", "GEG", "REE"
}

RETAIL_TICKERS = {
    "MWG", "FRT", "PNJ", "DGW", "PET", "HAX", "SVC", "VGC", "CTF"
}

TECHNOLOGY_TICKERS = {
    "FPT", "CMG", "ELC", "ITD", "SAM", "VGI", "CTR", "FOX"
}


def detect_industry_category(symbol: str, company_name: str = "", icb_name: str = "") -> str:
    """Xác định nhóm ngành chuyên sâu theo mã hoặc từ khóa phân loại ICB."""
    sym = symbol.strip().upper()
    c_name = company_name.lower()
    icb = icb_name.lower()

    if sym in BANKING_TICKERS or "ngân hàng" in c_name or "bank" in c_name or "ngân hàng" in icb:
        return "BANKING"
    if sym in REAL_ESTATE_TICKERS or "bất động sản" in c_name or "địa ốc" in c_name or "bất động sản" in icb:
        return "REAL_ESTATE"
    if sym in MANUFACTURING_TICKERS or "thép" in c_name or "sản xuất" in c_name or "vật liệu" in c_name or "hóa chất" in c_name:
        return "MANUFACTURING"
    if sym in RETAIL_TICKERS or "bán lẻ" in c_name or "thương mại" in c_name or "bán lẻ" in icb:
        return "RETAIL"
    if sym in TECHNOLOGY_TICKERS or "công nghệ" in c_name or "phần mềm" in c_name or "viễn thông" in c_name or "technology" in icb:
        return "TECHNOLOGY"

    return "GENERAL"


def compute_industry_metrics(
    symbol: str,
    latest_quarter: Dict[str, Any],
    ratios: Dict[str, Any],
    company_name: str = "",
    icb_name: str = ""
) -> Dict[str, Any]:
    """Tính toán và đóng gói các chỉ số đặc thù của từng nhóm ngành từ 100% dữ liệu BCTC/Ratios thật."""
    category = detect_industry_category(symbol, company_name, icb_name)
    sym = symbol.strip().upper()

    def _val(k):
        v = latest_quarter.get(k)
        if v is not None:
            try:
                f = float(v)
                return f if math.isfinite(f) else None
            except (ValueError, TypeError):
                return None
        return None

    rev = _val("revenue")
    assets = _val("totalAssets")
    equity = _val("equity")
    inv = _val("inventory")
    receivables = _val("accountsReceivable")
    cash = _val("cashAndEquivalents")
    st_debt = _val("shortTermDebt")
    lt_debt = _val("longTermDebt")
    total_debt = _val("totalDebt")
    if total_debt is None and (st_debt is not None or lt_debt is not None):
        total_debt = (st_debt or 0.0) + (lt_debt or 0.0)
    cogs = _val("costOfGoodsSold")
    capex = abs(_val("capex")) if _val("capex") is not None else None
    depreciation = _val("depreciation")
    op_profit = _val("operatingProfit")
    net_inc = _val("netIncomeParent") if _val("netIncomeParent") is not None else _val("netIncome")

    # 1. NGÀNH NGÂN HÀNG (BANKING)
    if category == "BANKING":
        # Trích xuất dữ liệu thực tế từ BCTC hoặc Ratios (nếu có thuyết minh ngân hàng)
        cir = None
        op_exp = _val("operatingExpense") or _val("sellingGeneralAdministrative")
        op_inc = _val("operatingIncome") or _val("netInterestIncome")
        if op_exp is not None and op_inc and op_inc > 0:
            cir = round((op_exp / op_inc) * 100.0, 1)
        elif ratios.get("efficiency", {}).get("cir") is not None:
            cir = float(ratios["efficiency"]["cir"])

        nim = None
        if ratios.get("profitability", {}).get("nim") is not None:
            nim = float(ratios["profitability"]["nim"])
        elif _val("netInterestIncome"):
            e_assets = _val("earningAssets") or assets
            if e_assets and e_assets > 0:
                # NIM = (Thu nhập lãi thuần 4 quý / Tài sản sinh lãi)
                nim = round((_val("netInterestIncome") * 4.0 / e_assets) * 100.0, 2)

        npl = float(ratios.get("credit", {}).get("npl")) if ratios.get("credit", {}).get("npl") is not None else None
        llr = float(ratios.get("credit", {}).get("llr")) if ratios.get("credit", {}).get("llr") is not None else None
        casa = float(ratios.get("funding", {}).get("casa")) if ratios.get("funding", {}).get("casa") is not None else None
        ldr = float(ratios.get("liquidity", {}).get("ldr")) if ratios.get("liquidity", {}).get("ldr") is not None else None

        return {
            "category": "BANKING",
            "categoryName": "Ngành Ngân Hàng & Dịch Vụ Tài Chính",
            "categoryIcon": "🏦",
            "highlights": "Ngân hàng được đánh giá qua chất lượng tài sản (NPL, LLR) và hiệu quả sinh lời chi phí vốn (NIM, CASA, CIR).",
            "metrics": [
                {
                    "id": "nim",
                    "name": "Biên Lãi Thuần (NIM)",
                    "value": nim,
                    "unit": "%",
                    "benchmark": "> 3.5%",
                    "rating": ("Xuất sắc" if nim >= 3.8 else "Tốt" if nim >= 3.0 else "Trung bình") if nim is not None else "Cần bổ sung BCTC",
                    "desc": "Chênh lệch giữa thu nhập lãi cho vay và chi phí huy động vốn"
                },
                {
                    "id": "npl",
                    "name": "Tỷ Lệ Nợ Xấu (NPL Ratio)",
                    "value": npl,
                    "unit": "%",
                    "benchmark": "< 2.0%",
                    "rating": ("An toàn" if npl <= 1.6 else "Đạt chuẩn" if npl <= 2.5 else "Rủi ro") if npl is not None else "Cần bổ sung thuyết minh",
                    "desc": "Tỷ lệ nợ nhóm 3-5 trên tổng dư nợ cho vay khách hàng"
                },
                {
                    "id": "llr",
                    "name": "Bao Phủ Nợ Xấu (LLR)",
                    "value": llr,
                    "unit": "%",
                    "benchmark": "> 100%",
                    "rating": ("Dày dặn" if llr >= 150 else "Đủ chuẩn" if llr >= 100 else "Mỏng") if llr is not None else "Cần bổ sung thuyết minh",
                    "desc": "Quỹ dự phòng rủi ro tín dụng trên nợ xấu, bộ đệm phòng thủ tài chính"
                },
                {
                    "id": "casa",
                    "name": "Tiền Gửi Không Kỳ Hạn (CASA)",
                    "value": casa,
                    "unit": "%",
                    "benchmark": "> 25%",
                    "rating": ("Vượt trội" if casa >= 35 else "Tốt" if casa >= 25 else "Bình thường") if casa is not None else "Cần bổ sung thuyết minh",
                    "desc": "Nguồn vốn giá rẻ tối ưu hóa chi phí đầu vào của ngân hàng"
                },
                {
                    "id": "ldr",
                    "name": "Cho Vay / Huy Động (LDR)",
                    "value": ldr,
                    "unit": "%",
                    "benchmark": "< 85%",
                    "rating": ("Chuẩn mực" if ldr <= 85 else "Căng thẳng") if ldr is not None else "Cần bổ sung thuyết minh",
                    "desc": "Tỷ lệ cho vay trên tiền gửi huy động theo quy định của NHNN"
                },
                {
                    "id": "cir",
                    "name": "Chi Phí / Thu Nhập (CIR)",
                    "value": cir,
                    "unit": "%",
                    "benchmark": "< 40%",
                    "rating": ("Tinh gọn" if cir <= 35 else "Khá" if cir <= 40 else "Cao") if cir is not None else "Cần bổ sung BCTC",
                    "desc": "Tỷ lệ chi phí hoạt động trên tổng thu nhập hoạt động"
                }
            ]
        }

    # 2. NGÀNH BẤT ĐỘNG SẢN (REAL ESTATE)
    if category == "REAL_ESTATE":
        inv_to_assets = round((inv / assets) * 100.0, 1) if (inv is not None and assets and assets > 0) else None
        net_debt = (total_debt - cash) if (total_debt is not None and cash is not None) else total_debt
        net_debt_equity = round(net_debt / equity, 2) if (net_debt is not None and equity and equity > 0) else None
        cash_st_debt = round(cash / st_debt, 2) if (cash is not None and st_debt and st_debt > 0) else None

        unearned_rev_val = _val("unearnedRevenue") or _val("customerDeposits")
        unearned_rev_ratio = None
        if unearned_rev_val is not None and assets and assets > 0:
            unearned_rev_ratio = round((unearned_rev_val / assets) * 100.0, 1)

        return {
            "category": "REAL_ESTATE",
            "categoryName": "Ngành Bất Động Sản & Phát Triển Hạ Tầng",
            "categoryIcon": "🏢",
            "highlights": "Đánh giá qua sức nặng tồn kho quỹ đất, dòng tiền người mua trả tiền trước và áp lực đòn bẩy nợ ròng.",
            "metrics": [
                {
                    "id": "inv_to_assets",
                    "name": "Tồn Kho / Tổng Tài Sản",
                    "value": inv_to_assets,
                    "unit": "%",
                    "benchmark": "40 - 65%",
                    "rating": ("Dồi dào" if inv_to_assets >= 40 else "Thấp") if inv_to_assets is not None else "Chưa đủ số liệu",
                    "desc": "Tỷ lệ dự án đang triển khai và quỹ đất dở dang của doanh nghiệp"
                },
                {
                    "id": "unearned_revenue",
                    "name": "Người Mua Trả Tiền Trước / Tổng TS",
                    "value": unearned_rev_ratio,
                    "unit": "%",
                    "benchmark": "> 15%",
                    "rating": ("Của để dành lớn" if unearned_rev_ratio >= 15 else "Bình thường") if unearned_rev_ratio is not None else "Cần bổ sung CĐKT",
                    "desc": "Khoản tiền đặt cọc từ khách hàng mua nhà/đất ghi nhận doanh thu khi bàn giao"
                },
                {
                    "id": "net_debt_equity",
                    "name": "Nợ Vay Ròng / Vốn Chủ (Net Debt/E)",
                    "value": net_debt_equity,
                    "unit": "lần",
                    "benchmark": "< 1.2x",
                    "rating": ("An toàn" if net_debt_equity <= 0.8 else "Chấp nhận được" if net_debt_equity <= 1.5 else "Đòn bẩy cao") if net_debt_equity is not None else "Chưa đủ số liệu",
                    "desc": "Áp lực vay nợ sau khi đã bù trừ toàn bộ tiền mặt và tiền gửi"
                },
                {
                    "id": "cash_st_debt",
                    "name": "Tiền Mặt / Nợ Ngắn Hạn",
                    "value": cash_st_debt,
                    "unit": "lần",
                    "benchmark": "> 0.5x",
                    "rating": ("Dồi dào" if cash_st_debt >= 0.8 else "Ổn định" if cash_st_debt >= 0.5 else "Cần theo dõi") if cash_st_debt is not None else "Chưa đủ số liệu",
                    "desc": "Khả năng thanh toán tức thời các khoản nợ vay đến hạn trả"
                }
            ]
        }

    # 3. NGÀNH SẢN XUẤT & VẬT LIỆU (MANUFACTURING)
    if category == "MANUFACTURING":
        dso = ratios.get("efficiency", {}).get("dso")
        dio = ratios.get("efficiency", {}).get("dio")
        dpo = ratios.get("efficiency", {}).get("dpo")
        ccc = round(dso + dio - dpo) if (dso is not None and dio is not None and dpo is not None) else None

        capex_da = round(capex / depreciation, 2) if (capex is not None and depreciation and depreciation > 0) else None
        gross_margin = ratios.get("profitability", {}).get("grossMargin")
        if gross_margin is None and rev and rev > 0 and cogs is not None:
            gross_margin = round(((rev - cogs) / rev) * 100.0, 2)

        fixed_assets = _val("fixedAssets")
        fixed_asset_turn = round((rev * 4.0) / fixed_assets, 2) if (rev is not None and fixed_assets and fixed_assets > 0) else None

        return {
            "category": "MANUFACTURING",
            "categoryName": "Ngành Sản Xuất Công Nghiệp & Vật Liệu",
            "categoryIcon": "🏭",
            "highlights": "Đo lường vòng quay chu kỳ tiền mặt (CCC), biên lãi gộp công nghiệp và tốc độ tái đầu tư mở rộng CapEx.",
            "metrics": [
                {
                    "id": "ccc",
                    "name": "Chu Kỳ Tiền Mặt (CCC)",
                    "value": ccc,
                    "unit": "ngày",
                    "benchmark": "< 90 ngày",
                    "rating": ("Rất nhanh" if ccc < 60 else "Chuẩn mực" if ccc < 110 else "Dài ngày") if ccc is not None else "Chưa đủ số liệu",
                    "desc": "Thời gian từ lúc chi tiền mua NVL đến khi thu tiền bán hàng (DSO + DIO - DPO)"
                },
                {
                    "id": "capex_da",
                    "name": "CapEx / Khấu Hao (D&A)",
                    "value": capex_da,
                    "unit": "lần",
                    "benchmark": "> 1.0x",
                    "rating": ("Mở rộng công suất" if capex_da > 1.2 else "Duy trì hoạt động" if capex_da >= 0.8 else "Thu hẹp") if capex_da is not None else "Chưa đủ số liệu",
                    "desc": "Tỷ lệ đầu tư tài sản cố định mới so với mức hao mòn khấu hao"
                },
                {
                    "id": "gross_margin",
                    "name": "Biên Lợi Nhuận Gộp",
                    "value": gross_margin,
                    "unit": "%",
                    "benchmark": "> 15%",
                    "rating": ("Cao" if gross_margin >= 18 else "Khá" if gross_margin >= 12 else "Mỏng") if gross_margin is not None else "Chưa đủ số liệu",
                    "desc": "Sức mạnh chuyển chi phí nguyên liệu đầu vào sang giá bán thành phẩm"
                },
                {
                    "id": "fixed_asset_turnover",
                    "name": "Vòng Quay TSCĐ",
                    "value": fixed_asset_turn,
                    "unit": "vòng",
                    "benchmark": "> 1.5x",
                    "rating": ("Tối ưu" if fixed_asset_turn >= 2.0 else "Khá" if fixed_asset_turn >= 1.2 else "Chưa đầy tải") if fixed_asset_turn is not None else "Chưa đủ số liệu",
                    "desc": "Hiệu suất tạo doanh thu trên quy mô nhà xưởng và máy móc thiết bị"
                }
            ]
        }

    # 4. NGÀNH BÁN LẺ (RETAIL)
    if category == "RETAIL":
        inv_turn = ratios.get("efficiency", {}).get("inventoryTurnover")
        dio = ratios.get("efficiency", {}).get("dio")
        gross_margin = ratios.get("profitability", {}).get("grossMargin")
        net_margin = ratios.get("profitability", {}).get("netMargin")

        return {
            "category": "RETAIL",
            "categoryName": "Ngành Bán Lẻ & Chuỗi Phân Phối",
            "categoryIcon": "🛒",
            "highlights": "Bán lẻ chú trọng tốc độ luân chuyển hàng hóa tồn kho và khả năng giữ vững biên lãi gộp.",
            "metrics": [
                {
                    "id": "inv_turn",
                    "name": "Vòng Quay Hàng Tồn Kho",
                    "value": inv_turn,
                    "unit": "vòng",
                    "benchmark": "> 6.0x",
                    "rating": ("Xuất sắc" if inv_turn >= 6.5 else "Tốt" if inv_turn >= 4.5 else "Chậm") if inv_turn is not None else "Chưa đủ số liệu",
                    "desc": "Số lần luân chuyển xả kho trong chu kỳ kinh doanh"
                },
                {
                    "id": "dio",
                    "name": "Số Ngày Lưu Kho (DIO)",
                    "value": dio,
                    "unit": "ngày",
                    "benchmark": "< 60 ngày",
                    "rating": ("Nhanh" if dio <= 55 else "Bình thường" if dio <= 75 else "Ứ đọng") if dio is not None else "Chưa đủ số liệu",
                    "desc": "Số ngày trung bình để bán hết một vòng kho hàng"
                },
                {
                    "id": "gross_margin",
                    "name": "Biên Lợi Nhuận Gộp",
                    "value": gross_margin,
                    "unit": "%",
                    "benchmark": "> 20%",
                    "rating": ("Dày" if gross_margin >= 22 else "Khá") if gross_margin is not None else "Chưa đủ số liệu",
                    "desc": "Tỷ suất lợi nhuận sau khi trừ giá vốn hàng nhập"
                },
                {
                    "id": "net_margin",
                    "name": "Biên Lợi Nhuận Ròng",
                    "value": net_margin,
                    "unit": "%",
                    "benchmark": "> 3.5%",
                    "rating": ("Khỏe" if net_margin >= 4.5 else "Trung bình") if net_margin is not None else "Chưa đủ số liệu",
                    "desc": "Lợi nhuận ròng cuối cùng sau toàn bộ chi phí cửa hàng và nhân sự"
                }
            ]
        }

    # 5. NGÀNH CÔNG NGHỆ (TECHNOLOGY)
    if category == "TECHNOLOGY":
        ebit_margin = round((op_profit / rev) * 100.0, 2) if (op_profit is not None and rev and rev > 0) else None
        net_cash = (cash - (total_debt or 0.0)) if cash is not None else None
        net_cash_ratio = round((net_cash / assets) * 100.0, 1) if (net_cash is not None and assets and assets > 0) else None
        roe = ratios.get("profitability", {}).get("roe")

        return {
            "category": "TECHNOLOGY",
            "categoryName": "Ngành Công Nghệ Thông Tin & Viễn Thông",
            "categoryIcon": "💻",
            "highlights": "Doanh nghiệp công nghệ được đánh giá cao nhờ biên hoạt động dày, đệm tiền mặt ròng và tăng trưởng doanh thu số.",
            "metrics": [
                {
                    "id": "ebit_margin",
                    "name": "Biên Hoạt Động (EBIT Margin)",
                    "value": ebit_margin,
                    "unit": "%",
                    "benchmark": "> 15%",
                    "rating": ("Xuất sắc" if ebit_margin >= 18 else "Khá") if ebit_margin is not None else "Chưa đủ số liệu",
                    "desc": "Biên lợi nhuận hoạt động cốt lõi từ dịch vụ phần mềm và IT"
                },
                {
                    "id": "net_cash_ratio",
                    "name": "Tiền Mặt Ròng / Tổng Tài Sản",
                    "value": net_cash_ratio,
                    "unit": "%",
                    "benchmark": "> 15%",
                    "rating": ("Dồi dào" if net_cash_ratio >= 18 else "An toàn") if net_cash_ratio is not None else "Chưa đủ số liệu",
                    "desc": "Vùng đệm tiền mặt ròng dồi dào, hầu như không chịu rủi ro lãi vay"
                },
                {
                    "id": "roe",
                    "name": "Tỷ Suất Sinh Lời ROE",
                    "value": roe,
                    "unit": "%",
                    "benchmark": "> 20%",
                    "rating": ("Xuất sắc" if roe >= 20 else "Khá") if roe is not None else "Chưa đủ số liệu",
                    "desc": "Khả năng sinh lời vượt trội trên vốn đầu tư"
                }
            ]
        }

    # 6. MẶC ĐỊNH CHO DOANH NGHIỆP CHUNG (GENERAL)
    roe_gen = ratios.get("profitability", {}).get("roe")
    net_margin_gen = ratios.get("profitability", {}).get("netMargin")
    debt_equity_gen = ratios.get("leverage", {}).get("debtToEquity")

    return {
        "category": "GENERAL",
        "categoryName": "Doanh Nghiệp Thương Mại & Tổng Hợp",
        "categoryIcon": "🏢",
        "highlights": "Đánh giá qua các chỉ số hiệu quả kinh doanh cơ bản và cấu trúc vốn an toàn.",
        "metrics": [
            {
                "id": "roe",
                "name": "Tỷ Suất Sinh Lời ROE",
                "value": roe_gen,
                "unit": "%",
                "benchmark": "> 15%",
                "rating": ("Xuất sắc" if roe_gen >= 20 else "Tốt" if roe_gen >= 15 else "Trung bình") if roe_gen is not None else "Chưa đủ số liệu",
                "desc": "Hiệu quả sử dụng vốn chủ sở hữu"
            },
            {
                "id": "net_margin",
                "name": "Biên Lợi Nhuận Ròng",
                "value": net_margin_gen,
                "unit": "%",
                "benchmark": "> 8%",
                "rating": ("Cao" if net_margin_gen >= 12 else "Khá" if net_margin_gen >= 8 else "Mỏng") if net_margin_gen is not None else "Chưa đủ số liệu",
                "desc": "Tỷ lệ lợi nhuận sau thuế trên doanh thu"
            },
            {
                "id": "debt_to_equity",
                "name": "Nợ Vay / Vốn Chủ",
                "value": debt_equity_gen,
                "unit": "lần",
                "benchmark": "< 1.5x",
                "rating": ("An toàn" if debt_equity_gen <= 1.0 else "Chấp nhận được" if debt_equity_gen <= 1.5 else "Đòn bẩy cao") if debt_equity_gen is not None else "Chưa đủ số liệu",
                "desc": "Mức độ sử dụng nợ tài trợ cho hoạt động kinh doanh"
            }
        ]
    }
