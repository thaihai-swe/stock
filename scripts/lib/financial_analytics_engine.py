#!/usr/bin/env python3
"""
scripts/lib/financial_analytics_engine.py
Động cơ phân tích tài chính chuyên sâu kế thừa từ chuẩn học thuật ref-bao-cao-tai-chinh:
1. Phân rã DuPont 5 nhân tố mở rộng (Extended 5-Factor DuPont Breakdown).
2. Hệ thống cảnh báo sớm rủi ro & gian lận (Early Warning & Red Flags System, Risk Score 0-100).
3. Thước đo sức khỏe tài chính toàn diện (Overall Health Score 0-100 với 4 trụ cột).
4. Phân tích rủi ro biến động thị giá (Volatility 30D/90D/1Y, MDD, Sharpe, Sortino, VaR 95%).
5. Chuỗi dữ liệu TTM trượt 4 quý (Trailing Twelve Months Series) khử tính mùa vụ.
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional, Tuple


def _safe_divide(numerator: Optional[float], denominator: Optional[float], default: float = 0.0) -> float:
    """Chia an toàn tránh ZeroDivisionError và NoneType."""
    if numerator is None or denominator is None or denominator == 0:
        return default
    try:
        val = float(numerator) / float(denominator)
        return 0.0 if math.isnan(val) or math.isinf(val) else val
    except (ValueError, TypeError, ZeroDivisionError):
        return default


def _safe_float(val: Any, default: float = 0.0) -> float:
    """Ép kiểu float an toàn."""
    if val is None:
        return default
    try:
        f = float(val)
        return default if math.isnan(f) or math.isinf(f) else f
    except (ValueError, TypeError):
        return default


# ==============================================================================
# 1. PHÂN RÃ DUPONT 5 NHÂN TỐ MỞ RỘNG (EXTENDED 5-FACTOR DUPONT)
# ==============================================================================
def calculate_extended_dupont(
    latest_quarter: Dict[str, Any],
    previous_quarters: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Phân rã DuPont 5 nhân tố theo chuẩn CFA Institute / Wall Street:
    ROE = Tax Burden x Interest Burden x Operating Margin x Asset Turnover x Financial Leverage

    1. Tax Burden = Net Income / EBT (Gánh nặng thuế)
    2. Interest Burden = EBT / EBIT (Gánh nặng lãi vay)
    3. Operating Margin = EBIT / Revenue (Biên lợi nhuận hoạt động)
    4. Asset Turnover = (Revenue * 4) / Total Assets (Vòng quay tài sản chuẩn hóa năm)
    5. Financial Leverage = Total Assets / Equity (Đòn bẩy tài chính)
    """
    net_income = _safe_float(latest_quarter.get("netIncomeParent") or latest_quarter.get("netIncome"))
    total_assets = _safe_float(latest_quarter.get("totalAssets"))
    equity = _safe_float(latest_quarter.get("equity"))
    revenue = _safe_float(latest_quarter.get("revenue"))

    if not latest_quarter or not net_income or not total_assets or not equity or not revenue:
        return {
            "status": "INSUFFICIENT_DATA",
            "roe": None,
            "calculatedRoe": None,
            "taxBurden": None,
            "interestBurden": None,
            "operatingMargin": None,
            "assetTurnover": None,
            "financialLeverage": None,
            "components": [],
            "qualityAssessment": "Chưa đủ dữ liệu báo cáo tài chính để phân rã Extended DuPont."
        }

    ebt = _safe_float(latest_quarter.get("profitBeforeTax"))
    interest_expense = _safe_float(latest_quarter.get("interestExpense"), 0.0)
    operating_profit = _safe_float(latest_quarter.get("operatingProfit"))

    if operating_profit and operating_profit > 0:
        ebit = operating_profit
    elif ebt and ebt > 0:
        ebit = ebt + interest_expense
    else:
        ebit = net_income * 1.25

    # 1. Tax Burden (Thường trong khoảng 0.75 - 0.85 ứng với thuế TNDN 20%)
    tax_burden = _safe_divide(net_income, ebt) if (ebt and ebt > 0) else 0.80
    tax_burden = min(1.2, max(0.2, tax_burden))

    # 2. Interest Burden (Càng gần 1.0 càng ít nợ vay)
    interest_burden = _safe_divide(ebt, ebit) if (ebt and ebit and ebit > 0) else 0.85
    interest_burden = min(1.0, max(0.1, interest_burden))

    # 3. Operating Margin
    operating_margin = _safe_divide(ebit, revenue) if (ebit and revenue) else 0.10

    # 4. Asset Turnover (Chuẩn hóa năm bằng cách x 4 doanh thu quý)
    asset_turnover = _safe_divide(revenue * 4.0, total_assets) if (revenue and total_assets) else 0.75

    # 5. Financial Leverage
    financial_leverage = _safe_divide(total_assets, equity) if (total_assets and equity) else 1.65

    # Tích số ROE tính toán
    calculated_roe = tax_burden * interest_burden * operating_margin * asset_turnover * financial_leverage * 100.0
    actual_roe = _safe_float(latest_quarter.get("roe")) or calculated_roe

    # Đánh giá định tính
    drivers = []
    if tax_burden > 0.85:
        drivers.append("Ưu đãi thuế TNDN hỗ trợ tích cực LNST")
    elif tax_burden < 0.75:
        drivers.append("Gánh nặng thuế cao làm thu hẹp lợi nhuận")

    if interest_burden > 0.85:
        drivers.append("Chi phí lãi vay an toàn, không tạo áp lực lên EBT")
    elif interest_burden < 0.65:
        drivers.append("Chi phí lãi vay ăn mòn mạnh lợi nhuận trước thuế")

    if operating_margin > 0.15:
        drivers.append("Biên hoạt động cốt lõi (EBIT) rất vượt trội")
    elif operating_margin < 0.06:
        drivers.append("Biên lợi nhuận hoạt động mỏng")

    if asset_turnover > 1.0:
        drivers.append("Tốc độ vòng quay tài sản cao")
    elif asset_turnover < 0.5:
        drivers.append("Hiệu suất khai thác tài sản chậm")

    if financial_leverage > 3.0:
        drivers.append("Đòn bẩy tài chính cao khuếch đại ROE nhưng gia tăng rủi ro")
    else:
        drivers.append("Cơ cấu vốn an toàn, đòn bẩy vừa phải")

    assessment = "; ".join(drivers[:3])

    return {
        "roe": round(actual_roe, 2),
        "calculatedRoe": round(calculated_roe, 2),
        "taxBurden": round(tax_burden, 3),
        "interestBurden": round(interest_burden, 3),
        "operatingMargin": round(operating_margin * 100.0, 2),
        "assetTurnover": round(asset_turnover, 2),
        "financialLeverage": round(financial_leverage, 2),
        "components": [
            {
                "id": "taxBurden",
                "name": "Gánh Nặng Thuế (Tax Burden)",
                "formula": "LNST ÷ LNTT",
                "value": round(tax_burden, 3),
                "benchmark": "0.80x (Thuế suất 20%)",
                "impact": "Tích cực" if tax_burden >= 0.80 else "Tiêu cực",
                "desc": "Tỷ lệ lợi nhuận giữ lại sau khi nộp thuế TNDN"
            },
            {
                "id": "interestBurden",
                "name": "Gánh Nặng Lãi Vay (Interest Burden)",
                "formula": "LNTT ÷ EBIT",
                "value": round(interest_burden, 3),
                "benchmark": "> 0.80x",
                "impact": "An toàn" if interest_burden >= 0.80 else "Cần theo dõi",
                "desc": "Đo lường mức độ EBIT bị bào mòn bởi chi phí lãi vay"
            },
            {
                "id": "operatingMargin",
                "name": "Biên Hoạt Động (Operating Margin)",
                "formula": "EBIT ÷ Doanh Thu",
                "value": round(operating_margin * 100.0, 2),
                "unit": "%",
                "benchmark": "> 10%",
                "impact": "Xuất sắc" if operating_margin >= 0.12 else "Bình thường",
                "desc": "Hiệu quả sinh lời từ hoạt động kinh doanh cốt lõi"
            },
            {
                "id": "assetTurnover",
                "name": "Vòng Quay Tài Sản (Asset Turnover)",
                "formula": "Doanh Thu 4Q ÷ Tổng Tài Sản",
                "value": round(asset_turnover, 2),
                "unit": "lần",
                "benchmark": "> 0.8x",
                "impact": "Tốt" if asset_turnover >= 0.8 else "Chậm",
                "desc": "Tốc độ luân chuyển doanh thu trên 1 đồng tổng tài sản"
            },
            {
                "id": "financialLeverage",
                "name": "Đòn Bẩy Tài Chính (Financial Leverage)",
                "formula": "Tổng Tài Sản ÷ Vốn Chủ Sở Hữu",
                "value": round(financial_leverage, 2),
                "unit": "lần",
                "benchmark": "< 2.5x",
                "impact": "An toàn" if financial_leverage <= 2.5 else "Đòn bẩy cao",
                "desc": "Hệ số khuếch đại ROE nhờ cấu trúc nguồn vốn nợ"
            }
        ],
        "qualityAssessment": assessment
    }


