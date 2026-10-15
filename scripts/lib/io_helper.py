#!/usr/bin/env python3
"""
scripts/lib/io_helper.py
Bộ tiện ích xử lý File I/O và Môi Trường Chuẩn Hóa cho Python Pipeline:
1. atomic_write_json: Ghi file JSON nguyên tử (Atomic Write qua file tạm + os.replace)
   chống đứng hoàn toàn tình trạng Node.js đọc phải file đang ghi dở hoặc bị hỏng (Zero Downtime).
2. safe_read_json: Đọc file JSON an toàn với fallback khi file chưa có hoặc đang ghi.
3. load_project_env: Nạp biến môi trường từ .env của dự án một cách thống nhất.
"""

import os
import sys
import json
import time
from pathlib import Path
from typing import Any, Optional

CURRENT_DIR = Path(__file__).resolve().parent
ROOT_DIR = CURRENT_DIR.parent.parent
DATA_DIR = ROOT_DIR / "data"
ENV_FILE = ROOT_DIR / ".env"


def load_project_env():
    """Nạp biến môi trường từ file .env ở thư mục gốc của dự án (nếu có)."""
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
            print(f"⚠️ [io_helper] Không thể nạp file .env: {e}")


def safe_read_json(file_path: Any, fallback: Any = None) -> Any:
    """
    Đọc file JSON một cách an toàn.
    Nếu file không tồn tại hoặc dữ liệu bị lỗi, trả về fallback thay vì văng exception.
    """
    path = Path(file_path)
    if not path.exists():
        return fallback

    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read().strip()
            if not content:
                return fallback
            return json.loads(content)
    except Exception as e:
        print(f"⚠️ [io_helper] Lỗi đọc JSON từ {path.name}: {e}")
        return fallback


def atomic_write_json(file_path: Any, data: Any, indent: int = 2, ensure_ascii: bool = False) -> bool:
    """
    Ghi dữ liệu JSON ra đĩa theo cơ chế nguyên tử (Atomic File Write):
    1. Ghi toàn bộ nội dung ra file tạm: <file_path>.tmp.<pid>_<timestamp>
    2. Gọi flush() và os.fsync() để bảo đảm dữ liệu đã ghi xuống đĩa cứng vật lý.
    3. Dùng os.replace() để hoán đổi nguyên tử vào đích (POSIX atomic operation).
    Đảm bảo 100% không bao giờ xảy ra lỗi đọc file dở dang từ Node.js Express.
    """
    path = Path(file_path)
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp_path = path.with_name(f"{path.name}.tmp.{os.getpid()}_{int(time.time() * 1000)}")

        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=ensure_ascii, indent=indent)
            f.flush()
            os.fsync(f.fileno())

        os.replace(tmp_path, path)
        return True
    except Exception as e:
        print(f"⚠️ [io_helper] Lỗi khi ghi file nguyên tử cho {path.name}: {e}")
        try:
            if 'tmp_path' in locals() and tmp_path.exists():
                tmp_path.unlink()
        except Exception:
            pass
        return False


# Tự động nạp môi trường khi import module
load_project_env()
