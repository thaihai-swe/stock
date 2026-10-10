"""
scripts/lib/valuation_engine.py
Hệ thống Động cơ Định giá Doanh nghiệp (Enterprise Stock Valuation Engine)
dành riêng cho Thị Trường Chứng Khoán Việt Nam (HOSE, HNX, UPCoM).

Bao gồm:
1. Mô hình Benjamin Graham Number
2. Mô hình Chiết khấu Cổ tức Gordon Dividend Discount Model (DDM)
3. Mô hình Định giá theo P/E Mục tiêu Ngành
4. Mô hình Định giá theo P/B Mục tiêu Ngành
5. Mô hình Định giá theo EV / EBITDA Multiple
6. Mô hình Định giá theo Price / Cash Flow (P/CF Multiple)
7. Mô hình Định giá theo Price / Sales (P/S Multiple)
8. Động cơ Tổng hợp Giá trị Hợp lý Hội tụ (Consensus Fair Value) & Biên An Toàn (MoS %)
9. Phân rã Hiệu quả Sinh lời DuPont 3 Nhân tố & Đánh giá Chất lượng Lợi nhuận
10. Động cơ Chấm điểm Xung lực Kỹ thuật (Technical Momentum Score -3 đến +3)
11. Dòng tiền tự do FCF & Tốc độ Tăng trưởng kép CAGR
"""

import math
from typing import Optional, Dict, Any, List


# ---------------------------------------------------------------------------
# CÁC THAM SỐ CHUẨN HÓA THỊ TRƯỜNG CHỨNG KHOÁN VIỆT NAM (DEFAULT BENCHMARKS)
# ---------------------------------------------------------------------------
DEFAULT_WACC = 0.115               # 11.5% Chi phí vốn bình quân yêu cầu (WACC thị trường VN)
DEFAULT_GROWTH_RATE = 0.035        # 3.5% Tốc độ tăng trưởng dài hạn thận trọng (g)
DEFAULT_PE_MULTIPLE = 11.5         # 11.5x P/E trung vị cổ phiếu chất lượng
DEFAULT_PB_MULTIPLE = 1.35         # 1.35x P/B trung vị thị trường
DEFAULT_EV_EBITDA_MULTIPLE = 7.5   # 7.5x EV/EBITDA trung vị ngành sản xuất & kinh doanh
DEFAULT_PCF_MULTIPLE = 8.0         # 8.0x P/CF trung vị dòng tiền hoạt động
DEFAULT_PS_MULTIPLE = 1.1          # 1.1x P/S trung vị doanh thu


# ---------------------------------------------------------------------------
# 1. CÁC MÔ HÌNH ĐỊNH GIÁ TOÁN HỌC ĐỘC LẬP
# ---------------------------------------------------------------------------

def calc_graham(eps: Optional[float], bvps: Optional[float], multiplier: float = 22.5) -> Optional[int]:
    """
    Công thức Benjamin Graham: Giá trị nội tại = sqrt(22.5 * EPS * BVPS)
    (22.5 tương đương P/E trần 15x * P/B trần 1.5x)
    Điều kiện: EPS > 0 và BVPS > 0.
    """
    if eps and bvps and eps > 0 and bvps > 0:
        try:
            return round(math.sqrt(multiplier * eps * bvps))
        except Exception:
            return None
    return None


def calc_ddm(dps: Optional[float], r: float = DEFAULT_WACC, g: float = DEFAULT_GROWTH_RATE) -> Optional[int]:
    """
    Mô hình Chiết khấu Cổ tức Gordon Growth Model:
    P = DPS * (1 + g) / (r - g)
    Áp dụng cho doanh nghiệp có dòng cổ tức tiền mặt đều đặn.
    Điều kiện: DPS > 0 và r > g.
    """
    if dps and dps > 0 and r > g:
        try:
            return round((dps * (1 + g)) / (r - g))
        except Exception:
            return None
    return None


