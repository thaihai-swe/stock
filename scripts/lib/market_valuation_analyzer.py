#!/usr/bin/env python3
"""
scripts/lib/market_valuation_analyzer.py
Động cơ phân tích thống kê định giá thị trường VN-Index:
1. Thống kê phân vị, Z-score, 5-band động theo 4 cửa sổ thời gian (5 Năm, 10 Năm, Hiện đại từ 2007, Toàn bộ).
2. Tính toán độ lệch chuẩn so với Trung vị (% vs Median) và Trung bình (% vs Mean).
3. Metric dẫn xuất: Tích số Graham P/E * P/B và ROE proxy (P/B / P/E * 100).
4. Composite Valuation Signal (0-100) đưa ra khuyến nghị khách quan (MUA MẠNH / MUA / GIỮ / BÁN).
5. Phát hiện cảnh báo cực đoan khi |z| > 2.
"""

from __future__ import annotations

import math
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

try:
    from scripts.lib.config_loader import get_macro_narratives, get_macro_thresholds
except ImportError:
    try:
        from lib.config_loader import get_macro_narratives, get_macro_thresholds
    except ImportError:
        def get_macro_thresholds() -> Dict[str, Any]:
            return {}
        def get_macro_narratives() -> Dict[str, Any]:
            return {}

_thresholds = get_macro_thresholds()
_narratives = get_macro_narratives()


def compute_window_stats(df: pd.DataFrame, col: str, label: str) -> Dict[str, Any]:
    """Tính toán bộ chỉ số thống kê & phân vị 5-band cho 1 cột số liệu trong 1 cửa sổ thời gian."""
    if df.empty or col not in df.columns:
        return {"label": label, "error": "không có dữ liệu"}

    values = df[col].dropna().values
    if len(values) < 5:
        return {"label": label, "error": "không đủ dữ liệu thống kê"}

    mean = float(np.mean(values))
    median = float(np.median(values))
    std = float(np.std(values, ddof=0))
    current = float(values[-1])
    zscore = (current - mean) / std if std > 1e-10 else 0.0

    below = np.sum(values <= current)
    percentile = float(round((below / len(values)) * 100.0, 1))

    p10 = float(np.percentile(values, 10))
    p25 = float(np.percentile(values, 25))
    p75 = float(np.percentile(values, 75))
    p90 = float(np.percentile(values, 90))

    # Gán nhãn 5 dải định vị theo chuẩn phân phối thống kê
    if current <= p10:
        band = "Rất rẻ"
        band_badge = "bg-emerald-500/20 text-emerald-400 border border-emerald-400/40"
        band_color = "#22c55e"
    elif current <= p25:
        band = "Rẻ"
        band_badge = "bg-teal-500/20 text-teal-300 border border-teal-400/40"
        band_color = "#14b8a6"
    elif current <= p75:
        band = "Trung bình"
        band_badge = "bg-blue-500/20 text-blue-300 border border-blue-400/40"
        band_color = "#3b82f6"
    elif current <= p90:
        band = "Mắc"
        band_badge = "bg-amber-500/20 text-amber-300 border border-amber-400/40"
        band_color = "#f59e0b"
    else:
        band = "Rất mắc"
        band_badge = "bg-rose-500/20 text-rose-300 border border-rose-400/40"
        band_color = "#ef4444"

    # % so với median và mean (dấu âm = rẻ hơn, dương = đắt hơn)
    vs_median_pct = float(round(((current - median) / median) * 100 if median != 0 else 0.0, 1))
    vs_mean_pct = float(round(((current - mean) / mean) * 100 if mean != 0 else 0.0, 1))

    return {
        "label": label,
        "mean": float(round(mean, 2)),
        "median": float(round(median, 2)),
        "std": float(round(std, 2)),
        "current": float(round(current, 2)),
        "zscore": float(round(zscore, 2)),
        "percentile": percentile,
        "p10": float(round(p10, 2)),
        "p25": float(round(p25, 2)),
        "p75": float(round(p75, 2)),
        "p90": float(round(p90, 2)),
        "band": band,
        "bandBadge": band_badge,
        "bandColor": band_color,
        "nObs": int(len(values)),
        "vsMedianPct": vs_median_pct,
        "vsMeanPct": vs_mean_pct,
    }


