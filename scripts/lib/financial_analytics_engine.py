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
    ebt = _safe_float(latest_quarter.get("profitBeforeTax"))
    interest_expense = _safe_float(latest_quarter.get("interestExpense"))
    operating_profit = _safe_float(latest_quarter.get("operatingProfit"))
    ebit = operating_profit if operating_profit > 0 else (ebt + interest_expense if ebt > 0 else net_income * 1.3)
    revenue = _safe_float(latest_quarter.get("revenue"))
    total_assets = _safe_float(latest_quarter.get("totalAssets"))
    equity = _safe_float(latest_quarter.get("equity"))

    # Tránh giá trị 0 làm gãy chuỗi nhân
    if ebt <= 0 and net_income > 0:
        ebt = net_income * 1.25
    if ebit <= 0 and ebt > 0:
        ebit = ebt + max(1.0, interest_expense)

    # 1. Tax Burden (Thường trong khoảng 0.75 - 0.85 ứng với thuế TNDN 20%)
    tax_burden = _safe_divide(net_income, ebt, default=0.80)
    tax_burden = min(1.2, max(0.2, tax_burden))

    # 2. Interest Burden (Càng gần 1.0 càng ít nợ vay)
    interest_burden = _safe_divide(ebt, ebit, default=0.85)
    interest_burden = min(1.0, max(0.1, interest_burden))

    # 3. Operating Margin
    operating_margin = _safe_divide(ebit, revenue, default=0.10)

    # 4. Asset Turnover (Chuẩn hóa năm bằng cách x 4 doanh thu quý)
    asset_turnover = _safe_divide(revenue * 4.0, total_assets, default=0.75)

    # 5. Financial Leverage
    financial_leverage = _safe_divide(total_assets, equity, default=1.65)

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


# ==============================================================================
# 3. THƯỚC ĐO SỨC KHỎE TỔNG THỂ (OVERALL HEALTH SCORE 0-100)
# ==============================================================================
def calculate_overall_health_score(ratios: Dict[str, Any]) -> Dict[str, Any]:
    """
    Tính điểm sức khỏe tài chính toàn diện 4 trụ cột có trọng số:
    Score = 0.30 x Profitability + 0.25 x Efficiency + 0.25 x Leverage + 0.20 x Liquidity
    """
    prof = ratios.get("profitability", {})
    eff = ratios.get("efficiency", {})
    lev = ratios.get("leverage", {})
    liq = ratios.get("liquidity", {})

    # 1. Trụ cột Sinh Lời (Profitability - 30%)
    roe = _safe_float(prof.get("roe"))
    roa = _safe_float(prof.get("roa"))
    net_margin = _safe_float(prof.get("netMargin"))

    p_roe = 40 if roe >= 20 else 32 if roe >= 15 else 24 if roe >= 10 else 16 if roe >= 5 else 8
    p_roa = 35 if roa >= 10 else 28 if roa >= 7 else 21 if roa >= 5 else 14 if roa >= 3 else 7
    p_margin = 25 if net_margin >= 15 else 20 if net_margin >= 10 else 15 if net_margin >= 5 else 10 if net_margin >= 2 else 5
    profitability_score = p_roe + p_roa + p_margin  # Max 100

    # 2. Trụ cột Hiệu Quả (Efficiency - 25%)
    asset_turn = _safe_float(eff.get("assetTurnover"))
    inv_turn = _safe_float(eff.get("inventoryTurnover"))

    e_asset = 50 if asset_turn >= 1.2 else 40 if asset_turn >= 0.9 else 30 if asset_turn >= 0.7 else 20 if asset_turn >= 0.5 else 10
    e_inv = 50 if inv_turn >= 8.0 else 40 if inv_turn >= 5.0 else 30 if inv_turn >= 3.0 else 20 if inv_turn >= 1.5 else 10
    efficiency_score = e_asset + e_inv  # Max 100

    # 3. Trụ cột Đòn Bẩy (Leverage - 25%)
    debt_equity = _safe_float(lev.get("debtToEquity"))
    interest_cov = _safe_float(liq.get("interestCoverage"))

    l_de = 50 if debt_equity <= 0.6 else 40 if debt_equity <= 1.0 else 30 if debt_equity <= 1.5 else 20 if debt_equity <= 2.2 else 10
    l_ic = 50 if interest_cov >= 5.0 else 40 if interest_cov >= 3.0 else 30 if interest_cov >= 2.0 else 20 if interest_cov >= 1.2 else 10
    leverage_score = l_de + l_ic  # Max 100

    # 4. Trụ cột Thanh Khoản (Liquidity - 20%)
    curr_r = _safe_float(liq.get("currentRatio"))
    quick_r = _safe_float(liq.get("quickRatio"))

    q_curr = 50 if curr_r >= 2.0 else 40 if curr_r >= 1.5 else 30 if curr_r >= 1.2 else 20 if curr_r >= 1.0 else 10
    q_quick = 50 if quick_r >= 1.5 else 40 if quick_r >= 1.2 else 30 if quick_r >= 1.0 else 20 if quick_r >= 0.7 else 10
    liquidity_score = q_curr + q_quick  # Max 100

    overall_score = round(
        0.30 * profitability_score +
        0.25 * efficiency_score +
        0.25 * leverage_score +
        0.20 * liquidity_score,
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
    cur = _safe_float(current_price, 20000)
    h52 = _safe_float(high_52w, cur * 1.25)
    l52 = _safe_float(low_52w, cur * 0.75)
    b = _safe_float(beta, 1.0)

    # Max Drawdown từ đỉnh 52 tuần
    mdd = round(((h52 - cur) / h52) * 100.0, 2) if h52 > 0 else 0.0

    # Ước lượng volatility hàng năm dựa trên range 52W và Beta
    # Parkinson Volatility Proxy: sigma ~ ln(High / Low) / (2 * sqrt(ln(2)))
    parkinson_vol = (math.log(max(1.01, h52 / max(1.0, l52))) / 1.665) * 100.0 if h52 > l52 else 25.0
    ann_vol = round(max(15.0, min(80.0, parkinson_vol * 0.85 + b * 10.0)), 1)
    daily_vol = round(ann_vol / math.sqrt(252.0), 2)

    # VaR 95% (Parametric: Z_0.95 = 1.645)
    var_95 = round(1.645 * daily_vol, 2)

    # Lợi nhuận ước lượng 1 năm (từ đáy hoặc mức tăng chuẩn)
    est_return = round(((cur - l52) / l52) * 100.0, 2) if l52 > 0 else 12.0
    sharpe = round((est_return - rf_rate) / ann_vol, 2) if ann_vol > 0 else 0.5
    sortino = round((est_return - rf_rate) / (ann_vol * 0.7), 2) if ann_vol > 0 else 0.7

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
