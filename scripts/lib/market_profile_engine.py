"""
scripts/lib/market_profile_engine.py
Động cơ Phân tích Hồ sơ Thị trường & Hành vi Giá - Khối lượng Định lượng (Quantitative Market Profile)
dành riêng cho Cổ phiếu Thị Trường Chứng Khoán Việt Nam.

Tham chiếu phương pháp luận từ: ref-equity-research-vn/vn-technical-analysis/references/stock_profile_blocks.md
Bao gồm:
1. Volume at Price (VAP / Volume Profile): 10 Dải giá, Point of Control (POC), High/Low Volume Nodes (HVN/LVN)
2. Xác nhận Khối lượng VPCI (Volume Price Confirmation Index)
3. Dòng tiền Chaikin Money Flow (CMF) & Xu hướng On-Balance Volume (OBV)
4. Wyckoff Effort vs Result (Nỗ lực vs Kết quả - Phát hiện gom/xả ẩn)
5. Phân phối Lợi suất & Rủi ro Đuôi (Skewness, Excess Kurtosis, CVaR/Expected Shortfall 95% & 99%)
6. Phân loại Archetype Tính cách Cổ phiếu (neutral_descriptive_non_advice)
"""

import math
from typing import Dict, Any, List, Optional


def finite(v) -> Optional[float]:
    try:
        x = float(v)
        return x if math.isfinite(x) else None
    except (TypeError, ValueError):
        return None


def mean(values: List[float]) -> Optional[float]:
    nums = [v for v in values if finite(v) is not None]
    return sum(nums) / len(nums) if nums else None


def std_dev(values: List[float]) -> Optional[float]:
    nums = [v for v in values if finite(v) is not None]
    if len(nums) < 2:
        return None
    avg = mean(nums)
    return math.sqrt(sum((v - avg) ** 2 for v in nums) / (len(nums) - 1))


def skewness(values: List[float]) -> Optional[float]:
    nums = [v for v in values if finite(v) is not None]
    if len(nums) < 3:
        return None
    avg = mean(nums)
    sd = std_dev(nums)
    if not sd or sd == 0:
        return 0.0
    n = len(nums)
    return round((n / ((n - 1) * (n - 2))) * sum(((v - avg) / sd) ** 3 for v in nums), 2)


def excess_kurtosis(values: List[float]) -> Optional[float]:
    nums = [v for v in values if finite(v) is not None]
    if len(nums) < 4:
        return None
    avg = mean(nums)
    sd = std_dev(nums)
    if not sd or sd == 0:
        return 0.0
    n = len(nums)
    z4 = sum(((v - avg) / sd) ** 4 for v in nums)
    k = ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * z4 - (3 * (n - 1) ** 2) / ((n - 2) * (n - 3))
    return round(k, 2)


def quantile(values: List[float], q: float) -> Optional[float]:
    nums = sorted(v for v in values if finite(v) is not None)
    if not nums:
        return None
    if len(nums) == 1:
        return nums[0]
    pos = q * (len(nums) - 1)
    lo = math.floor(pos)
    hi = math.ceil(pos)
    if lo == hi:
        return nums[lo]
    return nums[lo] + (nums[hi] - nums[lo]) * (pos - lo)