def compute_composite_signal(spe: Dict[str, Any], spb: Dict[str, Any]) -> Dict[str, Any]:
    """
    Tính Composite Valuation Score (0–100) kết hợp P/E và P/B:
    - 30% normalized Z-score PE
    - 30% normalized Z-score PB
    - 20% percentile PE
    - 20% percentile PB
    Điểm càng thấp = Thị trường càng rẻ / Biên an toàn càng lớn.
    """
    z_pe = spe.get("zscore", 0.0) or 0.0
    z_pb = spb.get("zscore", 0.0) or 0.0
    pctl_pe = spe.get("percentile", 50.0) or 50.0
    pctl_pb = spb.get("percentile", 50.0) or 50.0

    z_pe_norm = max(0.0, min(100.0, (z_pe + 3.0) / 6.0 * 100.0))
    z_pb_norm = max(0.0, min(100.0, (z_pb + 3.0) / 6.0 * 100.0))

    score = round(z_pe_norm * 0.30 + z_pb_norm * 0.30 + pctl_pe * 0.20 + pctl_pb * 0.20, 1)

    signals_map = _narratives.get("compositeSignals", {})
    if score <= 20.0:
        sig_data = signals_map.get("DEEP_VALUE", {})
        signal = sig_data.get("signal", "MUA MẠNH (DEEP VALUE)")
        badge = sig_data.get("badge", "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40")
        color = sig_data.get("color", "#22c55e")
        description = sig_data.get("description", "Định giá thị trường đang ở vùng đáy lịch sử (Percentile < 20%), cơ hội vàng tích lũy cổ phiếu giá trị.")
    elif score <= 40.0:
        sig_data = signals_map.get("VALUE_BUY", {})
        signal = sig_data.get("signal", "MUA TÍCH LŨY (VALUE BUY)")
        badge = sig_data.get("badge", "bg-teal-500/20 text-teal-300 border border-teal-400/40")
        color = sig_data.get("color", "#14b8a6")
        description = sig_data.get("description", "Định giá thị trường đang ở vùng hấp dẫn dưới trung vị lịch sử, thích hợp giải ngân DCA theo lộ trình.")
    elif score <= 60.0:
        sig_data = signals_map.get("HOLD", {})
        signal = sig_data.get("signal", "TRUNG LẬP / GIỮ (HOLD)")
        badge = sig_data.get("badge", "bg-blue-500/20 text-blue-300 border border-blue-400/40")
        color = sig_data.get("color", "#3b82f6")
        description = sig_data.get("description", "Định giá cân bằng quanh mức trung bình dài hạn, nắm giữ danh mục và chọn lọc cổ phiếu có câu chuyện riêng.")
    elif score <= 80.0:
        sig_data = signals_map.get("TRIM", {})
        signal = sig_data.get("signal", "HẠ TỶ TRỌNG (TRIM / CAUTION)")
        badge = sig_data.get("badge", "bg-amber-500/20 text-amber-300 border border-amber-400/40")
        color = sig_data.get("color", "#f59e0b")
        description = sig_data.get("description", "Thị trường bước vào vùng định giá cao hơn trung bình, cân nhắc chốt lời từng phần và nâng tỷ trọng tiền mặt.")
    else:
        sig_data = signals_map.get("DEFENSIVE", {})
        signal = sig_data.get("signal", "PHÒNG THỦ / BÁN (DEFENSIVE)")
        badge = sig_data.get("badge", "bg-rose-500/20 text-rose-300 border border-rose-400/40")
        color = sig_data.get("color", "#ef4444")
        description = sig_data.get("description", "Thị trường ở vùng quá nóng (Percentile > 80%), nguy cơ điều chỉnh định giá cao, ưu tiên quản trị rủi ro tối đa.")

    return {
        "score": score,
        "signal": signal,
        "badge": badge,
        "color": color,
        "description": description
    }

