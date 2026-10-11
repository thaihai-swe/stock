#!/usr/bin/env python3
"""
scripts/fetchers/sector_valuation_fetcher.py
Module chuyên trách trích xuất Dữ Liệu Định Giá Thực Tế 10 Nhóm Ngành Chuẩn GICS Việt Nam
(P/E, P/B, Vốn hóa, Tỷ suất cổ tức, Tăng trưởng LNST, Số lượng cổ phiếu, Hiệu suất chu kỳ)
bao phủ toàn bộ hơn 2.000 cổ phiếu trên 3 sàn (HOSE, HNX, UPCoM).

Hỗ trợ cơ chế Local Snapshot Caching (TTL 24h) và Zero-downtime Fallback.
"""

from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path
try:
    from .base import BaseFetcher
except ImportError:
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
    """Fetcher chuyên trách dữ liệu định giá ngành thực tế chuẩn GICS."""

    def __init__(self):
        super().__init__(default_source="SIMPLIZE")

    def _get_valuation_band(self, pe: Optional[float], vnindex_pe: float = 10.72) -> Dict[str, str]:
        """Xác định dải định giá ngành so với tương quan định giá toàn thị trường."""
        if pe is None or pe <= 0:
            return {"band": "Chưa xác định", "badge": "bg-gray-100 text-gray-700 border-gray-200", "color": "#9ca3af"}
        
        diff_pct = ((pe - vnindex_pe) / vnindex_pe) * 100
        if diff_pct <= -20.0 or pe < 9.0:
            return {"band": "Rất rẻ", "badge": "bg-emerald-500/20 text-emerald-400 border-emerald-400/40", "color": "#10b981"}
        elif diff_pct <= -5.0 or pe < 11.5:
            return {"band": "Rẻ", "badge": "bg-teal-500/20 text-teal-400 border-teal-400/40", "color": "#14b8a6"}
        elif diff_pct <= 20.0 or pe <= 13.5:
            return {"band": "Hợp lý", "badge": "bg-blue-500/20 text-blue-400 border-blue-400/40", "color": "#3b82f6"}
        elif diff_pct <= 40.0:
            return {"band": "Hơi đắt", "badge": "bg-amber-500/20 text-amber-400 border-amber-400/40", "color": "#f59e0b"}
        else:
            return {"band": "Đắt đỏ", "badge": "bg-rose-500/20 text-rose-400 border-rose-400/40", "color": "#ef4444"}

    def fetch_sectors_live(self, vnindex_pe: float = 10.72) -> List[Dict[str, Any]]:
        """Cào dữ liệu 10 nhóm ngành từ nguồn chuẩn GICS."""
        try:
            from curl_cffi import requests
            s = requests.Session(impersonate="chrome120")
            r = s.get(SIMPLIZE_URL, timeout=15)
            r.raise_for_status()
            html = r.text
        except Exception as e:
            # Fallback sang standard http_get
            try:
                html = self.http_get(SIMPLIZE_URL, timeout=15)
            except Exception as e2:
                print(f"  ⚠️ [SectorValuation] Lỗi kết nối HTTP: {e2}")
                return []

        match = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html)
        if not match:
            print("  ⚠️ [SectorValuation] Không tìm thấy __NEXT_DATA__ trong HTML")
            return []

        try:
            payload = json.loads(match.group(1))
            groups = payload.get("props", {}).get("pageProps", {}).get("parentIndustryGroups", [])
        except Exception as err:
            print(f"  ⚠️ [SectorValuation] Lỗi parse JSON payload: {err}")
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
                "netIncomeLtmGrowth": round(float(g.get("netIncomeLtmGrowth")), 2) if g.get("netIncomeLtmGrowth") is not None else None,
                "netIncomeEstGrowth": round(float(g.get("netIncomeEstGrowth")), 2) if g.get("netIncomeEstGrowth") is not None else None,
                "pricePctChg1d": round(float(g.get("pricePctChg1d")), 2) if g.get("pricePctChg1d") is not None else None,
                "pricePctChg7d": round(float(g.get("pricePctChg7d")), 2) if g.get("pricePctChg7d") is not None else None,
                "pricePctChg30d": round(float(g.get("pricePctChg30d")), 2) if g.get("pricePctChg30d") is not None else None,
                "pricePctChgYtd": round(float(g.get("pricePctChgYtd")), 2) if g.get("pricePctChgYtd") is not None else None,
                "pricePctChg1y": round(float(g.get("pricePctChg1y")), 2) if g.get("pricePctChg1y") is not None else None,
                "pricePctChg3y": round(float(g.get("pricePctChg3y")), 2) if g.get("pricePctChg3y") is not None else None,
                "pricePctChg5y": round(float(g.get("pricePctChg5y")), 2) if g.get("pricePctChg5y") is not None else None,
                "valuationBand": band_info["band"],
                "valuationBadge": band_info["badge"],
                "valuationColor": band_info["color"],
            })

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
                print(f"  ⚠️ [SectorValuation] Lỗi đọc cache: {e}")

        # 2. Cào dữ liệu trực tuyến
        print("  🌐 Đang cào dữ liệu định giá 10 nhóm ngành thực tế (GICS)...")
        live_data = self.fetch_sectors_live(vnindex_pe=vnindex_pe)

        # 3. Lưu cache nếu thành công
        if live_data and len(live_data) >= 8:
            try:
                CACHE_FILE.write_text(json.dumps(live_data, ensure_ascii=False, indent=2), encoding="utf-8")
                print(f"  ✅ Đã lưu {len(live_data)} nhóm ngành thực tế vào {CACHE_FILE.name}")
                return live_data
            except Exception as e:
                print(f"  ⚠️ [SectorValuation] Lỗi ghi cache: {e}")

        # 4. Fallback: Nếu cào lỗi, nạp lại cache cũ (bất kể hạn)
        if CACHE_FILE.exists():
            try:
                cached = json.loads(CACHE_FILE.read_text(encoding="utf-8"))
                if isinstance(cached, list) and len(cached) > 0:
                    print(f"  ℹ️ [SectorValuation] Phục hồi từ cache dự phòng: {len(cached)} ngành.")
                    return cached
            except Exception:
                pass

        return live_data or []


if __name__ == "__main__":
    fetcher = SectorValuationFetcher()
    sectors = fetcher.fetch_and_cache_sectors()
    print(f"\n📊 KẾT QUẢ ĐỊNH GIÁ 10 NGÀNH ({len(sectors)} ngành):")
    for s in sectors:
        print(f"  {s['icon']} {s['code']:<8} | {s['name']:<25} | P/E: {s['pe']:<5} | P/B: {s['pb']:<5} | Dải: {s['valuationBand']:<10} | Cap: {s['marketCapBn']:>12,.0f} Tỷ | {s['totalTickers']} CP")