def calc_pe_target(eps: Optional[float], multiple: float = DEFAULT_PE_MULTIPLE) -> Optional[int]:
    """
    Định giá theo P/E mục tiêu: Giá = EPS * Target P/E
    Điều kiện: EPS > 0 và multiple > 0.
    """
    if eps and eps > 0 and multiple > 0:
        return round(eps * multiple)
    return None


def calc_pb_target(bvps: Optional[float], multiple: float = DEFAULT_PB_MULTIPLE) -> Optional[int]:
    """
    Định giá theo P/B mục tiêu: Giá = BVPS * Target P/B
    Điều kiện: BVPS > 0 và multiple > 0.
    """
    if bvps and bvps > 0 and multiple > 0:
        return round(bvps * multiple)
    return None


def calc_ev_ebitda(ebitda: Optional[float], net_debt: Optional[float], shares: Optional[float], multiple: float = DEFAULT_EV_EBITDA_MULTIPLE) -> Optional[int]:
    """
    Định giá theo EV/EBITDA Multiple:
    Fair EV = EBITDA * Multiple
    Fair Market Cap = Fair EV - Net Debt
    Fair Price = Fair Market Cap / Shares Outstanding
    Đơn vị: ebitda và net_debt cùng đơn vị (ví dụ VNĐ hoặc Tỷ VNĐ), shares là tổng số lượng cổ phiếu.
    """
    if ebitda and ebitda > 0 and shares and shares > 0 and multiple > 0:
        try:
            debt = net_debt if net_debt is not None else 0
            fair_ev = ebitda * multiple
            fair_mcap = fair_ev - debt
            if fair_mcap > 0:
                return round(fair_mcap / shares)
        except Exception:
            return None
    return None


def calc_pcf(cfo: Optional[float], shares: Optional[float], multiple: float = DEFAULT_PCF_MULTIPLE) -> Optional[int]:
    """
    Định giá theo Price / Cash Flow (P/CF Multiple):
    Fair Market Cap = CFO * Multiple
    Fair Price = Fair Market Cap / Shares
    Điều kiện: CFO > 0 và shares > 0.
    """
    if cfo and cfo > 0 and shares and shares > 0 and multiple > 0:
        try:
            fair_mcap = cfo * multiple
            return round(fair_mcap / shares)
        except Exception:
            return None
    return None


def calc_ps_target(revenue: Optional[float], shares: Optional[float], multiple: float = DEFAULT_PS_MULTIPLE) -> Optional[int]:
    """
    Định giá theo Price / Sales (P/S Multiple):
    Fair Price = (Revenue * Multiple) / Shares
    Điều kiện: Revenue > 0 và shares > 0.
    """
    if revenue and revenue > 0 and shares and shares > 0 and multiple > 0:
        try:
            return round((revenue * multiple) / shares)
        except Exception:
            return None
    return None


# ---------------------------------------------------------------------------
# 2. ĐỘNG CƠ TỔNG HỢP GIÁ HỢP LÝ HỘI TỤ (CONSENSUS FAIR VALUE) & BIÊN AN TOÀN
# ---------------------------------------------------------------------------

