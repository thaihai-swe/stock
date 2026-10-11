"""
scripts/lib/valuation_engine.py
Hệ thống Động cơ Định giá Doanh nghiệp (Enterprise Stock Valuation Engine)
dành riêng cho Thị Trường Chứng Khoán Việt Nam (HOSE, HNX, UPCoM).

Nâng cấp toàn diện kế thừa từ chuẩn định lượng ref-best-valuation (FAM v11.4P & Valuation Library 20260808):
1. 10 Mô hình Định giá Định lượng Độc lập (Graham Normalized, P/E Median, Gordon P/B, Multi-Stage DCF, DDM Fade, FCFF, FCFE, RIM/EVA, RNAV BĐS, EV/EBITDA & EV/Sales)
2. Ma trận Trọng số 23 Phân Ngành TTCK Việt Nam & Bộ lọc Ngoại lai Outlier Filtering (±60%)
3. Bộ Nhận diện 7 Bẫy Định giá (Valuation Traps Scanner) với cơ chế Phạt Trần Điểm khi Bẫy CAO
4. Hệ thống 7 Vùng Định giá (7 Price Zones) & Khung Quyết định 3 Tầng Gated (V40 / Q35 / T25)
5. Dải băng Định giá Lịch sử P25 - P50 - P75 (Historical Valuation Band)
6. Phòng Thí nghiệm FinVal Lab (Đối chiếu 20+ Chỉ tiêu vs SMA 5 Năm)
7. Đánh giá Độ An toàn & Bền vững Cổ tức (Dividend Sustainability Engine)
"""

from __future__ import annotations

import math
from typing import Optional, Dict, Any, List, Tuple


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
DEFAULT_RISK_FREE_RATE = 0.045     # 4.5% Lãi suất TPCP VN 10Y/20Y cơ sở


def _safe_float(val: Any, default: float = 0.0) -> float:
    if val is None:
        return default
    try:
        f = float(val)
        return default if math.isnan(f) or math.isinf(f) else f
    except (ValueError, TypeError):
        return default


def _safe_div(num: Optional[float], den: Optional[float], default: Optional[float] = None) -> Optional[float]:
    if num is None or den is None or den == 0.0:
        return default
    try:
        res = float(num) / float(den)
        return default if math.isnan(res) or math.isinf(res) else res
    except (ValueError, TypeError, ZeroDivisionError):
        return default


# ---------------------------------------------------------------------------
# 1. CÁC MÔ HÌNH ĐỊNH GIÁ TOÁN HỌC ĐỘC LẬP
# ---------------------------------------------------------------------------

def calc_graham(
    eps: Optional[float],
    bvps: Optional[float],
    multiplier: Optional[float] = None,
    pe_avg: Optional[float] = None,
    pb_avg: Optional[float] = None,
    rf: Optional[float] = None,
    g: Optional[float] = None,
    max_multiplier: float = 22.5,
    min_multiplier: float = 4.0
) -> Optional[int]:
    """
    Công thức Benjamin Graham thích ứng động (Dynamic Conservative Multiplier):
    1. Nếu có pe_avg và pb_avg:
       effective_multiplier = min(max_multiplier, max(min_multiplier, pe_avg * pb_avg))
       Tránh dùng cứng 22.5 (15.0 x 1.5) gây định giá quá hào phóng cho các ngành chu kỳ/thâm dụng vốn.
    2. Giá trị nội tại = sqrt(effective_multiplier * EPS * BVPS)
    3. Growth Formula (ref-best-valuation): Nếu có rf và g:
       V = (EPS * (7.0 + 1.0 * g_pct) * 4.4) / (rf_pct)
    Điều kiện: EPS > 0 và BVPS > 0.
    """
    if eps and bvps and eps > 0 and bvps > 0:
        try:
            # 1. Revised Growth Formula (nếu có rf và g từ ref-best-valuation)
            if rf is not None and rf > 0 and g is not None:
                g_pct = g * 100.0 if g < 1.0 else g
                rf_pct = rf * 100.0 if rf < 1.0 else rf
                val = (eps * (7.0 + min(20.0, max(0.0, g_pct))) * 4.4) / rf_pct
                return round(val) if val > 0 else None

            # 2. Xác định effective multiplier (thích ứng theo PE_avg và PB_avg)
            if multiplier is not None and multiplier > 0:
                eff_mult = multiplier
            elif pe_avg is not None and pb_avg is not None and pe_avg > 0 and pb_avg > 0:
                raw_mult = pe_avg * pb_avg
                eff_mult = min(max_multiplier, max(min_multiplier, raw_mult))
            else:
                eff_mult = max_multiplier

            return round(math.sqrt(eff_mult * eps * bvps))
        except Exception:
            return None
    return None


def calc_ddm(
    dps: Optional[float],
    r: float = DEFAULT_WACC,
    g: float = DEFAULT_GROWTH_RATE,
    div_consistency: Optional[float] = None
) -> Optional[int]:
    """
    Mô hình Chiết khấu Cổ tức Gordon Growth Model:
    P = DPS * (1 + g) / (r - g)
    Nếu có div_consistency (0.0 - 1.0 từ ref-best-valuation): g_eff = g * max(0.5, div_consistency).
    """
    if dps and dps > 0 and r > g:
        try:
            eff_g = g
            if div_consistency is not None:
                eff_g = g * max(0.5, min(1.0, float(div_consistency)))
            if r <= eff_g:
                eff_g = r - 0.015
            return round((dps * (1 + eff_g)) / (r - eff_g))
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


def calc_pb_target(
    bvps: Optional[float],
    multiple: float = DEFAULT_PB_MULTIPLE,
    roe: Optional[float] = None
) -> Optional[int]:
    """
    Định giá theo P/B mục tiêu: Giá = BVPS * Target P/B
    Nếu có roe < 12% và multiple > 2.0x: Áp dụng ROE Penalty từ ref-best-valuation:
    adj_pb = multiple * max(0.5, roe / 12.0)
    """
    if bvps and bvps > 0 and multiple > 0:
        adj_pb = multiple
        if roe is not None and roe > 0 and multiple > 2.0 and roe < 12.0:
            adj_pb = multiple * max(0.5, roe / 12.0)
        return round(bvps * adj_pb)
    return None


def calc_gordon_pb(
    bvps: Optional[float],
    roe: Optional[float],
    coe: float = DEFAULT_WACC,
    terminal_g: float = 0.03
) -> Optional[int]:
    """
    Mô hình Gordon P/B chuyên biệt cho Ngân Hàng & Tài Chính (từ ref-best-valuation):
    PB_fair = clamp((ROE - g) / (CoE - g), 0.5, 3.0)
    Fair Price = BVPS * PB_fair
    """
    if bvps and bvps > 0 and roe is not None:
        try:
            roe_dec = roe / 100.0 if roe > 1.0 else float(roe)
            coe_dec = coe / 100.0 if coe > 1.0 else float(coe)
            g_dec = terminal_g / 100.0 if terminal_g > 1.0 else float(terminal_g)
            if coe_dec <= g_dec:
                coe_dec = g_dec + 0.015
            gordon_pb = (roe_dec - g_dec) / (coe_dec - g_dec)
            fair_pb = max(0.5, min(3.0, gordon_pb))
            return round(bvps * fair_pb)
        except Exception:
            return None
    return None


def calc_ev_ebitda(
    ebitda: Optional[float],
    net_debt: Optional[float],
    shares: Optional[float],
    multiple: float = DEFAULT_EV_EBITDA_MULTIPLE
) -> Optional[int]:
    """
    Định giá theo EV/EBITDA Multiple:
    Fair EV = EBITDA * Multiple
    Fair Market Cap = Fair EV - Net Debt
    Fair Price = Fair Market Cap / Shares Outstanding
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
    """
    if revenue and revenue > 0 and shares and shares > 0 and multiple > 0:
        try:
            return round((revenue * multiple) / shares)
        except Exception:
            return None
    return None


def calc_multi_stage_dcf(
    base_fcf: Optional[float],
    shares: Optional[float],
    coe: float = DEFAULT_WACC,
    g1: float = 0.08,
    stage1_years: int = 3,
    stage2_years: int = 2,
    terminal_g: float = 0.03
) -> Optional[int]:
    """
    Mô hình DCF Đa Giai Đoạn (3-Stage DCF từ ref-best-valuation):
    - GĐ1 (1..stage1_years): Tăng trưởng cao g1
    - GĐ2 (stage1+1..stage1+stage2): Tăng trưởng chuyển tiếp s2 = (g1 + terminal_g) / 2
    - GĐ3 (Vĩnh viễn): Terminal Value = FCF_n * (1 + terminal_g) / (coe - terminal_g)
    Chiết khấu về hiện tại theo CoE / WACC.
    """
    if not base_fcf or base_fcf <= 0 or not shares or shares <= 0:
        return None
    try:
        r = coe / 100.0 if coe > 1.0 else float(coe)
        g_term = terminal_g / 100.0 if terminal_g > 1.0 else float(terminal_g)
        growth1 = g1 / 100.0 if g1 > 1.0 else float(g1)
        if r <= g_term:
            r = g_term + 0.015

        fcf_ps = base_fcf / shares
        total_pv = 0.0
        cur_fcf = fcf_ps

        for y in range(1, stage1_years + 1):
            cur_fcf *= (1.0 + growth1)
            total_pv += cur_fcf / ((1.0 + r) ** y)

        s2_growth = (growth1 + g_term) / 2.0
        for y in range(stage1_years + 1, stage1_years + stage2_years + 1):
            cur_fcf *= (1.0 + s2_growth)
            total_pv += cur_fcf / ((1.0 + r) ** y)

        tv = (cur_fcf * (1.0 + g_term)) / (r - g_term)
        pv_tv = tv / ((1.0 + r) ** (stage1_years + stage2_years))
        fair_val = total_pv + pv_tv
        return round(fair_val) if fair_val > 0 else None
    except Exception:
        return None


def calc_fcfe(
    cfo: Optional[float],
    capex: Optional[float],
    net_borrowing: Optional[float],
    shares: Optional[float],
    coe: float = DEFAULT_WACC,
    g: float = 0.04,
    terminal_g: float = 0.03
) -> Optional[int]:
    """
    Mô hình Chiết khấu Dòng tiền cho Cổ đông (FCFE từ ref-best-valuation):
    FCFE = CFO - CapEx + Net Borrowing
    Fair Price = (FCFE * (1 + g) / (CoE - terminal_g)) / Shares
    """
    if cfo is None or shares is None or shares <= 0:
        return None
    try:
        capex_val = abs(capex) if capex is not None else 0.0
        borrowing_val = net_borrowing if net_borrowing is not None else 0.0
        fcfe_val = cfo - capex_val + borrowing_val
        if fcfe_val <= 0:
            return None
        r = coe / 100.0 if coe > 1.0 else float(coe)
        g_term = terminal_g / 100.0 if terminal_g > 1.0 else float(terminal_g)
        growth = g / 100.0 if g > 1.0 else float(g)
        if r <= g_term:
            r = g_term + 0.015

        eq_val = (fcfe_val * (1.0 + growth)) / (r - g_term)
        if eq_val <= 0:
            return None
        return round(eq_val / shares)
    except Exception:
        return None


