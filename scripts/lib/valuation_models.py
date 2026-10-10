"""
scripts/lib/valuation_models.py
Tập hợp toàn bộ các mô hình định giá doanh nghiệp và phân tích chất lượng tài chính:
1. Benjamin Graham Number
2. Gordon Dividend Discount Model (DDM)
3. Giá mục tiêu theo P/E ngành lịch sử
4. Phân rã chất lượng lợi nhuận DuPont 3 Nhân tố
5. Dòng tiền tự do Free Cash Flow (FCF) & Chất lượng dòng tiền
6. Tăng trưởng kép hàng năm CAGR 3Y & 5Y
7. Động cơ chấm điểm kỹ thuật Active Tech Score (-6 đến +6)
"""

import math
from typing import Optional, Dict, Any, List

def calc_graham(eps: Optional[float], bvps: Optional[float]) -> Optional[int]:
    """
    Công thức Benjamin Graham: Giá trị nội tại = sqrt(22.5 * EPS * BVPS)
    (22.5 = 15x P/E tối đa * 1.5x P/B tối đa)
    """
    if eps and bvps and eps > 0 and bvps > 0:
        try:
            return round(math.sqrt(22.5 * eps * bvps))
        except Exception:
            return None
    return None

def calc_ddm(dps: Optional[float], r: float = 0.115, g: float = 0.035) -> Optional[int]:
    """
    Mô hình chiết khấu cổ tức Gordon Growth Model:
    P = DPS * (1 + g) / (r - g)
    Chuẩn hóa thị trường Việt Nam:
    - Chi phí vốn yêu cầu r = 11.5% (WACC)
    - Tăng trưởng cổ tức dài hạn thận trọng g = 3.5%
    """
    if dps and dps > 0 and r > g:
        try:
            return round((dps * (1 + g)) / (r - g))
        except Exception:
            return None
    return None

def calc_pe_target(eps: Optional[float], multiple: float = 11.5) -> Optional[int]:
    """
    Định giá theo P/E mục tiêu median 5 năm của doanh nghiệp niêm yết chất lượng.
    """
    if eps and eps > 0:
        return round(eps * multiple)
    return None

def calc_consensus_fair_value(candidates: List[Optional[int]], close: Optional[float]) -> Dict[str, Any]:
    """
    Tính giá trị hợp lý hội tụ (Consensus Fair Value) và Biên An Toàn (Margin of Safety).
    """
    valid = [c for c in candidates if c and c > 0]
    if not valid:
        return {
            "fairValue": None,
            "marginOfSafety": None,
            "rating": "NEUTRAL",
            "ratingText": "Chưa đủ dữ liệu định giá"
        }

    fair_val = round(sum(valid) / len(valid))
    mos = None
    if close and fair_val > 0:
        mos = round(((fair_val - close) / fair_val) * 100, 1)

    rating = "NEUTRAL"
    rating_text = "Hợp lý"
    if mos is not None:
        if mos >= 20.0:
            rating = "DEEP_VALUE"
            rating_text = "Rất Rẻ (Biên an toàn > 20%)"
        elif mos >= 5.0:
            rating = "ATTRACTIVE"
            rating_text = "Hấp Dẫn (Vùng Mua 5 - 20%)"
        elif mos >= -5.0:
            rating = "FAIR"
            rating_text = "Hợp Lý (Định giá cân bằng)"
        elif mos >= -20.0:
            rating = "EXPENSIVE"
            rating_text = "Định Giá Cao (-5% đến -20%)"
        else:
            rating = "RISKY"
            rating_text = "Rất Đắt / Rủi Ro (MoS < -20%)"

    return {
        "fairValue": fair_val,
        "marginOfSafety": mos,
        "rating": rating,
        "ratingText": rating_text
    }

