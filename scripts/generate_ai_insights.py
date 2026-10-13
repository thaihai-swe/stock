#!/usr/bin/env python3
"""
scripts/generate_ai_insights.py
Bộ sinh dữ liệu phân tích AI chạy nền (Background AI Insights Generator):
Được gọi tự động bởi GitHub Actions hoặc scripts/run_pipeline.py theo 3 chu kỳ:
1. --scope macro        : Sinh bản tin chiến lược vĩ mô CIO cho data/macro_valuation.json (Weekly).
2. --scope daily_market : Sinh nhịp đập thị trường EOD cho data/ai_insights_cache.json (Daily EOD).
3. --scope stocks       : Sinh phân tích định giá chuyên sâu cho data/financials/<MÃ>.json (Quarterly/On-demand).
"""

import os
import sys
import json
import argparse
import datetime
from pathlib import Path
from typing import List, Optional

CURRENT_DIR = Path(__file__).resolve().parent
ROOT_DIR = CURRENT_DIR.parent
DATA_DIR = ROOT_DIR / "data"
FINANCIALS_DIR = DATA_DIR / "financials"
MACRO_FILE = DATA_DIR / "macro_valuation.json"
AI_CACHE_FILE = DATA_DIR / "ai_insights_cache.json"
FUNDAMENTALS_FILE = DATA_DIR / "fundamentals_cache.json"

sys.path.insert(0, str(CURRENT_DIR))

from lib.ai_service import ai_service


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
            # 1. Ghi vào macro_valuation.json (phục vụ 0ms trực tiếp tại tab Vĩ Mô)
            macro_data["weeklyPulse"] = pulse_data
            with open(MACRO_FILE, "w", encoding="utf-8") as f:
                json.dump(macro_data, f, ensure_ascii=False, indent=2)

            # 2. Ghi bản sao lưu trữ vào data/ai_insights_cache.json
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


def generate_stocks_insights(symbols: List[str], dry_run: bool = False, model: Optional[str] = None, provider: Optional[str] = None):
    """Sinh báo cáo phân tích định giá chuyên sâu, tin tức NLP, pháp y BCTC và hội tụ định giá cho từng mã cổ phiếu."""
    print(f"\n🏢 [AI STOCK INTELLIGENCE] Đang sinh báo cáo định giá chuyên sâu cho {len(symbols)} mã...")
    count = 0
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    for sym in symbols:
        sym_clean = sym.strip().upper()
        fin_path = FINANCIALS_DIR / f"{sym_clean}.json"
        if not fin_path.exists():
            continue

        try:
            with open(fin_path, "r", encoding="utf-8") as f:
                fin_data = json.load(f)

            # 1. CFA Thesis Deep Dive
            val_eval = fin_data.get("valuationMultiples") or fin_data.get("valuation", {})
            deep_dive = ai_service.generate_stock_deepdive(sym_clean, fin_data, val_eval, model=model, provider=provider)
            deep_dive["updatedAt"] = now_iso

            # 2. Semantic News NLP & Catalyst Tracker
            news_data = fin_data.get("newsDigest", {})
            news_nlp = ai_service.generate_news_sentiment_analysis(sym_clean, news_data, model=model, provider=provider)
            news_nlp["updatedAt"] = now_iso

            # 3. Forensic Accounting & Earnings Quality Explainer
            forensic_data = {
                "beneishMScore": fin_data.get("beneishMScore", {}),
                "altmanZ": fin_data.get("healthScore", {}).get("altmanZ", {}),
                "forensicAnalysis": fin_data.get("forensicAnalysis", {})
            }
            dupont_data = fin_data.get("extendedDupont", {})
            forensic_comment = ai_service.generate_forensic_audit_comment(sym_clean, forensic_data, dupont_data=dupont_data, model=model, provider=provider)
            forensic_comment["updatedAt"] = now_iso

            # 4. Valuation Convergence & Sensitivity Interpreter
            val_convergence = ai_service.generate_valuation_convergence_comment(sym_clean, val_eval, model=model, provider=provider)
            val_convergence["updatedAt"] = now_iso

            if dry_run:
                print(f"   [DRY-RUN] {sym_clean}: {deep_dive.get('recommendation')} | News: {news_nlp.get('overallSentiment')} | Audit: {forensic_comment.get('auditVerdict')}")
            else:
                fin_data["aiDeepDive"] = deep_dive
                if not isinstance(fin_data.get("newsDigest"), dict):
                    fin_data["newsDigest"] = {}
                fin_data["newsDigest"]["aiNewsAnalysis"] = news_nlp

                if not isinstance(fin_data.get("forensicAnalysis"), dict):
                    fin_data["forensicAnalysis"] = {}
                fin_data["forensicAnalysis"]["aiAuditComment"] = forensic_comment

                if not isinstance(fin_data.get("valuationMultiples"), dict):
                    fin_data["valuationMultiples"] = {}
                fin_data["valuationMultiples"]["aiConvergence"] = val_convergence

                with open(fin_path, "w", encoding="utf-8") as f:
                    json.dump(fin_data, f, ensure_ascii=False, indent=2)
                count += 1
                print(f"   ✓ {sym_clean}: Cập nhật CFA Thesis, News NLP, Forensic Audit & Valuation Convergence.")
        except Exception as e:
            print(f"⚠️ Lỗi khi sinh AI Insights cho {sym_clean}: {e}")

    if not dry_run:
        print(f"✅ Đã cập nhật trọn bộ AI Intelligence cho {count}/{len(symbols)} mã cổ phiếu.")


