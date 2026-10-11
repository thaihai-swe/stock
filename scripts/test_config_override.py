#!/usr/bin/env python3
"""
scripts/test_config_override.py
Kiểm thử tính năng override và fallback của config_loader:
1. Đọc giá trị mặc định từ data/default-constant-value.json.
2. Kiểm tra khả năng nhận giá trị mới khi chỉnh sửa JSON.
3. Kiểm tra khả năng phục hồi và fallback an toàn khi file thiếu trường.
"""

import sys
import json
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
ROOT_DIR = CURRENT_DIR.parent
CONFIG_FILE = ROOT_DIR / "data" / "default-constant-value.json"

sys.path.insert(0, str(CURRENT_DIR))
from lib.config_loader import load_system_constants, get_valuation_config, get_system_config


def test_config_loader():
    print("=======================================================")
    print("🧪 KIỂM THỬ TÍNH NĂNG TẬP TRUNG HÓA CẤU HÌNH HỆ THỐNG")
    print("=======================================================")

    # 1. Đọc ban đầu
    cfg1 = load_system_constants(reload=True)
    val_cfg1 = get_valuation_config()
    original_wacc = val_cfg1["wacc"]
    print(f"1. Giá trị ban đầu WACC: {original_wacc}")
    assert original_wacc == 0.115, f"WACC ban đầu phải là 0.115, nhận được {original_wacc}"
    print("   ✅ Đọc thành công cấu hình ban đầu từ JSON.")

    # 2. Backup file
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        original_json_text = f.read()

    try:
        # 3. Giả lập người dùng sửa JSON: đổi WACC thành 0.135
        data = json.loads(original_json_text)
        data["valuation"]["wacc"] = 0.135
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        # Nạp lại
        cfg_modified = load_system_constants(reload=True)
        new_wacc = cfg_modified["valuation"]["wacc"]
        print(f"2. Giá trị sau khi người dùng sửa JSON: WACC = {new_wacc}")
        assert new_wacc == 0.135, f"WACC sau khi sửa phải là 0.135, nhận được {new_wacc}"
        print("   ✅ Hệ thống đã tự động nhận giá trị cấu hình mới từ JSON!")

        # 4. Giả lập người dùng xoá bớt trường (ví dụ xoá outlierFilter)
        del data["valuation"]["outlierFilter"]
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        cfg_fallback = load_system_constants(reload=True)
        fallback_gap = cfg_fallback["valuation"]["outlierFilter"]["outlierGapThreshold"]
        print(f"3. Giá trị sau khi xoá trường: outlierGapThreshold = {fallback_gap}")
        assert fallback_gap == 0.60, f"Fallback gap phải là 0.60, nhận được {fallback_gap}"
        print("   ✅ Cơ chế Fallback an toàn hoạt động chính xác khi thiếu trường!")

    finally:
        # Phục hồi nguyên trạng file ban đầu
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            f.write(original_json_text)
        load_system_constants(reload=True)
        print("4. Đã khôi phục nguyên trạng file cấu hình ban đầu.")

    print("\n🎉 TẤT CẢ TEST CASE CẤU HÌNH ĐÃ THÀNH CÔNG 100%!")


if __name__ == "__main__":
    test_config_loader()
