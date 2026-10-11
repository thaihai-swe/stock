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

try:
    from .config_loader import get_macro_config
except ImportError:
    try:
        from lib.config_loader import get_macro_config
    except ImportError:
        from scripts.lib.config_loader import get_macro_config

_macro_cfg = get_macro_config()

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

_PHASE_RULES = _macro_cfg.get("phaseRules") or {
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


GICS_SECTORS = {
    "VNFIN": {
        "code": "VNFIN",
        "name": "Tài Chính",
        "label": "Tài chính (Ngân hàng, CK, Bảo hiểm)",
        "icon": "🏦",
        "gicsGroup": "Financials",
    },
    "VNREAL": {
        "code": "VNREAL",
        "name": "Bất Động Sản",
        "label": "Bất động sản & KCN",
        "icon": "🏢",
        "gicsGroup": "Real Estate",
    },
    "VNIND": {
        "code": "VNIND",
        "name": "Công Nghiệp",
        "label": "Công nghiệp & Xây dựng",
        "icon": "🏗️",
        "gicsGroup": "Industrials",
    },
    "VNCONS": {
        "code": "VNCONS",
        "name": "Tiêu Dùng Thiết Yếu",
        "label": "Hàng hóa thiết yếu",
        "icon": "🛒",
        "gicsGroup": "Consumer Staples",
    },
    "VNDISCR": {
        "code": "VNDISCR",
        "name": "Tiêu Dùng Không Thiết Yếu",
        "label": "Hàng không thiết yếu & Bán lẻ",
        "icon": "🛍️",
        "gicsGroup": "Consumer Discretionary",
    },
    "VNENE": {
        "code": "VNENE",
        "name": "Năng Lượng",
        "label": "Năng lượng & Dầu khí",
        "icon": "⚡",
        "gicsGroup": "Energy",
    },
    "VNMAT": {
        "code": "VNMAT",
        "name": "Nguyên Vật Liệu",
        "label": "Nguyên vật liệu & Thép",
        "icon": "🧱",
        "gicsGroup": "Materials",
    },
    "VNIT": {
        "code": "VNIT",
        "name": "Công Nghệ",
        "label": "Công nghệ thông tin",
        "icon": "💻",
        "gicsGroup": "Information Technology",
    },
    "VNUT": {
        "code": "VNUT",
        "name": "Tiện Ích",
        "label": "Tiện ích (Điện, Nước, Khí)",
        "icon": "🚰",
        "gicsGroup": "Utilities",
    },
    "VNHEAL": {
        "code": "VNHEAL",
        "name": "Chăm Sóc Sức Khỏe",
        "label": "Y tế & Dược phẩm",
        "icon": "💊",
        "gicsGroup": "Healthcare",
    },
}

_GICS_SENSITIVITY_MATRIX = {
    # Mã GICS: (interbank, sbv_rate, cpi, usdvnd, oil, pmi)
    "VNFIN":  (-1.8, -1.5, -0.8, -1.0,  0.0, +1.2),  # Nhạy cảm cao với thanh khoản, lãi suất và tỷ giá; hưởng lợi khi PMI cao
    "VNREAL": (-1.0, -2.0, -1.0, -1.0,  0.0, +1.0),  # Chịu áp lực nặng khi lãi suất SBV tăng & tín dụng thắt chặt
    "VNIND":  (-1.0, -1.0, -0.5, -0.5, -0.5, +1.5),  # Hưởng lợi mạnh mẽ khi PMI mở rộng và giải ngân đầu tư công
    "VNCONS": ( 0.0,  0.0, -0.5,  0.0,  0.0,  0.0),  # Phòng thủ bền vững, ít nhạy cảm với chu kỳ lãi suất
    "VNDISCR":(-0.5, -0.5, -1.0,  0.0,  0.0, +1.0),  # Hưởng lợi khi kinh tế tăng tốc; chịu áp lực khi lạm phát CPI tăng
    "VNENE":  ( 0.0,  0.0, +1.0, +0.5, +2.0, +0.5),  # Hưởng lợi vượt trội khi giá dầu Brent tăng và lạm phát cao
    "VNMAT":  ( 0.0,  0.0, +0.5, -0.5, +1.5, +1.5),  # Nhạy cảm với chu kỳ hàng hóa cơ bản và hoạt động sản xuất công nghiệp
    "VNIT":   ( 0.0,  0.0,  0.0,  0.0,  0.0, +1.0),  # Tăng trưởng độc lập theo làn sóng chuyển đổi số, ít phụ thuộc lãi suất
    "VNUT":   (-1.0, -1.0,  0.0,  0.0, -1.0, -0.5),  # Dòng tiền phòng thủ và cổ tức, chịu áp lực khi lãi suất điều hành tăng
    "VNHEAL": ( 0.0,  0.0,  0.0,  0.0,  0.0,  0.0),  # Phòng thủ tuyệt đối, nhu cầu y tế phi chu kỳ
}

# Giữ alias tương thích ngược
SECTORS = GICS_SECTORS
_SENSITIVITY_MATRIX = _GICS_SENSITIVITY_MATRIX


def compute_sector_rotation(phase: str, macro: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Tính toán ma trận tác động vĩ mô và xoay vòng 10 nhóm ngành chuẩn GICS Việt Nam (HOSE)."""
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
    for sector_code, info in GICS_SECTORS.items():
        sens = _GICS_SENSITIVITY_MATRIX.get(sector_code, (0, 0, 0, 0, 0, 0))

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
            "key": sector_code,
            "code": sector_code,
            "name": info["name"],
            "label": info.get("label", info["name"]),
            "icon": info["icon"],
            "gicsGroup": info.get("gicsGroup", "Others"),
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

    vn_candidate = current_vnindex or macro.get("vnindex") or macro.get("currentPoint") or macro.get("stock_index")
    if not vn_candidate or float(vn_candidate) <= 500:
        try:
            cache_p = Path(__file__).resolve().parent.parent.parent / "data" / "macro_valuation.json"
            if cache_p.exists():
                with open(cache_p, "r", encoding="utf-8") as f:
                    vn_candidate = float(json.load(f).get("marketIndex", {}).get("currentPoint") or 0.0)
        except Exception:
            pass
    vn = float(vn_candidate) if (vn_candidate and float(vn_candidate) > 500) else 1250.0

    # Phân bổ xác suất 3 kịch bản theo Risk Score
    if risk_score <= 40.0:
        base_p, bull_p, bear_p = 55, 30, 15
    elif risk_score <= 60.0:
        base_p, bull_p, bear_p = 55, 25, 20
    else:
        base_p, bull_p, bear_p = 50, 20, 30

    # Dải điểm kỳ vọng co giãn theo tỷ lệ phần trăm thị giá thời gian thực
    base_low = int(round(vn * 0.98))     # -2.0%
    base_high = int(round(vn * 1.035))   # +3.5%
    bull_low = int(round(vn * 1.025))    # +2.5%
    bull_high = int(round(vn * 1.085))   # +8.5%
    bear_low = int(round(vn * 0.92))     # -8.0%
    bear_high = int(round(vn * 0.975))   # -2.5%

    scenarios = {
        "base": {
            "name": "Kịch Bản Cơ Sở (Base Case)",
            "probability": base_p,
            "badgeColor": "bg-blue-500/20 text-blue-400 border border-blue-500/30",
            "currentPoint": round(vn, 2),
            "vnIndexRange": f"{base_low} - {base_high}",
            "conditions": f"CPI duy trì quanh {cpi:.1f}%, PMI mở rộng trên 51 điểm, SBV giữ lãi suất điều hành {sbv_rate:.1f}%, tỷ giá ổn định trong biên độ quản lý.",
            "sectorBenefit": ["Ngân Hàng", "Bán Lẻ", "Công Nghệ Thông Tin"],
            "sectorImpacted": ["Hàng Tiêu Dùng Thiết Yếu", "Vật Liệu Nhạy Giá"],
            "narrative": "Kinh tế tiếp tục quỹ đạo mở rộng vừa phải. Dòng tiền tập trung vào các cổ phiếu cơ bản có EPS tăng trưởng thực chất.",
        },
        "bull": {
            "name": "Kịch Bản Tích Cực (Bull Case)",
            "probability": bull_p,
            "badgeColor": "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
            "currentPoint": round(vn, 2),
            "vnIndexRange": f"{bull_low} - {bull_high}",
            "conditions": "Fed tiếp tục chu kỳ hạ lãi suất, SBV nới lỏng room tín dụng, dòng vốn FDI & khối ngoại quay lại mua ròng, tỷ giá hạ nhiệt.",
            "sectorBenefit": ["Chứng Khoán", "Ngân Hàng", "Bất Động Sản", "Công Nghệ"],
            "sectorImpacted": ["Tiện Ích Điện Nước", "Dược Phẩm"],
            "narrative": "Thanh khoản bùng nổ, hệ số định giá thị trường được nâng lên — các nhóm ngành High-Beta dẫn dắt đà tăng điểm.",
        },
        "bear": {
            "name": "Kịch Bản Thận Trọng (Bear Case)",
            "probability": bear_p,
            "badgeColor": "bg-rose-500/20 text-rose-400 border border-rose-500/30",
            "currentPoint": round(vn, 2),
            "vnIndexRange": f"{bear_low} - {bear_high}",
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


def calculate_scenario_allocation_matrix(risk_bucket: str, layer_scores: Dict[str, float]) -> Dict[str, Any]:
    """
    Tạo Ma Trận Phân Bổ 4x3 (3 Kịch Bản: Base, Bull, Bear) x (4 Lớp Tài Sản) theo chuẩn ref-vn-macro-markets.
    Kèm các bộ điều chỉnh theo Khẩu vị Rủi ro và Chân trời Đầu tư.
    """
    # 1. Kịch bản Cơ Sở (Base Case)
    base_alloc = calculate_4asset_allocation(risk_bucket, layer_scores)

    # 2. Kịch bản Tích Cực (Bull Case) - Tăng tỷ trọng cổ phiếu, hạ tiền mặt
    bull_alloc = {
        "equity": min(85.0, base_alloc["equity"] + 15.0),
        "bond": max(10.0, base_alloc["bond"] - 5.0),
        "cash": max(5.0, base_alloc["cash"] - 8.0),
        "gold": max(2.5, base_alloc["gold"] - 2.0),
    }
    tot_bull = sum(bull_alloc.values())
    bull_alloc = {k: round(v / tot_bull * 100, 1) for k, v in bull_alloc.items()}

    # 3. Kịch bản Thận Trọng (Bear Case) - Nâng tiền mặt và vàng, hạ cổ phiếu
    bear_alloc = {
        "equity": max(15.0, base_alloc["equity"] - 20.0),
        "bond": min(45.0, base_alloc["bond"] + 5.0),
        "cash": min(50.0, base_alloc["cash"] + 12.0),
        "gold": min(15.0, base_alloc["gold"] + 3.0),
    }
    tot_bear = sum(bear_alloc.values())
    bear_alloc = {k: round(v / tot_bear * 100, 1) for k, v in bear_alloc.items()}

    return {
        "base": base_alloc,
        "bull": bull_alloc,
        "bear": bear_alloc,
        "profiles": {
            "conservative": {"equityAdj": -10, "cashAdj": +10, "label": "Bảo Thủ"},
            "balanced":     {"equityAdj": 0,   "cashAdj": 0,   "label": "Cân Bằng"},
            "aggressive":   {"equityAdj": +10, "cashAdj": -10, "label": "Tiến Thủ"},
        },
        "horizons": {
            "short":  {"equityAdj": -10, "cashAdj": +10, "label": "Ngắn Hạn (< 1 Năm)"},
            "medium": {"equityAdj": 0,   "cashAdj": 0,   "label": "Trung Hạn (1 - 5 Năm)"},
            "long":   {"equityAdj": +10, "cashAdj": -10, "label": "Dài Hạn (> 5 Năm)"},
        }
    }


def generate_executive_summary(
    macro: Dict[str, Any],
    risk_info: Dict[str, Any],
    regime: Dict[str, Any],
    scenarios: Dict[str, Any],
    active_tail_risks: List[Dict[str, Any]],
    market_pe: float = 10.72
) -> Dict[str, Any]:
    """
    Tổng hợp báo cáo điều hành cấp cao:
    - 3-5 Rủi ro trọng yếu (Key Risks)
    - 3-5 Động lực tăng trưởng (Growth Catalysts)
    - 3 Key Takeaways có gắn ⭐ Insight tổng hợp
    """
    usdvnd = float(macro.get("usdVndRate") or macro.get("usdvnd") or 25881.0)
    interbank = float(macro.get("interbank_rate") or 6.47)
    cpi = float(macro.get("cpi_yoy") or 5.08)
    pmi = float(macro.get("pmi") or 51.9)
    gdp = float(macro.get("gdp_growth_yoy") or 7.0)
    risk_score = risk_info.get("riskScore", 50.0)

    # 1. Key Risks (Sắp xếp theo mức độ nghiêm trọng)
    key_risks = []
    if usdvnd > 25600:
        key_risks.append({
            "level": "Rất cao" if usdvnd > 25900 else "Cao",
            "title": "Áp Lực Tỷ Giá USD/VND & Can Thiệp Tiền Tệ",
            "risk": f"Tỷ giá USD/VND neo cao ở mức {usdvnd:,.0f} đ/USD, gây áp lực lên thanh khoản tiền đồng và kích hoạt khối ngoại bán ròng.",
            "color": "text-rose-400 bg-rose-500/10 border-rose-500/30"
        })
    if interbank > 5.0:
        key_risks.append({
            "level": "Cao" if interbank > 6.5 else "Trung bình",
            "title": "Lãi Suất Liên Ngân Hàng Tăng Nhiệt",
            "risk": f"Lãi suất liên ngân hàng qua đêm đạt {interbank:.2f}%, báo hiệu thanh khoản cục bộ của hệ thống ngân hàng bị thắt chặt.",
            "color": "text-amber-400 bg-amber-500/10 border-amber-500/30"
        })
    if cpi > 4.5:
        key_risks.append({
            "level": "Cao",
            "title": "Lạm Phát CPI Vượt Ngưỡng Mục Tiêu",
            "risk": f"CPI tăng {cpi:.2f}% YoY vượt trần kiểm soát 4.5%, thu hẹp dư địa nới lỏng chính sách tiền tệ của SBV.",
            "color": "text-orange-400 bg-orange-500/10 border-orange-500/30"
        })

    # Bổ sung rủi ro từ tail risks nếu có
    for tr in active_tail_risks[:2]:
        if not any(r["title"] == tr["name"] for r in key_risks):
            key_risks.append({
                "level": "Rất cao" if tr.get("severity") == "CRITICAL" else "Cao",
                "title": tr["name"],
                "risk": tr["trigger"] + " " + tr["impact"],
                "color": "text-rose-400 bg-rose-500/10 border-rose-500/30"
            })

    if not key_risks:
        key_risks.append({
            "level": "Trung bình",
            "title": "Biến Động Địa Chính Trị Toàn Cầu",
            "risk": "Biến động giá dầu thô Brent và chính sách lãi suất neo cao của Fed tạo rủi ro nhập khẩu lạm phát.",
            "color": "text-blue-400 bg-blue-500/10 border-blue-500/30"
        })

    # 2. Catalysts (Động lực tích cực)
    catalysts = []
    if gdp >= 6.0:
        catalysts.append({
            "level": "Cao",
            "title": "Tăng Trưởng GDP Phục Hồi Mạnh Mẽ",
            "desc": f"Tăng trưởng kinh tế đạt {gdp:.2f}% YoY, tạo bệ phóng vững chắc cho lợi nhuận sau thuế của các doanh nghiệp niêm yết.",
            "color": "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
        })
    if pmi >= 50.0:
        catalysts.append({
            "level": "Cao",
            "title": "Khu Vực Sản Xuất Duy Trì Đà Mở Rộng",
            "desc": f"Chỉ số PMI đạt {pmi:.1f} điểm, phản ánh lượng đơn hàng mới và sản lượng xuất khẩu tiếp tục tăng trưởng khả quan.",
            "color": "text-teal-400 bg-teal-500/10 border-teal-500/30"
        })
    if market_pe < 13.5:
        catalysts.append({
            "level": "Cao",
            "title": "Định Giá Thị Trường Chiết Khấu Hấp Dẫn",
            "desc": f"P/E VN-Index ở mức {market_pe:.2f}x (dưới trung vị 10 năm), tạo biên an toàn lớn cho chiến lược đầu tư giá trị và tích sản dài hạn.",
            "color": "text-cyan-400 bg-cyan-500/10 border-cyan-500/30"
        })
    catalysts.append({
        "level": "Trung bình",
        "title": "Kỳ Vọng Nâng Hạng Thị Trường FTSE / MSCI",
        "desc": "Quy định Non-Pre-funding (Thông tư 68) đi vào thực thi tháo gỡ nút thắt lớn nhất cho dòng vốn ngoại tổ chức giải ngân.",
        "color": "text-indigo-400 bg-indigo-500/10 border-indigo-500/30"
    })

    # 3. Key Takeaways
    regime_name = regime.get("titleVi", "Mở Rộng Tăng Trưởng")
    stance_text = "Ưu tiên tích lũy cổ phiếu giá trị" if risk_score < 55 else "Duy trì vị thế cân bằng phòng thủ"

    key_takeaways = [
        f"⭐ Insight Tổng Hợp: Kinh tế Việt Nam đang trong pha '{regime_name}' với điểm rủi ro vĩ mô {risk_score}/100. P/E thị trường {market_pe:.2f}x phản ánh vùng định giá hấp dẫn cho chu kỳ đầu tư mới.",
        f"Rủi ro lớn nhất: Căng thẳng tỷ giá USD/VND ({usdvnd:,.0f}) và thanh khoản liên ngân hàng ({interbank:.2f}%) đòi hỏi kiểm soát chặt chẽ tỷ trọng đòn bẩy margin.",
        f"Cơ hội lớn nhất: {stance_text}, tập trung vào nhóm cổ phiếu hưởng lợi vĩ mô (Ngân hàng, Chứng khoán, Công nghệ) và nhóm định giá rẻ vượt trội (VN Diamond, VN Midcap)."
    ]

    return {
        "keyRisks": key_risks[:4],
        "catalysts": catalysts[:4],
        "keyTakeaways": key_takeaways,
    }


def calculate_style_indices(
    macro: Dict[str, Any],
    vnindex_pe: float = 10.72,
    vnindex_pb: float = 1.80,
    vn30_pe: float = 11.08,
    vn30_pb: float = 2.19
) -> List[Dict[str, Any]]:
    """
    Tính toán và định chuẩn ma trận so sánh 4 phân khúc phong cách đầu tư:
    1. VN-Index (Toàn thị trường)
    2. VN30 (Large-cap Blue-chip)
    3. VN Diamond (Chất lượng cao & Kín room ngoại - FUEVFVND)
    4. VN Midcap (Tăng trưởng vốn hóa vừa - FUEDCMID)
    5. VN100 (Hợp nhất VN30 + VN Midcap)
    """
    # VN Diamond có P/E chiết khấu hơn VN30 khoảng 15-20% do tỷ trọng Bank/Bán lẻ lớn và room ngoại kín
    diamond_pe = round(vn30_pe * 0.82, 2)
    diamond_pb = round(vn30_pb * 0.88, 2)

    # VN Midcap có P/E cao hơn VN-Index khoảng 15-20% do beta cao và định giá kỳ vọng tăng trưởng
    midcap_pe = round(vnindex_pe * 1.18, 2)
    midcap_pb = round(vnindex_pb * 0.92, 2)

    vn100_pe = round((vn30_pe * 0.75 + midcap_pe * 0.25), 2)
    vn100_pb = round((vn30_pb * 0.75 + midcap_pb * 0.25), 2)

    return [
        {
            "code": "VNINDEX",
            "name": "VN-Index (Toàn Thị Trường)",
            "proxy": "VNINDEX",
            "icon": "🏛️",
            "type": "Broad Market",
            "pe": vnindex_pe,
            "pb": vnindex_pb,
            "beta": 1.00,
            "peBand": "Rất Rẻ" if vnindex_pe < 11.5 else ("Rẻ" if vnindex_pe < 13.5 else "Hợp Lý"),
            "peBandColor": "text-emerald-400 bg-emerald-500/20 border-emerald-500/40",
            "flowCharacter": "Dòng tiền toàn thị trường, phản ánh tổng thể chu kỳ kinh tế",
            "strategy": "Tích lũy DCA dài hạn theo nhịp điều chỉnh của chỉ số",
            "weightAdvice": "Benchmark chuẩn mực"
        },
        {
            "code": "VN30",
            "name": "VN30 (Top 30 Blue-Chips)",
            "proxy": "E1VFVN30",
            "icon": "🏢",
            "type": "Large-Cap",
            "pe": vn30_pe,
            "pb": vn30_pb,
            "beta": 0.95,
            "peBand": "Rất Rẻ" if vn30_pe < 11.5 else ("Rẻ" if vn30_pe < 13.5 else "Hợp Lý"),
            "peBandColor": "text-emerald-400 bg-emerald-500/20 border-emerald-500/40",
            "flowCharacter": "Trụ đỡ thị trường, nơi dòng vốn ETF và tổ chức nước ngoài giải ngân đầu tiên",
            "strategy": "Phòng thủ vững chắc, hưởng lợi khi thị trường nâng hạng FTSE",
            "weightAdvice": "Chiếm 40 - 50% tỷ trọng cổ phiếu"
        },
        {
            "code": "VNDIAMOND",
            "name": "VN Diamond (Cổ Phiếu Kim Cương)",
            "proxy": "FUEVFVND",
            "icon": "💎",
            "type": "Quality & Foreign Room",
            "pe": diamond_pe,
            "pb": diamond_pb,
            "beta": 1.08,
            "peBand": "Siêu Hấp Dẫn" if diamond_pe < 10.0 else "Rất Rẻ",
            "peBandColor": "text-emerald-400 bg-emerald-500/20 border-emerald-500/40 animate-pulse",
            "flowCharacter": "Nhóm cổ phiếu kín room ngoại (FPT, MWG, PNJ, REE, TCB...), thanh khoản chất lượng",
            "strategy": "Định giá rẻ vượt trội so với chất lượng doanh nghiệp, điểm trúng dòng vốn ngoại",
            "weightAdvice": "Chiếm 25 - 35% tỷ trọng cổ phiếu"
        },
        {
            "code": "VNMIDCAP",
            "name": "VN Midcap (Top 70 Vốn Hóa Vừa)",
            "proxy": "FUEDCMID",
            "icon": "🚀",
            "type": "High Beta Growth",
            "pe": midcap_pe,
            "pb": midcap_pb,
            "beta": 1.32,
            "peBand": "Hấp Dẫn" if midcap_pe < 13.5 else "Cân Bằng",
            "peBandColor": "text-teal-400 bg-teal-500/20 border-teal-500/40",
            "flowCharacter": "Tập trung BĐS, Thép, Chứng khoán, dòng tiền cá nhân ưa chuộng, sóng tăng bốc nhất",
            "strategy": "Gia tăng tỷ trọng khi chu kỳ nới lỏng tiền tệ mở rộng để tối đa hóa hiệu suất",
            "weightAdvice": "Chiếm 20 - 30% tỷ trọng cổ phiếu"
        },
        {
            "code": "VN100",
            "name": "VN100 (Hợp Nhất VN30 + Midcap)",
            "proxy": "FUEVN100",
            "icon": "🌐",
            "type": "Large & Mid Composite",
            "pe": vn100_pe,
            "pb": vn100_pb,
            "beta": 1.05,
            "peBand": "Rất Rẻ" if vn100_pe < 12.0 else "Rẻ",
            "peBandColor": "text-emerald-400 bg-emerald-500/20 border-emerald-500/40",
            "flowCharacter": "Bao phủ 100 cổ phiếu hàng đầu chiếm hơn 90% vốn hóa thị trường",
            "strategy": "Cân bằng hoàn hảo giữa sức mạnh Blue-chip và tiềm năng bứt phá của Midcap",
            "weightAdvice": "Lựa chọn ETF toàn diện"
        }
    ]


def calculate_dual_sweet_spot_matrix(
    sector_valuations: List[Dict[str, Any]],
    sector_rotations: List[Dict[str, Any]],
    vnindex_pe: float = 10.72
) -> Dict[str, Any]:
    """
    Tính toán Ma Trận Thiên Thời Hội Tụ (Dual Sweet Spot Matrix):
    Kết hợp Trục Hoành (Định Giá Thực Tế 10 Ngành) x Trục Tung (Động Lực Vĩ Mô Net Impact Score).
    Phân loại vào 4 góc phần tư:
      - sweet_spot: Vùng Vàng Gom Mua (Vĩ mô thuận lợi + Định giá rẻ)
      - value_trap: Vùng Bẫy Giá Rẻ (Định giá rẻ nhưng vĩ mô bất lợi)
      - momentum: Vùng Quá Nhiệt / Đà Tăng (Vĩ mô mạnh nhưng định giá đắt)
      - defense: Vùng Phòng Thủ / Tránh Né (Vĩ mô bất lợi và định giá đắt)
    """
    if not sector_valuations:
        return {"items": [], "quadrants": {}, "stats": {}}

    # Ánh xạ trực tiếp 1:1 theo mã code chuẩn GICS (VNFIN, VNREAL...)
    rot_dict = {s.get("code") or s.get("key"): s for s in sector_rotations}

    items = []
    sweet_spot = []
    value_trap = []
    momentum = []
    defense = []

    for sec in sector_valuations:
        code = sec.get("code")
        rot = rot_dict.get(code)
        
        if rot:
            macro_score = rot.get("netScore", 0.0)
            macro_action = rot.get("action", "TRUNG LẬP")
            action_tag = rot.get("actionTag", "Neutral")
            rank = rot.get("rank", 5)
            decomposition = rot.get("decomposition", {})
            color_class = rot.get("colorClass", "text-gray-300 bg-gray-500/10 border-gray-500/20")
            badge_color = rot.get("badgeColor", "bg-gray-400")
        else:
            macro_score = 0.0
            macro_action = "TRUNG LẬP"
            action_tag = "Neutral"
            rank = 5
            decomposition = {}
            color_class = "text-gray-300 bg-gray-500/10 border-gray-500/20"
            badge_color = "bg-gray-400"

        pe = sec.get("pe") if sec.get("pe") is not None else 12.0
        pb = sec.get("pb") if sec.get("pb") is not None else 2.0

        is_valuation_cheap = pe <= vnindex_pe or pe <= 11.5
        is_valuation_expensive = pe >= 13.5
        is_macro_favorable = macro_score >= 0.0

        if is_macro_favorable and is_valuation_cheap:
            quadrant_key = "sweet_spot"
            quadrant_title = "Vùng Vàng Gom Mua (Sweet Spot)"
            quadrant_icon = "💎"
            quadrant_badge = "bg-emerald-500/20 text-emerald-400 border-emerald-400/40"
            recommendation = "Thiên thời hội tụ: Định giá rẻ kết hợp vĩ mô ủng hộ. Ưu tiên giải ngân chủ động."
        elif not is_macro_favorable and is_valuation_cheap:
            quadrant_key = "value_trap"
            quadrant_title = "Vùng Bẫy Giá Rẻ (Value Trap)"
            quadrant_icon = "⚠️"
            quadrant_badge = "bg-amber-500/20 text-amber-400 border-amber-400/40"
            recommendation = "Định giá rất rẻ nhưng chịu áp lực vĩ mô. Chia nhỏ tỷ trọng, gom từng phần hoặc chờ đảo chiều."
        elif is_macro_favorable and is_valuation_expensive:
            quadrant_key = "momentum"
            quadrant_title = "Vùng Quá Nhiệt (Momentum)"
            quadrant_icon = "🔥"
            quadrant_badge = "bg-purple-500/20 text-purple-400 border-purple-400/40"
            recommendation = "Động lực vĩ mô mạnh nhưng định giá cao. Phù hợp lướt sóng theo dòng tiền, quản trị rủi ro chặt chẽ."
        else:
            quadrant_key = "defense"
            quadrant_title = "Vùng Phòng Thủ (Defense)"
            quadrant_icon = "🛡️"
            quadrant_badge = "bg-rose-500/20 text-rose-400 border-rose-400/40"
            recommendation = "Vĩ mô bất lợi và định giá không hấp dẫn. Khuyến nghị đứng ngoài hoặc hạ tỷ trọng."

        item_data = {
            **sec,
            "macroScore": macro_score,
            "macroAction": macro_action,
            "actionTag": action_tag,
            "rank": rank,
            "decomposition": decomposition,
            "colorClass": color_class,
            "badgeColor": badge_color,
            "quadrantKey": quadrant_key,
            "quadrantTitle": quadrant_title,
            "quadrantIcon": quadrant_icon,
            "quadrantBadge": quadrant_badge,
            "recommendation": recommendation,
        }
        items.append(item_data)

        if quadrant_key == "sweet_spot":
            sweet_spot.append(item_data)
        elif quadrant_key == "value_trap":
            value_trap.append(item_data)
        elif quadrant_key == "momentum":
            momentum.append(item_data)
        else:
            defense.append(item_data)

    items.sort(key=lambda x: (x["quadrantKey"] != "sweet_spot", -x["macroScore"], x["pe"] or 99))

    return {
        "items": items,
        "quadrants": {
            "sweetSpot": sweet_spot,
            "valueTrap": value_trap,
            "momentum": momentum,
            "defense": defense,
        },
        "stats": {
            "totalSectors": len(items),
            "sweetSpotCount": len(sweet_spot),
            "valueTrapCount": len(value_trap),
            "momentumCount": len(momentum),
            "defenseCount": len(defense),
            "avgSectorPE": round(sum(i["pe"] for i in items if i.get("pe")) / max(1, len([i for i in items if i.get("pe")])), 2),
            "avgSectorPB": round(sum(i["pb"] for i in items if i.get("pb")) / max(1, len([i for i in items if i.get("pb")])), 2),
            "cheapestSector": min(items, key=lambda x: x["pe"] or 99)["name"] if items else None,
            "mostExpensiveSector": max(items, key=lambda x: x["pe"] or 0)["name"] if items else None,
        }
    }



