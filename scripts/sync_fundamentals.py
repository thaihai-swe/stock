#!/usr/bin/env python3
"""
scripts/sync_fundamentals.py
Script chính thức đồng bộ toàn bộ dữ liệu định giá, vĩ mô và Báo Cáo Tài Chính (BCTC)
Lưu trữ toàn bộ ra Local JSON trước (data/fundamentals_cache.json, data/macro_valuation.json,
data/financials/<SYMBOL>.json) để người dùng kiểm tra trước khi nạp DB.

Chạy bằng Python 3 thuần (không bắt buộc cài đặt gói bên ngoài).
"""

import json
import os
import sys
import time
import math
import ssl
import sqlite3
import urllib.request
import urllib.error
from pathlib import Path

def urlopen_safe(req, timeout=30):
    try:
        return urllib.request.urlopen(req, timeout=timeout)
    except urllib.error.URLError as e:
        err_str = str(e)
        if "CERTIFICATE_VERIFY_FAILED" in err_str:
            unverified_ctx = ssl._create_unverified_context()
            return urllib.request.urlopen(req, timeout=timeout, context=unverified_ctx)
        raise e
    except Exception as e:
        if "certificate verify failed" in str(e).lower():
            unverified_ctx = ssl._create_unverified_context()
            return urllib.request.urlopen(req, timeout=timeout, context=unverified_ctx)
        raise e

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"
FINANCIALS_DIR = DATA_DIR / "financials"
SUPPORTED_FILE = DATA_DIR / "supported_stocks.json"
CACHE_FILE = DATA_DIR / "fundamentals_cache.json"
MACRO_FILE = DATA_DIR / "macro_valuation.json"
ENV_FILE = ROOT_DIR / ".env"

def load_env_file():
    if ENV_FILE.exists():
        try:
            for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip().strip("'").strip('"')
                    os.environ.setdefault(key, val)
        except Exception as e:
            print(f"⚠️ Không thể đọc file .env: {e}")

load_env_file()

COLUMNS = [
    "name", "description", "close", "change", "change_abs", "volume",
    "sector.tr", "industry.tr",
    "price_earnings_ttm", "price_book_ratio", "price_sales_ratio", "enterprise_value_to_ebitda_ratio",
    "return_on_equity_fq", "return_on_equity_fy", "return_on_assets_fq", "return_on_assets_fy",
    "earnings_per_share_basic_ttm", "gross_margin_ttm", "operating_margin_ttm", "net_margin_ttm",
    "dividends_yield", "dps_common_stock_prim_issue_fy", "free_cash_flow_ttm", "free_cash_flow_margin_ttm",
    "total_debt_fq", "total_assets_fq", "debt_to_equity_fq", "current_ratio_fq", "quick_ratio_fq", "ebitda_ttm",
    "total_revenue_ttm", "net_income_ttm", "market_cap_basic", "total_shares_outstanding_fundamental",
    "Perf.W", "Perf.1M", "Perf.3M", "Perf.6M", "Perf.YTD", "Perf.Y", "Perf.5Y",
    "price_52_week_high", "price_52_week_low",
    "average_volume_10d_calc", "average_volume_30d_calc", "Volatility.W", "Volatility.M",
    "Recommend.All", "beta_1_year"
]

