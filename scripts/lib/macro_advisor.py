"""
scripts/lib/macro_advisor.py
Động cơ tư vấn phân bổ tài sản & nhiệt kế thị trường (Macro Advisor Engine).
Trích xuất từ lib2/advisor.py và lib2/valuation/analyzer.py.
"""

from typing import Dict, Any, Optional

try:
    from .config_loader import get_macro_config, get_macro_thresholds, get_macro_narratives
except ImportError:
    try:
        from lib.config_loader import get_macro_config, get_macro_thresholds, get_macro_narratives
    except ImportError:
        from scripts.lib.config_loader import get_macro_config, get_macro_thresholds, get_macro_narratives

_macro_cfg = get_macro_config()
_thresholds = get_macro_thresholds()
_narratives = get_macro_narratives()

_mv_thresh = _thresholds.get("marketValuation") or {}
DEFAULT_MEAN_PE = float(_mv_thresh.get("meanPe", 14.2))
DEFAULT_STD_PE = float(_mv_thresh.get("stdPe", 2.1))


def compute_pe_bands_and_zscore(
    current_pe: float,
    mean_pe: Optional[float] = None,
    std_pe: Optional[float] = None
) -> Dict[str, Any]:
    """
    Tính Z-Score và phân loại 5 Dải Định Giá P/E thị trường VN-Index theo cấu hình trung tâm Single Source of Truth:
    - Rất rẻ: <= deepValue (mặc định 11.5x)
    - Rẻ: <= cheap (mặc định 13.5x)
    - Hợp lý: <= fair (mặc định 16.0x)
    - Đắt: <= expensive (mặc định 18.0x)
    - Rất đắt: > expensive
    """
    if mean_pe is None:
        mean_pe = DEFAULT_MEAN_PE
    if std_pe is None:
        std_pe = DEFAULT_STD_PE

    zscore = round((current_pe - mean_pe) / std_pe, 2)
    bands_cfg = _macro_cfg.get("vnindexPeBands") or {
        "deepValue": 11.5,
        "cheap": 13.5,
        "fair": 16.0,
        "expensive": 18.0
    }
    t_deep = float(bands_cfg.get("deepValue", 11.5))
    t_cheap = float(bands_cfg.get("cheap", 13.5))
    t_fair = float(bands_cfg.get("fair", 16.0))
    t_exp = float(bands_cfg.get("expensive", 18.0))

    advice_cfg = _narratives.get("peBandsAdvice") or {}
    
    if current_pe <= t_deep:
        band = "DEEP_VALUE"
        meta = advice_cfg.get("DEEP_VALUE") or {}
        band_text = meta.get("bandText", "Rất Rẻ (Vùng đáy lịch sử)")
        band_color = meta.get("bandColor", "emerald")
        equity_pct = meta.get("equityPct", 85)
        cash_pct = meta.get("cashPct", 15)
        stance = meta.get("stance", "MUA GOM MẠNH")
        tpl = meta.get("rationaleTemplate", "P/E thị trường ở mức chiết khấu cực sâu (<= {deepValue}x). Cơ hội vàng để gom cổ phiếu giá trị.")
        rationale = tpl.format(deepValue=f"{t_deep:.1f}", currentPe=f"{current_pe:.2f}", meanPe=f"{mean_pe:.1f}", expensive=f"{t_exp:.1f}")
    elif current_pe <= t_cheap:
        band = "CHEAP"
        meta = advice_cfg.get("CHEAP") or {}
        band_text = meta.get("bandText", "Rẻ (Vùng định giá hấp dẫn)")
        band_color = meta.get("bandColor", "emerald")
        equity_pct = meta.get("equityPct", 80)
        cash_pct = meta.get("cashPct", 20)
        stance = meta.get("stance", "TÍCH LŨY CỔ PHIẾU GIÁ TRỊ")
        tpl = meta.get("rationaleTemplate", "P/E VN-Index ({currentPe}x) đang ở dải Rẻ so với trung bình chu kỳ 5 năm ({meanPe}x). Khuyến nghị duy trì 80% cổ phiếu cơ bản và giữ 20% tiền mặt linh hoạt.")
        rationale = tpl.format(deepValue=f"{t_deep:.1f}", currentPe=f"{current_pe:.2f}", meanPe=f"{mean_pe:.1f}", expensive=f"{t_exp:.1f}")
    elif current_pe <= t_fair:
        band = "FAIR"
        meta = advice_cfg.get("FAIR") or {}
        band_text = meta.get("bandText", "Hợp Lý (Định giá cân bằng)")
        band_color = meta.get("bandColor", "blue")
        equity_pct = meta.get("equityPct", 65)
        cash_pct = meta.get("cashPct", 35)
        stance = meta.get("stance", "NẮM GIỮ / CHỌN LỌC")
        tpl = meta.get("rationaleTemplate", "P/E VN-Index ({currentPe}x) nằm trong dải trung vị hợp lý. Khuyến nghị duy trì 65% cổ phiếu có EPS tăng trưởng cao, 35% tiền mặt.")
        rationale = tpl.format(deepValue=f"{t_deep:.1f}", currentPe=f"{current_pe:.2f}", meanPe=f"{mean_pe:.1f}", expensive=f"{t_exp:.1f}")
    elif current_pe <= t_exp:
        band = "EXPENSIVE"
        meta = advice_cfg.get("EXPENSIVE") or {}
        band_text = meta.get("bandText", "Đắt (Vùng chốt lời dần)")
        band_color = meta.get("bandColor", "amber")
        equity_pct = meta.get("equityPct", 45)
        cash_pct = meta.get("cashPct", 55)
        stance = meta.get("stance", "PHÒNG THỦ")
        tpl = meta.get("rationaleTemplate", "P/E VN-Index ({currentPe}x) vượt mức trung bình, bước vào vùng đắt. Khuyến nghị hạ tỷ trọng cổ phiếu, giữ 55% tiền mặt.")
        rationale = tpl.format(deepValue=f"{t_deep:.1f}", currentPe=f"{current_pe:.2f}", meanPe=f"{mean_pe:.1f}", expensive=f"{t_exp:.1f}")
    else:
        band = "OVERHEATED"
        meta = advice_cfg.get("OVERHEATED") or {}
        band_text = meta.get("bandText", "Rất Đắt / Hưng Phấn Cực Đại")
        band_color = meta.get("bandColor", "rose")
        equity_pct = meta.get("equityPct", 30)
        cash_pct = meta.get("cashPct", 70)
        stance = meta.get("stance", "QUẢN TRỊ RỦI RO CAO")
        tpl = meta.get("rationaleTemplate", "P/E VN-Index ({currentPe}x) vượt {expensive}x, thị trường rất đắt. Khuyến nghị phòng thủ với tối đa 70% tiền mặt.")
        rationale = tpl.format(deepValue=f"{t_deep:.1f}", currentPe=f"{current_pe:.2f}", meanPe=f"{mean_pe:.1f}", expensive=f"{t_exp:.1f}")

    return {
        "currentPE": current_pe,
        "historicalMeanPE": mean_pe,
        "historicalStdPE": std_pe,
        "zScore": zscore,
        "band": band,
        "bandText": band_text,
        "bandColor": band_color,
        "recommendedEquityPct": equity_pct,
        "recommendedCashPct": cash_pct,
        "stance": stance,
        "rationale": rationale
    }
