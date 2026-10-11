#!/usr/bin/env python3
"""
scripts/db_manager.py
Công cụ CLI chuẩn hóa quản lý Cơ sở dữ liệu SQLite / Turso:
1. status: Kiểm tra kết nối và thống kê số lượng bản ghi (orders, dividends, watchlist).
2. export: Sao lưu toàn bộ dữ liệu giao dịch cá nhân ra file JSON an toàn.
3. import: Khôi phục dữ liệu từ file backup JSON vào SQLite / Turso.
"""

import os
import sys
import json
import sqlite3
import argparse
from pathlib import Path
from datetime import datetime
from typing import Dict, Any

CURRENT_DIR = Path(__file__).resolve().parent
ROOT_DIR = CURRENT_DIR.parent
DATA_DIR = ROOT_DIR / "data"
DB_PATH = DATA_DIR / "stock.db"
BACKUPS_DIR = DATA_DIR / "backups"


def get_db_connection() -> sqlite3.Connection:
    """Mở kết nối tới database SQLite cục bộ."""
    if not DB_PATH.exists():
        DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def cmd_status():
    """Kiểm tra trạng thái và thống kê số lượng bản ghi."""
    print("\n========================================================")
    print("📊 TRẠNG THÁI CƠ SỞ DỮ LIỆU GIAO DỊCH (stock.db)")
    print("========================================================")
    print(f"📁 Đường dẫn file: {DB_PATH}")

    if not DB_PATH.exists():
        print("⚠️ File stock.db chưa tồn tại.")
        return

    conn = get_db_connection()
    c = conn.cursor()

    c.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [r[0] for r in c.fetchall()]

    print(f"📌 Tổng số bảng: {len(tables)}")
    print("--------------------------------------------------------")

    tracked_tables = ["buy_orders", "sell_orders", "dividends", "watchlist", "app_settings", "users"]
    for t in tracked_tables:
        if t in tables:
            c.execute(f"SELECT COUNT(*) FROM {t};")
            cnt = c.fetchone()[0]
            print(f"  • {t:<15}: {cnt:>5} bản ghi")
        else:
            print(f"  • {t:<15}: (chưa tạo bảng)")

    conn.close()
    print("========================================================\n")


def cmd_export(output_path: str = None):
    """Xuất toàn bộ dữ liệu ra file backup JSON."""
    BACKUPS_DIR.mkdir(parents=True, exist_ok=True)

    if not output_path:
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = BACKUPS_DIR / f"portfolio_backup_{ts}.json"
    else:
        output_file = Path(output_path)

    conn = get_db_connection()
    c = conn.cursor()

    backup_data: Dict[str, Any] = {
        "_meta": {
            "exportedAt": datetime.now().isoformat(),
            "source": "stock.db",
            "version": "1.0.0"
        },
        "tables": {}
    }

    tracked_tables = ["buy_orders", "sell_orders", "dividends", "watchlist", "app_settings", "users"]
    c.execute("SELECT name FROM sqlite_master WHERE type='table';")
    existing_tables = [r[0] for r in c.fetchall()]

    for t in tracked_tables:
        if t in existing_tables:
            c.execute(f"SELECT * FROM {t};")
            rows = [dict(r) for r in c.fetchall()]
            backup_data["tables"][t] = rows
            print(f"  📦 Đã xuất bảng {t}: {len(rows)} dòng")

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(backup_data, f, ensure_ascii=False, indent=2)

    conn.close()
    print(f"\n✅ Đã sao lưu dữ liệu thành công ra: {output_file}")


def cmd_import(input_path: str):
    """Khôi phục dữ liệu từ file backup JSON vào database."""
    in_file = Path(input_path)
    if not in_file.exists():
        print(f"❌ Lỗi: File không tồn tại: {in_file}")
        sys.exit(1)

    with open(in_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    tables_data = data.get("tables", {})
    if not tables_data and "buyOrders" in data:
        # Hỗ trợ format legacy transactions.json
        tables_data = {
            "buy_orders": data.get("buyOrders", []),
            "sell_orders": data.get("sellOrders", []),
            "dividends": data.get("dividends", []),
            "watchlist": data.get("watchlist", [])
        }

    conn = get_db_connection()
    c = conn.cursor()

    print(f"\n🔄 Bắt đầu nạp dữ liệu từ: {in_file.name}...")
    for table_name, rows in tables_data.items():
        if not rows:
            continue

        c.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name=?;", (table_name,))
        if not c.fetchone():
            print(f"  ⚠️ Bỏ qua bảng {table_name} (chưa tồn tại schema)")
            continue

        cols = list(rows[0].keys())
        # Chuyển đổi tags từ list sang json string nếu cần
        placeholders = ", ".join(["?"] * len(cols))
        col_names = ", ".join(cols)
        query = f"INSERT OR REPLACE INTO {table_name} ({col_names}) VALUES ({placeholders});"

        success_cnt = 0
        for r in rows:
            vals = []
            for col in cols:
                v = r.get(col)
                if isinstance(v, (list, dict)):
                    v = json.dumps(v, ensure_ascii=False)
                vals.append(v)
            try:
                c.execute(query, vals)
                success_cnt += 1
            except Exception as e:
                print(f"    ⚠️ Lỗi chèn dòng vào {table_name}: {e}")

        print(f"  ✅ Đã nhập {success_cnt}/{len(rows)} bản ghi vào bảng {table_name}")

    conn.commit()
    conn.close()
    print("✨ Hoàn tất phục hồi dữ liệu vào cơ sở dữ liệu!\n")


def main():
    parser = argparse.ArgumentParser(description="Quản lý Cơ sở Dữ liệu Giao dịch SQLite (stock.db)")
    subparsers = parser.add_subparsers(dest="command", help="Lệnh thực thi")

    # status
    subparsers.add_parser("status", help="Xem trạng thái và thống kê số lượng bản ghi")

    # export
    exp_parser = subparsers.add_parser("export", help="Sao lưu dữ liệu ra file JSON")
    exp_parser.add_argument("--output", "-o", help="Đường dẫn file backup xuất ra", default=None)

    # import
    imp_parser = subparsers.add_parser("import", help="Nạp dữ liệu từ file backup JSON")
    imp_parser.add_argument("--input", "-i", required=True, help="Đường dẫn file JSON cần nạp")

    args = parser.parse_args()

    if args.command == "status" or not args.command:
        cmd_status()
    elif args.command == "export":
        cmd_export(args.output)
    elif args.command == "import":
        cmd_import(args.input)


if __name__ == "__main__":
    main()