def calc_consensus_fair_value(candidates: List[Optional[int]], close: Optional[float] = None) -> Dict[str, Any]:
    """
    Tính Giá trị Hợp lý Hội tụ (Consensus Fair Value) và Biên An Toàn (Margin of Safety - MoS %).
    Nhận vào danh sách kết quả của các mô hình độc lập (đã lọc các giá trị > 0).
    Trả về:
    - fairValue: Giá hội tụ (trung bình cộng các mô hình hợp lệ)
    - marginOfSafety: Biên an toàn % so với thị giá hiện tại
    - rating, ratingText, ratingBadge: Phân loại định giá theo chuẩn Tailwind CSS
    """
    valid = [c for c in candidates if c is not None and c > 0]
    if not valid:
        return {
            "fairValue": None,
            "marginOfSafety": None,
            "upside": None,
            "diffPercent": None,
            "rating": "NEUTRAL",
            "ratingText": "Chưa đủ dữ liệu định giá",
            "ratingBadge": "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
            "validModelsCount": 0
        }

    fair_val = round(sum(valid) / len(valid))
    mos = None
    upside = None
    if close and close > 0 and fair_val > 0:
        mos = round(((fair_val - close) / fair_val) * 100, 1)
        upside = round(((fair_val - close) / close) * 100, 1)

    rating = "NEUTRAL"
    rating_text = "Hợp lý"
    rating_badge = "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"

    if mos is not None:
        if mos >= 20.0:
            rating = "DEEP_VALUE"
            rating_text = "Rất Rẻ (Biên an toàn > 20%)"
            rating_badge = "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
        elif mos >= 5.0:
            rating = "ATTRACTIVE"
            rating_text = "Hấp Dẫn (Vùng Mua 5 - 20%)"
            rating_badge = "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
        elif mos >= -5.0:
            rating = "FAIR"
            rating_text = "Hợp Lý (Định giá cân bằng)"
            rating_badge = "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
        elif mos >= -20.0:
            rating = "EXPENSIVE"
            rating_text = "Định Giá Cao (-5% đến -20%)"
            rating_badge = "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
        else:
            rating = "RISKY"
            rating_text = "Rất Đắt / Rủi Ro (MoS < -20%)"
            rating_badge = "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"

    return {
        "fairValue": fair_val,
        "marginOfSafety": mos,
        "upside": upside,
        "diffPercent": upside,
        "rating": rating,
        "ratingText": rating_text,
        "ratingBadge": rating_badge,
        "validModelsCount": len(valid)
    }


# ---------------------------------------------------------------------------
# 3. PHÂN RÃ CHẤT LƯỢNG LỢI NHUẬN DUPONT 3 NHÂN TỐ
# ---------------------------------------------------------------------------

def calc_dupont(
    net_income: Optional[float] = None,
    revenue: Optional[float] = None,
    total_assets: Optional[float] = None,
    equity: Optional[float] = None,
    roe: Optional[float] = None,
    net_margin: Optional[float] = None
) -> Dict[str, Any]:
    """
    Phân rã DuPont 3 Nhân tố:
    ROE = Biên Lợi Nhuận Ròng (NPM) * Vòng Quay Tài Sản (Asset Turnover) * Đòn Bẩy Tài Chính (Equity Multiplier)
    """
    npm = None
    if net_margin is not None:
        npm = round(float(net_margin), 2)
    elif net_income is not None and revenue and revenue > 0:
        npm = round((net_income / revenue) * 100, 2)

    turnover = None
    if revenue and total_assets and total_assets > 0:
        turnover = round(revenue / total_assets, 2)

    leverage = None
    if total_assets and equity and equity > 0:
        leverage = round(total_assets / equity, 2)

    calc_roe = None
    if roe is not None:
        calc_roe = round(float(roe), 2)
    elif net_income is not None and equity and equity > 0:
        calc_roe = round((net_income / equity) * 100, 2)

    assessment = "Dữ liệu đang được tổng hợp"
    if calc_roe is not None and npm is not None:
        if npm > 12.0 and (leverage is None or leverage < 2.5):
            assessment = "Chất lượng cao: Tăng trưởng nhờ biên lợi nhuận cốt lõi vững chắc, nợ vay an toàn."
        elif npm < 5.0 and (leverage is not None and leverage > 3.0):
            assessment = "Cảnh báo rủi ro: ROE được thúc đẩy chủ yếu do đòn bẩy nợ vay cao trong khi biên lợi nhuận mỏng."
        elif npm >= 8.0:
            assessment = "Ổn định: Biên lợi nhuận khá, hiệu quả sử dụng tài sản ở mức hợp lý."
        else:
            assessment = "Trung bình: Cần theo dõi thêm sự cải thiện của biên lợi nhuận ròng."

    return {
        "roe": calc_roe,
        "netProfitMargin": npm,
        "assetTurnover": turnover,
        "equityMultiplier": leverage,
        "qualityAssessment": assessment
    }


# ---------------------------------------------------------------------------
# 4. ĐỘNG CƠ CHẤM ĐIỂM XUNG LỰC KỸ THUẬT (TECH SCORE)
# ---------------------------------------------------------------------------