def calc_rim_eva(
    equity: Optional[float],
    roe: Optional[float],
    shares: Optional[float],
    coe: float = DEFAULT_WACC,
    forecast_years: int = 5,
    terminal_g: float = 0.03
) -> Optional[int]:
    """
    Mô hình Residual Income Model (RIM) / EVA (ref-best-valuation):
    Đặc biệt tối ưu cho Ngân Hàng, Chứng Khoán, Bảo Hiểm.
    EVA_t = Equity_{t-1} * (ROE - CoE)
    PV(EVA) = sum(EVA_t / (1 + CoE)^t)
    TV = (EVA_n * (1 + g)) / (CoE - g) / (1 + CoE)^n
    Fair Equity = Equity_0 + PV(EVA) + TV
    Fair Price = Fair Equity / Shares
    """
    if not equity or equity <= 0 or roe is None or not shares or shares <= 0:
        return None
    try:
        r = coe / 100.0 if coe > 1.0 else float(coe)
        g = terminal_g / 100.0 if terminal_g > 1.0 else float(terminal_g)
        roe_dec = roe / 100.0 if roe > 1.0 else float(roe)
        if r <= g:
            r = g + 0.015

        pv_eva = 0.0
        cur_eq = equity
        last_eva = 0.0
        for t in range(1, forecast_years + 1):
            eva_t = cur_eq * (roe_dec - r)
            pv_eva += eva_t / ((1.0 + r) ** t)
            cur_eq = cur_eq * (1.0 + (roe_dec * 0.70))  # Tái đầu tư 70% LNST
            last_eva = eva_t

        tv_eva = (last_eva * (1.0 + g)) / (r - g)
        pv_tv = tv_eva / ((1.0 + r) ** forecast_years)

        fair_equity = equity + pv_eva + pv_tv
        if fair_equity <= 0:
            return None
        return round(fair_equity / shares)
    except Exception:
        return None


def calc_rnav_real_estate(
    total_assets: Optional[float],
    total_debt: Optional[float],
    inventory: Optional[float],
    shares: Optional[float],
    current_liabilities: Optional[float] = None,
    discount_pct: float = 0.20,
    is_real_estate: bool = False
) -> Optional[int]:
    """
    Book NAV / RNAV (Revalued Net Asset Value từ ref-best-valuation):
    Base NAV = Total Assets - Total Debt.
    Đối với Bất Động Sản (RNAV):
    - Tồn kho dự án > 50% tổng tài sản: thưởng +10% tiềm năng quỹ đất.
    - Nợ ngắn hạn / Nợ vay > 60%: phạt -15% áp lực thanh khoản.
    - Áp dụng chiết khấu thận trọng NAV Discount (mặc định 20%).
    """
    if not total_assets or total_assets <= 0 or not shares or shares <= 0:
        return None
    try:
        debt = total_debt if total_debt is not None else 0.0
        base_nav = total_assets - debt
        if base_nav <= 0:
            return None

        adj_factor = 1.0
        if is_real_estate and inventory is not None:
            inv_ratio = inventory / total_assets
            ref_ratio = (current_liabilities / debt) if (current_liabilities and debt > 0) else 0.5
            adj_factor = 1.0 + (0.10 if inv_ratio > 0.5 else 0.0) - (0.15 if ref_ratio > 0.6 else 0.0)
            adj_factor = max(0.70, min(1.30, adj_factor))

        fair_equity = base_nav * (1.0 - discount_pct) * adj_factor
        if fair_equity <= 0:
            return None
        return round(fair_equity / shares)
    except Exception:
        return None


def calc_advanced_multiples(
    ebitda: Optional[float],
    revenue: Optional[float],
    net_debt: Optional[float],
    shares: Optional[float],
    target_ev_ebitda: float = DEFAULT_EV_EBITDA_MULTIPLE,
    target_ev_sales: float = DEFAULT_PS_MULTIPLE
) -> Optional[int]:
    """
    EV/EBITDA & EV/Sales kết hợp (ref-best-valuation):
    Fair EV = 0.5 * (EBITDA * EV_EBITDA) + 0.5 * (Revenue * EV_Sales)
    Fair Equity = Fair EV - Net Debt
    """
    if not shares or shares <= 0:
        return None
    try:
        debt = net_debt if net_debt is not None else 0.0
        val_ebitda = None
        if ebitda and ebitda > 0 and target_ev_ebitda > 0:
            ev = ebitda * target_ev_ebitda
            eq = ev - debt
            if eq > 0:
                val_ebitda = eq / shares
        val_sales = None
        if revenue and revenue > 0 and target_ev_sales > 0:
            ev_s = revenue * target_ev_sales
            eq_s = ev_s - debt
            if eq_s > 0:
                val_sales = eq_s / shares
        if val_ebitda and val_sales:
            return round((val_ebitda + val_sales) / 2.0)
        elif val_ebitda:
            return round(val_ebitda)
        elif val_sales:
            return round(val_sales)
        return None
    except Exception:
        return None


def calc_implied_fcf_yield(
    fcf: Optional[float],
    shares: Optional[float],
    rf: float = DEFAULT_RISK_FREE_RATE,
    size_premium: float = 0.015
) -> Optional[int]:
    """
    Implied Value từ FCF Yield (Chỉ dùng chẩn đoán / Diagnostic từ ref-best-valuation):
    Required FCF Yield = Rf + 3.0% + Size_Premium * 0.5
    Implied Market Cap = FCF / Required FCF Yield
    """
    if not fcf or fcf <= 0 or not shares or shares <= 0:
        return None
    try:
        req_yield = max(0.04, rf + 0.03 + (size_premium * 0.5))
        mcap = fcf / req_yield
        if mcap <= 0:
            return None
        return round(mcap / shares)
    except Exception:
        return None


# ---------------------------------------------------------------------------
# CÁC MÔ HÌNH ĐỊNH GIÁ CHIẾT KHẤU DÒNG TIỀN DCF & REVERSE DCF (REF-EQUITY-RESEARCH-VN)
# ---------------------------------------------------------------------------

SECTOR_WACC_BENCHMARKS = {
    "BANKING": 0.100,
    "MANUFACTURING": 0.105,
    "STEEL": 0.105,
    "HEAVY_INDUSTRY": 0.105,
    "REAL_ESTATE": 0.115,
    "RETAIL": 0.090,
    "CONSUMER": 0.090,
    "TECHNOLOGY": 0.090,
    "ENERGY": 0.100,
    "OIL_GAS": 0.100,
    "GENERAL": 0.105
}

def get_sector_wacc(industry_category: str = "GENERAL", beta: Optional[float] = 1.0) -> float:
    """
    Xác định WACC tham chiếu theo ngành TTCK VN và hiệu chỉnh theo Beta:
    WACC = Base_Sector_WACC + (beta - 1.0) * 1.5%
    """
    cat = (industry_category or "GENERAL").upper()
    base_wacc = SECTOR_WACC_BENCHMARKS.get(cat, SECTOR_WACC_BENCHMARKS["GENERAL"])
    b = float(beta) if beta is not None and beta > 0 else 1.0
    adjusted = base_wacc + (b - 1.0) * 0.015
    return round(max(0.075, min(0.160, adjusted)), 4)


def calc_dcf_fcff(
    base_fcff: Optional[float],
    wacc: float = DEFAULT_WACC,
    terminal_g: float = 0.03,
    net_debt: Optional[float] = 0.0,
    shares: Optional[float] = 1.0,
    growth_rates: Optional[List[float]] = None,
    projection_years: int = 5,
    historical_cagr: Optional[float] = None
) -> Dict[str, Any]:
    """
    Định giá Chiết khấu Dòng tiền Tự do Doanh nghiệp DCF (FCFF) với 3 Kịch Bản (Base, Bull, Bear).
    """
    if base_fcff is None or shares is None or shares <= 0:
        return {
            "status": "INVALID_INPUT",
            "basePrice": None,
            "bullPrice": None,
            "bearPrice": None,
            "fairPrice": None,
            "wacc": round(wacc * 100, 2),
            "terminalG": round(terminal_g * 100, 2),
            "note": "Thiếu dữ liệu dòng tiền hoặc số lượng cổ phiếu"
        }

    debt = float(net_debt) if net_debt is not None else 0.0

    if base_fcff <= 0:
        return {
            "status": "NEGATIVE_FCF",
            "basePrice": None,
            "bullPrice": None,
            "bearPrice": None,
            "fairPrice": None,
            "wacc": round(wacc * 100, 2),
            "terminalG": round(terminal_g * 100, 2),
            "note": "FCF0 âm — Khuyến nghị dùng phương pháp định giá EV/EBITDA hoặc P/B thay thế."
        }

    if growth_rates and len(growth_rates) >= projection_years:
        base_growths = growth_rates[:projection_years]
    elif historical_cagr is not None and not math.isnan(historical_cagr):
        start_g = max(0.03, min(0.25, float(historical_cagr)))
        base_growths = [
            round(start_g - (start_g - terminal_g) * (i / max(1, projection_years)), 4)
            for i in range(projection_years)
        ]
    else:
        base_growths = [0.10, 0.085, 0.07, 0.055, 0.045][:projection_years]

    def _compute_single_scenario(sc_growths: List[float], sc_wacc: float, sc_g: float) -> Optional[int]:
        if sc_wacc <= sc_g:
            return None
        pv_explicit = 0.0
        current_fcf = base_fcff
        for i, g in enumerate(sc_growths[:projection_years]):
            current_fcf *= (1.0 + g)
            pv_explicit += current_fcf / ((1.0 + sc_wacc) ** (i + 1))

        terminal_val = (current_fcf * (1.0 + sc_g)) / (sc_wacc - sc_g)
        pv_terminal = terminal_val / ((1.0 + sc_wacc) ** projection_years)
        ev = pv_explicit + pv_terminal
        equity = ev - debt
        if equity <= 0:
            return None
        return round(equity / shares)

    base_val = _compute_single_scenario(base_growths, wacc, terminal_g)
    bull_growths = [g + 0.03 for g in base_growths]
    bull_val = _compute_single_scenario(bull_growths, max(0.06, wacc - 0.005), min(0.045, terminal_g + 0.005))
    bear_growths = [max(0.01, g - 0.04) for g in base_growths]
    bear_val = _compute_single_scenario(bear_growths, wacc + 0.010, max(0.015, terminal_g - 0.010))

    return {
        "status": "SUCCESS",
        "basePrice": base_val,
        "bullPrice": bull_val,
        "bearPrice": bear_val,
        "fairPrice": base_val,
        "wacc": round(wacc * 100, 2),
        "terminalG": round(terminal_g * 100, 2),
        "note": "DCF FCFF 3 kịch bản: Base (Kế hoạch), Bull (+Tăng trưởng, -WACC), Bear (-Tăng trưởng, +WACC)"
    }


