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

        decomposition = {
            "interbank": round(impacts[0], 2),
            "sbvRate": round(impacts[1], 2),
            "cpi": round(impacts[2], 2),
            "usdVnd": round(impacts[3], 2),
            "oil": round(impacts[4], 2),
            "pmi": round(impacts[5], 2),
        }

        results.append({
            "key": sector_key,
            "name": info["name"],
            "icon": info["icon"],
            "netScore": net_score,
            "action": action,
            "actionTag": action_tag,
            "colorClass": color_class,
            "badgeColor": badge,
            "decomposition": decomposition,
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


def analyze_macro_clock(macro: Dict[str, Any]) -> Dict[str, Any]:
    """
    Đồng hồ vĩ mô 4 góc phần tư (Macro Clock 4-Quadrant):
    Kết hợp Trục Tăng trưởng GDP (Expansion / Slowdown / Stable) và Trục Lạm phát CPI (Cool / Hot / Stable).
    """
    gdp_val = float(macro.get("gdp_growth_yoy") or macro.get("vn_gdp_yoy") or 7.0)
    cpi_val = float(macro.get("cpi_yoy") or macro.get("vn_cpi_yoy") or 4.5)

    if gdp_val > 6.5:
        gdp_phase = "Expansion"
        gdp_phase_vi = "Tăng Trưởng Cao (>6.5%)"
    elif gdp_val < 5.5:
        gdp_phase = "Slowdown"
        gdp_phase_vi = "Tăng Trưởng Chậm (<5.5%)"
    else:
        gdp_phase = "Stable"
        gdp_phase_vi = "Tăng Trưởng Cân Bằng (5.5 - 6.5%)"

    if cpi_val > 5.5:
        infl_state = "Hot"
        infl_state_vi = "Lạm Phát Nóng (>5.5%)"
    elif cpi_val < 3.5:
        infl_state = "Cool"
        infl_state_vi = "Lạm Phát Hạ Nhiệt (<3.5%)"
    else:
        infl_state = "Stable"
        infl_state_vi = "Lạm Phát Trong Tầm Kiểm Soát (3.5 - 5.5%)"

    clock_map = {
        ("Expansion", "Cool"): {
            "quadrant": "🟢 GOLDILOCKS",
            "quadrantKey": "goldilocks",
            "titleVi": "Vàng Kinh Tế (Goldilocks)",
            "desc": "Tăng trưởng cao + Lạm phát hạ nhiệt • Môi trường lý tưởng nhất cho cổ phiếu",
            "colorClass": "text-emerald-400 bg-emerald-500/20 border-emerald-500/40",
            "favored": ["Chứng Khoán", "Ngân Hàng", "Bất Động Sản", "Bán Lẻ", "Công Nghệ"],
            "avoided": ["Tiêu Dùng Thiết Yếu (FMCG)", "Dược Phẩm", "Tiện Ích Điện Nước"]
        },
        ("Expansion", "Hot"): {
            "quadrant": "🟠 OVERHEATING",
            "quadrantKey": "overheating",
            "titleVi": "Tăng Nhiệt Đỉnh Chu Kỳ (Overheating)",
            "desc": "Tăng trưởng cao + Lạm phát nóng • Ưu tiên tài sản thực và nhóm hàng hóa",
            "colorClass": "text-amber-400 bg-amber-500/20 border-amber-500/40",
            "favored": ["Năng Lượng & Dầu Khí", "Thép & Vật Liệu", "Tiện Ích Điện Nước"],
            "avoided": ["Ngân Hàng", "Bất Động Sản", "Chứng Khoán"]
        },
        ("Expansion", "Stable"): {
            "quadrant": "🟠 OVERHEATING",
            "quadrantKey": "overheating",
            "titleVi": "Mở Rộng Tăng Tốc (Expansion)",
            "desc": "Tăng trưởng mạnh + Lạm phát vừa phải • Chu kỳ mở rộng bùng nổ của doanh nghiệp",
            "colorClass": "text-blue-400 bg-blue-500/20 border-blue-500/40",
            "favored": ["Ngân Hàng", "Chứng Khoán", "Công Nghệ", "Bán Lẻ"],
            "avoided": ["Tiêu Dùng Thiết Yếu (FMCG)", "Dược Phẩm"]
        },
        ("Slowdown", "Hot"): {
            "quadrant": "🔴 STAGFLATION",
            "quadrantKey": "stagflation",
            "titleVi": "Đình Lạm Rủi Ro (Stagflation)",
            "desc": "Tăng trưởng chậm + Lạm phát cao • Nguy cơ chi phí đẩy, ưu tiên tiền mặt & vàng",
            "colorClass": "text-rose-400 bg-rose-500/20 border-rose-500/40",
            "favored": ["Tiêu Dùng Thiết Yếu (FMCG)", "Dược Phẩm & Y Tế", "Vàng", "Tiền Mặt"],
            "avoided": ["Chứng Khoán", "Bất Động Sản", "Ngân Hàng", "Xây Dựng"]
        },
        ("Slowdown", "Cool"): {
            "quadrant": "🔵 REFLATION",
            "quadrantKey": "reflation",
            "titleVi": "Tái Nới Lỏng Kích Thích (Reflation)",
            "desc": "Tăng trưởng chậm + Lạm phát hạ nhiệt • Dư địa nới lỏng chính sách, đón đầu phục hồi",
            "colorClass": "text-cyan-400 bg-cyan-500/20 border-cyan-500/40",
            "favored": ["Chứng Khoán", "Ngân Hàng", "Đầu Tư Công & Xây Dựng", "Công Nghệ"],
            "avoided": ["FMCG", "Tiện Ích Điện Nước"]
        },
        ("Slowdown", "Stable"): {
            "quadrant": "🔵 REFLATION",
            "quadrantKey": "reflation",
            "titleVi": "Tái Nới Lỏng Kích Thích (Reflation)",
            "desc": "Tăng trưởng chậm lại + Lạm phát ổn định • Chu kỳ kích thích kinh tế dần hình thành",
            "colorClass": "text-cyan-400 bg-cyan-500/20 border-cyan-500/40",
            "favored": ["Chứng Khoán", "Ngân Hàng", "Đầu Tư Công"],
            "avoided": ["FMCG", "Tiện Ích"]
        },
        ("Stable", "Hot"): {
            "quadrant": "🟠 OVERHEATING",
            "quadrantKey": "overheating",
            "titleVi": "Tăng Nhiệt Thận Trọng",
            "desc": "Tăng trưởng cân bằng + Lạm phát nhích cao • Đề phòng SBV hút tiền thanh khoản",
            "colorClass": "text-amber-400 bg-amber-500/20 border-amber-500/40",
            "favored": ["Năng Lượng", "Vật Liệu", "Tiện Ích"],
            "avoided": ["BĐS Đầu Cơ", "Chứng Khoán"]
        },
        ("Stable", "Cool"): {
            "quadrant": "🟢 GOLDILOCKS",
            "quadrantKey": "goldilocks",
            "titleVi": "Cân Bằng Thuận Lợi (Goldilocks)",
            "desc": "Tăng trưởng ổn định + Lạm phát thấp • Tích lũy cổ phiếu giá trị có nền tảng vững chắc",
            "colorClass": "text-emerald-400 bg-emerald-500/20 border-emerald-500/40",
            "favored": ["Ngân Hàng", "Công Nghệ", "Bán Lẻ", "Chứng Khoán"],
            "avoided": ["FMCG", "Y Tế"]
        },
        ("Stable", "Stable"): {
            "quadrant": "⚪ TRANSITION",
            "quadrantKey": "transition",
            "titleVi": "Chuyển Giao Cân Bằng (Transition)",
            "desc": "Tín hiệu vĩ mô trung tính • Phù hợp nắm giữ danh mục và chọn lọc kỹ lưỡng",
            "colorClass": "text-gray-300 bg-gray-500/20 border-gray-500/40",
            "favored": ["Ngân Hàng Lớn", "Công Nghệ (FPT)", "Bán Lẻ Đầu Ngành"],
            "avoided": ["BĐS Đầu Cơ", "Cổ Phiếu Đòn Bẩy Cao"]
        },
    }

    info = clock_map.get((gdp_phase, infl_state), clock_map[("Stable", "Stable")])
    return {
        "quadrant": info["quadrant"],
        "quadrantKey": info["quadrantKey"],
        "titleVi": info["titleVi"],
        "desc": info["desc"],
        "colorClass": info["colorClass"],
        "gdpPhase": gdp_phase,
        "gdpPhaseVi": gdp_phase_vi,
        "gdpValue": round(gdp_val, 2),
        "inflationState": infl_state,
        "inflationStateVi": infl_state_vi,
        "cpiValue": round(cpi_val, 2),
        "favoredSectors": info["favored"],
        "avoidedSectors": info["avoided"],
    }


def analyze_yield_curve_stress(macro: Dict[str, Any]) -> Dict[str, Any]:
    """
    Phân tích đường cong lợi suất TPCP Việt Nam & Chỉ số căng thẳng thị trường nợ:
    - Long-Short Spread (LSS) = VN10Y - SBV Refinancing Rate.
    - Cross-Country Spread = VN10Y - US10Y.
    - Cảnh báo Inversion & Cảnh báo Recession Lead.
    """
    vn10y = float(macro.get("vn10yYield") or macro.get("vn10y") or 3.45)
    us10y = float(macro.get("us10yYield") or macro.get("us10y") or 4.3)
    sbv_rate = float(macro.get("sbvRefinancingRate") or macro.get("sbv_refinancing_rate") or 4.5)

    long_short_spread = round(vn10y - sbv_rate, 2)
    cross_country_spread = round(vn10y - us10y, 2)

    inversion_warning = long_short_spread < 0.0
    recession_lead = long_short_spread < -0.5 and vn10y >= 3.6

    if long_short_spread >= 0.5 and vn10y <= 3.5:
        yc_regime = "Easing"
        yc_regime_vi = "Nới Lỏng / Đường Cong Dốc Lên Khỏe Mạnh"
        regime_badge = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
    elif long_short_spread < 0.0:
        yc_regime = "Stress"
        yc_regime_vi = "Căng Thẳng / Nguy Cơ Đảo Ngược Kỳ Hạn"
        regime_badge = "bg-rose-500/20 text-rose-400 border-rose-500/30"
    else:
        yc_regime = "Neutral"
        yc_regime_vi = "Cân Bằng Chu Kỳ"
        regime_badge = "bg-blue-500/20 text-blue-400 border-blue-500/30"

    # Chỉ số căng thẳng đường cong YC Stress (0 - 100)
    stress_raw = 50.0 + (3.45 - vn10y) * (-15.0) + (-long_short_spread) * 20.0
    yc_stress = round(max(0.0, min(100.0, stress_raw)), 1)

    assessment = (
        f"Lợi suất TPCP 10Y ({vn10y:.2f}%) so với lãi suất tái cấp vốn SBV ({sbv_rate:.2f}%) tạo độ dốc LSS = {long_short_spread:+.2f}%. "
        f"Chênh lệch TPCP Việt Nam so với Mỹ 10Y là {cross_country_spread:+.2f}%. "
        + ("⚠️ Cảnh báo: Lợi suất dài hạn đang thấp hơn lãi suất điều hành, cần theo dõi thanh khoản hệ thống." if inversion_warning else "Độ dốc đường cong duy trì trong trạng thái bình thường.")
    )

    return {
        "vn10y": vn10y,
        "us10y": us10y,
        "sbvRefinancingRate": sbv_rate,
        "longShortSpread": long_short_spread,
        "crossCountrySpread": cross_country_spread,
        "inversionWarning": inversion_warning,
        "recessionLead": recession_lead,
        "ycRegime": yc_regime,
        "ycRegimeVi": yc_regime_vi,
        "regimeBadge": regime_badge,
        "ycStressIndex": yc_stress,
        "assessment": assessment,
    }


def detect_scenarios_and_tail_risks(
    macro: Dict[str, Any],
    risk_score: float,
    regime_phase: str,
    current_vnindex: Optional[float] = None
) -> Dict[str, Any]:
    """
    Ma trận 3 Kịch bản thị trường (Base / Bull / Bear) và 6 Named Tail-Risks tự động kiểm tra trigger thực tế.
    """
    cpi = float(macro.get("cpi_yoy") or macro.get("vn_cpi_yoy") or 5.08)
    sbv_rate = float(macro.get("sbvRefinancingRate") or macro.get("sbv_refinancing_rate") or 4.5)
    interbank = float(macro.get("interbank_rate") or macro.get("vn_interbank_overnight_rate") or 6.47)
    gdp = float(macro.get("gdp_growth_yoy") or macro.get("vn_gdp_yoy") or 7.0)
    credit = float(macro.get("credit_growth_yoy") or 15.08)
    usdvnd = float(macro.get("usdVndRate") or macro.get("usdvnd") or 25881.0)
    vn10y = float(macro.get("vn10yYield") or macro.get("vn10y") or 3.45)
    us10y = float(macro.get("us10yYield") or macro.get("us10y") or 4.3)

    vn = current_vnindex if (current_vnindex and current_vnindex > 500) else 1280.0

    # Phân bổ xác suất 3 kịch bản theo Risk Score
    if risk_score <= 40.0:
        base_p, bull_p, bear_p = 55, 30, 15
    elif risk_score <= 60.0:
        base_p, bull_p, bear_p = 55, 25, 20
    else:
        base_p, bull_p, bear_p = 50, 20, 30

    scenarios = {
        "base": {
            "name": "Kịch Bản Cơ Sở (Base Case)",
            "probability": base_p,
            "badgeColor": "bg-blue-500/20 text-blue-400 border border-blue-500/30",
            "vnIndexRange": f"{int(vn - 25)} - {int(vn + 45)}",
            "conditions": f"CPI duy trì quanh {cpi:.1f}%, PMI mở rộng trên 51 điểm, SBV giữ lãi suất điều hành {sbv_rate:.1f}%, tỷ giá ổn định trong biên độ quản lý.",
            "sectorBenefit": ["Ngân Hàng", "Bán Lẻ", "Công Nghệ Thông Tin"],
            "sectorImpacted": ["Hàng Tiêu Dùng Thiết Yếu", "Vật Liệu Nhạy Giá"],
            "narrative": "Kinh tế tiếp tục quỹ đạo mở rộng vừa phải. Dòng tiền tập trung vào các cổ phiếu cơ bản có EPS tăng trưởng thực chất.",
        },
        "bull": {
            "name": "Kịch Bản Tích Cực (Bull Case)",
            "probability": bull_p,
            "badgeColor": "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
            "vnIndexRange": f"{int(vn + 35)} - {int(vn + 110)}",
            "conditions": "Fed tiếp tục chu kỳ hạ lãi suất, SBV nới lỏng room tín dụng, dòng vốn FDI & khối ngoại quay lại mua ròng, tỷ giá hạ nhiệt.",
            "sectorBenefit": ["Chứng Khoán", "Ngân Hàng", "Bất Động Sản", "Công Nghệ"],
            "sectorImpacted": ["Tiện Ích Điện Nước", "Dược Phẩm"],
            "narrative": "Thanh khoản bùng nổ, hệ số định giá thị trường được nâng lên — các nhóm ngành High-Beta dẫn dắt đà tăng điểm.",
        },
        "bear": {
            "name": "Kịch Bản Thận Trọng (Bear Case)",
            "probability": bear_p,
            "badgeColor": "bg-rose-500/20 text-rose-400 border border-rose-500/30",
            "vnIndexRange": f"{int(vn - 100)} - {int(vn - 35)}",
            "conditions": "Lạm phát thế giới và giá dầu tăng vọt, SBV buộc phải hút ròng thanh khoản tiền đồng hoặc tăng lãi suất, USD/VND vượt đỉnh.",
            "sectorBenefit": ["Năng Lượng & Dầu Khí", "Hàng Tiêu Dùng Thiết Yếu", "Vàng"],
            "sectorImpacted": ["Bất Động Sản", "Chứng Khoán", "Ngân Hàng"],
            "narrative": "Lạm phát chi phí đẩy và thắt chặt thanh khoản ngắn hạn — ưu tiên nâng tỷ trọng tiền mặt và tài sản phòng vệ.",
        },
    }

    # 6 Named Tail-Risks (Kiểm tra trigger thực tế)
    active_tail_risks = []

    # 1. Liquidity Crisis
    if interbank > sbv_rate + 2.0:
        active_tail_risks.append({
            "id": "liquidity_crisis",
            "name": "Khủng Hoảng Thanh Khoản (Liquidity Crisis)",
            "signal": "STRONG SELL",
            "badge": "bg-rose-500 text-white animate-pulse",
            "severity": "CRITICAL",
            "trigger": f"Lãi suất liên ngân hàng qua đêm ({interbank:.2f}%) vượt trần lãi suất SBV ({sbv_rate:.2f}%) + 2.0pp.",
            "impact": "Áp lực thanh khoản hệ thống ngắn hạn căng thẳng, room tín dụng bị co hẹp, chi phí vốn ngân hàng tăng mạnh.",
        })

    # 2. Stagflation
    if gdp < 4.0 and cpi > 5.5 and risk_score > 60:
        active_tail_risks.append({
            "id": "stagflation",
            "name": "Đình Lạm (Stagflation Shock)",
            "signal": "STRONG SELL",
            "badge": "bg-rose-500 text-white animate-pulse",
            "severity": "CRITICAL",
            "trigger": f"GDP ({gdp:.2f}%) dưới 4% trong khi CPI ({cpi:.2f}%) vượt 5.5% và điểm rủi ro vĩ mô ở mức cao ({risk_score}/100).",
            "impact": "Biên lợi nhuận của hầu hết doanh nghiệp niêm yết bị bào mòn bởi chi phí đầu vào, nguy cơ suy thoái tăng vọt.",
        })

    # 3. Credit Crunch
    if credit < 10.0 and sbv_rate > 5.5:
        active_tail_risks.append({
            "id": "credit_crunch",
            "name": "Thắt Chặt Tín Dụng (Credit Crunch)",
            "signal": "SELL",
            "badge": "bg-amber-500 text-white",
            "severity": "HIGH",
            "trigger": f"Tăng trưởng tín dụng thấp ({credit:.1f}%) trong bối cảnh lãi suất điều hành cao ({sbv_rate:.1f}%).",
            "impact": "Dòng vốn lưu động doanh nghiệp bị nghẽn, áp lực nợ xấu và đảo nợ ngân hàng gia tăng.",
        })

    # 4. External Shock
    if usdvnd > 25700 or (vn10y - us10y) < -1.0:
        active_tail_risks.append({
            "id": "external_shock",
            "name": "Cú Sốc Tỷ Giá Ngoại Vi (External Shock)",
            "signal": "CAUTION",
            "badge": "bg-amber-500/20 text-amber-300 border border-amber-500/40",
            "severity": "MEDIUM",
            "trigger": f"Tỷ giá USD/VND ({usdvnd:,.0f}) neo cao hoặc chênh lệch lợi suất TPCP VN - Mỹ âm sâu ({vn10y - us10y:.2f}%).",
            "impact": "SBV chịu áp lực hút ròng tiền đồng qua tín phiếu hoặc can thiệp ngoại tệ, kích hoạt khối ngoại bán ròng.",
        })

    # 5. Soft Landing
    if risk_score < 50 and gdp >= 5.5 and cpi <= 5.0 and (vn10y - sbv_rate) >= -0.3:
        active_tail_risks.append({
            "id": "soft_landing",
            "name": "Kinh Tế Hạ Cánh Mềm (Soft Landing)",
            "signal": "BUY",
            "badge": "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40",
            "severity": "POSITIVE",
            "trigger": f"Điểm rủi ro vĩ mô thấp ({risk_score}/100), GDP tăng trưởng tốt ({gdp:.2f}%), lạm phát trong tầm kiểm soát ({cpi:.2f}%).",
            "impact": "Kinh tế hạ nhiệt an toàn, tạo nền tảng vững chắc cho chu kỳ tăng trưởng lợi nhuận doanh nghiệp.",
        })

    # 6. Bull Opportunity
    if risk_score < 40 and gdp >= 6.5:
        active_tail_risks.append({
            "id": "bull_opportunity",
            "name": "Cơ Hội Bùng Nổ Vĩ Mô (Bull Opportunity)",
            "signal": "STRONG BUY",
            "badge": "bg-emerald-500 text-white",
            "severity": "POSITIVE",
            "trigger": f"Môi trường vĩ mô mở rộng toàn diện: Điểm rủi ro rất thấp ({risk_score}/100) kết hợp GDP bùng nổ ({gdp:.2f}%).",
            "impact": "Cơ hội vàng giải ngân tích lũy cổ phiếu giá trị và nhóm cổ phiếu dẫn dắt thị trường.",
        })

    return {
        "scenarios": scenarios,
        "tailRisks": active_tail_risks,
        "hasActiveTailRisk": len(active_tail_risks) > 0,
        "criticalTailRiskCount": sum(1 for t in active_tail_risks if t["severity"] == "CRITICAL"),
    }


def compute_lead_lag_divergence(macro: Dict[str, Any]) -> Dict[str, Any]:
    """
    Phân tích độ lệch pha giữa nhóm chỉ báo tài chính dẫn dắt (Leading) và kinh tế thực đi sau (Lagging).
    """
    vn10y = float(macro.get("vn10yYield") or macro.get("vn10y") or 3.45)
    interbank = float(macro.get("interbank_rate") or macro.get("vn_interbank_overnight_rate") or 6.47)
    usdvnd = float(macro.get("usdVndRate") or macro.get("usdvnd") or 25881.0)
    cpi = float(macro.get("cpi_yoy") or macro.get("vn_cpi_yoy") or 5.08)
    gdp = float(macro.get("gdp_growth_yoy") or macro.get("vn_gdp_yoy") or 7.0)
    credit = float(macro.get("credit_growth_yoy") or 15.08)

    # 1. Nhóm Dẫn dắt (Financial Market & Liquidity)
    s_curve = (3.45 - vn10y) / 1.0
    s_ib = (interbank - 4.0) / 2.0
    s_fx = (usdvnd - 25400.0) / 600.0
    leading_z = (s_curve + s_ib + s_fx) / 3.0
    leading_pct = round(max(0.0, min(100.0, 50.0 + leading_z * 20.0)), 1)

    # 2. Nhóm Đi sau (Real Economy Lagging)
    s_cpi = (cpi - 4.5) / 1.5
    s_gdp = -(gdp - 6.5) / 1.5
    s_credit = (credit - 14.0) / 2.5
    lagging_z = (s_cpi + s_gdp + s_credit) / 3.0
    lagging_pct = round(max(0.0, min(100.0, 50.0 + lagging_z * 20.0)), 1)

    div = round(leading_pct - lagging_pct, 1)

    if div > 15.0:
        signal = "⚠️ LEADING WARNS"
        signal_vi = "Chỉ Báo Sớm Báo Động (Leading Warns)"
        badge = "bg-amber-500/20 text-amber-300 border border-amber-500/40"
        desc = "Thị trường tài chính & thanh khoản đang cảnh báo áp lực xấu hơn số liệu kinh tế vĩ mô công bố chậm."
    elif div < -15.0:
        signal = "📊 LAGGING CONFIRMS"
        signal_vi = "Kinh Tế Thực Xác Nhận (Lagging Confirms)"
        badge = "bg-blue-500/20 text-blue-300 border border-blue-500/40"
        desc = "Các chỉ báo kinh tế thực đi sau xác nhận mức độ điều chỉnh của chu kỳ."
    else:
        signal = "➡️ ALIGNED"
        signal_vi = "Đồng Pha Ổn Định (Aligned)"
        badge = "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
        desc = "Các chỉ báo sớm và số liệu kinh tế thực duy trì nhịp đồng pha cân bằng."

    return {
        "leadingPct": leading_pct,
        "laggingPct": lagging_pct,
        "divergence": div,
        "signal": signal,
        "signalVi": signal_vi,
        "badge": badge,
        "desc": desc,
    }


def compute_macro_confidence(macro: Dict[str, Any], n_conflicts: int = 0) -> Dict[str, Any]:
    """
    Đánh giá độ tin cậy của mô hình vĩ mô (0 - 100) & Phân hạng HIGH / MEDIUM / LOW.
    """
    required_keys = ["sbv_refinancing_rate", "cpi_yoy", "gdp_growth_yoy", "interbank_rate", "credit_growth_yoy", "pmi", "usdvnd", "vn10yYield"]
    present = sum(1 for k in required_keys if (macro.get(k) is not None or macro.get(k.replace("Yield", "")) is not None))
    data_quality = round((present / len(required_keys)) * 100.0, 1)

    regime_stability = 75.0
    clarity = 70.0
    if n_conflicts >= 2:
        clarity -= 15.0

    overall = round(data_quality * 0.30 + regime_stability * 0.30 + clarity * 0.40, 1)

    if overall >= 65.0:
        label = "HIGH"
        label_vi = "Độ Tin Cậy Cao"
        badge = "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
    elif overall >= 45.0:
        label = "MEDIUM"
        label_vi = "Độ Tin Cậy Vừa Phải"
        badge = "bg-blue-500/20 text-blue-300 border border-blue-500/40"
    else:
        label = "LOW"
        label_vi = "Cần Thận Trọng / Dữ Liệu Thiếu Hụt"
        badge = "bg-amber-500/20 text-amber-300 border border-amber-500/40"

    return {
        "overall": overall,
        "label": label,
        "labelVi": label_vi,
        "badge": badge,
        "dataQuality": data_quality,
        "regimeStability": regime_stability,
        "signalClarity": clarity,
    }

