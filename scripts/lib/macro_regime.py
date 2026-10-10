#!/usr/bin/env python3
"""
scripts/lib/macro_regime.py
Bộ động cơ định lượng vĩ mô, nhận diện chu kỳ và phân bổ danh mục theo chuẩn ref-macro-vietnam:
1. Phân định 5 pha chu kỳ kinh tế (Recovery, Expansion, Overheating, Slowdown, Recession).
2. Tính toán Risk Score (0-100) theo 8 thành phần z-score & phân rã 4 lớp rủi ro (Monetary, Growth, Price, External).
3. Ma trận nhạy cảm & xoay vòng 11 nhóm ngành HOSE (Sector Rotation).
4. Radar 6 tín hiệu sớm dẫn dắt (Leading Signals) và khẩu vị rủi ro Risk-On / Risk-Off.
5. Phân bổ 4 lớp tài sản động (Equity, Bond, Cash, Gold).
6. Khuyến nghị Arbitrage Vàng miếng SJC vs Vàng thế giới quy đổi.
"""

from typing import Any, Dict, List, Optional, Tuple

PHASES = ("Recovery", "Expansion", "Overheating", "Slowdown", "Recession")

PHASE_META = {
    "Recovery": {
        "titleVi": "Phục Hồi Kinh Tế",
        "description": "Lãi suất hạ nhiệt, lạm phát thấp, thanh khoản dồi dào. Cổ phiếu chu kỳ, chứng khoán và bán lẻ dẫn dắt.",
        "badgeColor": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        "color": "emerald",
    },
    "Expansion": {
        "titleVi": "Mở Rộng Tăng Trưởng",
        "description": "Tăng trưởng tín dụng và sản xuất vững chắc, lợi nhuận DN bùng nổ. Ngân hàng, BĐS và công nghệ dẫn sóng.",
        "badgeColor": "bg-blue-500/20 text-blue-400 border-blue-500/30",
        "color": "blue",
    },
    "Overheating": {
        "titleVi": "Tăng Nhiệt & Đỉnh Chu Kỳ",
        "description": "Lãi suất bắt đầu nhích tăng, lạm phát áp lực cao. Dòng tiền dịch chuyển sang năng lượng, vật liệu và phòng thủ.",
        "badgeColor": "bg-amber-500/20 text-amber-400 border-amber-500/30",
        "color": "amber",
    },
    "Slowdown": {
        "titleVi": "Chậm Lại & Thắt Chặt",
        "description": "Lãi suất cao, tín dụng thắt chặt, biên lợi nhuận thu hẹp. Ưu tiên hàng tiêu dùng thiết yếu, tiện ích điện nước và tiền mặt.",
        "badgeColor": "bg-orange-500/20 text-orange-400 border-orange-500/30",
        "color": "orange",
    },
    "Recession": {
        "titleVi": "Suy Thoái & Đáy Chu Kỳ",
        "description": "Hoạt động sản xuất thu hẹp, PMI dưới 50, chuẩn bị bước vào chu kỳ nới lỏng chính sách tiền tệ mới.",
        "badgeColor": "bg-rose-500/20 text-rose-400 border-rose-500/30",
        "color": "rose",
    },
}

_PHASE_RULES = {
    "sbv_refinancing_rate": {
        "Recovery": (None, 4.5),
        "Expansion": (4.0, 5.5),
        "Overheating": (5.0, 7.0),
        "Slowdown": (6.5, None),
        "Recession": (None, 4.5),
    },
    "interbank_rate": {
        "Recovery": (None, 2.5),
        "Expansion": (2.0, 4.5),
        "Overheating": (4.0, 6.5),
        "Slowdown": (6.0, None),
        "Recession": (None, 3.0),
    },
    "cpi_yoy": {
        "Recovery": (None, 4.0),
        "Expansion": (3.5, 5.5),
        "Overheating": (5.0, 7.5),
        "Slowdown": (7.0, None),
        "Recession": (None, 3.5),
    },
    "credit_growth_yoy": {
        "Recovery": (None, 12.0),
        "Expansion": (12.0, 16.5),
        "Overheating": (16.0, None),
        "Slowdown": (None, 11.0),
        "Recession": (None, 8.0),
    },
    "pmi": {
        "Recovery": (50.0, 52.5),
        "Expansion": (51.5, 55.0),
        "Overheating": (53.0, None),
        "Slowdown": (48.0, 50.5),
        "Recession": (None, 48.5),
    },
    "usdvnd": {
        "Recovery": (None, 24800),
        "Expansion": (24500, 25500),
        "Overheating": (25200, 26200),
        "Slowdown": (25800, None),
        "Recession": (25000, None),
    },
}


