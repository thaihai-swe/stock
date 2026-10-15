#!/usr/bin/env python3
"""
scripts/run_pipeline.py
Bộ điều phối Pipeline Thống Nhất (Unified Data Pipeline Orchestrator):
Quản lý chu kỳ thu thập dữ liệu tài chính & vĩ mô chuẩn hóa theo 4 tần suất:
1. --cadence daily     : Tác vụ EOD sau giờ đóng cửa (TradingView Scanner + Nhiệt kế VN-Index + 60 nến DNSE).
2. --cadence weekly    : Tác vụ vĩ mô & ngành cuối tuần (TradingEconomics 95 chỉ số + 10 Ngành GICS + Simply Wall St + News Digest).
3. --cadence quarterly : Tác vụ BCTC chi tiết 8 quý & 5 năm, 54 Ratios, DuPont, DCF 3 kịch bản.
4. --cadence all       : Chạy trọn vẹn toàn bộ các tầng dữ liệu.
"""

import sys
import time
import json
import argparse
import subprocess
from pathlib import Path
from typing import List, Optional

CURRENT_DIR = Path(__file__).resolve().parent
ROOT_DIR = CURRENT_DIR.parent
DATA_DIR = ROOT_DIR / "data"
SUPPORTED_FILE = DATA_DIR / "supported_stocks.json"

try:
    from lib.requested_stocks_manager import (
        get_pending_requested_symbols,
        filter_missing_financials,
        mark_symbol_synced,
        mark_symbol_failed,
        add_to_supported_stocks
    )
except ImportError:
    from scripts.lib.requested_stocks_manager import (
        get_pending_requested_symbols,
        filter_missing_financials,
        mark_symbol_synced,
        mark_symbol_failed,
        add_to_supported_stocks
    )