def main():
    parser = argparse.ArgumentParser(description="Bộ Sinh Dữ Liệu Phân Tích AI Chạy Nền")
    parser.add_argument(
        "--scope", "-s",
        choices=["macro", "weekly_market", "weekly", "stocks", "all"],
        default="all",
        help="Phạm vi sinh dữ liệu: macro (vĩ mô CIO), weekly_market (nhịp đập cuối tuần), weekly (cả vĩ mô + nhịp đập tuần), stocks (BCTC từng mã), all (toàn bộ)"
    )
    parser.add_argument(
        "--symbols",
        help="Danh sách mã cổ phiếu (phân tách bởi dấu phẩy, ví dụ: HPG,PNJ)",
        default=None
    )
    parser.add_argument(
        "--model", "-m",
        help="Chỉ định mô hình AI cụ thể (ví dụ: gemini-1.5-flash, gemini-1.5-pro, gemini-2.0-flash, gpt-4o-mini)",
        default=None
    )
    parser.add_argument(
        "--gemini-model",
        help="Bí danh chỉ định mô hình Google Gemini (ví dụ: gemini-1.5-flash, gemini-1.5-pro, gemini-2.0-flash)",
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
    print(f"📌 Phạm vi (Scope): [{args.scope.upper()}] | Provider: [{status['activeProvider'].upper()}]")
    print(f"🌟 Gemini Model:   [{status['geminiModel']}] | OpenAI Model: [{status['openaiModel']}]")
    if chosen_model:
        print(f"🎯 CLI Model Ghi Đè: [{chosen_model}]")
    print("==================================================================")

    if args.scope == "macro":
        generate_macro_insights(dry_run=args.dry_run, model=chosen_model, provider=args.provider)
    elif args.scope == "weekly_market":
        generate_weekly_market_insights(dry_run=args.dry_run, model=chosen_model, provider=args.provider)
    elif args.scope == "weekly":
        generate_macro_insights(dry_run=args.dry_run, model=chosen_model, provider=args.provider)
        generate_weekly_market_insights(dry_run=args.dry_run, model=chosen_model, provider=args.provider)
    elif args.scope == "stocks":
        generate_stocks_insights(symbols, dry_run=args.dry_run, model=chosen_model, provider=args.provider)
    elif args.scope == "all":
        generate_macro_insights(dry_run=args.dry_run, model=chosen_model, provider=args.provider)
        generate_weekly_market_insights(dry_run=args.dry_run, model=chosen_model, provider=args.provider)
        generate_stocks_insights(symbols, dry_run=args.dry_run, model=chosen_model, provider=args.provider)

    print("\n✨ Hoàn tất tác vụ sinh AI Insights chạy nền!")


if __name__ == "__main__":
    main()