def detect_phase(macro: Dict[str, Any]) -> Dict[str, Any]:
    """Xác định pha kinh tế vĩ mô Việt Nam theo quy chuẩn 6 drivers."""
    scores = {p: 0 for p in PHASES}
    matched = []

    for key, rules in _PHASE_RULES.items():
        val = macro.get(key)
        if val is None:
            continue
        for phase, (lo, hi) in rules.items():
            lo_ok = lo is None or val >= lo
            hi_ok = hi is None or val <= hi
            if lo_ok and hi_ok:
                scores[phase] += 1
                matched.append((key, phase, val))

    phase_priority = {
        "Slowdown": 5,
        "Overheating": 4,
        "Expansion": 3,
        "Recovery": 2,
        "Recession": 1,
    }
    top_score = max(scores.values()) if scores else 0
    if top_score == 0:
        phase = "Expansion"  # Default fallback
    else:
        candidates = [p for p, s in scores.items() if s == top_score]
        phase = max(candidates, key=lambda p: phase_priority.get(p, 1))

    meta = PHASE_META.get(phase, PHASE_META["Expansion"])
    return {
        "phase": phase,
        "titleVi": meta["titleVi"],
        "description": meta["description"],
        "badgeColor": meta["badgeColor"],
        "color": meta["color"],
        "scores": scores,
        "voteCount": top_score,
        "matchedDrivers": [f"{k}={v}" for (k, p, v) in matched if p == phase][:5]
    }


def calculate_risk_score_and_layers(macro: Dict[str, Any]) -> Dict[str, Any]:
    """
    Tính Risk Score (0-100) theo 8 thành phần và phân rã 4 lớp (Monetary, Growth, Price, External).
    """
    cpi = float(macro.get("cpi_yoy") or 4.5)
    sbv_rate = float(macro.get("sbv_refinancing_rate") or 4.5)
    gdp_growth = float(macro.get("gdp_growth_yoy") or 7.0)
    vn10y = float(macro.get("vn10yYield") or macro.get("vn10y") or 3.45)
    us10y = float(macro.get("us10yYield") or macro.get("us10y") or 4.3)
    credit = float(macro.get("credit_growth_yoy") or 14.0)
    usdvnd = float(macro.get("usdVndRate") or macro.get("usdvnd") or 25500.0)

    # 1. Tính các gap thành phần
    s_infl = (cpi - 4.0) / 1.5
    real_rate = sbv_rate - cpi
    s_pol = ((real_rate - 1.5) / 1.5) + 0.5 * ((sbv_rate - 4.5) / 1.0)
    s_grow = -((gdp_growth - 6.5) / 1.5)
    s_curve = -((vn10y - sbv_rate) / 1.2)
    s_spread = ((vn10y - us10y) / 1.5)
    s_credit = ((credit - 14.0) / 2.5)
    s_fx = ((usdvnd - 25000.0) / 1000.0)

    # 2. Risk Z-score tổng hợp
    components = [s_infl, s_pol, s_grow, s_curve, s_spread, s_credit, s_fx]
    risk_z = sum(components) / len(components)

    # Scale to 0-100
    risk_score = round(max(0.0, min(100.0, 50.0 + (risk_z * 20.0))), 1)

    # Phân loại Risk Bucket B0 - B4
    if risk_score <= 20.0:
        bucket = "B0"
        bucket_label = "Rất Thấp (Môi trường cực kỳ thuận lợi)"
        bucket_color = "text-emerald-400"
    elif risk_score <= 40.0:
        bucket = "B1"
        bucket_label = "Thấp (Môi trường ổn định)"
        bucket_color = "text-emerald-500"
    elif risk_score <= 60.0:
        bucket = "B2"
        bucket_label = "Trung Bình (Cần theo dõi cẩn trọng)"
        bucket_color = "text-amber-400"
    elif risk_score <= 80.0:
        bucket = "B3"
        bucket_label = "Cao (Rủi ro vĩ mô gia tăng)"
        bucket_color = "text-orange-500"
    else:
        bucket = "B4"
        bucket_label = "Rất Cao (Mức độ cảnh báo phòng thủ)"
        bucket_color = "text-rose-500"

    # 3. Phân rã 4 Layers (Normalized 0-100)
    monetary_layer = round(max(0.0, min(100.0, 50.0 + ((s_pol + s_curve) / 2.0) * 20.0)), 1)
    growth_layer = round(max(0.0, min(100.0, 50.0 + ((s_grow + s_curve) / 2.0) * 20.0)), 1)
    price_layer = round(max(0.0, min(100.0, 50.0 + (s_infl * 20.0))), 1)
    external_layer = round(max(0.0, min(100.0, 50.0 + ((s_fx + s_spread) / 2.0) * 20.0)), 1)

    return {
        "riskScore": risk_score,
        "riskBucket": bucket,
        "riskBucketLabel": bucket_label,
        "riskBucketColor": bucket_color,
        "layers": {
            "monetary": monetary_layer,
            "growth": growth_layer,
            "price": price_layer,
            "external": external_layer,
        }
    }