def calc_reverse_dcf(
    current_ev: Optional[float],
    base_fcff: Optional[float],
    wacc: float = DEFAULT_WACC,
    terminal_g: float = 0.03,
    max_iter: int = 50
) -> Optional[float]:
    """
    Reverse DCF: Dùng phương pháp Binary Search tìm tốc độ tăng trưởng ngụ ý g (Implied Growth Rate)
    sao cho PV(FCFF, g, WACC) = Enterprise Value hiện tại.
    """
    if not current_ev or current_ev <= 0 or not base_fcff or base_fcff <= 0 or wacc <= terminal_g:
        return None

    def _calc_ev_for_g(g_rate: float) -> float:
        pv = 0.0
        cf = base_fcff
        for i in range(1, 6):
            cf = base_fcff * ((1.0 + g_rate) ** i)
            pv += cf / ((1.0 + wacc) ** i)
        tv = (cf * (1.0 + terminal_g)) / (wacc - terminal_g)
        pv += tv / ((1.0 + wacc) ** 5)
        return pv

    lo = -0.30
    hi = 0.60
    for _ in range(max_iter):
        mid = (lo + hi) / 2.0
        ev_test = _calc_ev_for_g(mid)
        if ev_test < current_ev:
            lo = mid
        else:
            hi = mid

    implied_g = round(((lo + hi) / 2.0) * 100, 2)
    return implied_g


def calc_dcf_sensitivity_matrix(
    base_fcff: Optional[float],
    net_debt: Optional[float] = 0.0,
    shares: Optional[float] = 1.0,
    wacc_list: Optional[List[float]] = None,
    g_list: Optional[List[float]] = None,
    growth_rates: Optional[List[float]] = None,
    historical_cagr: Optional[float] = None
) -> Dict[str, Any]:
    """
    Tính bảng phân tích độ nhạy cảm 2 chiều (2D Sensitivity Matrix) cho DCF:
    WACC vs Terminal g.
    """
    waccs = wacc_list or [0.100, 0.105, 0.110, 0.120]
    gs = g_list or [0.020, 0.030, 0.040]

    if not base_fcff or base_fcff <= 0 or not shares or shares <= 0:
        return {
            "waccList": [round(w * 100, 1) for w in waccs],
            "gList": [round(g * 100, 1) for g in gs],
            "matrix": []
        }

    debt = float(net_debt) if net_debt is not None else 0.0
    matrix = []

    if growth_rates and len(growth_rates) >= 5:
        default_growths = growth_rates[:5]
    elif historical_cagr is not None and not math.isnan(historical_cagr):
        start_g = max(0.03, min(0.25, float(historical_cagr)))
        default_growths = [round(start_g - (start_g - 0.03) * (i / 5.0), 4) for i in range(5)]
    else:
        default_growths = [0.10, 0.085, 0.07, 0.055, 0.045]

    for w in waccs:
        row = []
        for g in gs:
            if w <= g:
                row.append(None)
                continue
            pv_explicit = 0.0
            cf = base_fcff
            for i, gr in enumerate(default_growths):
                cf *= (1.0 + gr)
                pv_explicit += cf / ((1.0 + w) ** (i + 1))
            tv = (cf * (1.0 + g)) / (w - g)
            pv_terminal = tv / ((1.0 + w) ** 5)
            ev = pv_explicit + pv_terminal
            eq = ev - debt
            row.append(round(eq / shares) if eq > 0 else None)
        matrix.append(row)

    return {
        "waccList": [round(w * 100, 1) for w in waccs],
        "gList": [round(g * 100, 1) for g in gs],
        "matrix": matrix
    }


# ---------------------------------------------------------------------------
# 2. ĐỘNG CƠ TỔNG HỢP GIÁ HỢP LÝ HỘI TỤ (CONSENSUS FAIR VALUE) & BIÊN AN TOÀN
# ---------------------------------------------------------------------------

def calc_consensus_fair_value(
    candidates: List[Optional[int]],
    close: Optional[float] = None,
    weights: Optional[List[float]] = None
) -> Dict[str, Any]:
    """
    Tính Giá trị Hợp lý Hội tụ (Consensus Fair Value) và Biên An Toàn (Margin of Safety - MoS %).
    Bảo đảm tương thích ngược 100% với các phiên bản trước.
    """
    if weights and len(weights) == len(candidates):
        valid_pairs = [(c, w) for c, w in zip(candidates, weights) if c is not None and c > 0 and w > 0]
        if not valid_pairs:
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
        total_w = sum(w for _, w in valid_pairs)
        fair_val = round(sum(c * w for c, w in valid_pairs) / total_w)
        valid_count = len(valid_pairs)
    else:
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
        valid_count = len(valid)

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
        "validModelsCount": valid_count
    }


# ---------------------------------------------------------------------------
# 3. MA TRẬN 23 PHÂN NGÀNH TTCK VN & BỘ LỌC NGOẠI LAI (OUTLIER FILTERING ±60%)
# ---------------------------------------------------------------------------

SECTOR_WEIGHTS_23: Dict[str, Dict[str, float]] = {
    "Ngân Hàng": {"pe": 0.13, "pb": 0.22, "graham": 0.05, "dcf": 0.00, "fcff": 0.00, "fcfe": 0.00, "rim": 0.18, "nav": 0.17, "evebitda": 0.00, "ddm": 0.25},
    "Chứng Khoán": {"pe": 0.25, "pb": 0.25, "graham": 0.08, "dcf": 0.00, "fcff": 0.00, "fcfe": 0.00, "rim": 0.15, "nav": 0.17, "evebitda": 0.00, "ddm": 0.10},
    "Bảo Hiểm": {"pe": 0.20, "pb": 0.22, "graham": 0.08, "dcf": 0.00, "fcff": 0.00, "fcfe": 0.00, "rim": 0.18, "nav": 0.12, "evebitda": 0.00, "ddm": 0.20},
    "Bất Động Sản": {"pe": 0.10, "pb": 0.18, "graham": 0.05, "dcf": 0.10, "fcff": 0.07, "fcfe": 0.05, "rim": 0.08, "nav": 0.32, "evebitda": 0.00, "ddm": 0.05},
    "Thép": {"pe": 0.20, "pb": 0.10, "graham": 0.05, "dcf": 0.18, "fcff": 0.12, "fcfe": 0.08, "rim": 0.00, "nav": 0.05, "evebitda": 0.22, "ddm": 0.00},
    "Dệt May": {"pe": 0.25, "pb": 0.10, "graham": 0.05, "dcf": 0.15, "fcff": 0.12, "fcfe": 0.08, "rim": 0.00, "nav": 0.05, "evebitda": 0.20, "ddm": 0.00},
    "Dược Phẩm & Y Tế": {"pe": 0.22, "pb": 0.08, "graham": 0.10, "dcf": 0.22, "fcff": 0.12, "fcfe": 0.08, "rim": 0.00, "nav": 0.03, "evebitda": 0.10, "ddm": 0.05},
    "Bán Lẻ": {"pe": 0.25, "pb": 0.08, "graham": 0.05, "dcf": 0.20, "fcff": 0.12, "fcfe": 0.08, "rim": 0.00, "nav": 0.04, "evebitda": 0.18, "ddm": 0.00},
    "Công Nghệ & Viễn Thông": {"pe": 0.22, "pb": 0.05, "graham": 0.05, "dcf": 0.25, "fcff": 0.15, "fcfe": 0.10, "rim": 0.00, "nav": 0.03, "evebitda": 0.15, "ddm": 0.00},
    "Dầu Khí": {"pe": 0.18, "pb": 0.08, "graham": 0.05, "dcf": 0.18, "fcff": 0.14, "fcfe": 0.08, "rim": 0.00, "nav": 0.05, "evebitda": 0.16, "ddm": 0.08},
    "Điện & Tiện Ích": {"pe": 0.18, "pb": 0.08, "graham": 0.05, "dcf": 0.18, "fcff": 0.14, "fcfe": 0.08, "rim": 0.00, "nav": 0.05, "evebitda": 0.16, "ddm": 0.08},
    "Xây Dựng": {"pe": 0.22, "pb": 0.15, "graham": 0.05, "dcf": 0.15, "fcff": 0.10, "fcfe": 0.08, "rim": 0.00, "nav": 0.07, "evebitda": 0.18, "ddm": 0.00},
    "Vật Liệu Xây Dựng": {"pe": 0.22, "pb": 0.15, "graham": 0.05, "dcf": 0.15, "fcff": 0.10, "fcfe": 0.08, "rim": 0.00, "nav": 0.07, "evebitda": 0.18, "ddm": 0.00},
    "Thủy Sản": {"pe": 0.22, "pb": 0.10, "graham": 0.05, "dcf": 0.18, "fcff": 0.12, "fcfe": 0.08, "rim": 0.00, "nav": 0.05, "evebitda": 0.15, "ddm": 0.05},
    "Thực Phẩm & Đồ Uống": {"pe": 0.22, "pb": 0.10, "graham": 0.05, "dcf": 0.18, "fcff": 0.12, "fcfe": 0.08, "rim": 0.00, "nav": 0.05, "evebitda": 0.15, "ddm": 0.05},
    "Khai Khoáng": {"pe": 0.20, "pb": 0.12, "graham": 0.05, "dcf": 0.18, "fcff": 0.12, "fcfe": 0.08, "rim": 0.00, "nav": 0.05, "evebitda": 0.15, "ddm": 0.05},
    "Phân Bón": {"pe": 0.20, "pb": 0.12, "graham": 0.05, "dcf": 0.18, "fcff": 0.12, "fcfe": 0.08, "rim": 0.00, "nav": 0.05, "evebitda": 0.15, "ddm": 0.05},
    "Hóa Chất": {"pe": 0.20, "pb": 0.12, "graham": 0.05, "dcf": 0.18, "fcff": 0.12, "fcfe": 0.08, "rim": 0.00, "nav": 0.05, "evebitda": 0.15, "ddm": 0.05},
    "Logistics & Vận Tải": {"pe": 0.18, "pb": 0.08, "graham": 0.05, "dcf": 0.22, "fcff": 0.14, "fcfe": 0.08, "rim": 0.00, "nav": 0.05, "evebitda": 0.15, "ddm": 0.05},
    "Hàng Không": {"pe": 0.18, "pb": 0.08, "graham": 0.05, "dcf": 0.22, "fcff": 0.14, "fcfe": 0.08, "rim": 0.00, "nav": 0.05, "evebitda": 0.15, "ddm": 0.05},
    "Giáo Dục": {"pe": 0.18, "pb": 0.08, "graham": 0.05, "dcf": 0.22, "fcff": 0.14, "fcfe": 0.08, "rim": 0.00, "nav": 0.05, "evebitda": 0.15, "ddm": 0.05},
    "Nông Nghiệp": {"pe": 0.20, "pb": 0.12, "graham": 0.05, "dcf": 0.18, "fcff": 0.12, "fcfe": 0.08, "rim": 0.00, "nav": 0.05, "evebitda": 0.15, "ddm": 0.05},
    "Cao Su": {"pe": 0.20, "pb": 0.12, "graham": 0.05, "dcf": 0.18, "fcff": 0.12, "fcfe": 0.08, "rim": 0.00, "nav": 0.05, "evebitda": 0.15, "ddm": 0.05},
    "Khác": {"pe": 0.15, "pb": 0.15, "graham": 0.08, "dcf": 0.15, "fcff": 0.12, "fcfe": 0.08, "rim": 0.08, "nav": 0.07, "evebitda": 0.07, "ddm": 0.05}
}


