#!/usr/bin/env python3
"""
scripts/fetchers/sector_valuation_fetcher.py
Module chuyên trách trích xuất Dữ Liệu Định Giá Thực Tế 10 Nhóm Ngành Chuẩn GICS Việt Nam
(P/E, P/B, Vốn hóa, Tỷ suất cổ tức, Tăng trưởng LNST, Số lượng cổ phiếu, Hiệu suất chu kỳ)
bao phủ toàn bộ hơn 2.000 cổ phiếu trên 3 sàn (HOSE, HNX, UPCoM).

Sử dụng BeautifulSoup4 + pandas (pd.read_html) bóc tách bảng HTML Table chuẩn hóa,
đồng nhất với kiến trúc của tradingeconomics_fetcher.py.
Tích hợp hệ thống Console Error Logging chi tiết cho từng trường dữ liệu bị thiếu/lỗi,
cơ chế Dual-layer Fallback (__NEXT_DATA__) và Local Snapshot Caching (TTL 24h).
"""

from __future__ import annotations

import io
import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd
from bs4 import BeautifulSoup

try:
    from .base import BaseFetcher
except (ImportError, ValueError):
    from base import BaseFetcher

PROJECT_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = PROJECT_DIR / "data"
CACHE_FILE = DATA_DIR / "sector_valuation_cache.json"
CACHE_TTL_HOURS = 24
SIMPLIZE_URL = "https://simplize.vn/co-phieu/nganh"

GICS_SECTOR_MAP: Dict[str, Dict[str, str]] = {
    "tai-chinh": {
        "code": "VNFIN",
        "name": "Tài chính",
        "label": "Tài chính (Ngân hàng, CK, Bảo hiểm)",
        "icon": "🏦",
        "gicsGroup": "Financials",
    },
    "bat-dong-san": {
        "code": "VNREAL",
        "name": "Bất động sản",
        "label": "Bất động sản & KCN",
        "icon": "🏢",
        "gicsGroup": "Real Estate",
    },
    "cong-nghiep": {
        "code": "VNIND",
        "name": "Công nghiệp",
        "label": "Công nghiệp & Xây dựng",
        "icon": "🏗️",
        "gicsGroup": "Industrials",
    },
    "hang-hoa-thiet-yeu": {
        "code": "VNCONS",
        "name": "Hàng hóa thiết yếu",
        "label": "Tiêu dùng thiết yếu",
        "icon": "🛒",
        "gicsGroup": "Consumer Staples",
    },
    "hang-hoa-khong-thiet-yeu": {
        "code": "VNDISCR",
        "name": "Hàng hóa không thiết yếu",
        "label": "Tiêu dùng không thiết yếu & Bán lẻ",
        "icon": "🛍️",
        "gicsGroup": "Consumer Discretionary",
    },
    "nang-luong": {
        "code": "VNENE",
        "name": "Năng lượng",
        "label": "Năng lượng & Dầu khí",
        "icon": "⚡",
        "gicsGroup": "Energy",
    },
    "nguyen-vat-lieu": {
        "code": "VNMAT",
        "name": "Nguyên vật liệu",
        "label": "Nguyên vật liệu & Thép",
        "icon": "🧱",
        "gicsGroup": "Materials",
    },
    "cong-nghe": {
        "code": "VNIT",
        "name": "Công nghệ",
        "label": "Công nghệ thông tin (FPT, CMG...)",
        "icon": "💻",
        "gicsGroup": "Information Technology",
    },
    "tien-ich": {
        "code": "VNUT",
        "name": "Tiện ích",
        "label": "Tiện ích (Điện, Nước, Khí)",
        "icon": "🚰",
        "gicsGroup": "Utilities",
    },
    "cham-soc-suc-khoe": {
        "code": "VNHEAL",
        "name": "Chăm sóc sức khỏe",
        "label": "Y tế & Dược phẩm",
        "icon": "💊",
        "gicsGroup": "Healthcare",
    },
}


