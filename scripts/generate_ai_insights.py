#!/usr/bin/env python3
"""
scripts/generate_ai_insights.py
Bộ sinh dữ liệu phân tích AI chạy nền (Background AI Insights Generator):
Được gọi tự động bởi GitHub Actions hoặc scripts/run_pipeline.py theo các chu kỳ:
1. --scope macro         : Sinh bản tin chiến lược vĩ mô CIO cho data/macro_valuation.json (Weekly).
2. --scope weekly_market : Sinh nhịp đập thị trường cuối tuần cho data/macro_valuation.json (Weekly).
3. --scope portfolio     : Sinh báo cáo sức khỏe danh mục & chịu tải vĩ mô cho data/portfolio_ai_insights.json (Weekly/On-demand).
4. --scope stocks        : Sinh phân tích định giá tích hợp 5-trong-1 (DeepDive, News, Audit, Convergence, Dividend) (Weekly Delta/On-demand).
5. --scope weekly        : Chạy toàn diện bộ tuần (Macro + Weekly Market + Portfolio + Stocks Delta).
"""

import os
import sys
import json
import time
import sqlite3
import argparse
import datetime
from pathlib import Path
from typing import List, Optional, Tuple, Dict, Any

CURRENT_DIR = Path(__file__).resolve().parent
ROOT_DIR = CURRENT_DIR.parent
DATA_DIR = ROOT_DIR / "data"
FINANCIALS_DIR = DATA_DIR / "financials"
MACRO_FILE = DATA_DIR / "macro_valuation.json"
AI_CACHE_FILE = DATA_DIR / "ai_insights_cache.json"
FUNDAMENTALS_FILE = DATA_DIR / "fundamentals_cache.json"
PORTFOLIO_AI_FILE = DATA_DIR / "portfolio_ai_insights.json"
DB_FILE = DATA_DIR / "stock.db"

sys.path.insert(0, str(CURRENT_DIR))

from lib.ai_service import ai_service


def get_active_portfolio_and_holdings(user_id: str = "demo") -> Tuple[List[Dict[str, Any]], float]:
    """Đọc danh mục nắm giữ thực tế và số dư tiền mặt của user_id từ SQLite stock.db."""
    if not DB_FILE.exists():
        return [], 0.0

    try:
        conn = sqlite3.connect(str(DB_FILE))
        cur = conn.cursor()

        # 1. Đọc các lệnh mua còn khối lượng nắm giữ (remaining_qty > 0) của user_id
        cur.execute("""
            SELECT symbol, SUM(remaining_qty), SUM(remaining_qty * cost_per_share)
            FROM buy_orders
            WHERE remaining_qty > 0 AND (user_id = ? OR (? = 'demo' AND (user_id IS NULL OR user_id = '')))
            GROUP BY symbol
        """, (user_id, user_id))
        rows = cur.fetchall()

        prices_map = {}
        if FUNDAMENTALS_FILE.exists():
            try:
                with open(FUNDAMENTALS_FILE, "r", encoding="utf-8") as f:
                    prices_map = json.load(f)
            except Exception:
                pass

        holdings = []
        total_mkt_val = 0.0
        for r in rows:
            sym = str(r[0]).strip().upper()
            qty = int(r[1] or 0)
            cost = float(r[2] or 0.0)
            if qty <= 0:
                continue

            avg_cost = round(cost / qty) if qty > 0 else 0
            f_info = prices_map.get(sym, {})
            cur_price = f_info.get("close") or f_info.get("price") or avg_cost
            mkt_val = qty * cur_price
            total_mkt_val += mkt_val

            holdings.append({
                "symbol": sym,
                "holdingQty": qty,
                "shares": qty,
                "avgCost": avg_cost,
                "totalCost": cost,
                "currentPrice": cur_price,
                "marketValue": mkt_val,
                "beta": f_info.get("beta") or 1.05,
                "sector": f_info.get("sector") or "Khác"
            })

        for h in holdings:
            h["weightPct"] = round((h["marketValue"] / total_mkt_val * 100), 1) if total_mkt_val > 0 else 0.0
            h["unrealizedPLPct"] = round(((h["currentPrice"] - h["avgCost"]) / h["avgCost"] * 100), 2) if h["avgCost"] > 0 else 0.0

        # 2. Đọc số dư tiền mặt từ app_settings của user_id
        cash_balance = 0.0
        try:
            cur.execute("""
                SELECT value FROM app_settings 
                WHERE key = 'cash_balance' AND (user_id = ? OR (? = 'demo' AND (user_id IS NULL OR user_id = '')))
                LIMIT 1
            """, (user_id, user_id))
            c_row = cur.fetchone()
            if c_row and c_row[0]:
                cash_balance = float(c_row[0])
            else:
                # Fallback sang cấu hình settings JSON nếu có
                cur.execute("""
                    SELECT value FROM app_settings 
                    WHERE key = 'settings' AND (user_id = ? OR (? = 'demo' AND (user_id IS NULL OR user_id = '')))
                    LIMIT 1
                """, (user_id, user_id))
                s_row = cur.fetchone()
                if s_row and s_row[0]:
                    s_data = json.loads(s_row[0])
                    cash_balance = float(s_data.get("cashBalance") or 0.0)
        except Exception:
            pass

        conn.close()
        return holdings, cash_balance
    except Exception as e:
        print(f"⚠️ Không thể đọc portfolio của user '{user_id}' từ SQLite: {e}")
        return [], 0.0