def calc_dupont(net_income: Optional[float], revenue: Optional[float], total_assets: Optional[float], equity: Optional[float]) -> Dict[str, Any]:
    """
    Phân rã DuPont 3 Nhân tố:
    ROE = Biên Lợi Nhuận Ròng (NPM) * Vòng Quay Tài Sản * Đòn Bẩy Tài Chính (Equity Multiplier)
    """
    npm = None
    if net_income is not None and revenue and revenue > 0:
        npm = round((net_income / revenue) * 100, 2)

    turnover = None
    if revenue and total_assets and total_assets > 0:
        turnover = round(revenue / total_assets, 2)

    leverage = None
    if total_assets and equity and equity > 0:
        leverage = round(total_assets / equity, 2)

    roe = None
    if net_income is not None and equity and equity > 0:
        roe = round((net_income / equity) * 100, 2)

    assessment = "Dữ liệu đang được phân tích"
    if roe is not None and npm is not None:
        if npm > 12.0 and (leverage is None or leverage < 2.5):
            assessment = "Chất lượng cao: Tăng trưởng nhờ biên lợi nhuận cốt lõi vững chắc, nợ vay an toàn."
        elif npm < 5.0 and (leverage is not None and leverage > 3.0):
            assessment = "Cảnh báo rủi ro: ROE được thúc đẩy chủ yếu do đòn bẩy nợ vay cao trong khi biên lợi nhuận mỏng."
        elif npm >= 8.0:
            assessment = "Ổn định: Biên lợi nhuận khá, hiệu quả sử dụng tài sản ở mức hợp lý."
        else:
            assessment = "Trung bình: Cần theo dõi thêm sự cải thiện của biên lợi nhuận ròng."

    return {
        "roe": roe,
        "netProfitMargin": npm,
        "assetTurnover": turnover,
        "equityMultiplier": leverage,
        "qualityAssessment": assessment
    }

def calc_fcf(cfo: Optional[float], capex: Optional[float]) -> Optional[float]:
    """
    Dòng tiền tự do FCF = CFO - CapEx (Nếu capex đã mang dấu âm thì FCF = CFO + capex).
    """
    if cfo is None:
        return None
    if capex is None:
        return cfo
    if capex < 0:
        return cfo + capex
    return cfo - capex

def calc_cagr(start_val: Optional[float], end_val: Optional[float], periods: int) -> Optional[float]:
    """
    Tốc độ tăng trưởng kép hàng năm: CAGR = (End / Start) ^ (1 / n) - 1
    """
    if start_val and end_val and start_val > 0 and end_val > 0 and periods > 0:
        try:
            return round((math.pow(end_val / start_val, 1.0 / periods) - 1.0) * 100.0, 1)
        except Exception:
            return None
    return None

def calc_tech_score(close: Optional[float], high_52: Optional[float], low_52: Optional[float], rec_score: Optional[float]) -> Dict[str, Any]:
    """
    Chấm điểm xung lực kỹ thuật (-3 đến +3).
    """
    score = 0
    factors = []

    # 1. Đồng thuận khuyến nghị (-2 đến +2)
    if rec_score is not None:
        if rec_score >= 0.3:
            score += 2
            factors.append("Đồng thuận kỹ thuật: Tích cực")
        elif rec_score > 0.05:
            score += 1
            factors.append("Đồng thuận kỹ thuật: Khá")
        elif rec_score <= -0.3:
            score -= 2
            factors.append("Đồng thuận kỹ thuật: Tiêu cực")
        elif rec_score < -0.05:
            score -= 1
            factors.append("Đồng thuận kỹ thuật: Yếu")

    # 2. Vị thế đáy đỉnh 52 tuần (-1 đến +1)
    if close and high_52 and low_52 and high_52 > low_52:
        pos = ((close - low_52) / (high_52 - low_52)) * 100.0
        if pos < 15.0:
            score += 1
            factors.append("Thị giá ở vùng đáy 52 tuần (Vùng giá chiết khấu)")
        elif pos > 85.0:
            score -= 1
            factors.append("Thị giá tiệm cận đỉnh 52 tuần (Áp lực chốt lời lớn)")

    score = max(-3, min(3, score))

    if score >= 2:
        verdict = "Tích cực (Bullish)"
        color = "text-emerald-500 font-bold"
    elif score == 1:
        verdict = "Khá (Moderate Bullish)"
        color = "text-green-500 font-semibold"
    elif score == 0:
        verdict = "Trung lập (Neutral)"
        color = "text-gray-400"
    elif score == -1:
        verdict = "Kém (Moderate Bearish)"
        color = "text-rose-400 font-semibold"
    else:
        verdict = "Tiêu cực (Bearish)"
        color = "text-rose-500 font-bold"

    return {
        "techScore": score,
        "techScoreVerdict": verdict,
        "techScoreColor": color,
        "factors": factors
    }