def calc_tech_score(
    close: Optional[float],
    high_52: Optional[float],
    low_52: Optional[float],
    rec_score: Optional[float] = None,
    beta: Optional[float] = None
) -> Dict[str, Any]:
    """
    Chấm điểm xung lực kỹ thuật (-3 đến +3) dựa trên 3 trụ cột:
    1. Đồng thuận kỹ thuật TradingView Recommendation (-2 đến +2)
    2. Vị thế đáy/đỉnh 52 tuần (-1 đến +1)
    3. Hệ số biến động Beta (-1 đến +1)
    """
    score = 0
    factors = []

    # 1. TradingView Recommendation Factor (-2 đến +2)
    if rec_score is not None:
        if rec_score >= 0.3:
            score += 2
            factors.append("Đồng thuận kỹ thuật TradingView: Tích cực")
        elif rec_score > 0.05:
            score += 1
            factors.append("Đồng thuận kỹ thuật TradingView: Khá")
        elif rec_score <= -0.3:
            score -= 2
            factors.append("Đồng thuận kỹ thuật TradingView: Tiêu cực")
        elif rec_score < -0.05:
            score -= 1
            factors.append("Đồng thuận kỹ thuật TradingView: Yếu")

    # 2. Vị thế giá 52 tuần (-1 đến +1)
    if close is not None and high_52 is not None and low_52 is not None and high_52 > low_52:
        pos = ((close - low_52) / (high_52 - low_52)) * 100.0
        if pos < 15.0:
            score += 1
            factors.append("Thị giá ở vùng đáy 52 tuần (Vùng giá chiết khấu)")
        elif pos > 85.0:
            score -= 1
            factors.append("Thị giá tiệm cận đỉnh 52 tuần (Áp lực chốt lời lớn)")

    # 3. Hệ số Beta rủi ro
    if beta is not None:
        if 0.8 <= beta <= 1.25:
            score += 1
            factors.append(f"Hệ số Beta ổn định ({beta}x)")
        elif beta > 1.6:
            score -= 1
            factors.append(f"Hệ số Beta biến động rất cao ({beta}x)")

    # Giới hạn điểm trong dải [-3, +3]
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


# ---------------------------------------------------------------------------
# 5. DÒNG TIỀN TỰ DO FCF & TĂNG TRƯỞNG KÉP CAGR
# ---------------------------------------------------------------------------