def get_priority_symbols(all_symbols: List[str]) -> List[str]:
    """Phân tầng ưu tiên: Danh mục thực tế -> Watchlist -> Mã khác."""
    holdings_syms = set()
    watchlist_syms = set()

    if DB_FILE.exists():
        try:
            conn = sqlite3.connect(str(DB_FILE))
            cur = conn.cursor()
            cur.execute("SELECT DISTINCT symbol FROM buy_orders WHERE remaining_qty > 0")
            holdings_syms = {str(r[0]).strip().upper() for r in cur.fetchall() if r[0]}

            cur.execute("SELECT DISTINCT symbol FROM watchlist")
            watchlist_syms = {str(r[0]).strip().upper() for r in cur.fetchall() if r[0]}
            conn.close()
        except Exception:
            pass

    t1 = [s for s in all_symbols if s in holdings_syms]
    t2 = [s for s in all_symbols if s in watchlist_syms and s not in holdings_syms]
    t3 = [s for s in all_symbols if s not in holdings_syms and s not in watchlist_syms]

    prioritized = t1 + t2 + t3
    return prioritized


def is_ai_stale(fin_data: Dict[str, Any], max_days: int = 6) -> bool:
    """Kiểm tra xem dữ liệu AI cổ phiếu đã quá hạn cần cập nhật hay chưa."""
    # Kiểm tra cả deep dive và dividend audit
    updated_at_str = (
        fin_data.get("aiDeepDive", {}).get("updatedAt") or
        fin_data.get("aiDividendAudit", {}).get("updatedAt") or
        fin_data.get("valuationMultiples", {}).get("aiConvergence", {}).get("updatedAt")
    )
    if not updated_at_str:
        return True

    try:
        updated_dt = datetime.datetime.fromisoformat(updated_at_str.replace("Z", "+00:00"))
        now = datetime.datetime.now(datetime.timezone.utc)
        diff = now - updated_dt
        return diff.total_seconds() > (max_days * 86400)
    except Exception:
        return True