SECTORS = {
    "banking":      {"name": "Ngân Hàng", "icon": "🏦"},
    "realestate":   {"name": "Bất Động Sản", "icon": "🏢"},
    "securities":   {"name": "Chứng Khoán", "icon": "📈"},
    "materials":    {"name": "Thép & Vật Liệu", "icon": "🏗️"},
    "retail":       {"name": "Bán Lẻ & Tiêu Dùng", "icon": "🛒"},
    "tech":         {"name": "Công Nghệ Thông Tin", "icon": "💻"},
    "energy":       {"name": "Năng Lượng & Dầu Khí", "icon": "⚡"},
    "construction": {"name": "Xây Dựng & Đầu Tư Công", "icon": "🚜"},
    "fmcg":         {"name": "Tiêu Dùng Thiết Yếu", "icon": "🥛"},
    "utilities":    {"name": "Điện, Nước & Tiện Ích", "icon": "💡"},
    "healthcare":   {"name": "Dược Phẩm & Y Tế", "icon": "💊"},
}

_SENSITIVITY_MATRIX = {
    # Ngành: (interbank, sbv_rate, cpi, usdvnd, oil, pmi)
    "banking":      (-1.5, -1.5, -1.0, -1.0,  0.0, +1.0),
    "realestate":   (-1.0, -2.0, -1.0, -1.0,  0.0, +1.0),
    "construction": (-1.0, -1.0, -0.5, -0.5, -0.5, +1.5),
    "retail":       (-0.5, -0.5, -1.0,  0.0,  0.0, +1.0),
    "energy":       ( 0.0,  0.0, +1.0, +0.5, +2.0, +0.5),
    "materials":    ( 0.0,  0.0, +0.5, -0.5, +1.5, +1.5),
    "fmcg":         ( 0.0,  0.0, -0.5,  0.0,  0.0,  0.0),
    "tech":         ( 0.0,  0.0,  0.0,  0.0,  0.0, +1.0),
    "utilities":    (-1.0, -1.0,  0.0,  0.0, -1.0, -0.5),
    "healthcare":   ( 0.0,  0.0,  0.0,  0.0,  0.0,  0.0),
    "securities":   (-2.0, -1.5,  0.0, -0.5,  0.0, +1.5),
}


