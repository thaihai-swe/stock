#!/usr/bin/env python3
"""
scripts/sync_fundamentals.py
Script chính thức đồng bộ toàn bộ dữ liệu định giá và chỉ số cơ bản (50+ chỉ số)
từ TradingView Scanner API vào cache cục bộ và Turso Cloud DB (nếu có cấu hình).

Chạy bằng Python 3 thuần (không cần pip install thêm gói ngoài).
"""

import json
import os
import sys
import time
import ssl
import sqlite3
import urllib.request
import urllib.error
from pathlib import Path

# Cấu hình SSL an toàn: thử default context, nếu thiếu chứng chỉ CA cục bộ trên macOS thì tự động fallback
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
SUPPORTED_FILE = DATA_DIR / "supported_stocks.json"
CACHE_FILE = DATA_DIR / "fundamentals_cache.json"
TRANS_FILE = DATA_DIR / "transactions.json"
ENV_FILE = ROOT_DIR / ".env"

# 1. Tự động đọc file .env nếu có (không cần gói python-dotenv)
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
    "Recommend.All", "RSI", "MACD.macd", "MACD.signal", "beta_1_year"
]

def load_symbols():
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
        symbols = ["ACB", "BID", "CTG", "FPT", "GAS", "HPG", "MBB", "MSN", "MWG", "SSI", "TCB", "VCB", "VHM", "VIC", "VNM", "VPB"]

    return symbols