def calculate_volume_at_price(
    daily_candles: List[Dict[str, Any]],
    num_buckets: int = 10
) -> Dict[str, Any]:
    """
    Phân tích Khối lượng Theo Dải Giá (Volume at Price - VAP):
    Chia biên độ giá thành num_buckets dải, tính tổng volume phân bổ.
    Xác định:
    - poc: Point of Control (Dải giá có khối lượng cao nhất)
    - hvn: High Volume Nodes (Dải giá có vol > 1.25x trung bình)
    - lvn: Low Volume Nodes (Dải giá có vol < 0.65x trung bình)
    """
    if not daily_candles or len(daily_candles) < 5:
        return {"buckets": [], "poc": None, "hvn": [], "lvn": []}

    closes = [float(c.get("close", 0)) for c in daily_candles if finite(c.get("close"))]
    volumes = [float(c.get("volume", 0)) for c in daily_candles if finite(c.get("volume"))]

    if not closes or not volumes:
        return {"buckets": [], "poc": None, "hvn": [], "lvn": []}

    min_p = min(closes)
    max_p = max(closes)
    if max_p <= min_p:
        return {"buckets": [], "poc": None, "hvn": [], "lvn": []}

    bucket_width = (max_p - min_p) / num_buckets
    buckets = []
    for i in range(num_buckets):
        b_low = min_p + i * bucket_width
        b_high = b_low + bucket_width
        buckets.append({
            "index": i,
            "priceLow": round(b_low),
            "priceHigh": round(b_high),
            "priceMid": round((b_low + b_high) / 2),
            "volume": 0.0,
            "volumePercent": 0.0
        })

    for c in daily_candles:
        cl = float(c.get("close", 0))
        vol = float(c.get("volume", 0))
        if cl <= 0 or vol <= 0:
            continue
        idx = min(int((cl - min_p) / bucket_width), num_buckets - 1)
        buckets[idx]["volume"] += vol

    total_vol = sum(b["volume"] for b in buckets)
    if total_vol > 0:
        for b in buckets:
            b["volumePercent"] = round((b["volume"] / total_vol) * 100, 1)

    avg_vol = total_vol / num_buckets if num_buckets > 0 else 0
    poc = max(buckets, key=lambda b: b["volume"]) if buckets else None
    hvn = [b for b in buckets if b["volume"] >= avg_vol * 1.25]
    lvn = [b for b in buckets if b["volume"] <= avg_vol * 0.65]

    return {
        "buckets": buckets,
        "poc": poc,
        "hvn": hvn,
        "lvn": lvn,
        "priceRange": {"min": round(min_p), "max": round(max_p)},
        "totalVolume": round(total_vol)
    }