def analyze_market_valuation(df: pd.DataFrame, now: Optional[datetime] = None) -> Dict[str, Any]:
    """
    Phân tích toàn diện chuỗi lịch sử định giá VN-Index:
    - 4 cửa sổ chu kỳ: ten_year (mặc định), five_year, modern (từ 2007), all_time (toàn bộ).
    - Metrics dẫn xuất: P/E * P/B, ROE proxy (P/B / P/E * 100).
    - Cảnh báo cực đoan khi |z| > 2.
    """
    if df.empty or "pe" not in df.columns:
        return {"error": "Không có dữ liệu định giá hợp lệ"}

    df_clean = df[df["pe"] > 1.0].copy()
    if df_clean.empty:
        return {"error": "Không có bản ghi P/E > 1.0 hợp lệ"}

    # Tính metric dẫn xuất
    df_derived = df_clean.copy()
    df_derived["pe_x_pb"] = df_derived["pe"] * df_derived["pb"]
    # ROE proxy = EPS / BVPS = (P/BV) / (P/E) = PB / PE * 100 (%)
    df_derived["roe_proxy"] = (df_derived["pb"] / df_derived["pe"]) * 100.0

    if now is None:
        now = datetime.now()

    five_yr = now - timedelta(days=365 * 5)
    ten_yr = now - timedelta(days=365 * 10)

    win_narratives = _narratives.get("valuationWindows", {})
    windows = {
        "ten_year": {
            "label": win_narratives.get("ten_year", {}).get("label", "10 Năm"),
            "desc": win_narratives.get("ten_year", {}).get("desc", "Cửa sổ chuẩn mực vĩ mô dài hạn (Khuyến nghị)"),
            "df": df_derived[df_derived["trading_date"] >= ten_yr].copy(),
        },
        "five_year": {
            "label": win_narratives.get("five_year", {}).get("label", "5 Năm"),
            "desc": win_narratives.get("five_year", {}).get("desc", "Chu kỳ kinh tế & tiền tệ gần nhất"),
            "df": df_derived[df_derived["trading_date"] >= five_yr].copy(),
        },
        "modern": {
            "label": win_narratives.get("modern", {}).get("label", "Từ 2007"),
            "desc": win_narratives.get("modern", {}).get("desc", "Thời kỳ hội nhập WTO"),
            "df": df_derived[df_derived["trading_date"] >= "2007-01-01"].copy(),
        },
        "all_time": {
            "label": win_narratives.get("all_time", {}).get("label", "Toàn Bộ (25 Năm)"),
            "desc": win_narratives.get("all_time", {}).get("desc", "Toàn cảnh từ ngày lập sàn HOSE"),
            "df": df_derived.copy(),
        },
    }

    windows_result: Dict[str, Any] = {}
    for wkey, winfo in windows.items():
        wdf = winfo["df"]
        if wdf.empty:
            continue
        pe_s = compute_window_stats(wdf, "pe", f"P/E ({winfo['label']})")
        pb_s = compute_window_stats(wdf, "pb", f"P/B ({winfo['label']})")
        pe_pb_s = compute_window_stats(wdf, "pe_x_pb", f"P/E×P/B ({winfo['label']})")
        roe_s = compute_window_stats(wdf, "roe_proxy", f"ROE ({winfo['label']})")

        sig = compute_composite_signal(pe_s, pb_s)

        windows_result[wkey] = {
            "key": wkey,
            "label": winfo["label"],
            "desc": winfo["desc"],
            "dateFrom": str(wdf["trading_date"].min())[:10],
            "dateTo": str(wdf["trading_date"].max())[:10],
            "nObs": len(wdf),
            "pe": pe_s,
            "pb": pb_s,
            "peXpb": pe_pb_s,
            "roeProxy": roe_s,
            "compositeSignal": sig,
        }

    last_row = df_derived.iloc[-1]
    cur_pe = round(float(last_row["pe"]), 2) if pd.notna(last_row["pe"]) else None
    cur_pb = round(float(last_row["pb"]), 2) if pd.notna(last_row["pb"]) else None
    cur_pe_pb = round(float(last_row["pe_x_pb"]), 2) if pd.notna(last_row["pe_x_pb"]) else None
    cur_roe = round(float(last_row["roe_proxy"]), 2) if pd.notna(last_row["roe_proxy"]) else None
    cur_date = str(last_row["trading_date"])[:10]

    # Kiểm tra cảnh báo cực đoan theo cửa sổ chuẩn 10 năm
    z_threshold = _thresholds.get("marketValuation", {}).get("zScoreExtreme", 2.0)
    def_win = windows_result.get("ten_year") or windows_result.get("all_time") or {}
    z_pe_def = def_win.get("pe", {}).get("zscore", 0.0) or 0.0
    z_pb_def = def_win.get("pb", {}).get("zscore", 0.0) or 0.0
    extreme_alert = abs(z_pe_def) > z_threshold or abs(z_pb_def) > z_threshold
    extreme_alert_text = None
    if extreme_alert:
        if z_pe_def < -z_threshold:
            extreme_alert_text = f"Cảnh báo độ lệch chuẩn cực đoan: Z-Score P/E = {z_pe_def:+.2f} (Rẻ hiếm có, vùng hoảng loạn lịch sử |z| > {z_threshold})."
        elif z_pe_def > z_threshold:
            extreme_alert_text = f"Cảnh báo độ lệch chuẩn cực đoan: Z-Score P/E = {z_pe_def:+.2f} (Đắt cực độ, vùng hưng phấn bong bóng |z| > {z_threshold})."

    return {
        "current": {
            "pe": cur_pe,
            "pb": cur_pb,
            "peXpb": cur_pe_pb,
            "roeProxy": cur_roe,
            "date": cur_date,
        },
        "defaultWindow": "ten_year",
        "extremeAlert": extreme_alert,
        "extremeAlertText": extreme_alert_text,
        "windows": windows_result,
    }


if __name__ == "__main__":
    from fetchers.vietstock_valuation_fetcher import VietstockValuationFetcher
    fetcher = VietstockValuationFetcher()
    df = fetcher.fetch_vnindex_history()
    res = analyze_market_valuation(df)
    print("Dữ liệu hiện tại:", res["current"])
    print("Cửa sổ 10 Năm:", res["windows"]["ten_year"]["pe"])
    print("Tín hiệu 10 Năm:", res["windows"]["ten_year"]["compositeSignal"])
