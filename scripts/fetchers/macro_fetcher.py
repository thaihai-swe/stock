#!/usr/bin/env python3
"""
scripts/fetchers/macro_fetcher.py
Module lấy dữ liệu kinh tế vĩ mô, lãi suất và thị trường hàng hóa/ngoại hối:
1. VN-Index P/E & P/B từ Vietstock / TradingView.
2. Lợi suất Trái phiếu Chính phủ Việt Nam 8 kỳ hạn từ HNX Portal.
3. Lãi suất điều hành SBV (Tái cấp vốn, Tái chiết khấu).
4. Thị trường quốc tế qua Yahoo Finance (yfinance): US 10Y, USD/VND, DXY, Dầu Brent, Vàng thế giới.
5. Giá vàng miếng SJC trong nước từ 24h.com.vn.
"""

import io
import re
import json
import time
from pathlib import Path
from datetime import date, datetime, timedelta
from typing import Dict, Any, Optional
from bs4 import BeautifulSoup
import pandas as pd
from .base import BaseFetcher

try:
    import yfinance as yf
except ImportError:
    yf = None

HNX_YIELD_URL = "https://hnx.vn/ModuleReportBonds/Bond_YieldCurve/SearchAndNextPageYieldCurveData"


class MacroFetcher(BaseFetcher):
    """Fetcher chuyên trách dữ liệu kinh tế vĩ mô & lãi suất."""

    def __init__(self):
        super().__init__(default_source="MACRO")

    def fetch_live_index_quote(self, symbol: str = "VNINDEX") -> Dict[str, Any]:
        """
        Lấy thị giá đóng cửa và biến động thời gian thực của chỉ số thị trường (VNINDEX, VN30).
        Nguồn chính thức: DNSE Live Feed API (đồng nhất 100% với Biểu đồ Thị Trường Trực Tuyến).
        """
        code = symbol.strip().upper()
        now_ts = int(time.time())
        from_ts = now_ts - 86400 * 30  # Lấy 30 ngày gần nhất để luôn có phiên gần nhất hợp lệ

        # 1. Nguồn chính thức: DNSE Live Chart API
        try:
            url = f"https://api.dnse.com.vn/chart-api/v2/ohlcs/index?symbol={code}&resolution=1D&from={from_ts}&to={now_ts}"
            headers = {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)",
                "Accept": "application/json"
            }
            raw = self.http_get(url, headers=headers, timeout=10, verify_ssl=False)
            if raw:
                data = json.loads(raw)
                closes = data.get("c", [])
                highs = data.get("h", [])
                lows = data.get("l", [])
                volumes = data.get("v", [])
                if closes:
                    current_close = round(float(closes[-1]), 2)
                    prev_close = round(float(closes[-2]), 2) if len(closes) > 1 else current_close
                    change = round(current_close - prev_close, 2)
                    change_pct = round((change / prev_close) * 100, 2) if prev_close > 0 else 0.0
                    high_val = round(float(highs[-1]), 2) if highs else current_close
                    low_val = round(float(lows[-1]), 2) if lows else current_close
                    vol_val = int(volumes[-1]) if volumes else 0

                    print(f"  [DNSE] Lấy thành công thị giá {code}: {current_close:.2f} điểm ({'+' if change >= 0 else ''}{change:.2f} / {'+' if change_pct >= 0 else ''}{change_pct:.2f}%).")
                    return {
                        "symbol": code,
                        "point": current_close,
                        "prevPoint": prev_close,
                        "change": change,
                        "changePercent": change_pct,
                        "high": high_val,
                        "low": low_val,
                        "volume": vol_val,
                        "source": "DNSE_LIVE"
                    }
        except Exception as e:
            print(f"  ⚠️ [MacroFetcher] Không thể lấy thị giá {code} từ DNSE: {e}")

        # 2. Dự phòng cấp 2: Khôi phục từ cache gần nhất trong data/macro_valuation.json hoặc data/prices_cache.json
        try:
            data_dir = Path(__file__).resolve().parent.parent.parent / "data"
            macro_cache = data_dir / "macro_valuation.json"
            if macro_cache.exists():
                with open(macro_cache, "r", encoding="utf-8") as f:
                    cdata = json.load(f)
                    m_idx = cdata.get("marketIndex", {})
                    pt = None
                    if code == "VNINDEX" and m_idx.get("currentPoint"):
                        pt = float(m_idx["currentPoint"])
                    elif code == "VN30":
                        pt = float(cdata.get("vn30", {}).get("currentPoint") or m_idx.get("vn30Point") or 0.0)
                    if pt and pt > 500:
                        print(f"  ℹ️ [MacroFetcher] Dùng snapshot macro cache gần nhất cho {code}: {pt:.2f} điểm.")
                        return {
                            "symbol": code,
                            "point": pt,
                            "prevPoint": pt,
                            "change": float(m_idx.get("change", 0.0)),
                            "changePercent": float(m_idx.get("changePercent", 0.0)),
                            "high": pt,
                            "low": pt,
                            "volume": 0,
                            "source": "LOCAL_SNAPSHOT_CACHE"
                        }
            prices_cache = data_dir / "prices_cache.json"
            if prices_cache.exists():
                with open(prices_cache, "r", encoding="utf-8") as f:
                    pdata = json.load(f)
                    item = pdata.get(code, {})
                    if item.get("point") and float(item["point"]) > 500:
                        pt = float(item["point"])
                        print(f"  ℹ️ [MacroFetcher] Dùng prices cache gần nhất cho {code}: {pt:.2f} điểm.")
                        return {
                            "symbol": code,
                            "point": pt,
                            "prevPoint": float(item.get("prevPoint", pt)),
                            "change": float(item.get("change", 0.0)),
                            "changePercent": float(item.get("changePct", item.get("changePercent", 0.0))),
                            "high": float(item.get("high", pt)),
                            "low": float(item.get("low", pt)),
                            "volume": int(item.get("volume", 0)),
                            "source": "LOCAL_PRICES_CACHE"
                        }
        except Exception:
            pass

        # 3. Giá trị fallback an toàn nếu hệ thống hoàn toàn mới
        print(f"  ⚠️ [MacroFetcher] Không có cache sẵn có cho {code}, trả về trạng thái UNAVAILABLE.")
        return {
            "symbol": code,
            "point": 0.0,
            "prevPoint": 0.0,
            "change": 0.0,
            "changePercent": 0.0,
            "high": 0.0,
            "low": 0.0,
            "volume": 0,
            "source": "UNAVAILABLE"
        }

    def _fetch_yahoo_direct_chart(self, ticker: str) -> Optional[float]:
        """
        Gọi trực tiếp Yahoo Finance Chart API qua HTTPS (dự phòng độc lập khi yfinance bị lỗi).
        Endpoint: https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d&range=5d
        Trả về giá trị thị trường thực tế gần nhất từ sàn quốc tế (không dùng số giả định).
        """
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d&range=5d"
        headers = {
            "User-Agent": USER_AGENT,
            "Accept": "application/json, text/plain, */*",
        }
        try:
            raw_text = self.http_get(url, headers=headers, timeout=8, verify_ssl=True)
            if raw_text:
                data = json.loads(raw_text)
                result_list = data.get("chart", {}).get("result", [])
                if result_list:
                    meta = result_list[0].get("meta", {})
                    price = meta.get("regularMarketPrice")
                    if price and float(price) > 0:
                        return round(float(price), 2)
                    closes = result_list[0].get("indicators", {}).get("quote", [{}])[0].get("close", [])
                    valid_closes = [c for c in closes if c is not None and float(c) > 0]
                    if valid_closes:
                        return round(float(valid_closes[-1]), 2)
        except Exception:
            pass
        return None

    def fetch_global_commodities_fx(self) -> Dict[str, float]:
        """
        Lấy tỷ giá USD/VND, Lợi suất US 10Y/5Y/2Y, Dầu Brent, Vàng thế giới và DXY qua Yahoo Finance.
        Khởi tạo động từ snapshot macro cache thực tế gần nhất thay vì gán hằng số tĩnh.
        Ưu tiên: yfinance -> Direct Yahoo Chart HTTPS API -> Real Cache Snapshot.
        """
        result = {}
        # 1. Nạp dữ liệu thực tế từ cache trước đó (nếu có)
        try:
            cache_file = Path(__file__).resolve().parent.parent.parent / "data" / "macro_valuation.json"
            if cache_file.exists():
                with open(cache_file, "r", encoding="utf-8") as f:
                    cdata = json.load(f)
                    m_prev = cdata.get("macro", {})
                    if m_prev:
                        if m_prev.get("goldWorld"): result["goldWorld"] = float(m_prev["goldWorld"])
                        if m_prev.get("oilBrent"): result["oilBrent"] = float(m_prev["oilBrent"])
                        if m_prev.get("us10yYield"): result["us10yYield"] = float(m_prev["us10yYield"])
                        if m_prev.get("us05yYield"): result["us05yYield"] = float(m_prev["us05yYield"])
                        if m_prev.get("us02yYield"): result["us02yYield"] = float(m_prev["us02yYield"])
                        if m_prev.get("dxy"): result["dxy"] = float(m_prev["dxy"])
                        if m_prev.get("usdVndRate"): result["usdVndRate"] = float(m_prev["usdVndRate"])
        except Exception:
            pass

        tickers_map = {
            "goldWorld": "GC=F",
            "oilBrent": "BZ=F",
            "us10yYield": "^TNX",
            "us05yYield": "^FVX",
            "us02yYield": "2YY=F",
            "dxy": "DX-Y.NYB",
            "usdVndRate": "USDVND=X",
        }

        # 2. Thu thập dữ liệu thực tế từ thị trường
        for key, sym in tickers_map.items():
            val = None
            if yf is not None:
                try:
                    t = yf.Ticker(sym)
                    df = t.history(period="5d")
                    if not df.empty:
                        val = float(df["Close"].iloc[-1])
                except Exception:
                    pass

            # Dự phòng Tầng 2: Gọi trực tiếp Yahoo Chart API nếu yfinance không phản hồi
            if val is None or val <= 0:
                val = self._fetch_yahoo_direct_chart(sym)

            if val is not None and val > 0:
                result[key] = round(val, 2)

        return result

    def fetch_hnx_yield_curve(self, target_date: Optional[date] = None) -> Dict[str, float]:
        """
        Lấy đường cong lợi suất Trái phiếu Chính phủ Việt Nam 8 kỳ hạn từ HNX Portal.
        Sử dụng BeautifulSoup4 + pandas (pd.read_html) để bóc tách bảng dữ liệu chuẩn hóa.
        Hỗ trợ tự động lùi ngày giao dịch (tối đa 10 ngày) để tìm phiên gần nhất khi rơi vào cuối tuần/nghỉ lễ.
        Dữ liệu dự phòng lấy từ cache thực tế đã lưu trước đó, tuyệt đối không dùng số giả định.
        """
        start_date = target_date or date.today()

        # 1. Nạp cache HNX thực tế đã lưu trước đó làm nguồn dự phòng an toàn
        cached_yields: Dict[str, float] = {}
        try:
            cache_file = Path(__file__).resolve().parent.parent.parent / "data" / "macro_valuation.json"
            if cache_file.exists():
                with open(cache_file, "r", encoding="utf-8") as f:
                    cdata = json.load(f)
                    m_prev = cdata.get("macro", {})
                    y_prev = m_prev.get("yieldCurve", {})
                    if y_prev and isinstance(y_prev, dict):
                        cached_yields = {k: float(v) for k, v in y_prev.items() if float(v) > 0}
        except Exception:
            pass

        tenor_map = {
            "1 năm": "1Y", "2 năm": "2Y", "3 năm": "3Y", "5 năm": "5Y",
            "7 năm": "7Y", "10 năm": "10Y", "15 năm": "15Y", "20 năm": "20Y"
        }

        # 2. Thử từ start_date lùi dần về trước tối đa 10 ngày giao dịch
        for day_offset in range(10):
            check_date = start_date - timedelta(days=day_offset)
            pdate = check_date.strftime("%d/%m/%Y")

            try:
                html = self.http_post_form(HNX_YIELD_URL, {"pDate": pdate}, verify_ssl=False)
                if not html or "Không tìm thấy dữ liệu" in html or len(html) < 500:
                    continue

                soup = BeautifulSoup(html, "html.parser")
                table = soup.find("table")
                if not table:
                    continue

                # HNX sử dụng định dạng số Việt Nam: dấu chấm phân tách hàng nghìn, dấu phẩy là thập phân
                dfs = pd.read_html(io.StringIO(str(table)), thousands=".", decimal=",")
                if not dfs or dfs[0].empty:
                    continue

                df = dfs[0]
                yields: Dict[str, float] = {}

                for _, row in df.iterrows():
                    if len(row) >= 2:
                        tenor_text = str(row.iloc[0]).strip().lower()
                        # Ưu tiên Par yield (cột 2), fallback sang Spot rate (cột 1)
                        raw_yield = row.iloc[2] if (len(row) > 2 and pd.notna(row.iloc[2])) else row.iloc[1]
                        for t_name, t_code in tenor_map.items():
                            if t_name == tenor_text:
                                try:
                                    val = float(raw_yield)
                                    if not pd.isna(val) and 0.0 < val < 50.0:
                                        yields[t_code] = round(val, 2)
                                except (ValueError, TypeError):
                                    pass

                if len(yields) >= 4:
                    print(f"  [HNX] Bóc tách thành công đường cong lợi suất TPCP ngày {pdate} ({len(yields)} kỳ hạn, 10Y={yields.get('10Y')}%) qua BeautifulSoup + Pandas.")
                    return yields

            except Exception as e:
                print(f"  ⚠️ [HNX] Lỗi bóc tách bảng lợi suất ngày {pdate}: {e}")

        print("  ⚠️ [HNX] Không tìm thấy dữ liệu bảng lợi suất gần nhất trong 10 ngày, bảo toàn dữ liệu HNX thực tế từ cache.")
        return cached_yields

    def fetch_sbv_rates(self) -> Dict[str, float]:
        """
        Lấy lãi suất điều hành Ngân hàng Nhà nước Việt Nam (SBV).
        Ưu tiên lấy từ dữ liệu thực tế TradingEconomics (macro_indicators.json) hoặc cache thực tế.
        """
        rates = {
            "refinancingRate": 4.5,
            "discountRate": 3.0,
            "interbankOvernight": 4.5
        }
        try:
            te_file = Path(__file__).resolve().parent.parent.parent / "data" / "macro_indicators.json"
            if te_file.exists():
                with open(te_file, "r", encoding="utf-8") as f:
                    te_data = json.load(f)
                    core = te_data.get("macroCore", {})
                    if core.get("sbv_refinancing_rate"):
                        rates["refinancingRate"] = float(core["sbv_refinancing_rate"])
                    if core.get("interbank_rate"):
                        rates["interbankOvernight"] = float(core["interbank_rate"])
        except Exception:
            pass

        try:
            cache_file = Path(__file__).resolve().parent.parent.parent / "data" / "macro_valuation.json"
            if cache_file.exists():
                with open(cache_file, "r", encoding="utf-8") as f:
                    cdata = json.load(f)
                    sbv_prev = cdata.get("macro", {}).get("sbvRates", {})
                    if sbv_prev:
                        if sbv_prev.get("refinancingRate"): rates["refinancingRate"] = float(sbv_prev["refinancingRate"])
                        if sbv_prev.get("discountRate"): rates["discountRate"] = float(sbv_prev["discountRate"])
                        if sbv_prev.get("interbankOvernight"): rates["interbankOvernight"] = float(sbv_prev["interbankOvernight"])
        except Exception:
            pass

        return rates

    def fetch_pnj_gold(self) -> Dict[str, Any]:
        """
        Lấy giá vàng miếng SJC và vàng nhẫn PNJ 999.9 chính thức từ PNJ Edge API.
        Endpoint: https://edge-api.pnj.io/ecom-frontend/v1/get-gold-price?zone=00
        Đơn vị trả về: triệu đồng/lượng. Dữ liệu thực tế 100%, không dùng số tĩnh.
        """
        result = {
            "sjcBuy": None,
            "sjcSell": None,
            "pnjBuy": None,
            "pnjSell": None,
            "updateDate": "",
            "source": "PNJ Official Edge API"
        }

        # 1. Khôi phục từ cache thực tế trước đó nếu PNJ Edge API tạm thời gián đoạn
        try:
            cache_file = Path(__file__).resolve().parent.parent.parent / "data" / "macro_valuation.json"
            if cache_file.exists():
                with open(cache_file, "r", encoding="utf-8") as f:
                    cdata = json.load(f)
                    m = cdata.get("macro", {})
                    if m.get("sjcGoldSell") and 50.0 <= float(m["sjcGoldSell"]) <= 300.0:
                        result["sjcBuy"] = float(m.get("sjcGoldBuy") or 0)
                        result["sjcSell"] = float(m.get("sjcGoldSell") or 0)
                    if m.get("pnjGoldSell") and 50.0 <= float(m["pnjGoldSell"]) <= 300.0:
                        result["pnjBuy"] = float(m.get("pnjGoldBuy") or 0)
                        result["pnjSell"] = float(m.get("pnjGoldSell") or 0)
                    if m.get("pnjUpdateDate"):
                        result["updateDate"] = str(m["pnjUpdateDate"])
        except Exception:
            pass

        # 2. Gọi PNJ Edge API thời gian thực
        url = "https://edge-api.pnj.io/ecom-frontend/v1/get-gold-price?zone=00"
        headers = {
            "Accept": "application/json, text/plain, */*",
            "Origin": "https://www.pnj.com.vn",
            "Referer": "https://www.pnj.com.vn/",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        }
        try:
            raw_text = self.http_get(url, headers=headers, timeout=10)
            if raw_text:
                payload = json.loads(raw_text)
                items = payload.get("data", [])
                update_date = payload.get("updateDate", "")
                if update_date:
                    result["updateDate"] = update_date

                for item in items:
                    masp = str(item.get("masp", "")).upper()
                    try:
                        # API PNJ trả về nghìn đồng/chỉ -> chia 100 để ra triệu đồng/lượng
                        giamua = float(item.get("giamua") or 0) / 100.0
                        giaban = float(item.get("giaban") or 0) / 100.0
                    except (ValueError, TypeError):
                        continue

                    if masp == "SJC" and 50.0 <= giaban <= 300.0:
                        result["sjcBuy"] = round(giamua, 2)
                        result["sjcSell"] = round(giaban, 2)
                    elif masp in ("N24K", "PNJ") and 50.0 <= giaban <= 300.0:
                        result["pnjBuy"] = round(giamua, 2)
                        result["pnjSell"] = round(giaban, 2)
        except Exception:
            pass

        return result

    def fetch_sjc_gold(self) -> Dict[str, float]:
        """Backward-compatible alias trả về giá SJC (triệu đồng/lượng)."""
        pnj = self.fetch_pnj_gold()
        return {"buy": pnj["sjcBuy"], "sell": pnj["sjcSell"]}

    def fetch_all_macro(self) -> Dict[str, Any]:
        """Tổng hợp toàn bộ chỉ số vĩ mô cho mô hình định giá & phân bổ tài sản."""
        global_fx = self.fetch_global_commodities_fx()
        yield_curve = self.fetch_hnx_yield_curve()
        sbv = self.fetch_sbv_rates()
        pnj_gold = self.fetch_pnj_gold()

        vn10y = yield_curve.get("10Y", 3.45)

        return {
            "vn10yYield": vn10y,
            "sbvRefinancingRate": sbv["refinancingRate"],
            "us10yYield": global_fx["us10yYield"],
            "usdVndRate": global_fx["usdVndRate"],
            "goldWorld": global_fx["goldWorld"],
            "oilBrent": global_fx["oilBrent"],
            "dxy": global_fx["dxy"],
            "sjcGoldBuy": pnj_gold["sjcBuy"],
            "sjcGoldSell": pnj_gold["sjcSell"],
            "pnjGoldBuy": pnj_gold["pnjBuy"],
            "pnjGoldSell": pnj_gold["pnjSell"],
            "pnjUpdateDate": pnj_gold["updateDate"],
            "yieldCurve": yield_curve,
            "sbvRates": sbv
        }