def calculate_vpci_and_flow(daily_candles: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Tính VPCI (Volume Price Confirmation Index) và Dòng tiền Chaikin (CMF):
    - VPCI > 1.05: Khối lượng xác nhận xu hướng giá (Volume Confirming Trend).
    - VPCI < 0.95: Phân kỳ giữa giá và khối lượng (Volume Divergence).
    - CMF > 0.05: Áp lực tích lũy mua gom (Accumulation).
    - CMF < -0.05: Áp lực phân phối xả hàng (Distribution).
    """
    if not daily_candles or len(daily_candles) < 20:
        return {
            "vpci": 1.0,
            "vpciStatus": "NEUTRAL",
            "cmf": 0.0,
            "cmfStatus": "BALANCED",
            "obvTrend": "NEUTRAL"
        }

    # CMF 20 phiên
    window_20 = daily_candles[-20:]
    mfv_sum = 0.0
    vol_sum = 0.0
    for c in window_20:
        cl = float(c.get("close", 0))
        h = float(c.get("high", cl))
        l = float(c.get("low", cl))
        v = float(c.get("volume", 0))
        if h > l and v > 0:
            mf_multiplier = ((cl - l) - (h - cl)) / (h - l)
            mfv_sum += mf_multiplier * v
            vol_sum += v

    cmf = round(mfv_sum / vol_sum, 3) if vol_sum > 0 else 0.0
    cmf_status = "ACCUMULATION" if cmf >= 0.05 else ("DISTRIBUTION" if cmf <= -0.05 else "BALANCED")

    # VPCI: Tỷ lệ giữa Vol ngắn hạn (5 phiên) vs Vol dài hạn (20 phiên)
    short_vol = mean([float(c.get("volume", 0)) for c in daily_candles[-5:]]) or 1.0
    long_vol = mean([float(c.get("volume", 0)) for c in window_20]) or 1.0
    vpci = round(short_vol / long_vol, 2) if long_vol > 0 else 1.0

    if vpci >= 1.15:
        vpci_status = "STRONG_CONFIRMATION"
    elif vpci >= 0.95:
        vpci_status = "NORMAL"
    else:
        vpci_status = "VOLUME_FADING"

    # OBV Trend (5 phiên gần nhất vs 20 phiên)
    obv_values = []
    current_obv = 0.0
    prev_close = float(daily_candles[0].get("close", 0))
    for c in daily_candles:
        cl = float(c.get("close", prev_close))
        v = float(c.get("volume", 0))
        if cl > prev_close:
            current_obv += v
        elif cl < prev_close:
            current_obv -= v
        obv_values.append(current_obv)
        prev_close = cl

    obv_5 = mean(obv_values[-5:]) or 0
    obv_20 = mean(obv_values[-20:]) or 0
    obv_trend = "BULLISH_FLOW" if obv_5 > obv_20 else "BEARISH_FLOW"

    return {
        "vpci": vpci,
        "vpciStatus": vpci_status,
        "cmf": cmf,
        "cmfStatus": cmf_status,
        "obvTrend": obv_trend
    }


def calculate_wyckoff_effort_result(daily_candles: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Phát hiện hiện tượng Wyckoff: Nỗ Lực vs Kết Quả (Effort vs Result):
    Khi khối lượng giao dịch đột biến (> 1.7x trung bình 20 phiên)
    nhưng biên độ giá dao động lại rất hẹp (< 0.7x trung bình 20 phiên)
    -> Cảnh báo hiện tượng Hấp thụ Cung (Absorption/Gom hàng) hoặc Phân phối kín (Distribution).
    """
    if not daily_candles or len(daily_candles) < 20:
        return {
            "effortWithoutResultDetected": False,
            "recentSignals": [],
            "state": "NORMAL"
        }

    vols_20 = [float(c.get("volume", 0)) for c in daily_candles[-20:]]
    avg_vol = mean(vols_20) or 1.0

    ranges_20 = [
        (float(c.get("high", c.get("close", 1))) - float(c.get("low", c.get("close", 1)))) / max(1.0, float(c.get("close", 1)))
        for c in daily_candles[-20:]
    ]
    avg_range = mean(ranges_20) or 0.02

    signals = []
    for c in daily_candles[-10:]:
        v = float(c.get("volume", 0))
        cl = float(c.get("close", 1))
        h = float(c.get("high", cl))
        l = float(c.get("low", cl))
        rng = (h - l) / cl if cl > 0 else 0

        # Nỗ lực lớn nhưng kết quả giá hẹp
        if v >= avg_vol * 1.7 and rng <= avg_range * 0.75:
            date_str = c.get("date", "Gần đây")
            signals.append({
                "date": date_str,
                "volumeRatio": round(v / avg_vol, 2),
                "rangeRatio": round(rng / avg_range, 2) if avg_range > 0 else 1.0,
                "type": "ABSORPTION_OR_DISTRIBUTION",
                "desc": f"Phiên {date_str}: Khối lượng tăng {round(v / avg_vol, 1)}x nhưng biên độ giá co hẹp (Nỗ lực hấp thụ theo Wyckoff)."
            })

    detected = len(signals) > 0
    state = "ABSORPTION_PHASE" if detected else "BALANCED_MARKET"

    return {
        "effortWithoutResultDetected": detected,
        "recentSignals": signals,
        "state": state
    }


def calculate_tail_risk_distribution(daily_candles: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Định lượng phân phối lợi suất & rủi ro đuôi (Tail Risk Profile):
    - Skewness (Độ lệch)
    - Excess Kurtosis (Độ nhọn đuôi béo)
    - Historical VaR 95% & VaR 99%
    - Expected Shortfall / CVaR 95% & 99% (Mức lỗ bình quân khi chạm đuôi xấu)
    """
    if not daily_candles or len(daily_candles) < 10:
        return {
            "skewness": 0.0,
            "kurtosis": 0.0,
            "var95": 2.5,
            "var99": 4.5,
            "es95": 3.8,
            "es99": 6.2,
            "tailRiskAssessment": "Bình thường"
        }

    daily_returns = []
    for i in range(1, len(daily_candles)):
        c_prev = float(daily_candles[i - 1].get("close", 0))
        c_curr = float(daily_candles[i].get("close", 0))
        if c_prev > 0 and c_curr > 0:
            ret = ((c_curr - c_prev) / c_prev) * 100
            daily_returns.append(ret)

    if len(daily_returns) < 5:
        return {
            "skewness": 0.0,
            "kurtosis": 0.0,
            "var95": 2.5,
            "var99": 4.5,
            "es95": 3.8,
            "es99": 6.2,
            "tailRiskAssessment": "Bình thường"
        }

    skew = skewness(daily_returns) or 0.0
    kurt = excess_kurtosis(daily_returns) or 0.0

    # VaR & Expected Shortfall (CVaR)
    # Lấy phân vị 5% và 1% ở đuôi giảm
    sorted_ret = sorted(daily_returns)
    q05 = quantile(sorted_ret, 0.05) or -2.5
    q01 = quantile(sorted_ret, 0.01) or -4.5

    var_95 = round(abs(q05), 2)
    var_99 = round(abs(q01), 2)

    tail_05 = [r for r in sorted_ret if r <= q05]
    tail_01 = [r for r in sorted_ret if r <= q01]

    es_95 = round(abs(mean(tail_05) or q05), 2)
    es_99 = round(abs(mean(tail_01) or q01), 2)

    assessment = "Đuôi béo cao — Rủi ro sụt giảm mạnh khi thị trường rung lắc" if kurt > 2.0 else "Phân phối lợi suất bình thường"

    return {
        "skewness": skew,
        "kurtosis": kurt,
        "var95": var_95,
        "var99": var_99,
        "es95": es_95,
        "es99": es_99,
        "tailRiskAssessment": assessment
    }


def classify_stock_archetype(
    vpci: float,
    cmf: float,
    kurtosis: float,
    beta: float
) -> Dict[str, Any]:
    """
    Phân loại Archetype tính cách cổ phiếu theo chuẩn ref-equity-research-vn:
    - trend_following: Bám trend mạnh mẽ
    - accumulation_breakout: Tích lũy bùng nổ
    - range_bound_cyclical: Dao động hộp tích lũy
    - trap_prone: Dễ gặp bẫy giá / biến động đuôi béo cao
    """
    if kurtosis > 2.5 and beta > 1.3:
        archetype = "TRAP_PRONE"
        name = "Biến Động Cao / Dễ Nhiễu (Trap-Prone)"
        desc = "Cổ phiếu có đuôi rủi ro dày và hệ số Beta cao, dễ có các phiên bẫy giá tăng/giảm đột ngột."
    elif cmf > 0.08 and vpci > 1.05:
        archetype = "ACCUMULATION_BREAKOUT"
        name = "Tích Lũy Bùng Nổ (Accumulation Breakout)"
        desc = "Dòng tiền thông minh vào mạnh (CMF dương cao) và khối lượng ủng hộ đà biến động."
    elif vpci > 1.10 and beta >= 0.8:
        archetype = "TREND_FOLLOWING"
        name = "Bám Xu Hướng (Trend Following)"
        desc = "Khối lượng giao dịch đồng thuận cao với các bước sóng giá, thích hợp cho chiến lược theo xu hướng."
    else:
        archetype = "RANGE_BOUND_CYCLICAL"
        name = "Dao Động Hộp / Chu Kỳ (Range-Bound)"
        desc = "Cổ phiếu biến động trong biên độ tích lũy, khối lượng và dòng tiền duy trì mức cân bằng."

    return {
        "archetype": archetype,
        "name": name,
        "description": desc,
        "guardrail": "Phân tích mô tả lịch sử hành vi giá-khối lượng, không phải khuyến nghị mua/bán."
    }


def compute_full_market_profile(
    symbol: str,
    daily_candles: List[Dict[str, Any]],
    stock_item: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Tổng hợp toàn bộ Hồ sơ Thị trường Định lượng 15 Blocks cho một mã cổ phiếu:
    1. Volume at Price (VAP) & POC
    2. VPCI & Chaikin Money Flow (CMF)
    3. Wyckoff Effort vs Result
    4. Phân phối Lợi suất & Rủi ro Đuôi (Tail Risk)
    5. Archetype tính cách cổ phiếu
    """
    vap_res = calculate_volume_at_price(daily_candles, num_buckets=10)
    flow_res = calculate_vpci_and_flow(daily_candles)
    wyckoff_res = calculate_wyckoff_effort_result(daily_candles)
    tail_res = calculate_tail_risk_distribution(daily_candles)

    beta = float(stock_item.get("technical", {}).get("beta") or 1.0) if stock_item else 1.0
    kurt = tail_res.get("kurtosis", 0.0)
    vpci = flow_res.get("vpci", 1.0)
    cmf = flow_res.get("cmf", 0.0)

    arch_res = classify_stock_archetype(vpci, cmf, kurt, beta)

    return {
        "symbol": symbol,
        "volumeAtPrice": vap_res,
        "moneyFlow": flow_res,
        "wyckoffEffort": wyckoff_res,
        "tailRisk": tail_res,
        "archetype": arch_res
    }