def compute_sector_rotation(phase: str, macro: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Tính toán ma trận tác động vĩ mô và xoay vòng 11 nhóm ngành HOSE."""
    interbank = float(macro.get("interbank_rate") or 6.47)
    sbv_rate = float(macro.get("sbv_refinancing_rate") or 4.5)
    cpi = float(macro.get("cpi_yoy") or 5.08)
    usdvnd = float(macro.get("usdVndRate") or macro.get("usdvnd") or 25881.0)
    oil = float(macro.get("oilBrent") or 104.7)
    pmi = float(macro.get("pmi") or 51.9)

    # Xác định driver strength (+1 / 0 / -1)
    str_interbank = 1 if interbank < 3.0 else (-1 if interbank > 5.5 else 0)
    str_sbv = 1 if sbv_rate <= 4.5 else (-1 if sbv_rate > 5.5 else 0)
    str_cpi = 1 if cpi < 4.0 else (-1 if cpi > 6.0 else 0)
    str_fx = 1 if usdvnd < 25000 else (-1 if usdvnd > 26000 else 0)
    str_oil = 1 if (65 <= oil <= 90) else (-1 if oil > 105 or oil < 50 else 0)
    str_pmi = 1 if pmi >= 51.0 else (-1 if pmi < 49.0 else 0)

    drivers = [str_interbank, str_sbv, str_cpi, str_fx, str_oil, str_pmi]

    results = []
    for sector_key, info in SECTORS.items():
        sens = _SENSITIVITY_MATRIX.get(sector_key, (0, 0, 0, 0, 0, 0))

        # Tính net impact score
        impacts = [
            sens[0] * (-drivers[0]),
            sens[1] * (-drivers[1]),
            sens[2] * (-drivers[2]),
            sens[3] * (-drivers[3]),
            sens[4] * drivers[4],
            sens[5] * drivers[5]
        ]
        net_score = round(sum(impacts), 1)

        if net_score >= 1.5:
            action = "TẬP TRUNG MUA"
            action_tag = "Overweight"
            color_class = "text-emerald-400 bg-emerald-500/15 border-emerald-500/30"
            badge = "bg-emerald-500"
        elif net_score >= 0.5:
            action = "KHẢ QUAN"
            action_tag = "Accumulate"
            color_class = "text-green-400 bg-green-500/10 border-green-500/20"
            badge = "bg-green-500"
        elif net_score >= -0.5:
            action = "TRUNG LẬP"
            action_tag = "Neutral"
            color_class = "text-gray-300 bg-gray-500/10 border-gray-500/20"
            badge = "bg-gray-400"
        elif net_score >= -1.5:
            action = "THẬN TRỌNG"
            action_tag = "Underweight"
            color_class = "text-amber-400 bg-amber-500/15 border-amber-500/30"
            badge = "bg-amber-500"
        else:
            action = "TRÁNH MUA / HẠ TỶ TRỌNG"
            action_tag = "Reduce"
            color_class = "text-rose-400 bg-rose-500/15 border-rose-500/30"
            badge = "bg-rose-500"

        results.append({
            "key": sector_key,
            "name": info["name"],
            "icon": info["icon"],
            "netScore": net_score,
            "action": action,
            "actionTag": action_tag,
            "colorClass": color_class,
            "badgeColor": badge,
        })

    # Sort descending by net score
    results.sort(key=lambda s: s["netScore"], reverse=True)
    for idx, s in enumerate(results):
        s["rank"] = idx + 1

    return results


def evaluate_leading_signals(macro: Dict[str, Any]) -> Dict[str, Any]:
    """Đánh giá 6 chỉ báo sớm để xác định trạng thái Risk-On / Risk-Off."""
    interbank = float(macro.get("interbank_rate") or 6.47)
    credit = float(macro.get("credit_growth_yoy") or 15.08)
    cpi = float(macro.get("cpi_yoy") or 5.08)
    pmi = float(macro.get("pmi") or 51.9)
    usdvnd = float(macro.get("usdVndRate") or macro.get("usdvnd") or 25881.0)
    vn10y = float(macro.get("vn10yYield") or macro.get("vn10y") or 3.45)

    signals = [
        {
            "key": "interbank",
            "name": "Lãi Suất Liên Ngân Hàng",
            "val": f"{interbank:.2f}%",
            "status": "bullish" if interbank < 3.0 else ("bearish" if interbank > 6.0 else "neutral"),
            "lead": "Thanh khoản liên ngân hàng duy trì thông thoáng hỗ trợ dòng tiền thị trường."
        },
        {
            "key": "credit",
            "name": "Tăng Trưởng Tín Dụng",
            "val": f"{credit:.1f}%",
            "status": "bullish" if (12.0 <= credit <= 16.5) else ("neutral" if credit > 16.5 else "bearish"),
            "lead": "Tín dụng tăng trưởng trong dải tối ưu 12-16% hỗ trợ sản xuất kinh doanh."
        },
        {
            "key": "cpi",
            "name": "Lạm Phát CPI",
            "val": f"{cpi:.2f}%",
            "status": "bullish" if cpi < 4.0 else ("neutral" if cpi <= 5.5 else "bearish"),
            "lead": "CPI dưới ngưỡng kiểm soát đảm bảo dư địa điều hành chính sách tiền tệ."
        },
        {
            "key": "pmi",
            "name": "Chỉ Số Sản Xuất PMI",
            "val": f"{pmi:.1f}",
            "status": "bullish" if pmi >= 51.0 else ("bearish" if pmi < 49.0 else "neutral"),
            "lead": "Hoạt động sản xuất công nghiệp và đơn hàng mới duy trì đà mở rộng."
        },
        {
            "key": "fx",
            "name": "Tỷ Giá USD/VND",
            "val": f"{usdvnd:,.0f}",
            "status": "bullish" if usdvnd < 25000 else ("bearish" if usdvnd > 26000 else "neutral"),
            "lead": "Tỷ giá ổn định giảm áp lực can thiệp hút ròng của Ngân hàng Nhà nước."
        },
        {
            "key": "vn10y",
            "name": "Lợi Suất TPCP 10Y",
            "val": f"{vn10y:.2f}%",
            "status": "bullish" if vn10y < 3.0 else ("bearish" if vn10y > 4.5 else "neutral"),
            "lead": "Lợi suất thấp giúp duy trì mức P/E chiết khấu hấp dẫn cho thị trường cổ phiếu."
        },
    ]

    bulls = sum(1 for s in signals if s["status"] == "bullish")
    bears = sum(1 for s in signals if s["status"] == "bearish")
    net = bulls - bears

    if net >= 3:
        stance = "Risk-On Mạnh (Ưu tiên giải ngân tích cực)"
        badge = "bg-emerald-500 text-white"
    elif net >= 1:
        stance = "Risk-On Nhẹ (Môi trường khả quan)"
        badge = "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
    elif net == 0:
        stance = "Trung Tính (Cân bằng danh mục)"
        badge = "bg-blue-500/20 text-blue-300 border border-blue-500/30"
    elif net >= -2:
        stance = "Risk-Off Nhẹ (Thận trọng phòng thủ)"
        badge = "bg-amber-500/20 text-amber-300 border border-amber-500/30"
    else:
        stance = "Risk-Off Mạnh (Ưu tiên tiền mặt cao)"
        badge = "bg-rose-500 text-white"

    return {
        "signals": signals,
        "bullishCount": bulls,
        "bearishCount": bears,
        "netScore": net,
        "stance": stance,
        "badgeClass": badge
    }


def calculate_4asset_allocation(risk_bucket: str, layer_scores: Dict[str, float]) -> Dict[str, Any]:
    """Phân bổ động 4 lớp tài sản: Cổ phiếu, Trái phiếu, Tiền mặt, Vàng."""
    base_map = {
        "B0": {"equity": 70.0, "bond": 20.0, "cash": 7.5, "gold": 2.5},
        "B1": {"equity": 60.0, "bond": 25.0, "cash": 10.0, "gold": 5.0},
        "B2": {"equity": 50.0, "bond": 30.0, "cash": 15.0, "gold": 5.0},
        "B3": {"equity": 35.0, "bond": 35.0, "cash": 25.0, "gold": 5.0},
        "B4": {"equity": 20.0, "bond": 35.0, "cash": 40.0, "gold": 5.0},
    }
    alloc = base_map.get(risk_bucket, base_map["B2"]).copy()

    # Điều chỉnh động theo layer
    monetary = layer_scores.get("monetary", 50.0)
    if monetary > 65.0:
        alloc["cash"] += 5.0
        alloc["equity"] -= 5.0
    elif monetary < 35.0:
        alloc["equity"] += 5.0
        alloc["cash"] -= 5.0

    price = layer_scores.get("price", 50.0)
    if price > 65.0:
        alloc["gold"] += 3.0
        alloc["cash"] -= 3.0

    for k in alloc:
        alloc[k] = max(0.0, alloc[k])
    tot = sum(alloc.values())
    if tot > 0:
        for k in alloc:
            alloc[k] = round(alloc[k] / tot * 100, 1)

    return alloc


def recommend_gold(
    gold_world: float,
    usd_vnd: float,
    sjc_sell: float,
    sjc_buy: float = 0.0,
    pnj_sell: float = 0.0,
    pnj_buy: float = 0.0,
    updated_at: str = ""
) -> Dict[str, Any]:
    """Tư vấn hành động vàng miếng SJC & Vàng nhẫn PNJ 999.9 dựa trên chênh lệch giá thế giới quy đổi."""
    # 1 troy oz = 31.1034768 g; 1 lượng vàng = 37.5 g
    world_per_luong = (gold_world * usd_vnd / 31.1034768) * 37.5
    sjc_spread_pct = 0.0
    pnj_spread_pct = 0.0

    if world_per_luong > 0:
        sjc_vnd = sjc_sell * 1_000_000 if (0 < sjc_sell < 1000) else sjc_sell
        if sjc_vnd > 0:
            sjc_spread_pct = round(((sjc_vnd / world_per_luong) - 1.0) * 100.0, 2)

        pnj_vnd = pnj_sell * 1_000_000 if (0 < pnj_sell < 1000) else pnj_sell
        if pnj_vnd > 0:
            pnj_spread_pct = round(((pnj_vnd / world_per_luong) - 1.0) * 100.0, 2)

    spread_ref = sjc_spread_pct if sjc_spread_pct != 0.0 else pnj_spread_pct

    if spread_ref >= 10.0:
        action = "MUA PHÒNG THỦ"
        size = "5-10% danh mục"
        reason = f"Chênh lệch SJC vs Thế giới rất lớn ({spread_ref}%). Biểu thị lực cầu nội địa phòng thủ tỷ giá gia tăng."
    elif spread_ref <= 3.0:
        action = "BÁN / TRÁNH MUA"
        size = "≤ 2% danh mục"
        reason = f"Chênh lệch SJC vs Thế giới giảm sâu ({spread_ref}%). Giá vàng trong nước bắt đầu bão hòa, thích hợp chốt lời."
    else:
        action = "NẮM GIỮ"
        size = "3-5% danh mục"
        reason = f"Chênh lệch giá vàng ổn định ({spread_ref}%). Khuyến nghị duy trì tỷ trọng phòng thủ tiêu chuẩn."

    return {
        "worldConvertedVnd": round(world_per_luong),
        "worldPriceUsd": round(gold_world, 2),
        "spreadPct": sjc_spread_pct,
        "sjcSpreadPct": sjc_spread_pct,
        "pnjSpreadPct": pnj_spread_pct,
        "sjcBuy": round(sjc_buy, 2) if sjc_buy > 0 else (round(sjc_sell - 3.0, 2) if sjc_sell > 0 else 0.0),
        "sjcSell": round(sjc_sell, 2),
        "pnjBuy": round(pnj_buy, 2) if pnj_buy > 0 else (round(pnj_sell - 3.0, 2) if pnj_sell > 0 else 0.0),
        "pnjSell": round(pnj_sell, 2),
        "updatedAt": updated_at,
        "action": action,
        "sizeHint": size,
        "reason": reason
    }