def calc_fcf(cfo: Optional[float], capex: Optional[float]) -> Optional[float]:
    """
    Dòng tiền tự do FCF = CFO - CapEx.
    Nếu CapEx đã mang dấu âm thì FCF = CFO + CapEx.
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


# ---------------------------------------------------------------------------
# 6. CLASS ĐIỀU PHỐI CHÍNH: STOCK VALUATION ENGINE
# ---------------------------------------------------------------------------

class StockValuationEngine:
    """
    Động cơ định giá doanh nghiệp tập trung.
    Nhận snapshot dữ liệu tài chính của một cổ phiếu và sinh ra toàn bộ ma trận định giá hoàn chỉnh:
    - 6 mô hình độc lập (Graham, DDM, P/E, P/B, EV/EBITDA, P/CF)
    - Giá trị hợp lý hội tụ & Biên an toàn MoS %
    - Phân rã DuPont 3 nhân tố
    - Chấm điểm xung lực kỹ thuật
    """

    def __init__(
        self,
        wacc: float = DEFAULT_WACC,
        growth_rate: float = DEFAULT_GROWTH_RATE,
        pe_multiple: float = DEFAULT_PE_MULTIPLE,
        pb_multiple: float = DEFAULT_PB_MULTIPLE,
        ev_multiple: float = DEFAULT_EV_EBITDA_MULTIPLE,
        pcf_multiple: float = DEFAULT_PCF_MULTIPLE,
        ps_multiple: float = DEFAULT_PS_MULTIPLE,
    ):
        self.wacc = wacc
        self.growth_rate = growth_rate
        self.pe_multiple = pe_multiple
        self.pb_multiple = pb_multiple
        self.ev_multiple = ev_multiple
        self.pcf_multiple = pcf_multiple
        self.ps_multiple = ps_multiple

    def evaluate(self, stock_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Thực hiện đánh giá định giá toàn diện cho một cổ phiếu từ dictionary dữ liệu.
        Hỗ trợ cả định dạng phẳng hoặc lồng nhau từ TradingView Scanner / vnstock.
        """
        close = stock_data.get("close")
        if close is not None:
            close = float(close)

        eps = stock_data.get("eps")
        if eps is None and "profitability" in stock_data:
            eps = stock_data["profitability"].get("eps")
        if eps is not None:
            eps = float(eps)

        pb = stock_data.get("pb")
        if pb is None and "valuation" in stock_data:
            pb = stock_data["valuation"].get("pb")
        if pb is not None:
            pb = float(pb)

        bvps = stock_data.get("bvps")
        if bvps is None and "valuation" in stock_data:
            bvps = stock_data["valuation"].get("bvps")

        total_assets = stock_data.get("totalAssets") or stock_data.get("total_assets")
        total_debt = stock_data.get("totalDebt") or stock_data.get("total_debt")
        equity = stock_data.get("equity")

        if total_assets and total_debt and not equity:
            equity = total_assets - total_debt

        # Ước lượng BVPS nếu chưa có
        if bvps is None:
            if close and pb and pb > 0:
                bvps = round(close / pb)
            elif equity and equity > 0 and total_assets and close:
                bvps = round(equity / (total_assets / (close or 10000)))

        dps = stock_data.get("dps")
        if dps is None and "dividends" in stock_data:
            dps = stock_data["dividends"].get("dps")
        if dps is not None:
            dps = float(dps)

        shares = stock_data.get("sharesOutstanding") or stock_data.get("shares")
        if shares is None and "scale" in stock_data:
            shares = stock_data["scale"].get("sharesOutstanding")
        if shares is not None:
            shares = float(shares)

        ebitda = stock_data.get("ebitda")
        if ebitda is None and "health" in stock_data:
            ebitda = stock_data["health"].get("ebitda")
        if ebitda is not None:
            ebitda = float(ebitda)

        cfo = stock_data.get("cfo") or stock_data.get("fcf")
        if cfo is None and "dividends" in stock_data:
            cfo = stock_data["dividends"].get("fcf")
        if cfo is not None:
            cfo = float(cfo)

        revenue = stock_data.get("revenue")
        if revenue is None and "scale" in stock_data:
            revenue = stock_data["scale"].get("revenue")
        if revenue is not None:
            revenue = float(revenue)

        net_income = stock_data.get("netIncome") or stock_data.get("net_income")
        if net_income is None and "scale" in stock_data:
            net_income = stock_data["scale"].get("netIncome")
        if net_income is not None:
            net_income = float(net_income)

        # 1. Tính toán các mô hình độc lập
        graham_val = calc_graham(eps, bvps)
        mos_graham = None
        if close and graham_val and graham_val > 0:
            mos_graham = round(((graham_val - close) / graham_val) * 100, 1)

        ddm_val = calc_ddm(dps, r=self.wacc, g=self.growth_rate)
        pe_target_val = calc_pe_target(eps, multiple=self.pe_multiple)
        pb_target_val = calc_pb_target(bvps, multiple=self.pb_multiple)

        # EV/EBITDA
        net_debt = total_debt if total_debt is not None else 0
        ev_ebitda_val = calc_ev_ebitda(ebitda, net_debt, shares, multiple=self.ev_multiple)

        # P/CF
        pcf_val = calc_pcf(cfo, shares, multiple=self.pcf_multiple)

        # P/S
        ps_val = calc_ps_target(revenue, shares, multiple=self.ps_multiple)

        # 2. Tập hợp ứng viên hội tụ
        candidates = [v for v in [graham_val, ddm_val, pe_target_val, pb_target_val, ev_ebitda_val, pcf_val] if v and v > 0]
        consensus_eval = calc_consensus_fair_value(candidates, close)

        fair_val = consensus_eval["fairValue"]
        mos_fair = consensus_eval["marginOfSafety"]
        rating = consensus_eval["rating"]
        rating_text = consensus_eval["ratingText"]
        rating_badge = consensus_eval["ratingBadge"]

        # Nếu không đủ ứng viên nhưng có Graham thì dùng rating Graham làm phụ trợ
        if fair_val is None and mos_graham is not None:
            if mos_graham >= 20.0:
                rating = "DEEP_VALUE"
                rating_text = "Rất Rẻ (Theo Graham > 20%)"
                rating_badge = "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
            elif mos_graham >= 5.0:
                rating = "ATTRACTIVE"
                rating_text = "Hấp Dẫn (Theo Graham)"
                rating_badge = "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
            elif mos_graham >= -10.0:
                rating = "FAIR"
                rating_text = "Hợp Lý (Theo Graham)"
                rating_badge = "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
            else:
                rating = "EXPENSIVE"
                rating_text = "Đắt (Cao hơn Graham Number)"
                rating_badge = "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"

        # 3. Phân rã DuPont 3 nhân tố
        roe_val = stock_data.get("roe")
        if roe_val is None and "profitability" in stock_data:
            roe_val = stock_data["profitability"].get("roe")

        net_margin_val = stock_data.get("netMargin")
        if net_margin_val is None and "profitability" in stock_data:
            net_margin_val = stock_data["profitability"].get("netMargin")

        dupont_eval = calc_dupont(
            net_income=net_income,
            revenue=revenue,
            total_assets=total_assets,
            equity=equity,
            roe=roe_val,
            net_margin=net_margin_val
        )

        # 4. Chấm điểm xung lực kỹ thuật
        h52 = stock_data.get("high52w") or stock_data.get("high_52")
        l52 = stock_data.get("low52w") or stock_data.get("low_52")
        rec_score = stock_data.get("recommendScore") or stock_data.get("rec_score")
        beta = stock_data.get("beta")

        tech_eval = calc_tech_score(close, h52, l52, rec_score, beta)

        # 5. Tính % chênh lệch giữa giá định giá từng mô hình so với thị giá hiện tại (Upside / Downside %)
        def calc_diff(target: Optional[int]) -> Optional[float]:
            if target is not None and target > 0 and close is not None and close > 0:
                return round(((target - close) / close) * 100, 1)
            return None

        graham_diff = calc_diff(graham_val)
        ddm_diff = calc_diff(ddm_val)
        pe_diff = calc_diff(pe_target_val)
        pb_diff = calc_diff(pb_target_val)
        ev_ebitda_diff = calc_diff(ev_ebitda_val)
        pcf_diff = calc_diff(pcf_val)
        ps_diff = calc_diff(ps_val)
        consensus_diff = consensus_eval.get("upside") or calc_diff(fair_val)

        # Kết quả định giá hợp nhất
        return {
            "bvps": bvps,
            "grahamNumber": graham_val,
            "marginOfSafetyGraham": mos_graham,
            "grahamDiffPercent": graham_diff,
            "ddmTarget": ddm_val,
            "ddmDiffPercent": ddm_diff,
            "peTarget": pe_target_val,
            "peDiffPercent": pe_diff,
            "pbTarget": pb_target_val,
            "pbDiffPercent": pb_diff,
            "evEbitdaFairPrice": ev_ebitda_val,
            "evEbitdaDiffPercent": ev_ebitda_diff,
            "pcfFairPrice": pcf_val,
            "pcfDiffPercent": pcf_diff,
            "psFairPrice": ps_val,
            "psDiffPercent": ps_diff,
            "fairValue": fair_val,
            "consensusFairValue": fair_val,
            "marginOfSafety": mos_fair,
            "marginOfSafetyFairValue": mos_fair,
            "upside": consensus_diff,
            "consensusDiffPercent": consensus_diff,
            "valuationRating": rating,
            "valuationRatingText": rating_text,
            "valuationRatingBadge": rating_badge,
            "validModelsCount": consensus_eval["validModelsCount"],
            "dupont": dupont_eval,
            "technicals": tech_eval
        }