class SectorValuationFetcher(BaseFetcher):
    """Fetcher chuyên trách dữ liệu định giá ngành thực tế chuẩn GICS bằng BeautifulSoup + Pandas."""

    def __init__(self):
        super().__init__(default_source="SIMPLIZE")

    def _parse_number(self, val: Any, field_name: str = "", sector_name: str = "") -> Optional[float]:
        """
        Làm sạch chuỗi số, %, T (Tỷ), dấu phẩy và chuyển đổi sang float.
        Log chi tiết ra console nếu trường bị thiếu, rỗng, NaN hoặc lỗi ép kiểu.
        """
        if val is None or pd.isna(val):
            print(f"  ⚠️ [SectorValuation] [{sector_name}] Trường '{field_name}' bị rỗng / NaN.")
            return None

        val_str = str(val).strip()
        if not val_str or val_str in ("-", "--", "N/A", "nan", "null"):
            print(f"  ⚠️ [SectorValuation] [{sector_name}] Trường '{field_name}' không có giá trị: '{val_str}'.")
            return None

        # Loại bỏ các ký tự đơn vị và định dạng: %, T (Tỷ VNĐ), dấu phẩy ngăn cách hàng nghìn
        cleaned = val_str.replace(",", "").replace("%", "").replace("T", "").strip()
        try:
            return float(cleaned)
        except ValueError as err:
            print(
                f"  ⚠️ [SectorValuation] [{sector_name}] Lỗi ép kiểu '{field_name}': "
                f"Không thể chuyển '{val_str}' thành số ({err})."
            )
            return None

    def _get_valuation_band(self, pe: Optional[float], vnindex_pe: float = 10.72) -> Dict[str, str]:
        """Xác định dải định giá ngành so với tương quan định giá toàn thị trường."""
        if pe is None or pe <= 0:
            return {
                "band": "Chưa xác định",
                "badge": "bg-gray-100 text-gray-700 border-gray-200",
                "color": "#9ca3af",
            }

        diff_pct = ((pe - vnindex_pe) / vnindex_pe) * 100
        if diff_pct <= -20.0 or pe < 9.0:
            return {
                "band": "Rất rẻ",
                "badge": "bg-emerald-500/20 text-emerald-400 border-emerald-400/40",
                "color": "#10b981",
            }
        elif diff_pct <= -5.0 or pe < 11.5:
            return {
                "band": "Rẻ",
                "badge": "bg-teal-500/20 text-teal-400 border-teal-400/40",
                "color": "#14b8a6",
            }
        elif diff_pct <= 20.0 or pe <= 13.5:
            return {
                "band": "Hợp lý",
                "badge": "bg-blue-500/20 text-blue-400 border-blue-400/40",
                "color": "#3b82f6",
            }
        elif diff_pct <= 40.0:
            return {
                "band": "Hơi đắt",
                "badge": "bg-amber-500/20 text-amber-400 border-amber-400/40",
                "color": "#f59e0b",
            }
        else:
            return {
                "band": "Đắt đỏ",
                "badge": "bg-rose-500/20 text-rose-400 border-rose-400/40",
                "color": "#ef4444",
            }

    def _extract_from_html_table(self, html: str, vnindex_pe: float) -> List[Dict[str, Any]]:
        """
        Bóc tách bảng dữ liệu 10 nhóm ngành từ HTML sử dụng BeautifulSoup và pandas read_html.
        Đồng thời bóc tách slug định danh từ các thẻ <a> trong bảng.
        """
        soup = BeautifulSoup(html, "html.parser")
        table = soup.find("table")
        if not table:
            print(f"  ⚠️ [SectorValuation] Không tìm thấy thẻ <table> trên HTML từ {SIMPLIZE_URL}.")
            return []

        # 1. Trích xuất mapping từ tên hiển thị sang slug từ các thẻ <a> trong bảng
        slug_map: Dict[str, str] = {}
        for a in table.select("a"):
            href = a.get("href", "")
            text = a.get_text(strip=True)
            if "/co-phieu/nganh/" in href and text:
                slug = href.split("/co-phieu/nganh/")[-1].strip("/")
                slug_map[text] = slug

        # 2. Dùng pandas đọc bảng HTML thành DataFrame
        try:
            df = pd.read_html(io.StringIO(str(table)))[0]
        except Exception as e:
            print(f"  ⚠️ [SectorValuation] Lỗi khi pandas parse bảng HTML qua pd.read_html: {e}")
            return []

        if "Nhóm ngành" not in df.columns:
            print(f"  ⚠️ [SectorValuation] Bảng HTML thiếu cột 'Nhóm ngành'. Các cột hiện có: {df.columns.tolist()}")
            return []

        # Lọc bỏ các hàng NaN (như hàng tiêu đề phụ)
        df_clean = df.dropna(subset=["Nhóm ngành"]).copy()
        if df_clean.empty:
            print("  ⚠️ [SectorValuation] Bảng HTML không có hàng dữ liệu hợp lệ sau khi loại bỏ NaN.")
            return []

        results: List[Dict[str, Any]] = []
        for _, row in df_clean.iterrows():
            raw_name = str(row.get("Nhóm ngành", "")).strip()
            slug = slug_map.get(raw_name, "")

            # Tìm kiếm thông tin ngành chuẩn GICS theo slug hoặc tên tiếng Việt
            meta = GICS_SECTOR_MAP.get(slug)
            if not meta:
                for s_key, s_meta in GICS_SECTOR_MAP.items():
                    if s_meta["name"].lower() == raw_name.lower():
                        meta = s_meta
                        slug = s_key
                        break

            if not meta:
                print(
                    f"  ⚠️ [SectorValuation] Phát hiện nhóm ngành chưa nằm trong danh mục GICS chuẩn: "
                    f"'{raw_name}' (slug: '{slug}')"
                )
                meta = {
                    "code": slug.upper() if slug else "UNKNOWN",
                    "name": raw_name,
                    "label": raw_name,
                    "icon": "📊",
                    "gicsGroup": "Others",
                }

            # Bóc tách và parse từng trường chỉ số với logging chi tiết khi có lỗi
            pe = self._parse_number(row.get("P/E"), "P/E", raw_name)
            pb = self._parse_number(row.get("P/B"), "P/B", raw_name)
            div_yield = self._parse_number(row.get("Tỷ suất cổ tức"), "Tỷ suất cổ tức", raw_name)
            market_cap_bn = self._parse_number(row.get("Vốn hóa"), "Vốn hóa", raw_name)
            tickers_count = self._parse_number(row.get("Số lượng cổ phiếu"), "Số lượng CP", raw_name)
            income_growth_est = self._parse_number(
                row.get("T.trưởng LNST 3 năm dự phóng"), "Tăng trưởng LNST 3Y", raw_name
            )

            p_1d = self._parse_number(row.get("% Giá 1D"), "% Giá 1D", raw_name)
            p_7d = self._parse_number(row.get("% Giá 7D"), "% Giá 7D", raw_name)
            p_ytd = self._parse_number(row.get("% Giá YTD"), "% Giá YTD", raw_name)
            p_1y = self._parse_number(row.get("% Giá 1Y"), "% Giá 1Y", raw_name)
            p_3y = self._parse_number(row.get("% Giá 3Y"), "% Giá 3Y", raw_name)

            band_info = self._get_valuation_band(pe, vnindex_pe=vnindex_pe)

            results.append({
                "code": meta["code"],
                "name": meta["name"],
                "label": meta["label"],
                "icon": meta["icon"],
                "slug": slug,
                "gicsGroup": meta["gicsGroup"],
                "pe": round(pe, 2) if pe is not None else None,
                "pb": round(pb, 2) if pb is not None else None,
                "divYield": round(div_yield, 2) if div_yield is not None else None,
                "marketCapBn": market_cap_bn or 0.0,
                "totalTickers": int(tickers_count) if tickers_count is not None else 0,
                "netIncomeEstGrowth": round(income_growth_est, 2) if income_growth_est is not None else None,
                "pricePctChg1d": round(p_1d, 2) if p_1d is not None else None,
                "pricePctChg7d": round(p_7d, 2) if p_7d is not None else None,
                "pricePctChgYtd": round(p_ytd, 2) if p_ytd is not None else None,
                "pricePctChg1y": round(p_1y, 2) if p_1y is not None else None,
                "pricePctChg3y": round(p_3y, 2) if p_3y is not None else None,
                "valuationBand": band_info["band"],
                "valuationBadge": band_info["badge"],
                "valuationColor": band_info["color"],
            })

        print(f"  ✅ [SectorValuation] Bóc tách thành công {len(results)} nhóm ngành từ bảng HTML.")
        return results

    def _extract_from_next_data(self, html: str, vnindex_pe: float) -> List[Dict[str, Any]]:
        """Cơ chế Fallback: Trích xuất JSON từ thẻ <script id='__NEXT_DATA__'>."""
        print("  ℹ️ [SectorValuation] Đang kích hoạt cơ chế fallback phụ từ JSON __NEXT_DATA__...")
        match = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html)
        if not match:
            print("  ⚠️ [SectorValuation] Fallback thất bại: Không tìm thấy __NEXT_DATA__ trong HTML.")
            return []

        try:
            payload = json.loads(match.group(1))
            groups = payload.get("props", {}).get("pageProps", {}).get("parentIndustryGroups", [])
        except Exception as err:
            print(f"  ⚠️ [SectorValuation] Fallback thất bại: Lỗi parse JSON payload: {err}")
            return []

        results: List[Dict[str, Any]] = []
        for g in groups:
            slug = g.get("slug", "")
            meta = GICS_SECTOR_MAP.get(
                slug,
                {
                    "code": slug.upper() if slug else "UNKNOWN",
                    "name": g.get("name", "Ngành"),
                    "label": g.get("name", "Ngành"),
                    "icon": "📊",
                    "gicsGroup": "Others",
                },
            )

            pe = float(g.get("peRatio")) if g.get("peRatio") is not None else None
            pb = float(g.get("pbRatio")) if g.get("pbRatio") is not None else None
            div_yield = float(g.get("divYieldRatio")) if g.get("divYieldRatio") is not None else None
            market_cap_bn = round(float(g.get("marketCap", 0)) / 1e9, 1)

            band_info = self._get_valuation_band(pe, vnindex_pe=vnindex_pe)

            results.append({
                "code": meta["code"],
                "name": g.get("name") or meta["name"],
                "label": meta["label"],
                "icon": meta["icon"],
                "slug": slug,
                "gicsGroup": meta["gicsGroup"],
                "pe": round(pe, 2) if pe is not None else None,
                "pb": round(pb, 2) if pb is not None else None,
                "divYield": round(div_yield, 2) if div_yield is not None else None,
                "marketCapBn": market_cap_bn,
                "totalTickers": int(g.get("totalTicker", 0)),
                "netIncomeEstGrowth": round(float(g.get("netIncomeEstGrowth")), 2) if g.get("netIncomeEstGrowth") is not None else None,
                "pricePctChg1d": round(float(g.get("pricePctChg1d")), 2) if g.get("pricePctChg1d") is not None else None,
                "pricePctChg7d": round(float(g.get("pricePctChg7d")), 2) if g.get("pricePctChg7d") is not None else None,
                "pricePctChgYtd": round(float(g.get("pricePctChgYtd")), 2) if g.get("pricePctChgYtd") is not None else None,
                "pricePctChg1y": round(float(g.get("pricePctChg1y")), 2) if g.get("pricePctChg1y") is not None else None,
                "pricePctChg3y": round(float(g.get("pricePctChg3y")), 2) if g.get("pricePctChg3y") is not None else None,
                "valuationBand": band_info["band"],
                "valuationBadge": band_info["badge"],
                "valuationColor": band_info["color"],
            })

        print(f"  ✅ [SectorValuation] Fallback JSON thành công: Lấy được {len(results)} nhóm ngành.")
        return results

    def fetch_sectors_live(self, vnindex_pe: float = 10.72) -> List[Dict[str, Any]]:
        """
        Cào dữ liệu 10 nhóm ngành từ nguồn chuẩn GICS.
        Ưu tiên bóc tách bảng HTML Table với BeautifulSoup + Pandas.
        Tự động fallback sang __NEXT_DATA__ JSON nếu bảng không khả dụng.
        """
        html = ""
        # 1. Tải HTML với curl_cffi (Chrome 120 impersonation)
        try:
            from curl_cffi import requests as cffi_requests
            s = cffi_requests.Session(impersonate="chrome120")
            r = s.get(SIMPLIZE_URL, timeout=15)
            r.raise_for_status()
            html = r.text
        except Exception as e:
            print(f"  ⚠️ [SectorValuation] Kết nối curl_cffi thất bại: {e}. Thử fallback sang BaseFetcher.http_get()...")
            try:
                html = self.http_get(SIMPLIZE_URL, timeout=15)
            except Exception as e2:
                print(f"  ❌ [SectorValuation] Lỗi kết nối HTTP toàn phần đến {SIMPLIZE_URL}: {e2}")
                return []

        # 2. Ưu tiên bóc tách bảng HTML Table qua BeautifulSoup + Pandas
        results = self._extract_from_html_table(html, vnindex_pe=vnindex_pe)

        # 3. Nếu bảng HTML không có hoặc kết quả < 8 ngành, kích hoạt fallback sang __NEXT_DATA__
        if not results or len(results) < 8:
            print("  ⚠️ [SectorValuation] Bóc tách từ bảng HTML không đủ dữ liệu. Đang chuyển sang fallback __NEXT_DATA__...")
            results = self._extract_from_next_data(html, vnindex_pe=vnindex_pe)

        return results

    def fetch_and_cache_sectors(self, vnindex_pe: float = 10.72) -> List[Dict[str, Any]]:
        """Lấy dữ liệu ngành thực tế với cơ chế Caching 24h & Zero-downtime Fallback."""
        # 1. Kiểm tra cache còn hạn
        if CACHE_FILE.exists():
            try:
                age_hours = (datetime.now().timestamp() - CACHE_FILE.stat().st_mtime) / 3600
                if age_hours < CACHE_TTL_HOURS:
                    data = json.loads(CACHE_FILE.read_text(encoding="utf-8"))
                    if isinstance(data, list) and len(data) >= 8:
                        print(f"  [SectorValuation] Nạp {len(data)} nhóm ngành từ cache ({age_hours:.1f}h trước).")
                        return data
            except Exception as e:
                print(f"  ⚠️ [SectorValuation] Lỗi đọc file cache: {e}")

        # 2. Cào dữ liệu trực tuyến
        print("  🌐 Đang cào dữ liệu định giá 10 nhóm ngành thực tế (GICS) bằng BeautifulSoup + Pandas...")
        live_data = self.fetch_sectors_live(vnindex_pe=vnindex_pe)

        # 3. Lưu cache nếu thành công
        if live_data and len(live_data) >= 8:
            try:
                CACHE_FILE.write_text(json.dumps(live_data, ensure_ascii=False, indent=2), encoding="utf-8")
                print(f"  ✅ Đã lưu {len(live_data)} nhóm ngành thực tế vào {CACHE_FILE.name}")
                return live_data
            except Exception as e:
                print(f"  ⚠️ [SectorValuation] Lỗi ghi file cache: {e}")

        # 4. Fallback: Nếu cào lỗi, nạp lại cache cũ bất kể thời gian
        if CACHE_FILE.exists():
            try:
                cached = json.loads(CACHE_FILE.read_text(encoding="utf-8"))
                if isinstance(cached, list) and len(cached) > 0:
                    print(f"  ℹ️ [SectorValuation] Phục hồi từ cache dự phòng: {len(cached)} ngành.")
                    return cached
            except Exception:
                pass

        print("  ❌ [SectorValuation] Không thể cào dữ liệu mới và không tìm thấy file cache dự phòng khả dụng!")
        return live_data or []


if __name__ == "__main__":
    fetcher = SectorValuationFetcher()
    sectors = fetcher.fetch_and_cache_sectors()
    print(f"\n📊 KẾT QUẢ ĐỊNH GIÁ 10 NGÀNH ({len(sectors)} ngành):")
    for s in sectors:
        cap_val = f"{s['marketCapBn']:>12,.0f} Tỷ" if s['marketCapBn'] else "N/A"
        pe_val = f"{s['pe']:<5}" if s['pe'] is not None else "N/A  "
        pb_val = f"{s['pb']:<5}" if s['pb'] is not None else "N/A  "
        print(
            f"  {s['icon']} {s['code']:<8} | {s['name']:<25} | "
            f"P/E: {pe_val} | P/B: {pb_val} | Dải: {s['valuationBand']:<10} | Cap: {cap_val} | {s['totalTickers']} CP"
        )