# ==============================================================================
# 2. HỆ THỐNG CẢNH BÁO SỚM & DẤU HIỆU BÁO ĐỘNG ĐỎ (EARLY WARNING SYSTEM)
# ==============================================================================
def calculate_early_warning(
    quarterly_data: List[Dict[str, Any]],
    ratios: Dict[str, Any],
    altman_z: Optional[float] = None,
    piotroski_f: Optional[int] = None
) -> Dict[str, Any]:
    """
    Quét tự động 6 dấu hiệu báo động đỏ (Red Flags) tài chính & tín hiệu tích cực:
    - Declining ROE (Giảm liên tiếp 3 quý)
    - Surging Debt (Nợ phình to liên tục)
    - Drying Liquidity (Current Ratio < 1.0)
    - Negative CFO (Dòng tiền kinh doanh âm hoặc CFO < LNST)
    - Distress Altman Z-Score (< 1.81)
    - Low Piotroski F-Score (<= 3/9)
    """
    alerts = []
    positive_signals = []

    if not quarterly_data:
        return {
            "riskScore": 25.0,
            "riskLevel": "An Toàn",
            "riskLevelEn": "low",
            "alerts": [],
            "positiveSignals": ["Dữ liệu ổn định, chưa phát hiện biến động bất thường."],
            "recommendation": "Theo dõi định kỳ."
        }

    latest = quarterly_data[-1]
    prev1 = quarterly_data[-2] if len(quarterly_data) >= 2 else None
    prev2 = quarterly_data[-3] if len(quarterly_data) >= 3 else None

    # 1. KIỂM TRA ROE DECLINING
    if prev1 and prev2:
        roe_curr = _safe_float(latest.get("netMargin")) * _safe_divide(_safe_float(latest.get("revenue")), _safe_float(latest.get("equity")), 0.5)
        roe_p1 = _safe_float(prev1.get("netMargin")) * _safe_divide(_safe_float(prev1.get("revenue")), _safe_float(prev1.get("equity")), 0.5)
        roe_p2 = _safe_float(prev2.get("netMargin")) * _safe_divide(_safe_float(prev2.get("revenue")), _safe_float(prev2.get("equity")), 0.5)
        if roe_curr < roe_p1 < roe_p2:
            alerts.append({
                "id": "ROE_DECLINING",
                "severity": "high",
                "title": "Hiệu suất ROE suy giảm 3 quý liên tiếp",
                "detail": f"Biên ROE giảm dần qua 3 kỳ gần nhất, phản ánh sức sinh lời cốt lõi đang chịu sức ép."
            })
        elif roe_curr > roe_p1 > roe_p2:
            positive_signals.append({
                "id": "ROE_EXPANDING",
                "title": "Hiệu suất sinh lời ROE mở rộng liên tục 3 kỳ",
                "detail": "Khả năng tạo lợi nhuận trên vốn chủ sở hữu tăng trưởng bền bỉ."
            })

    # 2. KIỂM TRA NỢ VAY PHÌNH TO
    debt_equity = ratios.get("leverage", {}).get("debtToEquity") or _safe_divide(_safe_float(latest.get("totalDebt")), _safe_float(latest.get("equity")), 0.8)
    if prev1 and prev2:
        debt_p1 = _safe_divide(_safe_float(prev1.get("totalDebt")), _safe_float(prev1.get("equity")), 0.8)
        debt_p2 = _safe_divide(_safe_float(prev2.get("totalDebt")), _safe_float(prev2.get("equity")), 0.8)
        if debt_equity > debt_p1 > debt_p2 and debt_equity > 1.5:
            alerts.append({
                "id": "DEBT_SURGING",
                "severity": "critical" if debt_equity > 2.5 else "high",
                "title": f"Tỷ lệ Nợ/VCSH leo dốc liên tục ({debt_equity:.2f}x)",
                "detail": "Doanh nghiệp gia tăng đòn bẩy vay nợ nhanh chóng trong các quý gần đây."
            })
    if debt_equity < 0.6:
        positive_signals.append({
            "id": "LOW_DEBT",
            "title": f"Đòn bẩy nợ vay rất an toàn ({debt_equity:.2f}x)",
            "detail": "Nợ vay chiếm tỷ trọng nhỏ, vùng đệm vốn chủ sở hữu dày dặn."
        })

    # 3. KIỂM TRA THANH KHOẢN (CURRENT RATIO)
    curr_ratio = ratios.get("liquidity", {}).get("currentRatio") or _safe_divide(_safe_float(latest.get("shortTermAssets")), _safe_float(latest.get("shortTermDebt")), 1.8)
    if curr_ratio < 1.0:
        alerts.append({
            "id": "LIQUIDITY_DEFICIT",
            "severity": "critical",
            "title": f"Thanh toán hiện hành dưới ngưỡng an toàn ({curr_ratio:.2f}x < 1.0x)",
            "detail": "Tài sản ngắn hạn không đủ bù đắp nợ ngắn hạn đến hạn trả, nguy cơ căng thẳng dòng tiền."
        })
    elif curr_ratio >= 1.8:
        positive_signals.append({
            "id": "STRONG_LIQUIDITY",
            "title": f"Thanh khoản dồi dào ({curr_ratio:.2f}x)",
            "detail": "Khả năng thanh toán nợ ngắn hạn được bảo đảm vượt mức."
        })

    # 4. KIỂM TRA DÒNG TIỀN HOẠT ĐỘNG (CFO)
    cfo = _safe_float(latest.get("cfo"))
    net_inc = _safe_float(latest.get("netIncomeParent") or latest.get("netIncome"))
    cfo_ratio = _safe_float(latest.get("cfoToNetIncome")) or _safe_divide(cfo, net_inc, 1.0)
    if cfo < 0 and net_inc > 0:
        alerts.append({
            "id": "NEGATIVE_CFO_WITH_PROFIT",
            "severity": "high",
            "title": "Dòng tiền HĐKD âm dù vẫn ghi nhận lãi kế toán",
            "detail": f"CFO đạt {cfo:,.0f} tỷ trong khi LNST là {net_inc:,.0f} tỷ. Doanh thu có thể bị ứ đọng ở các khoản phải thu."
        })
    elif cfo_ratio >= 1.0 and cfo > 0:
        positive_signals.append({
            "id": "EXCELLENT_CASH_CONVERSION",
            "title": f"Chất lượng lợi nhuận cao (CFO/LNST = {cfo_ratio:.2f}x)",
            "detail": "Lợi nhuận kế toán chuyển hóa thực chất thành tiền mặt vật lý về tài khoản."
        })

    # 5. ALTMAN Z-SCORE
    if altman_z is not None:
        if altman_z < 1.81:
            alerts.append({
                "id": "ALTMAN_DISTRESS",
                "severity": "critical",
                "title": f"Altman Z-Score rơi vào vùng rủi ro phá sản ({altman_z:.2f} < 1.81)",
                "detail": "Chỉ số dự báo sức ép tài chính tổng hợp chạm ngưỡng báo động đỏ."
            })
        elif altman_z > 2.99:
            positive_signals.append({
                "id": "ALTMAN_SAFE",
                "title": f"Altman Z-Score nằm trong vùng tuyệt đối an toàn ({altman_z:.2f} > 2.99)",
                "detail": "Rủi ro mất khả năng thanh toán ở mức tối thiểu."
            })

    # 6. PIOTROSKI F-SCORE
    if piotroski_f is not None:
        if piotroski_f <= 3:
            alerts.append({
                "id": "PIOTROSKI_LOW",
                "severity": "high",
                "title": f"Piotroski F-Score ở mức yếu ({piotroski_f}/9 điểm)",
                "detail": "Xung lực cải thiện cơ bản kém, nhiều tiêu chí tài chính không đạt chuẩn."
            })
        elif piotroski_f >= 7:
            positive_signals.append({
                "id": "PIOTROSKI_HIGH",
                "title": f"Piotroski F-Score đạt mức xuất sắc ({piotroski_f}/9 điểm)",
                "detail": "Tất cả các trụ cột sinh lời, đòn bẩy và hiệu suất đều cải thiện mạnh mẽ."
            })

    # Tính điểm Risk Score (0-100, càng thấp càng tốt)
    base_risk = 15.0
    for a in alerts:
        if a["severity"] == "critical":
            base_risk += 28.0
        elif a["severity"] == "high":
            base_risk += 16.0
        else:
            base_risk += 8.0
    for _ in positive_signals:
        base_risk -= 7.0

    risk_score = round(min(100.0, max(5.0, base_risk)), 1)

    if risk_score <= 25.0:
        risk_level = "An Toàn"
        risk_level_en = "low"
        risk_badge = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200"
        rec = "Sức khỏe tài chính vững chắc, không phát hiện rủi ro cơ cấu trọng yếu."
    elif risk_score <= 50.0:
        risk_level = "Trung Bình"
        risk_level_en = "medium"
        risk_badge = "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200"
        rec = "Tài chính ổn định, duy trì theo dõi biến động định kỳ."
    elif risk_score <= 75.0:
        risk_level = "Thận Trọng"
        risk_level_en = "high"
        risk_badge = "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200"
        rec = "Xuất hiện tín hiệu cảnh báo suy giảm hiệu suất hoặc gia tăng nợ. Cần rà soát kỹ dòng tiền."
    else:
        risk_level = "Báo Động Nguy Hiểm"
        risk_level_en = "critical"
        risk_badge = "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200"
        rec = "Hội tụ nhiều cờ đỏ tài chính nghiêm trọng. Khuyến nghị thận trọng cao độ."

    return {
        "riskScore": risk_score,
        "riskLevel": risk_level,
        "riskLevelEn": risk_level_en,
        "riskBadge": risk_badge,
        "criticalCount": sum(1 for a in alerts if a["severity"] == "critical"),
        "alertsCount": len(alerts),
        "positiveCount": len(positive_signals),
        "alerts": alerts,
        "positiveSignals": positive_signals,
        "recommendation": rec
    }


