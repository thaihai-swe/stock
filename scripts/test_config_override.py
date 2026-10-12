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

    # 1b. Kiểm tra Graham config ban đầu
    graham_cfg = val_cfg1.get("graham", {})
    print(f"1b. Giá trị ban đầu Graham basePeMax: {graham_cfg.get('basePeMax')}, cyclicalGrowthRate: {graham_cfg.get('cyclicalGrowthRate')}")
    assert graham_cfg.get("basePeMax") == 7.0, f"basePeMax ban đầu phải là 7.0, nhận được {graham_cfg.get('basePeMax')}"
    assert graham_cfg.get("cyclicalGrowthRate") == 5.0, f"cyclicalGrowthRate ban đầu phải là 5.0, nhận được {graham_cfg.get('cyclicalGrowthRate')}"
    print("   ✅ Đọc thành công cấu hình Graham từ JSON.")

    # 2. Backup file
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        original_json_text = f.read()

    try:
        # 3. Giả lập người dùng sửa JSON: đổi WACC thành 0.135 và basePeMax thành 6.5
        data = json.loads(original_json_text)
        data["valuation"]["wacc"] = 0.135
        data["valuation"]["graham"]["basePeMax"] = 6.5
        data["valuation"]["graham"]["cyclicalGrowthRate"] = 4.5
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        # Nạp lại
        cfg_modified = load_system_constants(reload=True)
        new_wacc = cfg_modified["valuation"]["wacc"]
        new_base_pe_max = cfg_modified["valuation"]["graham"]["basePeMax"]
        new_cyc_g = cfg_modified["valuation"]["graham"]["cyclicalGrowthRate"]
        print(f"2. Giá trị sau khi người dùng sửa JSON: WACC = {new_wacc}, basePeMax = {new_base_pe_max}, cyc_g = {new_cyc_g}")
        assert new_wacc == 0.135, f"WACC sau khi sửa phải là 0.135, nhận được {new_wacc}"
        assert new_base_pe_max == 6.5, f"basePeMax sau khi sửa phải là 6.5, nhận được {new_base_pe_max}"
        assert new_cyc_g == 4.5, f"cyclicalGrowthRate sau khi sửa phải là 4.5, nhận được {new_cyc_g}"
        print("   ✅ Hệ thống đã tự động nhận giá trị cấu hình mới Graham & WACC từ JSON!")

        # 4. Giả lập người dùng xoá bớt trường (xoá outlierFilter và graham)
        del data["valuation"]["outlierFilter"]
        del data["valuation"]["graham"]
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        cfg_fallback = load_system_constants(reload=True)
        fallback_gap = cfg_fallback["valuation"]["outlierFilter"]["outlierGapThreshold"]
        fallback_base_pe_max = cfg_fallback["valuation"]["graham"]["basePeMax"]
        print(f"3. Giá trị sau khi xoá trường: outlierGapThreshold = {fallback_gap}, fallback basePeMax = {fallback_base_pe_max}")
        assert fallback_gap == 0.60, f"Fallback gap phải là 0.60, nhận được {fallback_gap}"
        assert fallback_base_pe_max == 7.0, f"Fallback basePeMax phải là 7.0, nhận được {fallback_base_pe_max}"
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