def normalize_sector_name(sector_str: str) -> str:
    s = (sector_str or "").strip().lower()
    if any(k in s for k in ["ngân hàng", "bank"]):
        return "Ngân Hàng"
    if any(k in s for k in ["chứng khoán", "securities"]):
        return "Chứng Khoán"
    if any(k in s for k in ["bảo hiểm", "insurance"]):
        return "Bảo Hiểm"
    if any(k in s for k in ["bất động sản", "địa ốc", "real estate"]):
        return "Bất Động Sản"
    if any(k in s for k in ["thép", "steel"]):
        return "Thép"
    if any(k in s for k in ["công nghệ", "viễn thông", "technology", "software"]):
        return "Công Nghệ & Viễn Thông"
    if any(k in s for k in ["bán lẻ", "retail"]):
        return "Bán Lẻ"
    if any(k in s for k in ["dầu khí", "oil", "gas"]):
        return "Dầu Khí"
    if any(k in s for k in ["điện", "tiện ích", "utilities", "energy"]):
        return "Điện & Tiện Ích"
    if any(k in s for k in ["dược", "y tế", "pharmaceutical"]):
        return "Dược Phẩm & Y Tế"
    if any(k in s for k in ["xây dựng", "construction"]):
        return "Xây Dựng"
    if any(k in s for k in ["thủy sản", "seafood"]):
        return "Thủy Sản"
    if any(k in s for k in ["thực phẩm", "đồ uống", "food", "beverage"]):
        return "Thực Phẩm & Đồ Uống"
    if any(k in s for k in ["hóa chất", "chemical"]):
        return "Hóa Chất"
    if any(k in s for k in ["phân bón", "fertilizer"]):
        return "Phân Bón"
    if any(k in s for k in ["vận tải", "logistics"]):
        return "Logistics & Vận Tải"
    if any(k in s for k in ["dệt may", "textile"]):
        return "Dệt May"
    return "Khác"


def get_method_suitability(method_name: str, sector: str, dps: Optional[float] = 0.0) -> Tuple[float, str]:
    """
    Tính hệ số phù hợp (Suitability Multiplier) theo chuẩn ref-best-valuation:
    - Tài chính: Tắt DCF, FCFF, FCFE, EV/EBITDA; giảm Graham còn 0.35.
    - DDM: = 0 nếu không có DPS; = 0.25 với BĐS.
    - NAV: = 0.45 với phi tài chính phi BĐS.
    - RIM: = 0.55 với phi tài chính.
    """
    sec = normalize_sector_name(sector)
    is_fin = sec in ["Ngân Hàng", "Chứng Khoán", "Bảo Hiểm"]
    is_re = sec == "Bất Động Sản"

    if is_fin and method_name in ["DCF", "FCFF", "FCFE", "EV/EBITDA"]:
        return 0.0, "N/A ngành TC"
    if is_fin and method_name == "Graham":
        return 0.35, "Ít phù hợp NH/CK"
    if method_name == "DDM" and (dps is None or dps <= 0):
        return 0.0, "Không có DPS"
    if method_name == "DDM" and is_re:
        return 0.25, "CT BĐS kém"
    if method_name == "NAV" and not is_fin and not is_re:
        return 0.45, "Thứ cấp phi TC/BĐS"
    if method_name == "RIM" and not is_fin:
        return 0.55, "Thứ cấp phi TC"
    return 1.0, "Phù hợp"


def filter_outliers_and_consensus(
    models: List[Dict[str, Any]],
    close: Optional[float] = None
) -> Dict[str, Any]:
    """
    Bộ lọc Ngoại Lai (Outlier Filtering ±60%) & Consensus Blending theo ref-best-valuation:
    1. Nhận danh sách các mô hình có value > 0 và effective_weight > 0.
    2. Tính median ban đầu.
    3. Lọc bỏ các mô hình có gap = abs(val - median) / median > 60% (gắn cờ isOutlier = True).
    4. Tính weighted average (Giá W) và median (Giá ĐT) từ các mô hình đạt chuẩn.
    5. Dispersion = abs(Giá W - Giá ĐT) / Giá ĐT * 100%.
    6. Nếu Dispersion > 25%: Intrinsic = min(Giá W, Giá ĐT).
       Ngược lại: Intrinsic = 0.6 * Giá W + 0.4 * Giá ĐT.
    """
    valid_candidates = [m for m in models if m.get("value") and m["value"] > 0 and m.get("weight", 0) > 0]
    total_suitable = len([m for m in models if m.get("weight", 0) > 0])

    if not valid_candidates:
        return {
            "fairValue": None,
            "weightedValue": None,
            "medianValue": None,
            "dispersionPct": 0.0,
            "consensusLevel": "LOW",
            "coveragePct": 0.0,
            "confidenceScore": 0.0,
            "modelsUsed": 0,
            "modelsValid": 0,
            "excludedOutliers": [],
            "models": models
        }

    # 1. Median ban đầu
    vals_initial = sorted([m["value"] for m in valid_candidates])
    mid_idx = len(vals_initial) // 2
    initial_median = (vals_initial[mid_idx] if len(vals_initial) % 2 != 0 else (vals_initial[mid_idx - 1] + vals_initial[mid_idx]) / 2.0)

    # 2. Lọc ngoại lai ±60%
    clean_candidates = []
    excluded_names = []

    for m in models:
        v = m.get("value")
        w = m.get("weight", 0)
        if v and v > 0 and w > 0:
            gap = abs(v - initial_median) / initial_median if initial_median > 0 else 0.0
            if gap <= 0.60:
                m["isOutlier"] = False
                m["outlierGapPct"] = round(gap * 100, 1)
                clean_candidates.append(m)
            else:
                m["isOutlier"] = True
                m["outlierGapPct"] = round(gap * 100, 1)
                excluded_names.append(m.get("name", m.get("id")))
        else:
            m["isOutlier"] = False
            m["outlierGapPct"] = 0.0

    if not clean_candidates:
        clean_candidates = valid_candidates

    # 3. Tính Giá W và Giá ĐT
    sum_w = sum(m["weight"] for m in clean_candidates)
    weighted_val = round(sum(m["value"] * m["weight"] for m in clean_candidates) / sum_w) if sum_w > 0 else initial_median

    clean_vals_sorted = sorted([m["value"] for m in clean_candidates])
    c_mid = len(clean_vals_sorted) // 2
    clean_median = round(clean_vals_sorted[c_mid] if len(clean_vals_sorted) % 2 != 0 else (clean_vals_sorted[c_mid - 1] + clean_vals_sorted[c_mid]) / 2.0)

    # 4. Dispersion & Consensus
    dispersion = round((abs(weighted_val - clean_median) / clean_median) * 100.0, 1) if clean_median > 0 else 0.0
    consensus_level = "HIGH" if dispersion < 15.0 else ("MED" if dispersion < 30.0 else "LOW")

    if dispersion > 25.0:
        consensus_fv = min(weighted_val, clean_median)
    else:
        consensus_fv = round((weighted_val * 0.60) + (clean_median * 0.40))

    models_used = len(clean_candidates)
    coverage = round((models_used / max(1, total_suitable)) * 100.0, 1)

    # 5. Statistical Confidence Score (0 - 100)
    # Dựa trên độ phân tán và số lượng mô hình đạt chuẩn
    conf_spread = 40.0 if dispersion < 15.0 else (30.0 if dispersion < 25.0 else (20.0 if dispersion < 40.0 else 10.0))
    conf_coverage = min(40.0, (coverage / 100.0) * 40.0)
    conf_sample = min(20.0, models_used * 3.0)
    confidence_score = round(min(100.0, conf_spread + conf_coverage + conf_sample), 1)

    return {
        "fairValue": consensus_fv,
        "weightedValue": weighted_val,
        "medianValue": clean_median,
        "dispersionPct": dispersion,
        "consensusLevel": consensus_level,
        "coveragePct": coverage,
        "confidenceScore": confidence_score,
        "modelsUsed": models_used,
        "modelsValid": len(valid_candidates),
        "excludedOutliers": excluded_names,
        "models": models
    }


# ---------------------------------------------------------------------------
# 4. BỘ PHÁT HIỆN 7 BẪY ĐỊNH GIÁ (VALUATION TRAPS SCANNER)
# ---------------------------------------------------------------------------