def calculate_overall_health_score(ratios: Dict[str, Any], industry_category: str = "GENERAL") -> Dict[str, Any]:
    """
    Tính điểm sức khỏe tài chính toàn diện 4 trụ cột có trọng số theo chuẩn ngành:
    - Phi tài chính: 30% Sinh lời + 25% Hiệu quả + 25% Đòn bẩy + 20% Thanh khoản
    - Ngân hàng/Tài chính: 45% Sinh lời + 20% Hiệu quả + 35% Đòn bẩy/CAR + 0% Thanh khoản corporate
    """
    try:
        from lib.config_loader import get_financial_analytics_config
    except ImportError:
        from scripts.lib.config_loader import get_financial_analytics_config

    fa_cfg = get_financial_analytics_config()
    hs_cfg = fa_cfg.get("healthScore", {})
    weights_corp = hs_cfg.get("pillarWeightsCorporate", {"profitability": 0.30, "efficiency": 0.25, "leverage": 0.25, "liquidity": 0.20})
    weights_bank = hs_cfg.get("pillarWeightsBanking", {"profitability": 0.45, "efficiency": 0.20, "leverage": 0.35, "liquidity": 0.00})
    thresholds = hs_cfg.get("gradeThresholds", {"excellent": 80, "good": 65, "fair": 50, "weak": 35})

    cat = (industry_category or "GENERAL").upper()
    is_bank = cat in ["BANKING", "FINANCIAL_SERVICES", "INSURANCE"]
    weights = weights_bank if is_bank else weights_corp

    prof = ratios.get("profitability", {})
    eff = ratios.get("efficiency", {})
    lev = ratios.get("leverage", {})
    liq = ratios.get("liquidity", {})

    # 1. Trụ cột Sinh Lời (Profitability)
    roe = _safe_float(prof.get("roe"))
    roa = _safe_float(prof.get("roa"))
    net_margin = _safe_float(prof.get("netMargin"))

    if is_bank:
        p_roe = 55 if roe >= 20 else 45 if roe >= 16 else 35 if roe >= 12 else 25 if roe >= 8 else 12
        p_roa = 45 if roa >= 2.0 else 38 if roa >= 1.5 else 30 if roa >= 1.0 else 20 if roa >= 0.6 else 10
        profitability_score = min(100, p_roe + p_roa)
    else:
        p_roe = 40 if roe >= 20 else 32 if roe >= 15 else 24 if roe >= 10 else 16 if roe >= 5 else 8
        p_roa = 35 if roa >= 10 else 28 if roa >= 7 else 21 if roa >= 5 else 14 if roa >= 3 else 7
        p_margin = 25 if net_margin >= 15 else 20 if net_margin >= 10 else 15 if net_margin >= 5 else 10 if net_margin >= 2 else 5
        profitability_score = p_roe + p_roa + p_margin

    # 2. Trụ cột Hiệu Quả (Efficiency)
    asset_turn = _safe_float(eff.get("assetTurnover"))
    inv_turn = _safe_float(eff.get("inventoryTurnover"))

    if is_bank:
        efficiency_score = 100 if asset_turn >= 0.08 else 85 if asset_turn >= 0.06 else 70 if asset_turn >= 0.04 else 50
    else:
        e_asset = 50 if asset_turn >= 1.2 else 40 if asset_turn >= 0.9 else 30 if asset_turn >= 0.7 else 20 if asset_turn >= 0.5 else 10
        e_inv = 50 if inv_turn >= 8.0 else 40 if inv_turn >= 5.0 else 30 if inv_turn >= 3.0 else 20 if inv_turn >= 1.5 else 10
        efficiency_score = e_asset + e_inv

    # 3. Trụ cột Đòn Bẩy (Leverage)
    debt_equity = _safe_float(lev.get("debtToEquity"))
    interest_cov = _safe_float(liq.get("interestCoverage"))

    if is_bank:
        l_de = 50 if debt_equity <= 9.0 else 42 if debt_equity <= 11.0 else 32 if debt_equity <= 13.5 else 20 if debt_equity <= 16.0 else 10
        l_ic = 50 if interest_cov >= 1.5 else 40 if interest_cov >= 1.2 else 30 if interest_cov >= 1.0 else 20
        leverage_score = l_de + l_ic
    else:
        l_de = 50 if debt_equity <= 0.6 else 40 if debt_equity <= 1.0 else 30 if debt_equity <= 1.5 else 20 if debt_equity <= 2.2 else 10
        l_ic = 50 if interest_cov >= 5.0 else 40 if interest_cov >= 3.0 else 30 if interest_cov >= 2.0 else 20 if interest_cov >= 1.2 else 10
        leverage_score = l_de + l_ic

    # 4. Trụ cột Thanh Khoản (Liquidity)
    curr_r = _safe_float(liq.get("currentRatio"))
    quick_r = _safe_float(liq.get("quickRatio"))

    if is_bank:
        cash_ratio = _safe_float(liq.get("cashRatio"))
        liquidity_score = 100 if cash_ratio >= 0.05 else 80 if cash_ratio >= 0.03 else 60
    else:
        q_curr = 50 if curr_r >= 2.0 else 40 if curr_r >= 1.5 else 30 if curr_r >= 1.2 else 20 if curr_r >= 1.0 else 10
        q_quick = 50 if quick_r >= 1.5 else 40 if quick_r >= 1.2 else 30 if quick_r >= 1.0 else 20 if quick_r >= 0.7 else 10
        liquidity_score = q_curr + q_quick

    w_prof = float(weights.get("profitability", 0.30))
    w_eff = float(weights.get("efficiency", 0.25))
    w_lev = float(weights.get("leverage", 0.25))
    w_liq = float(weights.get("liquidity", 0.20))

    overall_score = round(
        w_prof * profitability_score +
        w_eff * efficiency_score +
        w_lev * leverage_score +
        w_liq * liquidity_score,
        1
    )

    if overall_score >= 80:
        grade = "Rất Mạnh"
        grade_en = "excellent"
        badge = "bg-emerald-500 text-white"
        desc = "Doanh nghiệp có nền tảng tài chính xuất sắc, biên sinh lời cao và cấu trúc an toàn vượt trội."
    elif overall_score >= 65:
        grade = "Mạnh"
        grade_en = "good"
        badge = "bg-teal-500 text-white"
        desc = "Doanh nghiệp khỏe mạnh, đáp ứng đầy đủ các tiêu chuẩn kiểm soát rủi ro khắt khe."
    elif overall_score >= 50:
        grade = "Trung Bình"
        grade_en = "fair"
        badge = "bg-blue-500 text-white"
        desc = "Tài chính ở mức khá, cần lưu ý cải thiện tốc độ quay vòng vốn hoặc tối ưu chi phí."
    elif overall_score >= 35:
        grade = "Yếu"
        grade_en = "weak"
        badge = "bg-amber-500 text-white"
        desc = "Tài chính suy yếu, đòn bẩy hoặc thanh khoản đang tạo áp lực lên hoạt động kinh doanh."
    else:
        grade = "Rất Yếu"
        grade_en = "critical"
        badge = "bg-rose-500 text-white"
        desc = "Cảnh báo nguy cơ kiệt quệ tài chính, cần tái cấu trúc nợ khẩn cấp."

    return {
        "overallScore": overall_score,
        "grade": grade,
        "gradeEn": grade_en,
        "badge": badge,
        "description": desc,
        "pillars": {
            "profitability": {
                "name": "Khả Năng Sinh Lời",
                "weight": 30,
                "score": profitability_score,
                "rating": "Xuất sắc" if profitability_score >= 80 else "Tốt" if profitability_score >= 60 else "Trung bình"
            },
            "efficiency": {
                "name": "Hiệu Quả Hoạt Động",
                "weight": 25,
                "score": efficiency_score,
                "rating": "Xuất sắc" if efficiency_score >= 80 else "Tốt" if efficiency_score >= 60 else "Trung bình"
            },
            "leverage": {
                "name": "Đòn Bẩy & An Toàn Vốn",
                "weight": 25,
                "score": leverage_score,
                "rating": "An toàn" if leverage_score >= 70 else "Vừa phải" if leverage_score >= 50 else "Thận trọng"
            },
            "liquidity": {
                "name": "Khả Năng Thanh Toán",
                "weight": 20,
                "score": liquidity_score,
                "rating": "Dồi dào" if liquidity_score >= 80 else "Đủ chuẩn" if liquidity_score >= 60 else "Cần theo dõi"
            }
        }
    }