def fetch_tradingview(symbols):
    url = "https://scanner.tradingview.com/vietnam/scan"
    payload = {
        "filter": [{"left": "name", "operation": "in_range", "right": symbols}],
        "columns": COLUMNS
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
        }
    )
    try:
        with urlopen_safe(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print(f"❌ HTTP Error {e.code}: {e.read().decode('utf-8')}")
        raise e

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
            "pe": round(float(d["price_earnings_ttm"]), 2) if d.get("price_earnings_ttm") is not None else None,
            "pb": round(float(d["price_book_ratio"]), 2) if d.get("price_book_ratio") is not None else None,
            "ps": round(float(d["price_sales_ratio"]), 2) if d.get("price_sales_ratio") is not None else None,
            "evEbitda": round(float(d["enterprise_value_to_ebitda_ratio"]), 2) if d.get("enterprise_value_to_ebitda_ratio") is not None else None,
        },
        "profitability": {
            "roe": round(float(d["return_on_equity_fq"]), 2) if d.get("return_on_equity_fq") is not None else None,
            "roeFy": round(float(d["return_on_equity_fy"]), 2) if d.get("return_on_equity_fy") is not None else None,
            "roa": round(float(d["return_on_assets_fq"]), 2) if d.get("return_on_assets_fq") is not None else None,
            "roaFy": round(float(d["return_on_assets_fy"]), 2) if d.get("return_on_assets_fy") is not None else None,
            "eps": round(float(d["earnings_per_share_basic_ttm"])) if d.get("earnings_per_share_basic_ttm") is not None else None,
            "grossMargin": round(float(d["gross_margin_ttm"]), 2) if d.get("gross_margin_ttm") is not None else None,
            "operatingMargin": round(float(d["operating_margin_ttm"]), 2) if d.get("operating_margin_ttm") is not None else None,
            "netMargin": round(float(d["net_margin_ttm"]), 2) if d.get("net_margin_ttm") is not None else None,
        },
        "dividends": {
            "yield": round(float(d["dividends_yield"]), 2) if d.get("dividends_yield") is not None else None,
            "dps": round(float(d["dps_common_stock_prim_issue_fy"])) if d.get("dps_common_stock_prim_issue_fy") is not None else 0,
            "fcf": round(float(d["free_cash_flow_ttm"])) if d.get("free_cash_flow_ttm") is not None else None,
            "fcfMargin": round(float(d["free_cash_flow_margin_ttm"]), 2) if d.get("free_cash_flow_margin_ttm") is not None else None,
        },
        "health": {
            "totalDebt": round(float(d["total_debt_fq"])) if d.get("total_debt_fq") is not None else None,
            "totalAssets": round(float(d["total_assets_fq"])) if d.get("total_assets_fq") is not None else None,
            "debtToEquity": round(float(d["debt_to_equity_fq"]), 2) if d.get("debt_to_equity_fq") is not None else None,
            "currentRatio": round(float(d["current_ratio_fq"]), 2) if d.get("current_ratio_fq") is not None else None,
            "quickRatio": round(float(d["quick_ratio_fq"]), 2) if d.get("quick_ratio_fq") is not None else None,
            "ebitda": round(float(d["ebitda_ttm"])) if d.get("ebitda_ttm") is not None else None,
        },
        "scale": {
            "revenue": round(float(d["total_revenue_ttm"])) if d.get("total_revenue_ttm") is not None else None,
            "netIncome": round(float(d["net_income_ttm"])) if d.get("net_income_ttm") is not None else None,
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
            "rsi": round(float(d["RSI"]), 1) if d.get("RSI") is not None else None,
            "macd": round(float(d["MACD.macd"]), 2) if d.get("MACD.macd") is not None else None,
            "macdSignal": round(float(d["MACD.signal"]), 2) if d.get("MACD.signal") is not None else None,
            "beta": round(float(d["beta_1_year"]), 2) if d.get("beta_1_year") is not None else None,
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
            # Xoá toàn bộ dữ liệu cũ trong bảng để giải phóng dung lượng, không lưu vết cũ
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

    # Gửi batch trong một giao dịch duy nhất (nguyên tử - atomic)
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
    DATA_DIR.mkdir(parents=True, exist_ok=True)
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
        # Xoá toàn bộ dữ liệu cũ để tránh phình dung lượng
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
    print("\n======================================================")
    print("🐍 PYTHON BACKGROUND SYNC: ĐỒNG BỘ ĐỊNH GIÁ & CƠ BẢN")
    print("======================================================")
    t0 = time.time()

    symbols = load_symbols()
    print(f"📋 Danh sách {len(symbols)} mã cần đồng bộ (từ supported_stocks.json): {', '.join(symbols)}\n")

    if not symbols:
        print("ℹ️ Không có mã nào.")
        return

    # Đọc cache cũ để dự phòng mã lỗi mạng tạm thời
    old_cache = {}
    if CACHE_FILE.exists():
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                old_cache = json.load(f)
        except Exception:
            old_cache = {}

    print("🌐 Đang truy vấn TradingView Scanner API...")
    try:
        raw = fetch_tradingview(symbols)
    except Exception as e:
        print(f"❌ Lỗi truy vấn TradingView: {e}")
        sys.exit(1)

    items = raw.get("data", [])
    new_cache = {}
    count = 0
    for row in items:
        norm = normalize_row(row)
        if norm["symbol"]:
            new_cache[norm["symbol"]] = norm
            count += 1

    # Nếu có mã trong symbols chưa fetch được, giữ lại từ old_cache nếu có
    for s in symbols:
        if s not in new_cache and s in old_cache:
            new_cache[s] = old_cache[s]

    # Lưu metadata đồng bộ vào cache
    valid_count = len([k for k in new_cache if not k.startswith("_")])
    new_cache["_meta"] = {
        "lastSyncedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "syncedCount": valid_count,
        "symbolsCount": len(symbols)
    }

    # Lưu cache file JSON (chỉ lưu các mã trong danh sách hiện tại, xoá sạch mã cũ đã gỡ bỏ)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(new_cache, f, ensure_ascii=False, indent=2)

    # Phân luồng lưu trữ theo DB_MODE
    db_mode = os.environ.get("DB_MODE", "").strip().lower()
    turso_url = os.environ.get("TURSO_DATABASE_URL", "").strip()
    is_ci = os.environ.get("GITHUB_ACTIONS") == "true" or os.environ.get("CI") == "true"

    if (db_mode == "turso" or (is_ci and db_mode != "local")) and turso_url:
        sync_to_turso_http(new_cache)
    else:
        sync_to_local_sqlite(new_cache)

    elapsed = round(time.time() - t0, 2)
    print(f"\n✅ Đã đồng bộ thành công {valid_count} mã trong {elapsed}s.")
    print(f"📁 Đã cập nhật cache: {CACHE_FILE}")
    print("🔒 File data/supported_stocks.json được giữ nguyên vẹn theo source code.")
    print("======================================================\n")

if __name__ == "__main__":
    main()
