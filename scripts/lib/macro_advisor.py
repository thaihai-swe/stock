"""
scripts/lib/macro_advisor.py
Động cơ tư vấn phân bổ tài sản & nhiệt kế thị trường (Macro Advisor Engine).
Trích xuất từ lib2/advisor.py và lib2/valuation/analyzer.py.
"""

from typing import Dict, Any, Optional

def compute_pe_bands_and_zscore(current_pe: float, mean_pe: float = 14.2, std_pe: float = 2.1) -> Dict[str, Any]:
    """
    Tính Z-Score và phân loại 5 Dải Định Giá P/E thị trường VN-Index:
    - Rất rẻ: <= 11.5x (Z <= -1.28, P10)
    - Rẻ: 11.5x - 13.5x (Z: -1.28 đến -0.33, P25)
    - Hợp lý: 13.5x - 16.0x (Z: -0.33 đến +0.85)
    - Đắt: 16.0x - 18.0x (Z: +0.85 đến +1.80)
    - Rất đắt: > 18.0x (Z > +1.80)
    """
    zscore = round((current_pe - mean_pe) / std_pe, 2)
    
    if current_pe <= 11.5:
        band = "DEEP_VALUE"
        band_text = "Rất Rẻ (Vùng đáy lịch sử)"
        band_color = "emerald"
        equity_pct = 85
        cash_pct = 15
        stance = "MUA GOM MẠNH"
        rationale = "P/E thị trường ở mức chiết khấu cực sâu (<= 11.5x). Cơ hội vàng để gom cổ phiếu giá trị."
    elif current_pe <= 13.5:
        band = "CHEAP"
        band_text = "Rẻ (Vùng định giá hấp dẫn)"
        band_color = "emerald"
        equity_pct = 80
        cash_pct = 20
        stance = "TÍCH LŨY CỔ PHIẾU GIÁ TRỊ"
        rationale = f"P/E VN-Index ({current_pe}x) đang ở dải Rẻ so với trung bình chu kỳ 5 năm ({mean_pe}x). Khuyến nghị duy trì 80% cổ phiếu cơ bản và giữ 20% tiền mặt linh hoạt."
    elif current_pe <= 16.0:
        band = "FAIR"
        band_text = "Hợp Lý (Định giá cân bằng)"
        band_color = "blue"
        equity_pct = 65
        cash_pct = 35
        stance = "NẮM GIỮ / CHỌN LỌC"
        rationale = f"P/E VN-Index ({current_pe}x) nằm trong dải trung vị hợp lý. Khuyến nghị duy trì 65% cổ phiếu có EPS tăng trưởng cao, 35% tiền mặt."
    elif current_pe <= 18.0:
        band = "EXPENSIVE"
        band_text = "Đắt (Vùng chốt lời dần)"
        band_color = "amber"
        equity_pct = 45
        cash_pct = 55
        stance = "PHÒNG THỦ"
        rationale = f"P/E VN-Index ({current_pe}x) vượt mức trung bình, bước vào vùng đắt. Khuyến nghị hạ tỷ trọng cổ phiếu, giữ 55% tiền mặt."
    else:
        band = "OVERHEATED"
        band_text = "Rất Đắt / Hưng Phấn Cực Đại"
        band_color = "rose"
        equity_pct = 30
        cash_pct = 70
        stance = "QUẢN TRỊ RỦI RO CAO"
        rationale = f"P/E VN-Index ({current_pe}x) vượt 18.0x, thị trường rất đắt. Khuyến nghị phòng thủ với tối đa 70% tiền mặt."

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