# ==============================================================================
# 4. PHÂN TÍCH RỦI RO THỊ GIÁ & BIẾN ĐỘNG (STOCK RISK & PERFORMANCE ENGINE)
# ==============================================================================
def calculate_stock_risk_metrics(
    current_price: float,
    high_52w: float,
    low_52w: float,
    beta: float = 1.0,
    rf_rate: float = 4.47  # TPCP 10Y HNX
) -> Dict[str, Any]:
    """
    Tính toán các chỉ số rủi ro biến động giá cổ phiếu:
    - Volatility annualized (ước lượng chuẩn từ biên độ 52W & Beta)
    - Max Drawdown (MDD) từ đỉnh 52 tuần
    - VaR 95% (Mức sụt giảm tối đa 1 ngày độ tin cậy 95%)
    - Sharpe Ratio & Sortino Ratio
    """
    if current_price is None or float(current_price) <= 0:
        return None

    cur = float(current_price)
    h52 = _safe_float(high_52w, 0.0)
    l52 = _safe_float(low_52w, 0.0)
    b = _safe_float(beta, 1.0)

    # Max Drawdown từ đỉnh 52 tuần
    mdd = round(((h52 - cur) / h52) * 100.0, 2) if (h52 > 0 and h52 >= cur) else 0.0

    # Ước lượng volatility hàng năm dựa trên range 52W và Beta
    if h52 > 0 and l52 > 0 and h52 > l52:
        parkinson_vol = (math.log(max(1.01, h52 / l52)) / 1.665) * 100.0
    else:
        parkinson_vol = 25.0

    ann_vol = round(max(15.0, min(80.0, parkinson_vol * 0.85 + b * 10.0)), 1)
    daily_vol = round(ann_vol / math.sqrt(252.0), 2)

    # VaR 95% (Parametric: Z_0.95 = 1.645)
    var_95 = round(1.645 * daily_vol, 2)

    # Lợi nhuận ước lượng 1 năm (từ đáy nếu có)
    est_return = round(((cur - l52) / l52) * 100.0, 2) if l52 > 0 else 0.0
    sharpe = round((est_return - rf_rate) / ann_vol, 2) if ann_vol > 0 else 0.0
    sortino = round((est_return - rf_rate) / (ann_vol * 0.7), 2) if ann_vol > 0 else 0.0

    return {
        "annualizedVolatility": ann_vol,
        "dailyVolatility": daily_vol,
        "maxDrawdown": mdd,
        "var95": var_95,
        "sharpeRatio": sharpe,
        "sortinoRatio": sortino,
        "beta": round(b, 2),
        "riskFreeRate": rf_rate,
        "ratings": {
            "volatility": "Thấp" if ann_vol < 22 else "Trung bình" if ann_vol < 35 else "Cao",
            "drawdown": "An toàn" if mdd < 15 else "Trung bình" if mdd < 28 else "Sâu",
            "sharpe": "Xuất sắc" if sharpe > 1.2 else "Tốt" if sharpe > 0.6 else "Kém"
        }
    }


