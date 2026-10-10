#!/usr/bin/env python3
"""
scripts/run_full_pipeline.py
Script tổng hợp điều phối toàn bộ luồng trích xuất dữ liệu tài chính & định giá:
1. Đồng bộ 50+ chỉ số từ TradingView Scanner API (sync_fundamentals.py)
2. Cào & chuẩn hóa Báo Cáo Tài Chính 8 quý & 5 năm (fetch_financial_reports.py)
3. Tính toán nhiệt kế định giá VN-Index & cố vấn tỷ trọng tiền mặt (fetch_macro_valuation.py)
4. Xuất toàn bộ ra hệ thống Local JSON trong data/ (để người dùng kiểm tra 0ms).
"""

import sys
import time
import subprocess
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
ROOT_DIR = CURRENT_DIR.parent
DATA_DIR = ROOT_DIR / "data"

def run_step(step_name: str, script_name: str, args: list = None):
    script_path = CURRENT_DIR / script_name
    print(f"\n────────────────────────────────────────────────────────")
    print(f"🚀 BƯỚC: {step_name}")
    print(f"   Chạy: python3 {script_path.name}")
    print(f"────────────────────────────────────────────────────────")
    
    cmd = [sys.executable, str(script_path)] + (args or [])
    t0 = time.time()
    try:
        res = subprocess.run(cmd, cwd=str(ROOT_DIR), capture_output=True, text=True, check=True)
        print(res.stdout)
        elapsed = round(time.time() - t0, 2)
        print(f"✅ Hoàn thành {step_name} trong {elapsed}s.")
        return True
    except subprocess.CalledProcessError as e:
        print(f"⚠️ Cảnh báo tại {step_name}: {e}")
        if e.stdout:
            print(e.stdout)
        if e.stderr:
            print(e.stderr)
        return False

def main():
    print("\n==================================================================")
    print("🌟 CHƯƠNG TRÌNH ĐỒNG BỘ TOÀN DIỆN DỮ LIỆU ĐỊNH GIÁ & TÀI CHÍNH")
    print("   Lưu trữ Local JSON First (Zero Latency - Dễ Dàng Kiểm Tra)")
    print("==================================================================")
    start_total = time.time()

    # Bước 1: Đồng bộ chỉ số cơ bản & định giá tổng hợp
    run_step("1. Đồng Bộ Chỉ Số Cơ Bản & Định Giá", "sync_fundamentals.py")

    # Bước 2: Thu thập Báo Cáo Tài Chính (3 Báo Cáo Cốt Lõi)
    run_step("2. Thu Thập Báo Cáo Tài Chính (Income, Balance, Cash Flow)", "fetch_financial_reports.py")

    # Bước 3: Định giá vĩ mô VN-Index & Cố vấn phân bổ tài sản
    run_step("3. Định Giá Vĩ Mô & Nhiệt Kế VN-Index", "fetch_macro_valuation.py")

    total_elapsed = round(time.time() - start_total, 2)
    print("\n==================================================================")
    print(f"✨ TẤT CẢ CÁC BƯỚC ĐÃ HOÀN TẤT TRONG {total_elapsed}s!")
    print(f"📁 Dữ liệu định giá: {DATA_DIR / 'fundamentals_cache.json'}")
    print(f"🌐 Dữ liệu vĩ mô:    {DATA_DIR / 'macro_valuation.json'}")
    print(f"📊 Thư mục BCTC:    {DATA_DIR / 'financials/'}")
    print("==================================================================\n")

if __name__ == "__main__":
    main()