def get_configured_symbols() -> List[str]:
    """Lấy danh sách mã cấu hình theo dõi từ supported_stocks.json hoặc cache."""
    symbols = []
    if SUPPORTED_FILE.exists():
        try:
            with open(SUPPORTED_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                raw_list = data.get("symbols", []) if isinstance(data, dict) else (data if isinstance(data, list) else [])
                for s in raw_list:
                    if s and isinstance(s, str):
                        clean = s.strip().upper()
                        if clean and clean not in symbols:
                            symbols.append(clean)
        except Exception:
            pass

    if not symbols:
        fin_dir = DATA_DIR / "financials"
        if fin_dir.exists():
            symbols = sorted([p.stem.upper() for p in fin_dir.glob("*.json") if p.stem and not p.stem.startswith(".")])

    if not symbols:
        symbols = ["HPG", "PNJ", "DXG", "MBB", "VND", "VCB", "VHM", "FPT"]

    return symbols


def execute_step(step_name: str, script_name: str, args: Optional[List[str]] = None) -> bool:
    """Thực thi một bước trong pipeline và ghi nhận thời gian chạy."""
    script_path = CURRENT_DIR / script_name
    print(f"\n────────────────────────────────────────────────────────")
    print(f"🚀 BƯỚC: {step_name}")
    print(f"   Lệnh: {sys.executable} scripts/{script_name} {' '.join(args or [])}")
    print(f"────────────────────────────────────────────────────────")

    cmd = [sys.executable, str(script_path)] + (args or [])
    t0 = time.time()
    try:
        res = subprocess.run(cmd, cwd=str(ROOT_DIR), capture_output=True, text=True, check=True)
        if res.stdout:
            print(res.stdout.strip())
        elapsed = round(time.time() - t0, 2)
        print(f"✅ Hoàn thành [{step_name}] trong {elapsed}s.")
        return True
    except subprocess.CalledProcessError as e:
        print(f"⚠️ Cảnh báo lỗi tại [{step_name}]: {e}")
        if e.stdout:
            print("STDOUT:\n", e.stdout.strip())
        if e.stderr:
            print("STDERR:\n", e.stderr.strip())
        return False


def check_and_backfill_requested_stocks() -> List[str]:
    """
    Rà soát hàng đợi requested_stocks:
    Tìm các mã đang PENDING mà chưa có file hợp lệ trong data/financials/.
    Tự động đồng bộ ngay, tạo BCTC và chuyển sang SYNCED.
    """
    print("\n🔍 [RÀ SOÁT HÀNG ĐỢI] Kiểm tra các mã cổ phiếu được người dùng yêu cầu...")
    pending = get_pending_requested_symbols()
    if not pending:
        print("   ℹ️ Không có mã nào đang chờ trong hàng đợi requested_stocks.")
        return []

    missing = filter_missing_financials(pending)
    if not missing:
        print(f"   ✅ Tất cả {len(pending)} mã trong hàng đợi đã có sẵn BCTC trong kho lưu trữ.")
        for p in pending:
            mark_symbol_synced(p)
        return []

    print(f"   🎯 Phát hiện {len(missing)} mã yêu cầu chưa có BCTC: {', '.join(missing)}")
    backfilled = []
    for sym in missing:
        print(f"\n   👉 Đang tiến hành tự động cào dữ liệu cho mã yêu cầu {sym}...")
        # 1. TradingView Fundamentals
        execute_step(f"Auto-Sync TradingView Scanner cho {sym}", "sync_fundamentals.py", ["--symbols", sym])
        # 2. BCTC 8Q/5Y & DCF
        execute_step(f"Auto-Fetch BCTC Toàn Diện & DCF cho {sym}", "fetch_financial_reports.py", ["--symbols", sym])

        fin_path = DATA_DIR / "financials" / f"{sym}.json"
        if fin_path.exists():
            mark_symbol_synced(sym)
            backfilled.append(sym)
            print(f"   ✅ Hoàn tất nạp dữ liệu và bổ sung mã yêu cầu {sym} vào danh sách theo dõi!")
        else:
            mark_symbol_failed(sym, "Không thể tải BCTC từ các nguồn")
            print(f"   ⚠️ Thất bại khi nạp dữ liệu cho mã yêu cầu {sym}")

    return backfilled


def run_daily_pipeline(symbols: List[str]):
    """Chu kỳ Hằng Ngày (EOD 18:00 T2-T6): TradingView Scanner, Nhiệt kế VN-Index, 60 nến DNSE."""
    # 0. Tự động rà soát và tải dữ liệu cho các mã trong hàng đợi yêu cầu
    backfilled = check_and_backfill_requested_stocks()
    if backfilled:
        symbols = sorted(list(set(symbols + backfilled)))

    print("\n========================================================")
    print(f"☀️ PIPELINE HẰNG NGÀY (DAILY EOD SYNC) — {len(symbols)} MÃ")
    print("========================================================")

    # 1. TradingView Scanner 50+ chỉ số
    sym_arg = ",".join(symbols)
    execute_step("1.1 TradingView Scanner & Fundamentals Cache", "sync_fundamentals.py", ["--symbols", sym_arg])

    # 2. Nhiệt kế định giá VN-Index, P/E Bands, Vàng, Dầu, Tỷ giá
    execute_step("1.2 Nhiệt Kế Định Giá VN-Index & Vĩ Mô EOD", "fetch_macro_valuation.py")

    # 3. Cập nhật 60 nến ngày DNSE & Market Profile / POC / Wyckoff
    execute_step("1.3 Cập Nhật 60 Nến Ngày DNSE & Market Profile", "fetch_financial_reports.py", ["--symbols", sym_arg])

    # 4. Xử lý hàng đợi làm mới AI danh mục từ Online/Vercel (Pending Queue)
    execute_step("1.4 Xử Lý Hàng Đợi Làm Mới Portfolio AI (Pending Queue)", "generate_ai_insights.py", ["--scope", "portfolio", "--user-id", "pending"])



def run_weekly_pipeline(symbols: List[str]):
    """Chu kỳ Hằng Tuần (Sáng Thứ Bảy 10:00): Vĩ mô TradingEconomics, 10 Ngành GICS, Simply Wall St."""
    print("\n========================================================")
    print("📅 PIPELINE HẰNG TUẦN (WEEKLY MACRO & SECTORS SYNC)")
    print("========================================================")

    # 1. 95 Chỉ số vĩ mô TradingEconomics theo 10 phân nhóm
    execute_step("2.1 Kho 95 Chỉ Số Vĩ Mô TradingEconomics", "fetchers/tradingeconomics_fetcher.py")

    # 2. Định giá 10 nhóm ngành GICS Vietstock & Heatmap
    execute_step("2.2 Định Giá & Luân Chuyển 10 Nhóm Ngành GICS", "fetchers/sector_valuation_fetcher.py")

    # 3. Chuỗi dữ liệu lịch sử định giá 1-10Y Simply Wall St
    execute_step("2.3 Chuỗi Định Giá Lịch Sử 10Y Simply Wall St", "fetchers/market_valuation_history_fetcher.py")

    # 4. Tính toán Macro Regime 5-pha & 4-Tier Risk Score
    execute_step("2.4 Phân Tích Chu Kỳ 5-Pha & Điểm Rủi Ro Vĩ Mô", "fetch_macro_valuation.py")

    # 5. Cập nhật Bản tin thời sự 30 ngày & Sentiment
    sym_arg = ",".join(symbols)
    execute_step("2.5 Bản Tin Thời Sự & Bộ Đo Lường Tâm Lý 30 Ngày", "fetch_financial_reports.py", ["--symbols", sym_arg])

    # 6. Sinh Báo Cáo Chiến Lược Vĩ Mô CIO (AI Macro Briefing)
    execute_step("2.6 Sinh Báo Cáo Chiến Lược Vĩ Mô CIO (AI Macro Briefing)", "generate_ai_insights.py", ["--scope", "macro"])

    # 7. Sinh Nhịp Đập Thị Trường Cuối Tuần (AI Weekly Market Pulse)
    execute_step("2.7 Sinh Nhịp Đập Thị Trường Cuối Tuần (AI Weekly Market Pulse)", "generate_ai_insights.py", ["--scope", "weekly_market"])

    # 8. Đánh Giá Sức Khỏe Danh Mục & Chịu Tải Vĩ Mô (All Users - Weekly Delta)
    execute_step("2.8 Đánh Giá Sức Khỏe Danh Mục & Chịu Tải Vĩ Mô (All Users - Weekly Delta)", "generate_ai_insights.py", ["--scope", "portfolio", "--user-id", "all"])

    # 9. Bộ Phân Tích Cổ Phiếu Tích Hợp (AI Stock Suite - Weekly Smart Delta)
    execute_step("2.9 Bộ Phân Tích Cổ Phiếu Tích Hợp (AI Stock Suite - Weekly Delta)", "generate_ai_insights.py", ["--scope", "stocks", "--symbols", sym_arg])


def run_quarterly_pipeline(symbols: List[str], backfill_deep: bool = False):
    """Chu kỳ Hằng Quý (Mùa BCTC): 122+ chỉ tiêu BCTC 8Q/5Y, 54 Ratios, DuPont, DCF."""
    # 0. Tự động rà soát hàng đợi yêu cầu
    backfilled = check_and_backfill_requested_stocks()
    if backfilled:
        symbols = sorted(list(set(symbols + backfilled)))

    print("\n========================================================")
    print(f"📑 PIPELINE HẰNG QUÝ (QUARTERLY BCTC & RATIOS) — {len(symbols)} MÃ")
    print("========================================================")

    sym_arg = ",".join(symbols)
    extra_args = ["--symbols", sym_arg]
    if backfill_deep:
        extra_args.append("--backfill-deep")
    execute_step("3.1 Trích Xuất Toàn Bộ BCTC 122+ Chỉ Tiêu, 54 Ratios & DCF", "fetch_financial_reports.py", extra_args)

    # 2. Sinh Báo Cáo Phân Tích Định Giá Chuyên Sâu (AI Stock Deep Dive)
    execute_step("3.2 Sinh Báo Cáo Định Giá Chuyên Sâu (AI Stock Deep Dive)", "generate_ai_insights.py", ["--scope", "stocks", "--symbols", sym_arg])


def main():
    parser = argparse.ArgumentParser(description="Bộ Điều Phối Pipeline Thống Nhất Dữ Liệu Thị Trường & Định Giá")
    parser.add_argument(
        "--cadence", "-c",
        choices=["daily", "weekly", "quarterly", "all"],
        default="daily",
        help="Chu kỳ thực thi: daily (EOD), weekly (vĩ mô/ngành), quarterly (BCTC), all (toàn bộ)"
    )
    parser.add_argument(
        "--symbols", "-s",
        help="Danh sách mã cổ phiếu cần cập nhật (phân tách bởi dấu phẩy, ví dụ: HPG,PNJ,MWG)",
        default=None
    )
    parser.add_argument(
        "--backfill-deep",
        action="store_true",
        help="Cào dữ liệu lịch sử sâu từ CafeF cho kỳ BCTC"
    )

    args = parser.parse_args()

    symbols = [s.strip().upper() for s in args.symbols.split(",") if s.strip()] if args.symbols else get_configured_symbols()

    print("\n==================================================================")
    print("🌟 CHƯƠNG TRÌNH ĐIỀU PHỐI DỮ LIỆU ĐỊNH GIÁ & TÀI CHÍNH (PIPELINE)")
    print(f"📌 Chế độ vận hành (Cadence): [{args.cadence.upper()}]")
    print(f"🎯 Danh sách mã ({len(symbols)} mã): {', '.join(symbols)}")
    print("==================================================================")
    t_start = time.time()

    if args.cadence == "daily":
        run_daily_pipeline(symbols)
    elif args.cadence == "weekly":
        run_weekly_pipeline(symbols)
    elif args.cadence == "quarterly":
        run_quarterly_pipeline(symbols, backfill_deep=args.backfill_deep)
    elif args.cadence == "all":
        run_daily_pipeline(symbols)
        run_weekly_pipeline(symbols)
        run_quarterly_pipeline(symbols, backfill_deep=args.backfill_deep)

    total_time = round(time.time() - t_start, 2)
    print("\n==================================================================")
    print(f"✨ HOÀN TẤT TOÀN BỘ CHU TRÌNH [{args.cadence.upper()}] TRONG {total_time}s!")
    print(f"📁 Dữ liệu định giá: {DATA_DIR / 'fundamentals_cache.json'}")
    print(f"🌐 Dữ liệu vĩ mô:    {DATA_DIR / 'macro_valuation.json'}")
    print(f"📊 Kho BCTC:        {DATA_DIR / 'financials/'}")
    print("==================================================================\n")


if __name__ == "__main__":
    main()