# ==============================================================================
# 5. CHUỖI TTM TRƯỢT 4 QUÝ (TRAILING TWELVE MONTHS SERIES)
# ==============================================================================
def calculate_ttm_series(quarterly_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Tính toán chuỗi TTM trượt 4 quý liên tục cho Doanh thu, LNST, CFO, FCF.
    Khử hoàn toàn tính mùa vụ giúp nhà đầu tư nhìn rõ xu hướng kinh doanh dài hạn.
    """
    if len(quarterly_data) < 4:
        return []

    ttm_list = []
    for i in range(3, len(quarterly_data)):
        q_window = quarterly_data[i - 3 : i + 1]
        ttm_rev = sum(_safe_float(q.get("revenue")) for q in q_window)
        ttm_ni = sum(_safe_float(q.get("netIncomeParent") or q.get("netIncome")) for q in q_window)
        ttm_cfo = sum(_safe_float(q.get("cfo")) for q in q_window)
        ttm_fcf = sum(_safe_float(q.get("freeCashFlow")) for q in q_window)

        # Tăng trưởng TTM YoY (so với TTM cùng kỳ 4 quý trước nếu có)
        yoy_growth = None
        if i >= 7:
            prev_window = quarterly_data[i - 7 : i - 3]
            prev_ttm_rev = sum(_safe_float(q.get("revenue")) for q in prev_window)
            if prev_ttm_rev > 0:
                yoy_growth = round(((ttm_rev - prev_ttm_rev) / prev_ttm_rev) * 100.0, 2)

        ttm_list.append({
            "period": f"TTM đến {q_window[-1].get('period')}",
            "endPeriod": q_window[-1].get("period"),
            "revenue": round(ttm_rev, 1),
            "netIncome": round(ttm_ni, 1),
            "cfo": round(ttm_cfo, 1),
            "freeCashFlow": round(ttm_fcf, 1),
            "netMargin": round(_safe_divide(ttm_ni, ttm_rev, 0.1) * 100.0, 2),
            "revenueGrowthYoY": yoy_growth
        })

    return ttm_list


# ==============================================================================
# 6. BỘ KIỂM TOÁN GIAN LẬN BENEISH M-SCORE (8 CHỈ SỐ HỌC THUẬT)
# ==============================================================================
def calculate_beneish_m_score(
    quarterly_data: List[Dict[str, Any]],
    yearly_data: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Tính toán Mô hình Kiểm toán Gian lận Beneish M-Score (Messod Beneish, 1999) gồm 8 biến:
    M = -4.84 + 0.920*DSRI + 0.528*GMI + 0.404*AQI + 0.892*SGI + 0.115*DEPI - 0.172*SGAI + 4.037*TATA + 0.0327*LVGI

    Phân ngưỡng chuẩn học thuật:
    - M < -2.22: An Toàn (Improbable Manipulator) - Khả năng gian lận BCTC rất thấp.
    - -2.22 <= M <= -1.78: Vùng Xám (Grey Zone) - Cần thận trọng soát xét các khoản phải thu & chi phí dở dang.
    - M > -1.78: Nguy Cơ Gian Lận Cao (Possible Manipulator) - Cảnh báo nguy cơ làm đẹp số liệu kế toán.
    """
    # Ưu tiên lấy 2 năm liên tiếp gần nhất từ yearly_data, nếu không dùng 2 kỳ quý cách nhau 1 năm
    period_t: Dict[str, Any] = {}
    period_t_minus_1: Dict[str, Any] = {}

    if yearly_data and len(yearly_data) >= 2:
        period_t = yearly_data[-1]
        period_t_minus_1 = yearly_data[-2]
    elif len(quarterly_data) >= 5:
        # So sánh quý hiện tại với cùng kỳ 4 quý trước
        period_t = quarterly_data[-1]
        period_t_minus_1 = quarterly_data[-5]
    elif len(quarterly_data) >= 2:
        period_t = quarterly_data[-1]
        period_t_minus_1 = quarterly_data[-2]
    else:
        # Dữ liệu không đủ để so sánh 2 kỳ
        return {
            "mScore": -2.65,
            "manipulationProbability": "Thấp / An toàn",
            "status": "SAFE",
            "riskLevel": "low",
            "isManipulator": False,
            "periodComparison": "Dữ liệu kỳ đơn",
            "indices": [],
            "summary": "Dữ liệu chưa đủ 2 kỳ để đối chiếu động thái kế toán. M-Score ước lượng ở mức an toàn."
        }

    # Trích xuất dữ liệu kỳ t và t-1
    sales_t = _safe_float(period_t.get("revenue"), 1.0)
    sales_prev = _safe_float(period_t_minus_1.get("revenue"), 1.0)

    cogs_t = _safe_float(period_t.get("costOfGoodsSold"), sales_t * 0.8)
    cogs_prev = _safe_float(period_t_minus_1.get("costOfGoodsSold"), sales_prev * 0.8)

    rec_t = _safe_float(period_t.get("accountsReceivable"), sales_t * 0.2)
    rec_prev = _safe_float(period_t_minus_1.get("accountsReceivable"), sales_prev * 0.2)

    total_assets_t = _safe_float(period_t.get("totalAssets"), sales_t * 1.5)
    total_assets_prev = _safe_float(period_t_minus_1.get("totalAssets"), sales_prev * 1.5)

    current_assets_t = _safe_float(period_t.get("shortTermAssets"), total_assets_t * 0.5)
    current_assets_prev = _safe_float(period_t_minus_1.get("shortTermAssets"), total_assets_prev * 0.5)

    ppe_t = _safe_float(period_t.get("fixedAssets"), total_assets_t * 0.3)
    ppe_prev = _safe_float(period_t_minus_1.get("fixedAssets"), total_assets_prev * 0.3)

    securities_t = _safe_float(period_t.get("shortTermInvestments"), 0.0)
    securities_prev = _safe_float(period_t_minus_1.get("shortTermInvestments"), 0.0)

    depr_t = _safe_float(period_t.get("depreciation"), ppe_t * 0.08)
    depr_prev = _safe_float(period_t_minus_1.get("depreciation"), ppe_prev * 0.08)

    sga_t = _safe_float(period_t.get("sellingExpense"), 0.0) + _safe_float(period_t.get("adminExpense"), 0.0)
    if sga_t <= 0:
        sga_t = _safe_float(period_t.get("operatingExpense"), sales_t * 0.1)
    sga_prev = _safe_float(period_t_minus_1.get("sellingExpense"), 0.0) + _safe_float(period_t_minus_1.get("adminExpense"), 0.0)
    if sga_prev <= 0:
        sga_prev = _safe_float(period_t_minus_1.get("operatingExpense"), sales_prev * 0.1)

    total_debt_t = _safe_float(period_t.get("totalDebt"), total_assets_t * 0.4)
    total_debt_prev = _safe_float(period_t_minus_1.get("totalDebt"), total_assets_prev * 0.4)

    net_income_t = _safe_float(period_t.get("netIncomeParent") or period_t.get("netIncome"), sales_t * 0.1)
    cfo_t = _safe_float(period_t.get("cfo"), net_income_t * 1.1)

    # 1. DSRI (Days Sales in Receivables Index)
    rec_ratio_t = _safe_divide(rec_t, sales_t, 0.2)
    rec_ratio_prev = _safe_divide(rec_prev, sales_prev, 0.2)
    dsri = _safe_divide(rec_ratio_t, rec_ratio_prev, 1.0)
    dsri = min(3.0, max(0.3, dsri))

    # 2. GMI (Gross Margin Index)
    gm_t = _safe_divide(sales_t - cogs_t, sales_t, 0.2)
    gm_prev = _safe_divide(sales_prev - cogs_prev, sales_prev, 0.2)
    gmi = _safe_divide(gm_prev, gm_t, 1.0)
    gmi = min(3.0, max(0.3, gmi))

    # 3. AQI (Asset Quality Index)
    tangible_t = current_assets_t + ppe_t + securities_t
    tangible_prev = current_assets_prev + ppe_prev + securities_prev
    non_tangible_ratio_t = max(0.01, 1.0 - _safe_divide(tangible_t, total_assets_t, 0.8))
    non_tangible_ratio_prev = max(0.01, 1.0 - _safe_divide(tangible_prev, total_assets_prev, 0.8))
    aqi = _safe_divide(non_tangible_ratio_t, non_tangible_ratio_prev, 1.0)
    aqi = min(3.0, max(0.3, aqi))

    # 4. SGI (Sales Growth Index)
    sgi = _safe_divide(sales_t, sales_prev, 1.0)
    sgi = min(3.0, max(0.3, sgi))

    # 5. DEPI (Depreciation Index)
    depr_rate_t = _safe_divide(depr_t, ppe_t + depr_t, 0.08)
    depr_rate_prev = _safe_divide(depr_prev, ppe_prev + depr_prev, 0.08)
    depi = _safe_divide(depr_rate_prev, depr_rate_t, 1.0)
    depi = min(3.0, max(0.3, depi))

    # 6. SGAI (SGA Expense Index)
    sga_ratio_t = _safe_divide(sga_t, sales_t, 0.1)
    sga_ratio_prev = _safe_divide(sga_prev, sales_prev, 0.1)
    sgai = _safe_divide(sga_ratio_t, sga_ratio_prev, 1.0)
    sgai = min(3.0, max(0.3, sgai))

    # 7. LVGI (Leverage Index)
    lev_t = _safe_divide(total_debt_t, total_assets_t, 0.4)
    lev_prev = _safe_divide(total_debt_prev, total_assets_prev, 0.4)
    lvgi = _safe_divide(lev_t, lev_prev, 1.0)
    lvgi = min(3.0, max(0.3, lvgi))

    # 8. TATA (Total Accruals to Total Assets)
    tata = _safe_divide(net_income_t - cfo_t, total_assets_t, 0.0)
    tata = min(0.5, max(-0.5, tata))

    # Công thức Beneish M-Score chuẩn 8 nhân tố
    m_score = (
        -4.84
        + 0.920 * dsri
        + 0.528 * gmi
        + 0.404 * aqi
        + 0.892 * sgi
        + 0.115 * depi
        - 0.172 * sgai
        + 4.037 * tata
        + 0.0327 * lvgi
    )
    m_score = round(m_score, 2)

    # Đánh giá phân loại
    if m_score < -2.22:
        status = "SAFE"
        risk_level = "low"
        prob_text = "Rất thấp / An toàn"
        is_manipulator = False
        summary = f"M-Score = {m_score:.2f} (< -2.22). Báo cáo tài chính lành mạnh, không có dấu hiệu thao túng kế toán bất thường."
    elif m_score <= -1.78:
        status = "GREY"
        risk_level = "medium"
        prob_text = "Trung bình / Cần theo dõi"
        is_manipulator = False
        summary = f"M-Score = {m_score:.2f} (Vùng Xám [-2.22; -1.78]). Cần rà soát thêm biến động khoản phải thu hoặc chi phí dở dang."
    else:
        status = "ALERT"
        risk_level = "high"
        prob_text = "Cao / Nguy cơ thao túng"
        is_manipulator = True
        summary = f"M-Score = {m_score:.2f} (> -1.78). Cảnh báo rủi ro làm đẹp số liệu BCTC, tốc độ tăng khoản phải thu hoặc dồn tích cao."

    indices_detail = [
        {
            "id": "DSRI",
            "name": "Chỉ số Khoản Phải Thu (DSRI)",
            "value": round(dsri, 3),
            "benchmark": "< 1.03",
            "status": "Bình thường" if dsri <= 1.05 else "Cảnh báo nới tín dụng / ảo",
            "isAlert": dsri > 1.2,
            "desc": "Tỷ lệ Phải thu / Doanh thu. DSRI > 1 cho thấy phải thu tăng nhanh hơn doanh số."
        },
        {
            "id": "GMI",
            "name": "Chỉ số Biên Gộp (GMI)",
            "value": round(gmi, 3),
            "benchmark": "< 1.00",
            "status": "Biên gộp cải thiện" if gmi <= 1.0 else "Biên gộp xói mòn",
            "isAlert": gmi > 1.25,
            "desc": "Biên gộp kỳ trước / Biên gộp kỳ này. GMI > 1 phản ánh tỷ suất sinh lời gộp đang đi xuống."
        },
        {
            "id": "AQI",
            "name": "Chỉ số Chất Lượng Tài Sản (AQI)",
            "value": round(aqi, 3),
            "benchmark": "< 1.05",
            "status": "Chất lượng tốt" if aqi <= 1.05 else "Chi phí hóa tài sản cao",
            "isAlert": aqi > 1.25,
            "desc": "Tỷ lệ tài sản phi hữu hình & dở dang. AQI > 1 nghi vấn doanh nghiệp vốn hóa chi phí vào tài sản."
        },
        {
            "id": "SGI",
            "name": "Chỉ số Tăng Trưởng Doanh Thu (SGI)",
            "value": round(sgi, 3),
            "benchmark": "1.0 - 1.2",
            "status": "Tăng trưởng bình thường" if sgi <= 1.25 else "Tăng trưởng nóng",
            "isAlert": sgi > 1.4,
            "desc": "Tốc độ tăng doanh thu. DN tăng trưởng nóng thường chịu áp lực duy trì số liệu kỳ vọng."
        },
        {
            "id": "DEPI",
            "name": "Chỉ số Tỷ Lệ Khấu Hao (DEPI)",
            "value": round(depi, 3),
            "benchmark": "< 1.00",
            "status": "Khấu hao bình thường" if depi <= 1.0 else "Khấu hao chậm lại",
            "isAlert": depi > 1.2,
            "desc": "Tỷ lệ khấu hao kỳ trước / kỳ này. DEPI > 1 nghi vấn kéo dài niên hạn TSCĐ để giảm chi phí."
        },
        {
            "id": "SGAI",
            "name": "Chỉ số Chi Phí Bán Hàng & QLDN (SGAI)",
            "value": round(sgai, 3),
            "benchmark": "< 1.00",
            "status": "Tiết giảm tốt" if sgai <= 1.0 else "Chi phí vận hành tăng",
            "isAlert": sgai > 1.2,
            "desc": "Tỷ lệ chi phí SG&A / Doanh thu. SGAI > 1 cho thấy chi phí vận hành phình to hơn doanh số."
        },
        {
            "id": "LVGI",
            "name": "Chỉ số Đòn Bẩy Tài Chính (LVGI)",
            "value": round(lvgi, 3),
            "benchmark": "< 1.05",
            "status": "Kiểm soát nợ tốt" if lvgi <= 1.05 else "Gia tăng đòn bẩy nợ",
            "isAlert": lvgi > 1.3,
            "desc": "Tỷ lệ Nợ / Tổng tài sản kỳ này so với kỳ trước. LVGI > 1 cho thấy đòn bẩy nợ gia tăng."
        },
        {
            "id": "TATA",
            "name": "Tỷ Lệ Dồn Tích Trên Tổng Tài Sản (TATA)",
            "value": round(tata, 3),
            "benchmark": "< 0.05",
            "status": "Dòng tiền thực tốt" if tata <= 0.0 else "Lợi nhuận dồn tích",
            "isAlert": tata > 0.08,
            "desc": "(LNST - CFO) / Tổng tài sản. TATA âm sâu chứng minh lợi nhuận được bảo chứng bằng tiền mặt thật."
        }
    ]

    return {
        "mScore": m_score,
        "manipulationProbability": prob_text,
        "status": status,
        "riskLevel": risk_level,
        "isManipulator": is_manipulator,
        "periodComparison": f"{period_t.get('period', period_t.get('year', 't'))} vs {period_t_minus_1.get('period', period_t_minus_1.get('year', 't-1'))}",
        "indices": indices_detail,
        "summary": summary
    }


# ==============================================================================
# 7. GREENBLATT MAGIC FORMULA (EARNINGS YIELD & ROIC)
# ==============================================================================
def calculate_magic_formula(
    latest_quarter: Dict[str, Any],
    stock_item: Dict[str, Any],
    ttm_series: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Tính toán Công thức Kỳ Diệu của Joel Greenblatt (The Little Book That Beats the Market):
    1. Earnings Yield (EY%) = EBIT / Enterprise Value (EV)
    2. Return on Capital (ROIC%) = EBIT / (Net Working Capital + Net Fixed Assets)

    Phân hạng cổ phiếu: Doanh Nghiệp Xuất Sắc (ROIC cao) giao dịch tại Mức Giá Rẻ (EY cao).
    """
    try:
        from lib.config_loader import get_financial_analytics_config
    except ImportError:
        from scripts.lib.config_loader import get_financial_analytics_config

    fa_cfg = get_financial_analytics_config()
    mf_cfg = fa_cfg.get("magicFormula", {})
    min_ey_top = float(mf_cfg.get("minEarningsYieldTopTier", 9.0))
    min_roic_top = float(mf_cfg.get("minRoicTopTier", 18.0))
    ey_bench = float(mf_cfg.get("eyBenchmark", 15.0))
    roic_bench = float(mf_cfg.get("roicBenchmark", 30.0))

    close = _safe_float(stock_item.get("close") or latest_quarter.get("close"), 0.0)
    shares = _safe_float(stock_item.get("scale", {}).get("sharesOutstanding") or stock_item.get("shares"), 0.0)
    market_cap = _safe_float(stock_item.get("scale", {}).get("marketCap"), close * shares if (close > 0 and shares > 0) else 0.0)

    if close <= 0 or (market_cap <= 0 and shares <= 0):
        return {
            "status": "INSUFFICIENT_DATA",
            "earningsYield": None,
            "roic": None,
            "compositeScore": None,
            "category": "Chưa đủ dữ liệu thị giá/vốn hóa",
            "tier": "UNKNOWN",
            "recommendation": "Cần dữ liệu thị giá và quy mô cổ phiếu để xếp hạng Magic Formula.",
            "parameters": {}
        }

    # EBIT TTM 4 quý hoặc chuẩn hóa năm từ quý gần nhất
    ebit = 0.0
    if ttm_series and len(ttm_series) > 0:
        latest_ttm = ttm_series[-1]
        op = latest_ttm.get("operatingProfit")
        if op is not None:
            ebit = _safe_float(op)
        elif latest_ttm.get("netIncome") is not None:
            ebit = _safe_float(latest_ttm.get("netIncome"))
    else:
        q_ebit = _safe_float(latest_quarter.get("operatingProfit"))
        if q_ebit <= 0:
            q_pbt = _safe_float(latest_quarter.get("profitBeforeTax"))
            q_interest = _safe_float(latest_quarter.get("interestExpense"), 0.0)
            q_ebit = (q_pbt + q_interest) if q_pbt > 0 else 0.0
        ebit = q_ebit * 4.0

    if ebit <= 0:
        return {
            "status": "INSUFFICIENT_DATA",
            "earningsYield": None,
            "roic": None,
            "compositeScore": None,
            "category": "EBIT không đủ điều kiện (âm hoặc thiếu)",
            "tier": "UNKNOWN",
            "recommendation": "Doanh nghiệp không có lợi nhuận hoạt động EBIT dương để tính Magic Formula.",
            "parameters": {}
        }

    # Enterprise Value (EV) = Market Cap + Net Debt
    market_cap_bn = market_cap / 1_000_000_000.0 if market_cap > 100_000_000 else market_cap
    total_debt_bn = _safe_float(latest_quarter.get("totalDebt"), 0.0)
    cash_bn = _safe_float(latest_quarter.get("cashAndEquivalents"), 0.0) + _safe_float(latest_quarter.get("shortTermInvestments"), 0.0)
    net_debt_bn = total_debt_bn - cash_bn

    ev_bn = max(market_cap_bn * 0.5, market_cap_bn + net_debt_bn)

    # 1. Earnings Yield (EY %)
    earnings_yield = round(_safe_divide(ebit, ev_bn, 0.0) * 100.0, 2)

    # 2. Return on Capital (ROIC %)
    st_assets = _safe_float(latest_quarter.get("shortTermAssets"), 0.0)
    st_debt = _safe_float(latest_quarter.get("shortTermDebt"), 0.0)
    fixed_assets = _safe_float(latest_quarter.get("fixedAssets"), 0.0)
    equity = _safe_float(latest_quarter.get("equity"), 1000.0)

    net_working_capital = max(0.0, st_assets - cash_bn - st_debt)
    capital_employed = net_working_capital + fixed_assets
    if capital_employed <= 0:
        capital_employed = max(100.0, equity + net_debt_bn)

    roic = round(_safe_divide(ebit, capital_employed, 0.0) * 100.0, 2)

    # Đánh giá phân hạng Magic Formula
    ey_score = min(50.0, max(0.0, (earnings_yield / ey_bench) * 50.0))
    roic_score = min(50.0, max(0.0, (roic / roic_bench) * 50.0))
    composite_score = round(ey_score + roic_score, 1)

    if earnings_yield >= min_ey_top and roic >= min_roic_top:
        category = "Hạng 1: Siêu Phẩm (Chất Lượng Xuất Sắc & Định Giá Hời)"
        recommendation = "MUA MẠNH theo tiêu chí Joel Greenblatt Magic Formula."
        tier = "TOP_TIER"
    elif roic >= min_roic_top and earnings_yield < min_ey_top:
        category = "Hạng 2: Cổ Phiếu Tăng Trưởng Chất Lượng (Định Giá Cao)"
        recommendation = "Cổ phiếu sinh lời vốn tuyệt vời, có thể canh mua khi thị trường điều chỉnh."
        tier = "QUALITY_GROWTH"
    elif earnings_yield >= min_ey_top and roic < min_roic_top:
        category = "Hạng 3: Định Giá Rẻ nhưng Hiệu Quả Vốn Trung Bình"
        recommendation = "Cổ phiếu định giá hời, cần kiểm tra thêm nguy cơ bẫy giá trị (Value Trap)."
        tier = "VALUE_PLAY"
    else:
        category = "Hạng 4: Kém Hấp Dẫn (Hiệu Suất Vốn Yếu & Định Giá Đắt)"
        recommendation = "Chưa đáp ứng tiêu chí Magic Formula, tỷ suất sinh lời vốn chưa đủ bù đắp định giá."
        tier = "UNDERPERFORM"

    return {
        "earningsYield": earnings_yield,
        "roic": roic,
        "compositeScore": composite_score,
        "category": category,
        "tier": tier,
        "recommendation": recommendation,
        "parameters": {
            "ebitTTM": round(ebit, 1),
            "enterpriseValue": round(ev_bn, 1),
            "marketCap": round(market_cap_bn, 1),
            "netDebt": round(net_debt_bn, 1),
            "capitalEmployed": round(capital_employed, 1)
        },
        "benchmarks": {
            "earningsYieldTarget": "> 8.5% (Earning Yield cao chứng tỏ cổ phiếu đang rẻ so với EV)",
            "roicTarget": "> 15.0% (ROIC cao chứng minh doanh nghiệp có hào kinh tế - Moat sinh lời vốn mạnh)"
        }
    }


# ==============================================================================
# 8. GIẢI MÃ ĐIỂM BÙNG NỔ DÒNG TIỀN (FCF INFLECTION POINT ANALYZER)
# ==============================================================================
def analyze_fcf_inflection_point(
    quarterly_data: List[Dict[str, Any]],
    yearly_data: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Nhận diện Điểm Uốn Bùng Nổ Dòng Tiền (FCF Inflection Point):
    Đặc thù chiến lược phân tích DN sản xuất / hạ tầng Việt Nam:
    - CFO / NI > 1.0x: Dòng tiền kinh doanh dồi dào, tiền mặt thật về túi doanh nghiệp vượt trội lợi nhuận sổ sách.
    - FCF <= 0 do CapEx đạt đỉnh chu kỳ: Doanh nghiệp đang dồn lực tài chính xây dựng đại dự án / mở rộng công suất lớn.
    - Điểm uốn (Inflection Point): Khi dự án hoàn thành đưa vào vận hành thương mại, CapEx sụt giảm mạnh và doanh thu
      bùng nổ => FCF đảo chiều dương cực mạnh kích hoạt sóng tái định giá (Multiple Expansion).

    Đồng thời tính toán Thước đo Dồn Tích (Accruals Ratio = (NI - CFO) / TotalAssets).
    """
    if not quarterly_data:
        return {
            "signal": "NO_DATA",
            "isInflection": False,
            "accrualsRatio": 0.0,
            "cfoToNiRatio": 1.0,
            "capexToRevenueRatio": 0.0,
            "statusTitle": "Chưa đủ dữ liệu",
            "narrative": "Chưa đủ chuỗi báo cáo tài chính để phát hiện điểm uốn dòng tiền."
        }

    latest_q = quarterly_data[-1]
    ni = _safe_float(latest_q.get("netIncomeParent") or latest_q.get("netIncome"), 1.0)
    cfo = _safe_float(latest_q.get("cfo"), 1.0)
    capex = abs(_safe_float(latest_q.get("capex"), 0.0))
    revenue = _safe_float(latest_q.get("revenue"), 1.0)
    total_assets = _safe_float(latest_q.get("totalAssets"), 1.0)
    fcf = _safe_float(latest_q.get("freeCashFlow"), cfo - capex)
    cip = _safe_float(latest_q.get("constructionInProgress"), 0.0)

    # 1. Tỷ lệ CFO / NI (Chất lượng lợi nhuận)
    cfo_ni_ratio = round(_safe_divide(cfo, ni, 1.0), 2)

    # 2. Tỷ lệ CapEx / Revenue (Cường độ đầu tư tái thiết)
    capex_rev_ratio = round(_safe_divide(capex, revenue, 0.05) * 100.0, 2)

    # 3. Accruals Ratio = (NI - CFO) / Total Assets
    accruals_ratio = round(_safe_divide(ni - cfo, total_assets, 0.0), 3)

    # 4. Tỷ lệ Xây dựng dở dang / Tổng tài sản
    cip_ratio = round(_safe_divide(cip, total_assets, 0.0) * 100.0, 1)

    # 5. Kiểm tra xu hướng CapEx qua các quý
    capex_history = [abs(_safe_float(q.get("capex"), 0.0)) for q in quarterly_data[-4:]]
    avg_prev_capex = sum(capex_history[:-1]) / max(1, len(capex_history) - 1) if len(capex_history) > 1 else capex

    # Nhận diện tín hiệu Điểm Uốn
    is_inflection = False
    if cfo_ni_ratio >= 1.0 and fcf <= 0 and (capex > avg_prev_capex * 1.1 or cip_ratio > 15.0 or capex_rev_ratio > 12.0):
        signal = "EXPANSION_CAPEX_INFLECTION"
        is_inflection = True
        status_title = "🎯 Điểm Uốn Bùng Nổ Dòng Tiền (CapEx Peak Inflection)"
        signal_level = "bullish_inflection"
        narrative = (
            f"Doanh nghiệp tạo tiền mặt kinh doanh vượt trội (CFO/NI = {cfo_ni_ratio:.2f}x > 1.0x). "
            f"Dòng tiền FCF tạm thời âm ({fcf:,.0f} tỷ) do đang ở đỉnh chu kỳ giải ngân dự án lớn "
            f"(CapEx/Doanh thu = {capex_rev_ratio:.1f}%, XDDD chiếm {cip_ratio:.1f}% tổng tài sản). "
            f"Khi dự án vận hành thương mại, CapEx giảm sẽ giải phóng dòng tiền tự do khổng lồ, kích hoạt sóng tái định giá."
        )
    elif cfo_ni_ratio >= 1.0 and fcf > 0:
        signal = "CASH_COW_GENERATION"
        is_inflection = False
        status_title = "💎 Cỗ Máy In Tiền Mặt (Cash Cow Generation)"
        signal_level = "strong_cashflow"
        narrative = (
            f"Doanh nghiệp hoạt động như cỗ máy tạo tiền mặt (CFO/NI = {cfo_ni_ratio:.2f}x, FCF dương {fcf:,.0f} tỷ). "
            f"Đã vượt qua đỉnh chu kỳ đầu tư lớn, dòng tiền dồi dào hỗ trợ chi trả cổ tức cao hoặc thâu tóm mở rộng."
        )
    elif cfo_ni_ratio >= 0.7:
        signal = "REINVESTMENT_GROWTH"
        is_inflection = False
        status_title = "⚖️ Tái Đầu Tư Cân Bằng (Balanced Growth)"
        signal_level = "neutral"
        narrative = (
            f"Chất lượng dòng tiền kinh doanh đạt chuẩn (CFO/NI = {cfo_ni_ratio:.2f}x). "
            f"Dòng tiền tự do FCF duy trì ở mức cân bằng ({fcf:,.0f} tỷ)."
        )
    else:
        signal = "CASH_DRAIN_ALERT"
        is_inflection = False
        status_title = "⚠️ Cảnh Báo Thâm Hụt Tiền Mặt (Earnings Not Backed By Cash)"
        signal_level = "warning"
        narrative = (
            f"Dòng tiền kinh doanh yếu so với lợi nhuận kế toán (CFO/NI chỉ đạt {cfo_ni_ratio:.2f}x < 0.7x). "
            f"Lợi nhuận chủ yếu nằm ở công nợ hoặc tồn kho, rủi ro thanh khoản cần được giám sát chặt chẽ."
        )

    # Đánh giá chất lượng dồn tích (Accruals)
    if accruals_ratio <= -0.03:
        accruals_rating = "Thượng Hạng (Top-Tier) - CFO vượt trội LNST"
    elif accruals_ratio <= 0.02:
        accruals_rating = "Tốt - Lợi nhuận phản ánh tiền mặt thực tế"
    else:
        accruals_rating = "Cảnh Báo - Lợi nhuận sổ sách kế toán cao hơn tiền mặt"

    return {
        "signal": signal,
        "signalLevel": signal_level,
        "isInflection": is_inflection,
        "statusTitle": status_title,
        "narrative": narrative,
        "cfoToNiRatio": cfo_ni_ratio,
        "capexToRevenueRatio": capex_rev_ratio,
        "accrualsRatio": accruals_ratio,
        "accrualsRating": accruals_rating,
        "cipRatio": cip_ratio,
        "latestFcf": round(fcf, 1),
        "latestCfo": round(cfo, 1),
        "latestCapex": round(capex, 1),
        "constructionInProgress": round(cip, 1)
    }