def detect_valuation_traps(
    pe: Optional[float],
    pb: Optional[float],
    roe: Optional[float],
    coe_pct: float,
    fcf: Optional[float],
    de: Optional[float],
    rev_cagr: Optional[float],
    eps_cagr: Optional[float],
    dps: Optional[float],
    sector: str,
    share_cagr: Optional[float] = None,
    wc_growth: Optional[float] = None,
    rev_growth: Optional[float] = None
) -> Dict[str, Any]:
    """
    Nhận diện 7 Bẫy Định Giá theo chuẩn ref-best-valuation:
    1. Value Trap: P/E < 7.5 hoặc P/B < 0.9 và tăng trưởng âm (EPS CAGR < 0 hoặc Rev CAGR < 0).
    2. Book Trap: P/B < 0.9 và ROE < CoE.
    3. Cyclical Peak: Ngành chu kỳ, P/E thấp nhưng FCF âm/yếu.
    4. Dividend Trap: DPS > 0 nhưng FCF âm kéo dài (phi tài chính).
    5. Debt Stress: D/E > 1.6 (hoặc > 4.5 với tài chính) kết hợp FCF âm.
    6. Share Dilution: Share CAGR > 10% và EPS CAGR < Share CAGR * 0.5.
    7. Working Capital Stress: WC Growth > 20% và > Rev Growth * 2.
    """
    sec_norm = normalize_sector_name(sector)
    is_fin = sec_norm in ["Ngân Hàng", "Chứng Khoán", "Bảo Hiểm"]
    is_cyc = sec_norm in ["Thép", "Hóa Chất", "Dầu Khí", "Thủy Sản", "Khai Khoáng", "Phân Bón", "Cao Su"]

    low_pe = pe is not None and 0 < pe < 7.5
    low_pb = pb is not None and 0 < pb < 0.9
    weak_growth = (eps_cagr is not None and eps_cagr < 0) or (rev_cagr is not None and rev_cagr < 0)
    weak_fcf = fcf is None or fcf <= 0
    roe_val = roe if roe is not None else 0.0
    roe_below_coe = (roe_val < coe_pct) if roe_val > 0 else True
    debt_threshold = 4.5 if is_fin else 1.6
    high_debt = de is not None and de > debt_threshold

    trap_value = (low_pe or low_pb) and weak_growth
    trap_book = low_pb and roe_below_coe
    trap_cyc = is_cyc and low_pe and weak_fcf
    trap_div = (dps is not None and dps > 0 and weak_fcf and not is_fin)
    trap_debt = high_debt and weak_fcf
    trap_dilution = (share_cagr is not None and share_cagr > 10.0 and
                     (eps_cagr is None or eps_cagr < share_cagr * 0.5))
    trap_wc = (wc_growth is not None and rev_growth is not None and
               wc_growth > 20.0 and wc_growth > (rev_growth * 2.0))

    trap_score = (
        (2.5 if trap_value else 0.0) +
        (2.5 if trap_book else 0.0) +
        (2.0 if trap_cyc else 0.0) +
        (1.5 if trap_div else 0.0) +
        (2.0 if trap_debt else 0.0) +
        (1.5 if trap_dilution else 0.0) +
        (1.5 if trap_wc else 0.0)
    )

    traps_detected = []
    if trap_value:
        traps_detected.append("Value Trap (Rẻ kèm tăng trưởng âm)")
    if trap_book:
        traps_detected.append("Book Trap (ROE thấp hơn Chi phí vốn CoE)")
    if trap_cyc:
        traps_detected.append("Cyclical Peak (Đỉnh chu kỳ lợi nhuận)")
    if trap_div:
        traps_detected.append("Dividend Trap (Cổ tức không bảo chứng bằng FCF)")
    if trap_debt:
        traps_detected.append("Debt Stress (Đòn bẩy nợ cao kèm dòng tiền âm)")
    if trap_dilution:
        traps_detected.append("Share Dilution (Tốc độ pha loãng CP quá nhanh)")
    if trap_wc:
        traps_detected.append("WC Stress (Vốn lưu động ứ đọng công nợ/tồn kho)")

    trap_label = "CAO" if trap_score >= 4.0 else ("TB" if trap_score >= 2.0 else "THẤP")
    trap_reason = "; ".join(traps_detected) if traps_detected else "Không phát hiện bẫy định giá"

    return {
        "trapScore": round(trap_score, 1),
        "trapLabel": trap_label,
        "trapReason": trap_reason,
        "isCapPenalized": trap_label == "CAO",
        "trapsList": [
            {"id": "value_trap", "name": "Value Trap", "active": trap_value, "desc": "P/E hoặc P/B thấp giả tạo trong khi doanh thu hoặc EPS suy giảm."},
            {"id": "book_trap", "name": "Book Trap", "active": trap_book, "desc": "P/B rẻ nhưng ROE thấp hơn chi phí vốn CoE (phá hủy giá trị)."},
            {"id": "cyclical_peak", "name": "Cyclical Peak", "active": trap_cyc, "desc": "Đỉnh chu kỳ kinh doanh: P/E rất thấp nhưng dòng tiền FCF đảo chiều âm."},
            {"id": "dividend_trap", "name": "Dividend Trap", "active": trap_div, "desc": "Cổ tức tiền mặt cao nhưng dòng tiền tự do FCF âm kéo dài."},
            {"id": "debt_stress", "name": "Debt Stress", "active": trap_debt, "desc": "Đòn bẩy tài chính vượt ngưỡng kèm thâm hụt tiền mặt."},
            {"id": "share_dilution", "name": "Share Dilution", "active": trap_dilution, "desc": "Pha loãng cổ phiếu nhanh hơn tốc độ tăng trưởng lợi nhuận."},
            {"id": "wc_stress", "name": "Working Capital Stress", "active": trap_wc, "desc": "Vốn lưu động phình to bất thường so với tăng trưởng doanh số."}
        ]
    }


# ---------------------------------------------------------------------------
# 5. HỆ THỐNG 7 VÙNG ĐỊNH GIÁ (7 PRICE ZONES) & KHUYẾN NGHỊ 3 TẦNG GATED
# ---------------------------------------------------------------------------

def calc_7_price_zones(
    close: Optional[float],
    consensus_fv: Optional[float],
    safe_buy: Optional[float],
    buy_price_base: Optional[float],
    bear_v: Optional[float] = None,
    bull_v: Optional[float] = None
) -> Dict[str, Any]:
    """
    Xác định 7 Vùng Giá theo chuẩn ref-best-valuation:
    1. Deep Value: < Safe Buy * 0.90
    2. Buy Zone: Safe Buy * 0.90 .. Safe Buy
    3. Accumulate: Safe Buy .. Fair Value * 0.90
    4. Fair Zone: Fair Value * 0.90 .. Fair Value * 1.10
    5. Above Fair: Fair Value * 1.10 .. Bull Value * 0.95
    6. Expensive: Bull Value * 0.95 .. Bull Value * 1.15
    7. Danger: > Bull Value * 1.15
    """
    if not close or not consensus_fv or consensus_fv <= 0:
        return {
            "currentZone": "N/A",
            "zoneBadge": "bg-gray-100 text-gray-700",
            "safeBuyPrice": None,
            "acceptableBuyPrice": None,
            "boundaries": {}
        }

    s_buy = safe_buy if safe_buy and safe_buy > 0 else consensus_fv * 0.75
    b_accum = buy_price_base if buy_price_base and buy_price_base > 0 else consensus_fv * 0.85
    b_bull = bull_v if bull_v and bull_v > 0 else consensus_fv * 1.25

    v_deep = s_buy * 0.90
    v_buy = s_buy
    v_accum = max(v_buy, min(consensus_fv * 0.90, b_accum))
    v_fair_low = consensus_fv * 0.90
    v_fair_high = consensus_fv * 1.10
    v_above = max(v_fair_high, b_bull * 0.95)
    v_exp = max(v_above, b_bull * 1.15)

    if close < v_deep:
        zone = "Deep Value"
        badge = "bg-emerald-600 text-white"
    elif close <= v_buy:
        zone = "Buy Zone"
        badge = "bg-emerald-500 text-white"
    elif close < v_fair_low:
        zone = "Accumulate"
        badge = "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
    elif close <= v_fair_high:
        zone = "Fair Zone"
        badge = "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
    elif close <= v_above:
        zone = "Above Fair"
        badge = "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
    elif close <= v_exp:
        zone = "Expensive"
        badge = "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300"
    else:
        zone = "Danger"
        badge = "bg-rose-600 text-white"

    return {
        "currentZone": zone,
        "zoneBadge": badge,
        "safeBuyPrice": round(s_buy),
        "acceptableBuyPrice": round(v_accum),
        "bearPrice": round(consensus_fv * 0.70) if not bear_v else round(bear_v),
        "bullPrice": round(b_bull),
        "boundaries": {
            "deepValue": round(v_deep),
            "safeBuy": round(v_buy),
            "accumulate": round(v_accum),
            "fairLow": round(v_fair_low),
            "fairHigh": round(v_fair_high),
            "aboveFair": round(v_above),
            "expensive": round(v_exp)
        }
    }


def calc_3_layer_decision(
    close: Optional[float],
    consensus_fv: Optional[float],
    margin_of_safety: Optional[float],
    risk_adjusted_mos: float,
    models_used: int,
    coverage_pct: float,
    confidence_score: float,
    dispersion_pct: float,
    trap_label: str,
    roe: Optional[float],
    coe_pct: float,
    cfo: Optional[float],
    net_income: Optional[float],
    altman_z: Optional[float],
    tech_score: Optional[int]
) -> Dict[str, Any]:
    """
    Khung Quyết Định 3 Tầng Gated theo chuẩn ref-best-valuation:
    Điểm Tổng = 0.40 * Định Giá + 0.35 * Chất Lượng + 0.25 * Thời Điểm.
    - Định giá (V40): MOS vs MOS rủi ro, trừ điểm nếu Dispersion cao.
    - Chất lượng (Q35): ROE - CoE spread, CFO/NI, Altman Z.
    - Thời điểm (T25): Tech score.
    - Phạt trần: Bẫy CAO khống chế điểm <= 5.0 (Không cho phép Strong Buy).
    - Cổng mở khi modelsUsed >= 3, coverage >= 60%, confidence >= 50%, dispersion <= 40%.
    """
    mos = margin_of_safety if margin_of_safety is not None else 0.0

    # 1. Tầng Định Giá (0.0 - 10.0)
    v_raw = 5.0 + (mos / 10.0) * 2.0
    if dispersion_pct > 25.0:
        v_raw -= 1.5
    if coverage_pct < 60.0:
        v_raw -= 1.0
    v_score = max(0.0, min(10.0, v_raw))

    # 2. Tầng Chất Lượng (0.0 - 10.0)
    q_score = 5.0
    roe_val = roe if roe is not None else 10.0
    roe_coe_spread = round(roe_val - coe_pct, 2)
    if roe_coe_spread > 5.0:
        q_score += 2.0
    elif roe_coe_spread < -2.0:
        q_score -= 2.0

    if cfo and net_income and net_income > 0:
        cfo_ratio = cfo / net_income
        if cfo_ratio >= 1.0:
            q_score += 1.5
        elif cfo_ratio < 0.7:
            q_score -= 1.5

    if altman_z is not None:
        if altman_z > 2.99:
            q_score += 1.5
        elif altman_z < 1.81:
            q_score -= 2.0
    q_score = max(0.0, min(10.0, q_score))

    # 3. Tầng Thời Điểm (0.0 - 10.0)
    t_score = 5.0
    if tech_score is not None:
        t_score = 5.0 + (tech_score * 1.5)
    t_score = max(0.0, min(10.0, t_score))

    # Điểm tổng hợp 3 tầng
    raw_composite = (0.40 * v_score) + (0.35 * q_score) + (0.25 * t_score)
    composite_score = round(min(5.0, raw_composite) if trap_label == "CAO" else raw_composite, 1)

    # Cổng kiểm soát dữ liệu
    gate_open = (models_used >= 3 and coverage_pct >= 60.0 and confidence_score >= 50.0 and dispersion_pct <= 40.0)

    buy_rec = "N/A"
    decision_reason = "Chưa đủ điều kiện độ phủ dữ liệu"

    if gate_open:
        if mos >= risk_adjusted_mos and confidence_score >= 60.0 and composite_score >= 7.5:
            buy_rec = "🟢 STRONG BUY"
            decision_reason = "MOS vượt trội biên an toàn + Chất lượng tài chính vững chắc"
        elif mos >= risk_adjusted_mos and composite_score >= 6.5:
            buy_rec = "🟢 BUY"
            decision_reason = "Thị giá đạt biên an toàn rủi ro"
        elif mos >= 0:
            buy_rec = "🟡 HOLD"
            decision_reason = "Thị giá dao động quanh vùng giá trị hợp lý"
        elif mos >= -15.0:
            buy_rec = "🟠 AVOID"
            decision_reason = "Cao hơn giá trị thực (0% đến 15%)"
        else:
            buy_rec = "🔴 SELL"
            decision_reason = "Định giá đắt đỏ (> 15% Fair Value)"
    else:
        if mos >= 0:
            buy_rec = "🟡 HOLD"
            decision_reason = "Thiếu độ phủ mô hình hoặc phân tán cao"
        else:
            buy_rec = "🟠 AVOID"
            decision_reason = "Thị giá cao hơn định giá cơ sở"

    return {
        "compositeScore": composite_score,
        "valuationLayerScore": round(v_score, 1),
        "qualityLayerScore": round(q_score, 1),
        "timingLayerScore": round(t_score, 1),
        "roeCoeSpread": roe_coe_spread,
        "buyRecommendation": buy_rec,
        "decisionReason": decision_reason,
        "isGateOpen": gate_open,
        "isTrapCapped": trap_label == "CAO"
    }