def generate_macro_insights(dry_run: bool = False, model: Optional[str] = None, provider: Optional[str] = None):
    """Sinh bản tin chiến lược vĩ mô CIO hàng tuần."""
    print("\n🌐 [AI MACRO STRATEGIST] Đang cập nhật báo cáo vĩ mô CIO...")
    if not MACRO_FILE.exists():
        print(f"⚠️ Không tìm thấy file {MACRO_FILE}. Bỏ qua.")
        return

    try:
        with open(MACRO_FILE, "r", encoding="utf-8") as f:
            macro_data = json.load(f)

        briefing = ai_service.generate_macro_briefing(macro_data, model=model, provider=provider)
        briefing["updatedAt"] = datetime.datetime.now(datetime.timezone.utc).isoformat()

        # Sinh phân tích dẫn truyền vĩ mô vào ngành (Sector Transmission)
        sector_trans = ai_service.generate_sector_transmission_analysis(
            macro_data,
            macro_data.get("sectorRotation", {}) or macro_data.get("dualMatrix", {}),
            model=model,
            provider=provider
        )
        sector_trans["updatedAt"] = datetime.datetime.now(datetime.timezone.utc).isoformat()

        if dry_run:
            print(f"   [DRY-RUN] Headline: {briefing.get('headline')}")
            print(f"   [DRY-RUN] Sector Transmission: {sector_trans.get('transmissionHeadline')}")
        else:
            macro_data["aiInsight"] = briefing
            macro_data["sectorTransmission"] = sector_trans
            with open(MACRO_FILE, "w", encoding="utf-8") as f:
                json.dump(macro_data, f, ensure_ascii=False, indent=2)
            print(f"✅ Đã ghi nhận aiInsight & sectorTransmission thành công vào {MACRO_FILE}.")
    except Exception as e:
        print(f"⚠️ Lỗi khi sinh AI Macro Insights: {e}")


def generate_weekly_market_insights(dry_run: bool = False, model: Optional[str] = None, provider: Optional[str] = None):
    """Sinh bản tin nhịp đập thị trường cuối tuần (Weekly Market Pulse & Wrap)."""
    print("\n📅 [AI WEEKLY MARKET PULSE] Đang sinh bản tin nhịp đập thị trường cuối tuần...")
    if not MACRO_FILE.exists():
        print(f"⚠️ Không tìm thấy file {MACRO_FILE}. Vui lòng chạy fetch_macro_valuation.py trước.")
        return

    try:
        with open(MACRO_FILE, "r", encoding="utf-8") as f:
            macro_data = json.load(f)

        market_data = macro_data.get("marketIndex", {})
        sector_data = macro_data.get("sectorRotation", {}) or macro_data.get("dualMatrix", {})

        pulse_data = ai_service.generate_weekly_market_pulse(
            market_data=market_data,
            macro_data=macro_data,
            sector_data=sector_data,
            model=model,
            provider=provider
        )
        pulse_data["updatedAt"] = datetime.datetime.now(datetime.timezone.utc).isoformat()

        if dry_run:
            print(f"   [DRY-RUN] Weekly Pulse Headline: {pulse_data.get('pulseHeadline')}")
        else:
            macro_data["weeklyPulse"] = pulse_data
            with open(MACRO_FILE, "w", encoding="utf-8") as f:
                json.dump(macro_data, f, ensure_ascii=False, indent=2)

            cache = {}
            if AI_CACHE_FILE.exists():
                try:
                    with open(AI_CACHE_FILE, "r", encoding="utf-8") as f:
                        cache = json.load(f)
                except Exception:
                    pass
            cache["weeklyPulse"] = pulse_data
            if "dailyPulse" in cache:
                del cache["dailyPulse"]
            with open(AI_CACHE_FILE, "w", encoding="utf-8") as f:
                json.dump(cache, f, ensure_ascii=False, indent=2)

            print(f"✅ Đã ghi nhận weeklyPulse thành công vào {MACRO_FILE} và {AI_CACHE_FILE}.")
    except Exception as e:
        print(f"⚠️ Lỗi khi sinh Weekly Market Pulse: {e}")


