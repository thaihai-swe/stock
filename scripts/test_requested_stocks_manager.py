#!/usr/bin/env python3
"""
scripts/test_requested_stocks_manager.py
Unit test kiểm thử toàn diện module Requested Stocks Manager:
- Đảm bảo lưu đúng 5 trường: symbol, requested_at, status, synced_at, error_message.
- Kiểm thử lọc mã thiếu BCTC (filter_missing_financials).
- Kiểm thử đánh dấu hoàn tất (mark_symbol_synced) và tự động ghi supported_stocks.json.
- Kiểm thử đánh dấu thất bại (mark_symbol_failed).
"""

import sys
import json
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
ROOT_DIR = CURRENT_DIR.parent
DATA_DIR = ROOT_DIR / "data"

sys.path.insert(0, str(ROOT_DIR))

from scripts.lib.requested_stocks_manager import (
    init_requested_stocks_table,
    get_pending_requested_symbols,
    filter_missing_financials,
    mark_symbol_synced,
    mark_symbol_failed,
    add_to_supported_stocks,
    REQUESTED_FILE,
    SUPPORTED_FILE
)


def run_tests():
    print("\n========================================================")
    print("🧪 BẮT ĐẦU KIỂM THỬ REQUESTED STOCKS MANAGER (5 TRƯỜNG)")
    print("========================================================")

    init_requested_stocks_table()
    print("✅ 1. init_requested_stocks_table: Thành công")

    # Giả lập thêm mã TESTQUEUE vào requested_stocks.json
    test_sym = "TESTXYZ"
    req_data = {}
    if REQUESTED_FILE.exists():
        try:
            with open(REQUESTED_FILE, "r", encoding="utf-8") as f:
                req_data = json.load(f)
        except Exception:
            req_data = {}

    req_data[test_sym] = {
        "symbol": test_sym,
        "requested_at": "2026-10-12T22:50:00Z",
        "status": "PENDING",
        "synced_at": None,
        "error_message": None
    }
    with open(REQUESTED_FILE, "w", encoding="utf-8") as f:
        json.dump(req_data, f, ensure_ascii=False, indent=2)

    # Kiểm tra get_pending_requested_symbols
    pending = get_pending_requested_symbols()
    assert test_sym in pending, f"Lỗi: {test_sym} không có trong danh sách pending!"
    print(f"✅ 2. get_pending_requested_symbols: Thành công (tìm thấy {test_sym})")

    # Kiểm tra filter_missing_financials (TESTXYZ chắc chắn chưa có file JSON)
    missing = filter_missing_financials([test_sym, "HPG"])
    assert test_sym in missing, f"Lỗi: {test_sym} phải nằm trong missing!"
    assert "HPG" not in missing, "Lỗi: HPG đã có BCTC, không được nằm trong missing!"
    print(f"✅ 3. filter_missing_financials: Thành công (phân loại đúng {test_sym} thiếu, HPG có sẵn)")

    # Kiểm tra mark_symbol_synced
    mark_symbol_synced(test_sym)
    with open(REQUESTED_FILE, "r", encoding="utf-8") as f:
        updated = json.load(f)
    record = updated.get(test_sym, {})
    assert record.get("status") == "SYNCED", f"Lỗi: status không phải SYNCED! ({record.get('status')})"
    assert record.get("synced_at") is not None, "Lỗi: synced_at bị None!"
    assert record.get("error_message") is None, "Lỗi: error_message không phải None!"
    assert set(record.keys()) == {"symbol", "requested_at", "status", "synced_at", "error_message"}, \
        f"Lỗi: Record không đúng 5 trường! Có: {list(record.keys())}"
    print(f"✅ 4. mark_symbol_synced: Thành công (chuẩn đúng 5 trường: {list(record.keys())})")

    # Kiểm tra add_to_supported_stocks
    with open(SUPPORTED_FILE, "r", encoding="utf-8") as f:
        sup_data = json.load(f)
    assert test_sym in sup_data.get("symbols", []), f"Lỗi: {test_sym} chưa được thêm vào supported_stocks.json!"
    print(f"✅ 5. add_to_supported_stocks: Thành công (đã ghi vào {SUPPORTED_FILE.name})")

    # Kiểm tra mark_symbol_failed
    mark_symbol_failed(test_sym, "Test error message")
    with open(REQUESTED_FILE, "r", encoding="utf-8") as f:
        failed_data = json.load(f)
    failed_record = failed_data.get(test_sym, {})
    assert failed_record.get("status") == "FAILED"
    assert failed_record.get("error_message") == "Test error message"
    print("✅ 6. mark_symbol_failed: Thành công")

    # Cleanup: Xóa test_sym khỏi files để giữ repository sạch sẽ
    if test_sym in updated:
        del updated[test_sym]
        with open(REQUESTED_FILE, "w", encoding="utf-8") as f:
            json.dump(updated, f, ensure_ascii=False, indent=2)

    if test_sym in sup_data.get("symbols", []):
        sup_data["symbols"].remove(test_sym)
        with open(SUPPORTED_FILE, "w", encoding="utf-8") as f:
            json.dump(sup_data, f, ensure_ascii=False, indent=2)

    print("✅ 7. Dọn dẹp dữ liệu kiểm thử (Cleanup): Hoàn tất!")
    print("\n🎉 TẤT CẢ 7 BƯỚC KIỂM THỬ REQUESTED STOCKS MANAGER ĐÃ PASS 100% THÀNH CÔNG!\n")


if __name__ == "__main__":
    run_tests()