# ---------------------------------------------------------------------------
# 6. DẢI BĂNG ĐỊNH GIÁ LỊCH SỬ P25 - P50 - P75 & ĐỘ BỀN CỔ TỨC
# ---------------------------------------------------------------------------

def calc_historical_valuation_bands(
    close: Optional[float],
    eps: Optional[float],
    bvps: Optional[float],
    pe_history: Optional[List[float]] = None,
    pb_history: Optional[List[float]] = None
) -> Dict[str, Any]:
    """
    Tính dải băng P25 - P50 - P75 theo phân vị định giá lịch sử.
    """
    if not close or not eps or eps <= 0 or not bvps or bvps <= 0:
        return {
            "band25": None,
            "band50": None,
            "band75": None,
            "bandPosition": "N/A",
            "bandWidthPct": None
        }

    pe_list = sorted([p for p in (pe_history or [8.0, 10.5, 12.0, 14.5, 17.0]) if p and p > 0])
    pb_list = sorted([p for p in (pb_history or [1.0, 1.25, 1.45, 1.8, 2.2]) if p and p > 0])

    def _pctl(arr: List[float], pct: float) -> float:
        if not arr:
            return 1.0
        k = (len(arr) - 1) * (pct / 100.0)
        f = math.floor(k)
        c = math.ceil(k)
        if f == c:
            return arr[int(k)]
        return arr[f] * (c - k) + arr[c] * (k - f)

    pe_p25 = _pctl(pe_list, 25)
    pe_p50 = _pctl(pe_list, 50)
    pe_p75 = _pctl(pe_list, 75)

    pb_p25 = _pctl(pb_list, 25)
    pb_p50 = _pctl(pb_list, 50)
    pb_p75 = _pctl(pb_list, 75)

    pe_band_25 = eps * pe_p25
    pe_band_50 = eps * pe_p50
    pe_band_75 = eps * pe_p75

    pb_band_25 = bvps * pb_p25
    pb_band_50 = bvps * pb_p50
    pb_band_75 = bvps * pb_p75

    band25 = round((pe_band_25 + pb_band_25) / 2.0)
    band50 = round((pe_band_50 + pb_band_50) / 2.0)
    band75 = round((pe_band_75 + pb_band_75) / 2.0)

    if close < band25:
        pos = "Dưới P25 (Vùng Rẻ)"
    elif close <= band50:
        pos = "P25–P50 (Hợp lý thấp)"
    elif close <= band75:
        pos = "P50–P75 (Hợp lý cao)"
    else:
        pos = "Trên P75 (Vùng Đắt)"

    width = round(((band75 - band25) / band50) * 100.0, 1) if band50 > 0 else 0.0

    cur_pe = round(close / eps, 2) if (close and eps and eps > 0) else None
    cur_pb = round(close / bvps, 2) if (close and bvps and bvps > 0) else None

    return {
        "band25": band25,
        "band50": band50,
        "band75": band75,
        "bandPosition": pos,
        "bandWidthPct": width,
        "peBand": {
            "p25": round(pe_p25, 2),
            "p50": round(pe_p50, 2),
            "p75": round(pe_p75, 2),
            "current": cur_pe
        },
        "pbBand": {
            "p25": round(pb_p25, 2),
            "p50": round(pb_p50, 2),
            "p75": round(pb_p75, 2),
            "current": cur_pb
        },
        "priceBands": {
            "peP25Price": round(pe_band_25) if pe_band_25 else None,
            "peP50Price": round(pe_band_50) if pe_band_50 else None,
            "peP75Price": round(pe_band_75) if pe_band_75 else None,
            "pbP25Price": round(pb_band_25) if pb_band_25 else None,
            "pbP50Price": round(pb_band_50) if pb_band_50 else None,
            "pbP75Price": round(pb_band_75) if pb_band_75 else None
        }
    }


def calc_dividend_sustainability(
    dps: Optional[float],
    eps: Optional[float],
    fcf: Optional[float],
    shares: Optional[float],
    dps_history: Optional[List[float]] = None
) -> Dict[str, Any]:
    """
    Đánh giá độ an toàn và bền vững của cổ tức theo chuẩn ref-best-valuation.
    """
    if dps is None or dps <= 0:
        return {
            "score": 0.0,
            "status": "Không có DPS",
            "payoutRatio": None,
            "fcfPayoutRatio": None,
            "consistency": 0.0
        }

    payout = round((dps / eps) * 100.0, 1) if (eps and eps > 0) else None
    total_div = (dps * shares) if shares and shares > 0 else None
    fcf_payout = round((total_div / fcf) * 100.0, 1) if (total_div and fcf and fcf > 0) else None

    # Đo độ đều đặn DPS
    consistency = 0.5
    if dps_history and len(dps_history) >= 3:
        valid_dps = [d for d in dps_history if d and d > 0]
        consistency = len(valid_dps) / len(dps_history)

    ds = 0.0
    dn = 0
    if payout is not None:
        ds += 5.0 if payout < 70.0 else (3.0 if payout < 90.0 else 1.0)
        dn += 1
    if fcf_payout is not None:
        ds += 5.0 if fcf_payout < 80.0 else (3.0 if fcf_payout < 100.0 else 1.0)
        dn += 1
    ds += consistency * 5.0
    dn += 1

    final_score = round(ds / dn, 1) if dn > 0 else 2.5
    if final_score >= 4.0:
        status = "✓✓ Rất an toàn"
    elif final_score >= 3.0:
        status = "✓ An toàn"
    elif final_score >= 2.0:
        status = "⚠ Cần theo dõi"
    else:
        status = "✗ Rủi ro cắt giảm"

    return {
        "score": final_score,
        "status": status,
        "payoutRatio": payout,
        "fcfPayoutRatio": fcf_payout,
        "consistency": round(consistency * 100, 1)
    }


# ---------------------------------------------------------------------------
# 7. PHÒNG THÍ NGHIỆM FINVAL LAB (20+ CHỈ TIÊU VS SMA 5 NĂM)
# ---------------------------------------------------------------------------