def init_portfolio_ai_table():
    """Tạo bảng portfolio_ai_insights trong SQLite nếu chưa có."""
    if not DB_FILE.exists():
        return
    try:
        conn = sqlite3.connect(str(DB_FILE))
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS portfolio_ai_insights (
                user_id TEXT PRIMARY KEY,
                health_score TEXT,
                health_verdict TEXT,
                portfolio_beta REAL,
                cash_weight_pct REAL,
                report_json TEXT NOT NULL,
                status TEXT DEFAULT 'success',
                updated_at TEXT NOT NULL
            );
        """)
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"⚠️ Lỗi khởi tạo bảng portfolio_ai_insights: {e}")


def save_portfolio_ai_to_db(user_id: str, report: Dict[str, Any]):
    """Lưu báo cáo phân tích danh mục vào bảng portfolio_ai_insights."""
    if not DB_FILE.exists():
        return
    try:
        init_portfolio_ai_table()
        conn = sqlite3.connect(str(DB_FILE))
        cur = conn.cursor()
        report_json = json.dumps(report, ensure_ascii=False)
        health_score = report.get("healthScore", "B+")
        health_verdict = report.get("healthVerdict", "")
        portfolio_beta = float(report.get("portfolioBeta") or 1.0)
        cash_weight_pct = float(report.get("cashWeightPct") or 0.0)
        status = report.get("status", "success")
        updated_at = report.get("updatedAt") or datetime.datetime.now(datetime.timezone.utc).isoformat()

        cur.execute("""
            INSERT OR REPLACE INTO portfolio_ai_insights
            (user_id, health_score, health_verdict, portfolio_beta, cash_weight_pct, report_json, status, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        """, (user_id, health_score, health_verdict, portfolio_beta, cash_weight_pct, report_json, status, updated_at))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"⚠️ Lỗi lưu portfolio_ai_insights vào DB cho user '{user_id}': {e}")


def get_portfolio_ai_updated_at(user_id: str) -> Optional[str]:
    """Lấy updatedAt của báo cáo trong DB."""
    if not DB_FILE.exists():
        return None
    try:
        conn = sqlite3.connect(str(DB_FILE))
        cur = conn.cursor()
        cur.execute("SELECT updated_at FROM portfolio_ai_insights WHERE user_id = ? LIMIT 1", (user_id,))
        row = cur.fetchone()
        conn.close()
        return row[0] if row else None
    except Exception:
        return None


def get_all_active_users() -> List[str]:
    """Lấy danh sách tất cả các user_id có lệnh mua còn số lượng."""
    if not DB_FILE.exists():
        return ["demo"]
    try:
        conn = sqlite3.connect(str(DB_FILE))
        cur = conn.cursor()
        cur.execute("SELECT DISTINCT user_id FROM buy_orders WHERE remaining_qty > 0")
        rows = cur.fetchall()
        users = [str(r[0]).strip() for r in rows if r[0]]
        conn.close()
        return users if users else ["demo"]
    except Exception:
        return ["demo"]


def generate_single_user_portfolio_insights(
    user_id: str,
    macro_data: Dict[str, Any],
    dry_run: bool = False,
    model: Optional[str] = None,
    provider: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Đánh giá sức khỏe danh mục cho 1 user_id duy nhất và lưu DB."""
    print(f"\n🛡️ [AI PORTFOLIO STRESS-TESTER] Đang đánh giá sức khỏe danh mục cho User: [{user_id}]...")
    holdings, cash_balance = get_active_portfolio_and_holdings(user_id=user_id)
    if not holdings and cash_balance <= 0:
        print(f"   ℹ️ User [{user_id}] không có cổ phiếu nắm giữ hoặc số dư tiền mặt. Bỏ qua.")
        return None

    try:
        report = ai_service.generate_portfolio_stress_test(
            holdings=holdings,
            cash_balance=cash_balance,
            macro_data=macro_data,
            model=model,
            provider=provider
        )
        report["userId"] = user_id

        if dry_run:
            print(f"   [DRY-RUN] User [{user_id}] Health Score: {report.get('healthScore')} | {report.get('healthVerdict')}")
            for sc in report.get("stressTestScenarios", []):
                print(f"      - Kịch bản: {sc.get('name')} | Ước tính: {sc.get('estimatedImpactPct')}%")
        else:
            save_portfolio_ai_to_db(user_id, report)
            print(f"✅ Đã ghi nhận báo cáo sức khỏe danh mục vào Database cho User [{user_id}].")
            if user_id == "demo":
                with open(PORTFOLIO_AI_FILE, "w", encoding="utf-8") as f:
                    json.dump(report, f, ensure_ascii=False, indent=2)
                print(f"   ✓ Đã đồng bộ file dự phòng: {PORTFOLIO_AI_FILE}")
        return report
    except Exception as e:
        print(f"⚠️ Lỗi khi sinh AI Portfolio Stress-Tester cho User [{user_id}]: {e}")
        return None


def generate_portfolio_insights(
    user_id: Optional[str] = "demo",
    force: bool = False,
    dry_run: bool = False,
    model: Optional[str] = None,
    provider: Optional[str] = None,
):
    """
    Sinh báo cáo sức khỏe danh mục theo người dùng.
    - user_id cụ thể (vd 'demo'): Sinh cho riêng user đó.
    - user_id == 'all': Batch job quét qua mọi user đang nắm giữ cổ phiếu, chỉ xử lý user quá hạn (>6 ngày) hoặc khi dùng --force.
    """
    macro_data = {}
    if MACRO_FILE.exists():
        try:
            with open(MACRO_FILE, "r", encoding="utf-8") as f:
                macro_data = json.load(f)
        except Exception:
            pass

    target_user = (user_id or "demo").strip()

    if target_user.lower() == "all":
        users = get_all_active_users()
        print(f"\n👥 [BATCH PORTFOLIO AI] Quét danh mục của {len(users)} người dùng...")
        processed_count = 0
        for idx, u in enumerate(users):
            updated_at_str = get_portfolio_ai_updated_at(u)
            if not force and updated_at_str:
                try:
                    dt = datetime.datetime.fromisoformat(updated_at_str.replace("Z", "+00:00"))
                    now = datetime.datetime.now(datetime.timezone.utc)
                    if (now - dt).total_seconds() <= (6 * 86400):
                        print(f"   ℹ️ [{idx+1}/{len(users)}] User [{u}]: AI còn mới (< 6 ngày) -> Bỏ qua.")
                        continue
                except Exception:
                    pass

            generate_single_user_portfolio_insights(
                user_id=u,
                macro_data=macro_data,
                dry_run=dry_run,
                model=model,
                provider=provider
            )
            processed_count += 1
            if idx < len(users) - 1:
                time.sleep(2.0)
        print(f"✅ Hoàn tất Batch Portfolio AI: Đã xử lý {processed_count}/{len(users)} người dùng.")
    else:
        generate_single_user_portfolio_insights(
            user_id=target_user,
            macro_data=macro_data,
            dry_run=dry_run,
            model=model,
            provider=provider
        )


def generate_stocks_insights(
    symbols: List[str],
    force: bool = False,
    dry_run: bool = False,
    model: Optional[str] = None,
    provider: Optional[str] = None,
):
    """
    Sinh báo cáo định giá chuyên sâu tích hợp 5-trong-1:
    (CFA Thesis, News NLP, Forensic Audit, 10-Model Convergence, Dividend Safety).
    - Gom Prompt: 1 request duy nhất / mã cổ phiếu (giảm 75% API calls).
    - Smart Delta: Bỏ qua mã có dữ liệu AI < 6 ngày (trừ khi dùng cờ --force).
    - Pacing: Nghỉ 2.0s giữa các mã để triệt tiêu lỗi Throttling 429.
    """
    ordered_symbols = get_priority_symbols(symbols)
    print(f"\n🏢 [AI STOCK INTELLIGENCE] Bắt đầu xử lý {len(ordered_symbols)} mã (Chế độ: {'FORCE TẤT CẢ' if force else 'SMART DELTA CACHE'})...")

    count = 0
    skipped = 0
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    for idx, sym in enumerate(ordered_symbols):
        sym_clean = sym.strip().upper()
        fin_path = FINANCIALS_DIR / f"{sym_clean}.json"
        if not fin_path.exists():
            continue

        try:
            with open(fin_path, "r", encoding="utf-8") as f:
                fin_data = json.load(f)

            # Smart Delta Cache: Bỏ qua nếu dữ liệu AI còn mới
            if not force and not is_ai_stale(fin_data, max_days=6):
                skipped += 1
                print(f"   ℹ️ [{idx+1}/{len(ordered_symbols)}] {sym_clean}: AI còn mới (< 6 ngày) -> Bỏ qua. Dùng --force nếu muốn làm mới.")
                continue

            print(f"   👉 [{idx+1}/{len(ordered_symbols)}] Đang phân tích AI tích hợp cho {sym_clean}...")

            val_eval = fin_data.get("valuationMultiples") or fin_data.get("valuation", {})
            news_data = fin_data.get("newsDigest", {})
            forensic_data = {
                "beneishMScore": fin_data.get("beneishMScore", {}),
                "altmanZ": fin_data.get("healthScore", {}).get("altmanZ", {}),
                "forensicAnalysis": fin_data.get("forensicAnalysis", {})
            }
            dupont_data = fin_data.get("extendedDupont", {})
            dividend_data = fin_data.get("dividendSustainability", {})

            # GỌI 1 REQUEST TỔNG HỢP DUY NHẤT (5-TRONG-1)
            intel = ai_service.generate_stock_comprehensive_intel(
                symbol=sym_clean,
                fin_data=fin_data,
                val_eval=val_eval,
                news_data=news_data,
                forensic_data=forensic_data,
                dupont_data=dupont_data,
                dividend_data=dividend_data,
                model=model,
                provider=provider
            )

            # Bổ sung timestamp cho từng phân hệ
            for key in ["aiDeepDive", "aiNewsAnalysis", "aiAuditComment", "aiConvergence", "aiDividendAudit"]:
                if key in intel and isinstance(intel[key], dict):
                    intel[key]["updatedAt"] = now_iso

            if dry_run:
                deep = intel.get("aiDeepDive", {})
                div = intel.get("aiDividendAudit", {})
                print(f"      [DRY-RUN] {sym_clean}: Khuyến nghị={deep.get('recommendation')} | Cổ tức={div.get('safetyRating')}")
            else:
                # Ghi vào cấu trúc JSON
                fin_data["aiDeepDive"] = intel.get("aiDeepDive", {})

                if not isinstance(fin_data.get("newsDigest"), dict):
                    fin_data["newsDigest"] = {}
                fin_data["newsDigest"]["aiNewsAnalysis"] = intel.get("aiNewsAnalysis", {})

                if not isinstance(fin_data.get("forensicAnalysis"), dict):
                    fin_data["forensicAnalysis"] = {}
                fin_data["forensicAnalysis"]["aiAuditComment"] = intel.get("aiAuditComment", {})

                if not isinstance(fin_data.get("valuationMultiples"), dict):
                    fin_data["valuationMultiples"] = {}
                fin_data["valuationMultiples"]["aiConvergence"] = intel.get("aiConvergence", {})

                if not isinstance(fin_data.get("dividendSustainability"), dict):
                    fin_data["dividendSustainability"] = {}
                fin_data["dividendSustainability"]["aiDividendAudit"] = intel.get("aiDividendAudit", {})
                fin_data["aiDividendAudit"] = intel.get("aiDividendAudit", {})

                with open(fin_path, "w", encoding="utf-8") as f:
                    json.dump(fin_data, f, ensure_ascii=False, indent=2)

                count += 1
                print(f"      ✓ {sym_clean}: Đã cập nhật 5 phân hệ (Thesis, News, Audit, Convergence, Dividend).")

            # Pacing: Giãn cách 2 giây giữa các mã để triệt tiêu throttling 429
            if idx < len(ordered_symbols) - 1:
                time.sleep(2.0)

        except Exception as e:
            print(f"⚠️ Lỗi khi sinh AI Insights cho {sym_clean}: {e}")

    print(f"✅ Hoàn tất AI Cổ Phiếu: Cập nhật mới {count} mã | Bỏ qua (còn hạn) {skipped} mã.")


def main():
    parser = argparse.ArgumentParser(description="Bộ Sinh Dữ Liệu Phân Tích AI Chạy Nền")
    parser.add_argument(
        "--scope", "-s",
        choices=["macro", "weekly_market", "portfolio", "weekly", "stocks", "all"],
        default="all",
        help="Phạm vi sinh dữ liệu: macro, weekly_market, portfolio, weekly (tuần), stocks, all"
    )
    parser.add_argument(
        "--user-id", "-u",
        help="ID người dùng cho phân tích danh mục (mặc định 'demo', hoặc 'all' cho batch)",
        default="demo"
    )
    parser.add_argument(
        "--symbols",
        help="Danh sách mã cổ phiếu (phân tách bởi dấu phẩy, ví dụ: HPG,PNJ)",
        default=None
    )
    parser.add_argument(
        "--force", "-f",
        action="store_true",
        help="Ép buộc sinh lại AI bỏ qua bộ đệm thời gian Smart Delta Cache"
    )
    parser.add_argument(
        "--model", "-m",
        help="Chỉ định mô hình AI cụ thể (ví dụ: gemini-1.5-flash, gemini-2.0-flash, gpt-4o-mini)",
        default=None
    )
    parser.add_argument(
        "--gemini-model",
        help="Bí danh chỉ định mô hình Google Gemini",
        default=None
    )
    parser.add_argument(
        "--provider", "-p",
        choices=["auto", "gemini", "openai", "heuristic"],
        help="Nhà cung cấp AI ưu tiên (auto, gemini, openai, heuristic)",
        default=None
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Chạy thử nghiệm kiểm tra output mà không ghi đè file"
    )

    args = parser.parse_args()

    chosen_model = args.gemini_model or args.model
    if chosen_model:
        os.environ["GEMINI_MODEL"] = chosen_model
        ai_service.refresh_env()

    symbols = []
    if args.symbols:
        symbols = [s.strip().upper() for s in args.symbols.split(",") if s.strip()]
    else:
        if FINANCIALS_DIR.exists():
            symbols = sorted([p.stem.upper() for p in FINANCIALS_DIR.glob("*.json") if p.stem and not p.stem.startswith(".")])
        if not symbols:
            symbols = ["HPG", "PNJ", "DXG", "MBB", "VND", "VCB", "VHM", "FPT"]

    status = ai_service.get_status()
    print("==================================================================")
    print("🤖 CHƯƠNG TRÌNH SINH DỮ LIỆU PHÂN TÍCH AI CHẠY NỀN (BACKGROUND AI)")
    print(f"📌 Phạm vi (Scope): [{args.scope.upper()}] | User: [{args.user_id}] | Provider: [{status['activeProvider'].upper()}]")
    print(f"🌟 Gemini Model:   [{status['geminiModel']}] | OpenAI Model: [{status['openaiModel']}]")
    if chosen_model:
        print(f"🎯 CLI Model Ghi Đè: [{chosen_model}]")
    print("==================================================================")

    if args.scope == "macro":
        generate_macro_insights(dry_run=args.dry_run, model=chosen_model, provider=args.provider)
    elif args.scope == "weekly_market":
        generate_weekly_market_insights(dry_run=args.dry_run, model=chosen_model, provider=args.provider)
    elif args.scope == "portfolio":
        generate_portfolio_insights(user_id=args.user_id, force=args.force, dry_run=args.dry_run, model=chosen_model, provider=args.provider)
    elif args.scope == "weekly":
        generate_macro_insights(dry_run=args.dry_run, model=chosen_model, provider=args.provider)
        generate_weekly_market_insights(dry_run=args.dry_run, model=chosen_model, provider=args.provider)
        generate_portfolio_insights(user_id=args.user_id, force=args.force, dry_run=args.dry_run, model=chosen_model, provider=args.provider)
        generate_stocks_insights(symbols, force=args.force, dry_run=args.dry_run, model=chosen_model, provider=args.provider)
    elif args.scope == "stocks":
        generate_stocks_insights(symbols, force=args.force, dry_run=args.dry_run, model=chosen_model, provider=args.provider)
    elif args.scope == "all":
        generate_macro_insights(dry_run=args.dry_run, model=chosen_model, provider=args.provider)
        generate_weekly_market_insights(dry_run=args.dry_run, model=chosen_model, provider=args.provider)
        generate_portfolio_insights(user_id=args.user_id, force=args.force, dry_run=args.dry_run, model=chosen_model, provider=args.provider)
        generate_stocks_insights(symbols, force=args.force, dry_run=args.dry_run, model=chosen_model, provider=args.provider)

    print("\n✨ Hoàn tất tác vụ sinh AI Insights chạy nền!")


if __name__ == "__main__":
    main()