def load_symbols():
    if len(sys.argv) > 1:
        for i, arg in enumerate(sys.argv):
            if arg == "--symbols" and i + 1 < len(sys.argv):
                return [s.strip().upper() for s in sys.argv[i+1].split(",") if s.strip()]
            elif not arg.startswith("-") and i > 0:
                return [s.strip().upper() for s in arg.split(",") if s.strip()]

    symbols = []
    if SUPPORTED_FILE.exists():
        try:
            with open(SUPPORTED_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                raw_list = data.get("symbols", []) if isinstance(data, dict) else (data if isinstance(data, list) else [])
                seen = set()
                for s in raw_list:
                    if s and isinstance(s, str):
                        clean = s.strip().upper()
                        if clean and clean not in seen:
                            seen.add(clean)
                            symbols.append(clean)
        except Exception as e:
            print(f"⚠️ Không đọc được supported_stocks.json: {e}")

    if not symbols:
        # Tự động quét từ data/financials/*.json hoặc keys từ fundamentals_cache.json
        if FINANCIALS_DIR.exists():
            symbols = sorted([p.stem.upper() for p in FINANCIALS_DIR.glob("*.json") if p.stem and not p.stem.startswith(".")])
        if not symbols and CACHE_FILE.exists():
            try:
                with open(CACHE_FILE, "r", encoding="utf-8") as f:
                    symbols = sorted(list(json.load(f).keys()))
            except Exception:
                pass
        if not symbols:
            symbols = ["HPG", "FPT", "VNM", "MWG", "MBB", "TCB", "VCB", "SSI", "VIC", "VHM"]

    return symbols

try:
    from fetchers.market_fetcher import MarketFetcher
except ImportError:
    from scripts.fetchers.market_fetcher import MarketFetcher

def fetch_tradingview(symbols):
    """Ủy thác việc lấy dữ liệu TradingView Scanner sang MarketFetcher độc lập."""
    fetcher = MarketFetcher()
    return fetcher.fetch_tradingview_raw(symbols)

try:
    from lib.valuation_engine import StockValuationEngine
except ImportError:
    from scripts.lib.valuation_engine import StockValuationEngine

engine = StockValuationEngine()


def normalize_row(row):
    d = {col: row["d"][i] if i < len(row["d"]) else None for i, col in enumerate(COLUMNS)}
    sym = (d.get("name") or "").upper()
    close = float(d["close"]) if d.get("close") is not None else None
    h52 = float(d["price_52_week_high"]) if d.get("price_52_week_high") is not None else None
    l52 = float(d["price_52_week_low"]) if d.get("price_52_week_low") is not None else None

    range52 = None
    if close is not None and h52 is not None and l52 is not None and h52 > l52:
        range52 = max(0, min(100, round(((close - l52) / (h52 - l52)) * 100)))

    rec_score = d.get("Recommend.All")
    rec_text = "Trung lập"
    rec_color = "text-gray-400"
    if rec_score is not None:
        if rec_score >= 0.5:
            rec_text = "Mua mạnh"
            rec_color = "text-emerald-500 font-bold"
        elif rec_score > 0.1:
            rec_text = "Mua"
            rec_color = "text-green-500 font-medium"
        elif rec_score <= -0.5:
            rec_text = "Bán mạnh"
            rec_color = "text-rose-500 font-bold"
        elif rec_score < -0.1:
            rec_text = "Bán"
            rec_color = "text-rose-400 font-medium"

    pe_val = round(float(d["price_earnings_ttm"]), 2) if d.get("price_earnings_ttm") is not None else None
    pb_val = round(float(d["price_book_ratio"]), 2) if d.get("price_book_ratio") is not None else None
    eps_val = round(float(d["earnings_per_share_basic_ttm"])) if d.get("earnings_per_share_basic_ttm") is not None else None
    dps_val = round(float(d["dps_common_stock_prim_issue_fy"])) if d.get("dps_common_stock_prim_issue_fy") is not None else 0
    rev_val = round(float(d["total_revenue_ttm"])) if d.get("total_revenue_ttm") is not None else None
    ni_val = round(float(d["net_income_ttm"])) if d.get("net_income_ttm") is not None else None
    assets_val = round(float(d["total_assets_fq"])) if d.get("total_assets_fq") is not None else None
    debt_val = round(float(d["total_debt_fq"])) if d.get("total_debt_fq") is not None else None
    net_margin_val = round(float(d["net_margin_ttm"]), 2) if d.get("net_margin_ttm") is not None else None
    roe_val = round(float(d["return_on_equity_fq"]), 2) if d.get("return_on_equity_fq") is not None else None
    ebitda_val = round(float(d["ebitda_ttm"])) if d.get("ebitda_ttm") is not None else None
    fcf_val = round(float(d["free_cash_flow_ttm"])) if d.get("free_cash_flow_ttm") is not None else None
    shares_val = round(float(d["total_shares_outstanding_fundamental"])) if d.get("total_shares_outstanding_fundamental") is not None else None
    beta_val = round(float(d["beta_1_year"]), 2) if d.get("beta_1_year") is not None else None

    # Động cơ định giá doanh nghiệp tập trung (Enterprise Valuation Engine)
    val_eval = engine.evaluate({
        "close": close,
        "eps": eps_val,
        "pb": pb_val,
        "dps": dps_val,
        "revenue": rev_val,
        "netIncome": ni_val,
        "totalAssets": assets_val,
        "totalDebt": debt_val,
        "ebitda": ebitda_val,
        "cfo": fcf_val,
        "shares": shares_val,
        "roe": roe_val,
        "netMargin": net_margin_val,
        "high52w": h52,
        "low52w": l52,
        "recommendScore": rec_score,
        "beta": beta_val
    })
    dupont_models = val_eval["dupont"]
    tech_eval = val_eval["technicals"]

    return {
        "symbol": sym,
        "exchange": row["s"].split(":")[0] if ":" in row.get("s", "") else "HOSE",
        "name": sym,
        "description": d.get("description") or sym,
        "close": close,
        "change": round(float(d["change"]), 2) if d.get("change") is not None else 0,
        "changeAbs": round(float(d["change_abs"]), 2) if d.get("change_abs") is not None else 0,
        "volume": int(d["volume"]) if d.get("volume") is not None else 0,
        "sector": d.get("sector.tr") or "Khác",
        "industry": d.get("industry.tr") or "Khác",
        "valuation": {
            "pe": pe_val,
            "pb": pb_val,
            "ps": round(float(d["price_sales_ratio"]), 2) if d.get("price_sales_ratio") is not None else None,
            "evEbitda": round(float(d["enterprise_value_to_ebitda_ratio"]), 2) if d.get("enterprise_value_to_ebitda_ratio") is not None else None,
            "bvps": val_eval["bvps"],
            "grahamNumber": val_eval["grahamNumber"],
            "marginOfSafetyGraham": val_eval["marginOfSafetyGraham"],
            "grahamDiffPercent": val_eval.get("grahamDiffPercent"),
            "ddmTarget": val_eval["ddmTarget"],
            "ddmDiffPercent": val_eval.get("ddmDiffPercent"),
            "peTarget": val_eval["peTarget"],
            "peDiffPercent": val_eval.get("peDiffPercent"),
            "pbTarget": val_eval["pbTarget"],
            "pbDiffPercent": val_eval.get("pbDiffPercent"),
            "evEbitdaFairPrice": val_eval["evEbitdaFairPrice"],
            "evEbitdaDiffPercent": val_eval.get("evEbitdaDiffPercent"),
            "pcfFairPrice": val_eval["pcfFairPrice"],
            "pcfDiffPercent": val_eval.get("pcfDiffPercent"),
            "psFairPrice": val_eval["psFairPrice"],
            "psDiffPercent": val_eval.get("psDiffPercent"),
            "fairValue": val_eval["fairValue"],
            "consensusFairValue": val_eval["consensusFairValue"],
            "marginOfSafety": val_eval["marginOfSafety"],
            "marginOfSafetyFairValue": val_eval["marginOfSafetyFairValue"],
            "upside": val_eval.get("upside"),
            "consensusDiffPercent": val_eval.get("consensusDiffPercent"),
            "valuationRating": val_eval["valuationRating"],
            "valuationRatingText": val_eval["valuationRatingText"],
            "valuationRatingBadge": val_eval["valuationRatingBadge"],
            "validModelsCount": val_eval["validModelsCount"]
        },
        "profitability": {
            "roe": roe_val,
            "roeFy": round(float(d["return_on_equity_fy"]), 2) if d.get("return_on_equity_fy") is not None else None,
            "roa": round(float(d["return_on_assets_fq"]), 2) if d.get("return_on_assets_fq") is not None else None,
            "roaFy": round(float(d["return_on_assets_fy"]), 2) if d.get("return_on_assets_fy") is not None else None,
            "eps": eps_val,
            "grossMargin": round(float(d["gross_margin_ttm"]), 2) if d.get("gross_margin_ttm") is not None else None,
            "operatingMargin": round(float(d["operating_margin_ttm"]), 2) if d.get("operating_margin_ttm") is not None else None,
            "netMargin": net_margin_val,
        },
        "dupont": dupont_models,
        "dividends": {
            "yield": round(float(d["dividends_yield"]), 2) if d.get("dividends_yield") is not None else None,
            "dps": dps_val,
            "fcf": round(float(d["free_cash_flow_ttm"])) if d.get("free_cash_flow_ttm") is not None else None,
            "fcfMargin": round(float(d["free_cash_flow_margin_ttm"]), 2) if d.get("free_cash_flow_margin_ttm") is not None else None,
        },
        "health": {
            "totalDebt": debt_val,
            "totalAssets": assets_val,
            "debtToEquity": round(float(d["debt_to_equity_fq"]), 2) if d.get("debt_to_equity_fq") is not None else None,
            "currentRatio": round(float(d["current_ratio_fq"]), 2) if d.get("current_ratio_fq") is not None else None,
            "quickRatio": round(float(d["quick_ratio_fq"]), 2) if d.get("quick_ratio_fq") is not None else None,
            "ebitda": round(float(d["ebitda_ttm"])) if d.get("ebitda_ttm") is not None else None,
        },
        "scale": {
            "revenue": rev_val,
            "netIncome": ni_val,
            "marketCap": round(float(d["market_cap_basic"])) if d.get("market_cap_basic") is not None else None,
            "sharesOutstanding": round(float(d["total_shares_outstanding_fundamental"])) if d.get("total_shares_outstanding_fundamental") is not None else None,
        },
        "performance": {
            "w1": round(float(d["Perf.W"]), 2) if d.get("Perf.W") is not None else None,
            "m1": round(float(d["Perf.1M"]), 2) if d.get("Perf.1M") is not None else None,
            "m3": round(float(d["Perf.3M"]), 2) if d.get("Perf.3M") is not None else None,
            "m6": round(float(d["Perf.6M"]), 2) if d.get("Perf.6M") is not None else None,
            "ytd": round(float(d["Perf.YTD"]), 2) if d.get("Perf.YTD") is not None else None,
            "y1": round(float(d["Perf.Y"]), 2) if d.get("Perf.Y") is not None else None,
            "y5": round(float(d["Perf.5Y"]), 2) if d.get("Perf.5Y") is not None else None,
            "high52w": h52,
            "low52w": l52,
            "range52wPercent": range52,
            "avgVol10d": round(float(d["average_volume_10d_calc"])) if d.get("average_volume_10d_calc") is not None else None,
            "avgVol30d": round(float(d["average_volume_30d_calc"])) if d.get("average_volume_30d_calc") is not None else None,
            "volatilityW": round(float(d["Volatility.W"]), 2) if d.get("Volatility.W") is not None else None,
            "volatilityM": round(float(d["Volatility.M"]), 2) if d.get("Volatility.M") is not None else None,
        },
        "technicals": {
            "recommendScore": round(float(rec_score), 2) if rec_score is not None else None,
            "recommendText": rec_text,
            "recommendColor": rec_color,
            "beta": round(float(d["beta_1_year"]), 2) if d.get("beta_1_year") is not None else None,
            **tech_eval
        },
        "updatedAt": int(time.time() * 1000)
    }





def sync_to_turso_http(cache_dict):
    turso_url = os.environ.get("TURSO_DATABASE_URL", "").strip()
    turso_token = os.environ.get("TURSO_AUTH_TOKEN", "").strip()

    if not turso_url:
        return

    endpoint = turso_url.replace("libsql://", "https://")
    if not endpoint.startswith("http"):
        endpoint = "https://" + endpoint
    pipeline_url = endpoint.rstrip("/") + "/v2/pipeline"

    print(f"☁️ Đang đồng bộ lên Turso Cloud ({endpoint})...")

    requests_payload = [
        {
            "type": "execute",
            "stmt": {
                "sql": """CREATE TABLE IF NOT EXISTS fundamentals_cache (
                    symbol TEXT PRIMARY KEY,
                    data TEXT NOT NULL,
                    updated_at INTEGER NOT NULL
                );"""
            }
        },
        {
            "type": "execute",
            "stmt": {
                "sql": "DELETE FROM fundamentals_cache;"
            }
        }
    ]

    now_ts = int(time.time() * 1000)
    for sym, data_obj in cache_dict.items():
        if sym.startswith("_"):
            continue
        requests_payload.append({
            "type": "execute",
            "stmt": {
                "sql": "INSERT INTO fundamentals_cache (symbol, data, updated_at) VALUES (?, ?, ?);",
                "args": [
                    {"type": "text", "value": sym},
                    {"type": "text", "value": json.dumps(data_obj, ensure_ascii=False)},
                    {"type": "integer", "value": str(now_ts)}
                ]
            }
        })

    CHUNK_SIZE = 100
    try:
        for i in range(0, len(requests_payload), CHUNK_SIZE):
            chunk = requests_payload[i:i + CHUNK_SIZE]
            req_data = json.dumps({"requests": chunk}).encode("utf-8")
            req = urllib.request.Request(
                pipeline_url,
                data=req_data,
                headers={
                    "Authorization": f"Bearer {turso_token}",
                    "Content-Type": "application/json"
                }
            )
            with urlopen_safe(req, timeout=15) as resp:
                resp.read()
        print("✅ Đã xoá dữ liệu cũ và ghi đè dữ liệu mới nhất lên Turso Cloud thành công!")
    except Exception as e:
        print(f"⚠️ Cảnh báo đồng bộ Turso HTTP: {e}")

def sync_to_local_sqlite(cache_dict):
    db_file = DATA_DIR / "stock.db"
    print(f"🏠 Chế độ DB_MODE=local: Đang đồng bộ vào SQLite cục bộ ({db_file})...")
    if not DATA_DIR.exists():
        try:
            DATA_DIR.mkdir(parents=True, exist_ok=True)
        except Exception:
            pass
    try:
        conn = sqlite3.connect(str(db_file))
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS fundamentals_cache (
                symbol TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                updated_at INTEGER NOT NULL
            );
        """)
        cursor.execute("DELETE FROM fundamentals_cache;")
        now_ts = int(time.time() * 1000)
        items_to_insert = [
            (sym, json.dumps(data_obj, ensure_ascii=False), now_ts)
            for sym, data_obj in cache_dict.items()
            if not sym.startswith("_")
        ]
        cursor.executemany(
            "INSERT INTO fundamentals_cache (symbol, data, updated_at) VALUES (?, ?, ?);",
            items_to_insert
        )
        conn.commit()
        conn.close()
        print(f"✅ Đã xoá dữ liệu cũ và ghi đè {len(items_to_insert)} mã vào SQLite cục bộ (data/stock.db) thành công!")
    except Exception as e:
        print(f"⚠️ Cảnh báo đồng bộ SQLite cục bộ: {e}")

def main():
    print("\n==================================================================")
    print("🐍 PYTHON BACKGROUND SYNC: ĐỒNG BỘ ĐỊNH GIÁ, VĨ MÔ & BCTC (LOCAL JSON)")
    print("==================================================================")
    t0 = time.time()

    symbols = load_symbols()
    print(f"📋 Danh sách {len(symbols)} mã cần đồng bộ: {', '.join(symbols)}\n")

    if not symbols:
        print("ℹ️ Không có mã nào.")
        return

    # Đọc cache cũ dự phòng
    old_cache = {}
    if CACHE_FILE.exists():
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                old_cache = json.load(f)
        except Exception:
            old_cache = {}

    print("🌐 Đang truy vấn TradingView Scanner API...")
    raw = None
    try:
        raw = fetch_tradingview(symbols)
    except Exception as e:
        print(f"⚠️ Không thể fetch trực tiếp từ TradingView (sử dụng dữ liệu cache có sẵn nếu có): {e}")

    new_cache = {}
    count = 0
    if raw and "data" in raw:
        items = raw.get("data", [])
        for row in items:
            norm = normalize_row(row)
            if norm["symbol"]:
                new_cache[norm["symbol"]] = norm
                count += 1

    # Nếu mã nào chưa fetch được từ mạng, sử dụng dữ liệu từ cache cũ nhưng cập nhật lại công thức mới
    for s in symbols:
        if s not in new_cache and s in old_cache and not s.startswith("_"):
            item = old_cache[s]
            # Bổ sung tính toán định giá cập nhật
            val_eval = engine.evaluate({
                "close": item.get("close"),
                "eps": item.get("profitability", {}).get("eps"),
                "pb": item.get("valuation", {}).get("pb"),
                "bvps": item.get("valuation", {}).get("bvps"),
                "dps": item.get("dividends", {}).get("dps", 0),
                "revenue": item.get("scale", {}).get("revenue"),
                "netIncome": item.get("scale", {}).get("netIncome"),
                "totalAssets": item.get("health", {}).get("totalAssets"),
                "totalDebt": item.get("health", {}).get("totalDebt"),
                "ebitda": item.get("health", {}).get("ebitda"),
                "cfo": item.get("dividends", {}).get("fcf"),
                "shares": item.get("scale", {}).get("sharesOutstanding"),
                "roe": item.get("profitability", {}).get("roe"),
                "netMargin": item.get("profitability", {}).get("netMargin"),
                "high52w": item.get("performance", {}).get("high52w"),
                "low52w": item.get("performance", {}).get("low52w"),
                "recommendScore": item.get("technicals", {}).get("recommendScore"),
                "beta": item.get("technicals", {}).get("beta")
            })
            item.setdefault("valuation", {}).update({
                "bvps": val_eval["bvps"],
                "grahamNumber": val_eval["grahamNumber"],
                "marginOfSafetyGraham": val_eval["marginOfSafetyGraham"],
                "ddmTarget": val_eval["ddmTarget"],
                "peTarget": val_eval["peTarget"],
                "pbTarget": val_eval["pbTarget"],
                "evEbitdaFairPrice": val_eval["evEbitdaFairPrice"],
                "pcfFairPrice": val_eval["pcfFairPrice"],
                "psFairPrice": val_eval["psFairPrice"],
                "fairValue": val_eval["fairValue"],
                "consensusFairValue": val_eval["consensusFairValue"],
                "marginOfSafety": val_eval["marginOfSafety"],
                "marginOfSafetyFairValue": val_eval["marginOfSafetyFairValue"],
                "valuationRating": val_eval["valuationRating"],
                "valuationRatingText": val_eval["valuationRatingText"],
                "valuationRatingBadge": val_eval["valuationRatingBadge"],
                "validModelsCount": val_eval["validModelsCount"]
            })
            item["dupont"] = val_eval["dupont"]
            item.setdefault("technicals", {}).update(val_eval["technicals"])
            item.get("technicals", {}).pop("rsi", None)
            item.get("technicals", {}).pop("macd", None)
            item.get("technicals", {}).pop("macdSignal", None)
            item["updatedAt"] = int(time.time() * 1000)
            new_cache[s] = item
            count += 1

    # Nếu đồng bộ một phần (partial sync), merge với cache cũ để không làm mất mã đã có
    if len(sys.argv) > 1:
        merged_cache = {**old_cache, **new_cache}
        # Cập nhật danh sách supported_stocks.json nếu có mã mới
        if SUPPORTED_FILE.exists():
            try:
                with open(SUPPORTED_FILE, "r", encoding="utf-8") as f:
                    sup_data = json.load(f)
                cur_syms = sup_data.get("symbols", []) if isinstance(sup_data, dict) else (sup_data if isinstance(sup_data, list) else [])
                updated = False
                for s in symbols:
                    if s not in cur_syms:
                        cur_syms.append(s)
                        updated = True
                if updated:
                    with open(SUPPORTED_FILE, "w", encoding="utf-8") as f:
                        json.dump({"symbols": cur_syms}, f, ensure_ascii=False, indent=2)
            except Exception:
                pass
        new_cache = merged_cache

    # Lưu metadata đồng bộ vào fundamentals_cache
    valid_count = len([k for k in new_cache if not k.startswith("_")])
    new_cache["_meta"] = {
        "lastSyncedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "syncedCount": valid_count,
        "symbolsCount": valid_count
    }

    if not DATA_DIR.exists():
        try:
            DATA_DIR.mkdir(parents=True, exist_ok=True)
        except Exception:
            pass
    if not FINANCIALS_DIR.exists():
        try:
            FINANCIALS_DIR.mkdir(parents=True, exist_ok=True)
        except Exception:
            pass

    # Ghi file data/fundamentals_cache.json (Trách nhiệm duy nhất của sync_fundamentals)
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(new_cache, f, ensure_ascii=False, indent=2)
    print(f"📁 Đã ghi cache định giá & xung lực kỹ thuật: {CACHE_FILE}")

    # Đồng bộ vào DB nếu được cấu hình
    db_mode = os.environ.get("DB_MODE", "").strip().lower()
    turso_url = os.environ.get("TURSO_DATABASE_URL", "").strip()
    is_ci = os.environ.get("GITHUB_ACTIONS") == "true" or os.environ.get("CI") == "true"

    if (db_mode == "turso" or (is_ci and db_mode != "local")) and turso_url:
        sync_to_turso_http(new_cache)
    else:
        sync_to_local_sqlite(new_cache)

    elapsed = round(time.time() - t0, 2)
    print(f"\n✨ HOÀN TẤT ĐỒNG BỘ: {valid_count} mã trong {elapsed}s.")
    print("🔍 Toàn bộ dữ liệu đã sẵn sàng dưới dạng LOCAL JSON để kiểm tra!")
    print("==================================================================\n")

if __name__ == "__main__":
    main()