def compute_finval_lab_snapshot(
    latest_data: Dict[str, Any],
    yearly_history: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    FinVal Lab Snapshot: Đối chiếu 20+ chỉ tiêu tài chính cốt lõi giữa hiện tại và SMA 5 năm.
    """
    if not yearly_history:
        return {"items": []}

    metrics_def = [
        ("eps", "EPS (Thu nhập mỗi CP)", "đ", False),
        ("bvps", "BVPS (Giá trị sổ sách)", "đ", False),
        ("pe", "Hệ số P/E", "x", True),
        ("pb", "Hệ số P/B", "x", True),
        ("roe", "Tỷ suất ROE", "%", False),
        ("roa", "Tỷ suất ROA", "%", False),
        ("roic", "Tỷ suất ROIC", "%", False),
        ("grossMargin", "Biên Lợi Nhuận Gộp", "%", False),
        ("netMargin", "Biên Lợi Nhuận Ròng", "%", False),
        ("revenue", "Doanh Thu Thuần", "Tỷ", False),
        ("netIncome", "Lợi Nhuận Sau Thuế", "Tỷ", False),
        ("ebitda", "Chỉ số EBITDA", "Tỷ", False),
        ("freeCashFlow", "Dòng Tiền Tự Do FCF", "Tỷ", False),
        ("debtToEquity", "Nợ / Vốn Chủ (D/E)", "x", True),
        ("currentRatio", "Hệ Số Thanh Toán Hiện Hành", "x", False),
        ("cashRatio", "Hệ Số Tiền Mặt", "x", False)
    ]

    items = []
    for key, label, unit, invert_color in metrics_def:
        cur_v = latest_data.get(key)
        hist_vals = [y.get(key) for y in yearly_history if y.get(key) is not None]
        sma_5y = sum(hist_vals) / len(hist_vals) if hist_vals else None

        # Chuẩn hóa đơn vị: Nếu là chỉ tiêu tính bằng "Tỷ" (revenue, netIncome, ebitda, freeCashFlow)
        cur_norm = cur_v
        sma_norm = sma_5y
        if unit == "Tỷ":
            if cur_norm is not None and abs(cur_norm) > 1e8:
                cur_norm = cur_norm / 1e9
            if sma_norm is not None and abs(sma_norm) > 1e8:
                sma_norm = sma_norm / 1e9

        delta_pct = None
        status = "Ổn định"
        badge = "text-gray-400"

        if cur_norm is not None and sma_norm is not None and sma_norm != 0:
            delta_pct = round(((cur_norm - sma_norm) / abs(sma_norm)) * 100.0, 1)
            is_better = (delta_pct <= -15.0) if invert_color else (delta_pct >= 15.0)
            is_worse = (delta_pct >= 15.0) if invert_color else (delta_pct <= -15.0)

            if is_better:
                status = "Cải thiện rõ rệt"
                badge = "text-emerald-500 font-semibold"
            elif is_worse:
                status = "Suy giảm so với TB"
                badge = "text-rose-400 font-semibold"

        items.append({
            "key": key,
            "label": label,
            "unit": unit,
            "current": round(cur_norm, 1) if (cur_norm is not None and unit == "Tỷ") else cur_v,
            "sma5y": round(sma_norm, 2) if sma_norm is not None else None,
            "deltaPct": delta_pct,
            "status": status,
            "badgeColor": badge,
            "invertLogic": invert_color
        })

    return {"items": items}


# ---------------------------------------------------------------------------
# 8. CÁC HÀM TIỆN ÍCH DUPONT & XUNG LỰC KỸ THUẬT
# ---------------------------------------------------------------------------

def calc_dupont(
    net_income: Optional[float] = None,
    revenue: Optional[float] = None,
    total_assets: Optional[float] = None,
    equity: Optional[float] = None,
    roe: Optional[float] = None,
    net_margin: Optional[float] = None
) -> Dict[str, Any]:
    """Phân rã DuPont 3 Nhân tố."""
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


def calc_tech_score(
    close: Optional[float],
    high_52: Optional[float],
    low_52: Optional[float],
    rec_score: Optional[float] = None,
    beta: Optional[float] = None
) -> Dict[str, Any]:
    """Chấm điểm xung lực kỹ thuật (-3 đến +3)."""
    score = 0
    factors = []

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

    if close is not None and high_52 is not None and low_52 is not None and high_52 > low_52:
        pos = ((close - low_52) / (high_52 - low_52)) * 100.0
        if pos < 15.0:
            score += 1
            factors.append("Thị giá ở vùng đáy 52 tuần (Vùng giá chiết khấu)")
        elif pos > 85.0:
            score -= 1
            factors.append("Thị giá tiệm cận đỉnh 52 tuần (Áp lực chốt lời lớn)")

    if beta is not None:
        if 0.8 <= beta <= 1.25:
            score += 1
            factors.append(f"Hệ số Beta ổn định ({beta}x)")
        elif beta > 1.6:
            score -= 1
            factors.append(f"Hệ số Beta biến động rất cao ({beta}x)")

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


def calc_fcf(cfo: Optional[float], capex: Optional[float]) -> Optional[float]:
    if cfo is None:
        return None
    if capex is None:
        return cfo
    if capex < 0:
        return cfo + capex
    return cfo - capex


def calc_cagr(start_val: Optional[float], end_val: Optional[float], periods: int) -> Optional[float]:
    if start_val and end_val and start_val > 0 and end_val > 0 and periods > 0:
        try:
            return round((math.pow(end_val / start_val, 1.0 / periods) - 1.0) * 100.0, 1)
        except Exception:
            return None
    return None


# ---------------------------------------------------------------------------
# 9. CLASS ĐIỀU PHỐI CHÍNH: STOCK VALUATION ENGINE
# ---------------------------------------------------------------------------

class StockValuationEngine:
    """
    Động cơ định giá doanh nghiệp tập trung (Enterprise Valuation Engine).
    Tích hợp 10 mô hình định giá định lượng, 7 bẫy định giá, ma trận 23 ngành,
    bộ lọc ngoại lai ±60%, 7 vùng giá và quyết định 3 tầng Gated.
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
        rf: float = DEFAULT_RISK_FREE_RATE
    ):
        self.wacc = wacc
        self.growth_rate = growth_rate
        self.pe_multiple = pe_multiple
        self.pb_multiple = pb_multiple
        self.ev_multiple = ev_multiple
        self.pcf_multiple = pcf_multiple
        self.ps_multiple = ps_multiple
        self.rf = rf

    def evaluate(self, stock_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Thực hiện đánh giá định giá toàn diện từ dữ liệu tài chính của một cổ phiếu.
        Bảo đảm tương thích ngược 100% với phiên bản cũ, bổ sung ma trận 10 mô hình lượng hóa.
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

        roe_val = stock_data.get("roe")
        if roe_val is None and "profitability" in stock_data:
            roe_val = stock_data["profitability"].get("roe")

        net_margin_val = stock_data.get("netMargin")
        if net_margin_val is None and "profitability" in stock_data:
            net_margin_val = stock_data["profitability"].get("netMargin")

        beta_val = stock_data.get("beta") or stock_data.get("technicals", {}).get("beta", 1.0)
        sector_raw = stock_data.get("sector") or stock_data.get("industry") or "Khác"
        sec_name = normalize_sector_name(sector_raw)

        # 1. Dải băng lịch sử P25-P75 để lấy P/E & P/B trung vị (pe_p50, pb_p50)
        bands_eval = calc_historical_valuation_bands(
            close=close,
            eps=eps,
            bvps=bvps,
            pe_history=stock_data.get("peHistory"),
            pb_history=stock_data.get("pbHistory")
        )

        pe_band = bands_eval.get("peBand", {})
        pb_band = bands_eval.get("pbBand", {})
        pe_p50 = float(pe_band.get("p50") or self.pe_multiple)
        pb_p50 = float(pb_band.get("p50") or self.pb_multiple)
        pe_pb_prod = round(pe_p50 * pb_p50, 2)
        graham_multiplier = round(min(22.5, max(4.0, pe_pb_prod)), 2)

        # 2. Tính toán các mô hình độc lập (10 Mô hình)
        graham_val = calc_graham(
            eps=eps,
            bvps=bvps,
            multiplier=graham_multiplier,
            pe_avg=pe_p50,
            pb_avg=pb_p50
        )
        ddm_val = calc_ddm(dps, r=self.wacc, g=self.growth_rate)
        pe_target_val = calc_pe_target(eps, multiple=self.pe_multiple)
        pb_target_val = calc_pb_target(bvps, multiple=self.pb_multiple, roe=roe_val)

        # Gordon P/B chuyên biệt cho tài chính
        gordon_pb_val = calc_gordon_pb(bvps, roe_val, coe=self.wacc, terminal_g=self.growth_rate)
        effective_pb_val = gordon_pb_val if (sec_name in ["Ngân Hàng", "Chứng Khoán", "Bảo Hiểm"] and gordon_pb_val) else pb_target_val

        net_debt = total_debt if total_debt is not None else 0
        ev_ebitda_val = calc_ev_ebitda(ebitda, net_debt, shares, multiple=self.ev_multiple)
        pcf_val = calc_pcf(cfo, shares, multiple=self.pcf_multiple)
        ps_val = calc_ps_target(revenue, shares, multiple=self.ps_multiple)

        # Multi-stage DCF
        dcf_val = calc_multi_stage_dcf(cfo, shares, coe=self.wacc, g1=self.growth_rate * 2.0, terminal_g=self.growth_rate)

        # FCFF & FCFE
        capex_val = stock_data.get("capex", 0.0)
        fcfe_val = calc_fcfe(cfo, capex_val, None, shares, coe=self.wacc, g=self.growth_rate)

        # RIM / EVA
        rim_val = calc_rim_eva(equity, roe_val, shares, coe=self.wacc, terminal_g=self.growth_rate)

        # RNAV BĐS
        inv_val = stock_data.get("inventory")
        rnav_val = calc_rnav_real_estate(total_assets, total_debt, inv_val, shares, is_real_estate=(sec_name == "Bất Động Sản"))

        # Advanced Multiples (EV/EBITDA + EV/Sales)
        adv_multiples_val = calc_advanced_multiples(ebitda, revenue, net_debt, shares, target_ev_ebitda=self.ev_multiple, target_ev_sales=self.ps_multiple)

        # Implied FCF Yield Diagnostic
        fcf_yield_val = calc_implied_fcf_yield(cfo, shares, rf=self.rf)

        # 3. Xây dựng danh sách 10 mô hình lượng hóa có trọng số ngành và hệ số phù hợp
        sec_weights = SECTOR_WEIGHTS_23.get(sec_name, SECTOR_WEIGHTS_23["Khác"])

        def _make_model(m_id, m_name, raw_v, base_w, formula="", formula_detail="", params=None, status_note=""):
            suit_mult, suit_note = get_method_suitability(m_id.upper(), sec_name, dps)
            eff_w = base_w * suit_mult
            diff_p = round(((raw_v - close) / close) * 100.0, 1) if (raw_v and close and close > 0) else None
            clean_name = m_name.split(". ", 1)[-1] if ". " in m_name else m_name
            note_str = status_note if raw_v is None else ("Phù hợp" if suit_mult >= 1.0 else suit_note)
            return {
                "id": m_id,
                "name": clean_name,
                "fullName": m_name,
                "cleanName": clean_name,
                "value": raw_v,
                "targetPrice": raw_v,
                "diffPercent": diff_p,
                "weight": round(eff_w, 3),
                "baseWeight": base_w,
                "suitability": suit_mult,
                "suitabilityNote": suit_note,
                "isOutlier": False,
                "outlierGapPct": 0.0,
                "formula": formula,
                "formulaDetail": formula_detail,
                "parameters": params or {},
                "statusNote": note_str
            }

        models10 = [
            _make_model(
                "graham", "1. Benjamin Graham", graham_val, sec_weights.get("graham", 0.05),
                formula="√(Min(22.5, PE_avg × PB_avg) × EPS × BVPS)",
                formula_detail=(
                    f"V = √({graham_multiplier} × {eps:,.0f} × {bvps:,.0f}) | "
                    f"Hệ số = Min(22.5, {pe_p50:.1f}x × {pb_p50:.2f}x = {pe_pb_prod})"
                ) if (eps and bvps) else "V = √(Min(22.5, PE_avg × PB_avg) × EPS × BVPS)",
                params={
                    "eps": eps,
                    "bvps": bvps,
                    "multiplier": graham_multiplier,
                    "peAvg": round(pe_p50, 2),
                    "pbAvg": round(pb_p50, 2),
                    "maxMultiplier": 22.5
                },
                status_note="EPS hoặc BVPS âm"
            ),
            _make_model(
                "pe", "2. P/E Chuẩn Hóa", pe_target_val, sec_weights.get("pe", 0.15),
                formula="EPS × P/E Mục Tiêu (11.5x)",
                formula_detail=f"V = {eps or 0:,.0f} × 11.5x (Median chu kỳ 5Y)" if eps else "V = EPS × 11.5x",
                params={"eps": eps, "targetPe": 11.5},
                status_note="EPS âm"
            ),
            _make_model(
                "pb", "3. P/B Ngành & Gordon", effective_pb_val, sec_weights.get("pb", 0.15),
                formula="BVPS × [(ROE - g)/(r - g)]",
                formula_detail=f"V = {bvps or 0:,.0f} × Gordon Multiple" if bvps else "BVPS × Gordon / Target P/B",
                params={"bvps": bvps, "roe": roe_val, "coe": round(self.wacc, 4), "terminalG": self.growth_rate},
                status_note="BVPS âm hoặc ROE không xác định"
            ),
            _make_model(
                "dcf", "4. DCF Đa Giai Đoạn", dcf_val, sec_weights.get("dcf", 0.15),
                formula="DCF 3 Pha (Growth → Fade → Terminal)",
                formula_detail=f"FCF Base, WACC={self.wacc*100:.1f}%, g1={self.growth_rate*200:.1f}%, g_term={self.growth_rate*100:.1f}%",
                params={"baseFcf": cfo, "shares": shares, "wacc": round(self.wacc, 4), "g1": self.growth_rate * 2.0, "terminalG": self.growth_rate},
                status_note="FCF âm hoặc đang chu kỳ đầu tư lớn"
            ),
            _make_model(
                "ddm", "5. Chiết Khấu DDM", ddm_val, sec_weights.get("ddm", 0.05),
                formula="[DPS × (1 + g)] / (r - g) × Fade",
                formula_detail=f"DPS={dps or 0:,.0f} đ, r={self.wacc*100:.1f}%, g={self.growth_rate*100:.1f}%" if dps else "Chiết khấu dòng cổ tức tiền mặt",
                params={"dps": dps, "coe": round(self.wacc, 4), "g": self.growth_rate},
                status_note="Không có cổ tức tiền mặt"
            ),
            _make_model(
                "fcff", "6. FCFF Doanh Nghiệp", dcf_val, sec_weights.get("fcff", 0.12),
                formula="(PV(FCFF) + TV - Nợ ròng) / Shares",
                formula_detail=f"FCFF chiết khấu WACC={self.wacc*100:.1f}%",
                params={"fcff": cfo, "netDebt": net_debt, "wacc": round(self.wacc, 4), "shares": shares},
                status_note="Dòng tiền FCFF âm"
            ),
            _make_model(
                "fcfe", "7. FCFE Cổ Đông", fcfe_val, sec_weights.get("fcfe", 0.08),
                formula="PV(FCFE) / Shares (CFO - CapEx + Nợ ròng)",
                formula_detail=f"FCFE chiết khấu CoE={self.wacc*100:.1f}%",
                params={"cfo": cfo, "capex": capex_val, "coe": round(self.wacc, 4), "shares": shares},
                status_note="Dòng tiền FCFE âm"
            ),
            _make_model(
                "rim", "8. Residual Income RIM/EVA", rim_val, sec_weights.get("rim", 0.08),
                formula="BVPS + Σ [BVPS × (ROE - r) / (1+r)^t] + TV",
                formula_detail=f"BVPS={bvps or 0:,.0f} đ, ROE={roe_val or 0:.1f}%, CoE={self.wacc*100:.1f}%" if bvps else "Mô hình thu nhập thặng dư vốn chủ",
                params={"equity": equity, "bvps": bvps, "roe": roe_val, "coe": round(self.wacc, 4), "shares": shares},
                status_note="Vốn chủ âm hoặc ROE < CoE"
            ),
            _make_model(
                "nav", "9. Book NAV / RNAV", rnav_val, sec_weights.get("nav", 0.07),
                formula="RNAV = Equity + ΔQuỹĐất - ChiếtKhấuNợ",
                formula_detail=f"Equity + Thặng dư quỹ đất (+10%) - Chiết khấu nợ ngắn (-15%)",
                params={"equity": equity, "totalAssets": total_assets, "totalDebt": total_debt, "inventory": inv_val, "shares": shares},
                status_note="Không đủ dữ liệu Bảng CĐKT"
            ),
            _make_model(
                "evebitda", "10. EV/EBITDA & EV/Sales", adv_multiples_val, sec_weights.get("evebitda", 0.07),
                formula="[(EBITDA × 7.5x) - Nợ ròng] / Shares",
                formula_detail=f"EBITDA Multiple 7.5x & EV/Sales 1.5x",
                params={"ebitda": ebitda, "multiple": self.ev_multiple, "revenue": revenue, "salesMultiple": self.ps_multiple, "netDebt": net_debt, "shares": shares},
                status_note="EBITDA âm hoặc nợ vay quá lớn"
            )
        ]

        # 3. Lọc ngoại lai ±60% & Consensus Blending
        consensus_analysis = filter_outliers_and_consensus(models10, close)
        fair_val = consensus_analysis["fairValue"]

        # Fallback an toàn nếu chưa đủ dữ liệu cho 10 mô hình: dùng 6 mô hình cũ
        candidates_legacy = [v for v in [graham_val, ddm_val, pe_target_val, pb_target_val, ev_ebitda_val, pcf_val] if v and v > 0]
        consensus_legacy = calc_consensus_fair_value(candidates_legacy, close)
        if fair_val is None:
            fair_val = consensus_legacy["fairValue"]

        mos_fair = round(((fair_val - close) / fair_val) * 100.0, 1) if (fair_val and close and close > 0) else None
        mos_graham = round(((graham_val - close) / graham_val) * 100.0, 1) if (graham_val and close and close > 0) else None

        # 4. Phát hiện 7 Bẫy Định Giá
        traps_eval = detect_valuation_traps(
            pe=stock_data.get("pe") or (close / eps if (close and eps and eps > 0) else None),
            pb=stock_data.get("pb") or (close / bvps if (close and bvps and bvps > 0) else None),
            roe=roe_val,
            coe_pct=self.wacc * 100.0,
            fcf=cfo,
            de=stock_data.get("debtToEquity") or (total_debt / equity if (total_debt and equity and equity > 0) else None),
            rev_cagr=stock_data.get("revCagr"),
            eps_cagr=stock_data.get("epsCagr"),
            dps=dps,
            sector=sec_name
        )

        # 5. Hệ thống 7 Vùng Định Giá & Quyết Định 3 Tầng Gated
        zones_eval = calc_7_price_zones(
            close=close,
            consensus_fv=fair_val,
            safe_buy=round(fair_val * 0.75) if fair_val else None,
            buy_price_base=round(fair_val * 0.85) if fair_val else None
        )

        h52 = stock_data.get("high52w") or stock_data.get("high_52")
        l52 = stock_data.get("low52w") or stock_data.get("low_52")
        rec_score = stock_data.get("recommendScore") or stock_data.get("rec_score")
        tech_eval = calc_tech_score(close, h52, l52, rec_score, beta_val)

        decision_eval = calc_3_layer_decision(
            close=close,
            consensus_fv=fair_val,
            margin_of_safety=mos_fair,
            risk_adjusted_mos=20.0 + (5.0 if traps_eval["trapLabel"] == "CAO" else 0.0),
            models_used=consensus_analysis["modelsUsed"],
            coverage_pct=consensus_analysis["coveragePct"],
            confidence_score=consensus_analysis["confidenceScore"],
            dispersion_pct=consensus_analysis["dispersionPct"],
            trap_label=traps_eval["trapLabel"],
            roe=roe_val,
            coe_pct=self.wacc * 100.0,
            cfo=cfo,
            net_income=net_income,
            altman_z=stock_data.get("altmanZ"),
            tech_score=tech_eval.get("techScore")
        )

        # 6. Dải băng lịch sử P25-P75 & Độ an toàn cổ tức (bands_eval đã tính ở bước 1)
        div_sustain = calc_dividend_sustainability(
            dps=dps,
            eps=eps,
            fcf=cfo,
            shares=shares,
            dps_history=stock_data.get("dpsHistory")
        )

        # 7. FinVal Lab Snapshot
        yearly_hist = stock_data.get("yearlyHistory") or []
        lab_snapshot = compute_finval_lab_snapshot(
            latest_data={
                "eps": eps, "bvps": bvps, "pe": stock_data.get("pe"), "pb": stock_data.get("pb"),
                "roe": roe_val, "netMargin": net_margin_val, "revenue": revenue, "netIncome": net_income,
                "ebitda": ebitda, "freeCashFlow": cfo, "debtToEquity": stock_data.get("debtToEquity")
            },
            yearly_history=yearly_hist
        )

        # 8. Phân rã DuPont 3 nhân tố
        dupont_eval = calc_dupont(
            net_income=net_income,
            revenue=revenue,
            total_assets=total_assets,
            equity=equity,
            roe=roe_val,
            net_margin=net_margin_val
        )

        def calc_diff(target: Optional[int]) -> Optional[float]:
            if target is not None and target > 0 and close is not None and close > 0:
                return round(((target - close) / close) * 100, 1)
            return None

        graham_diff = calc_diff(graham_val)
        ddm_diff = calc_diff(ddm_val)
        pe_diff = calc_diff(pe_target_val)
        pb_diff = calc_diff(effective_pb_val)
        ev_ebitda_diff = calc_diff(ev_ebitda_val)
        pcf_diff = calc_diff(pcf_val)
        ps_diff = calc_diff(ps_val)
        consensus_diff = calc_diff(fair_val)

        rating = decision_eval["buyRecommendation"]
        rating_text = decision_eval["decisionReason"]
        rating_badge = (
            "bg-emerald-600 text-white" if "STRONG BUY" in rating else
            ("bg-emerald-500 text-white" if "BUY" in rating else
             ("bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" if "HOLD" in rating else
              ("bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" if "AVOID" in rating else
               "bg-rose-600 text-white")))
        )

        # Hợp nhất kết quả trả về đầy đủ
        return {
            # --- Các trường tương thích ngược 100% ---
            "bvps": bvps,
            "grahamNumber": graham_val,
            "marginOfSafetyGraham": mos_graham,
            "grahamDiffPercent": graham_diff,
            "ddmTarget": ddm_val,
            "ddmDiffPercent": ddm_diff,
            "peTarget": pe_target_val,
            "peDiffPercent": pe_diff,
            "pbTarget": effective_pb_val,
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
            "validModelsCount": consensus_analysis["modelsUsed"],
            "dupont": dupont_eval,
            "technicals": tech_eval,

            # --- CÁC TRƯỜNG NÂNG CẤP LƯỢNG HÓA REF-BEST-VALUATION ---
            "sector": sec_name,
            "models10": consensus_analysis["models"],
            "consensusDetails": {
                "cleanWeightedAvg": consensus_analysis["weightedValue"],
                "cleanMedian": consensus_analysis["medianValue"],
                "dispersionPct": consensus_analysis["dispersionPct"],
                "consensusLevel": consensus_analysis["consensusLevel"],
                "coveragePct": consensus_analysis["coveragePct"],
                "confidenceScore": consensus_analysis["confidenceScore"],
                "modelsUsed": consensus_analysis["modelsUsed"],
                "modelsValid": consensus_analysis["modelsValid"],
                "excludedOutliers": consensus_analysis["excludedOutliers"]
            },
            "valuationTraps": traps_eval,
            "sevenPriceZones": zones_eval,
            "threeLayerDecision": decision_eval,
            "historicalBands": bands_eval,
            "dividendSustainability": div_sustain,
            "finvalLab": lab_snapshot,
            "impliedFcfYieldPrice": fcf_yield_val
        }
