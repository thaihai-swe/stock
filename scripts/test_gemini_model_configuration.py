#!/usr/bin/env python3
"""
scripts/test_gemini_model_configuration.py
Bộ kiểm thử tự động toàn diện kiểm tra cơ chế phân giải và cấu hình GEMINI_MODEL.
"""

import os
import sys
import unittest
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
ROOT_DIR = CURRENT_DIR.parent
sys.path.insert(0, str(CURRENT_DIR))

from lib.ai_service import PythonAiService, ai_service


class TestGeminiModelConfiguration(unittest.TestCase):
    def setUp(self):
        # Lưu trữ trạng thái env gốc
        self.orig_env = {
            "GEMINI_MODEL": os.environ.get("GEMINI_MODEL"),
            "AI_MODEL": os.environ.get("AI_MODEL"),
            "AI_PROVIDER": os.environ.get("AI_PROVIDER"),
            "GEMINI_API_KEY": os.environ.get("GEMINI_API_KEY"),
            "OPENAI_MODEL": os.environ.get("OPENAI_MODEL"),
            "DISABLE_DOTENV": os.environ.get("DISABLE_DOTENV"),
        }
        os.environ["DISABLE_DOTENV"] = "1"
        for k in ["GEMINI_MODEL", "AI_MODEL", "AI_PROVIDER", "GEMINI_API_KEY", "OPENAI_MODEL"]:
            if k in os.environ:
                del os.environ[k]

    def tearDown(self):
        # Khôi phục trạng thái env
        for k, v in self.orig_env.items():
            if v is not None:
                os.environ[k] = v
            elif k in os.environ:
                del os.environ[k]
        ai_service.refresh_env()

    def test_default_fallback_model(self):
        """Kiểm tra khi không có biến môi trường thì fallback về cấu hình mặc định."""
        service = PythonAiService()
        self.assertEqual(service.gemini_model, "gemini-1.5-flash")
        self.assertIn("gemini-2.0-flash", service.SUPPORTED_GEMINI_MODELS)

    def test_gemini_model_env_override(self):
        """Kiểm tra khi đặt biến GEMINI_MODEL thì được nhận diện chính xác."""
        os.environ["GEMINI_MODEL"] = "gemini-2.0-flash"
        service = PythonAiService()
        self.assertEqual(service.gemini_model, "gemini-2.0-flash")

    def test_gemini_model_takes_precedence_over_ai_model(self):
        """Kiểm tra độ ưu tiên: GEMINI_MODEL luôn ưu tiên hơn AI_MODEL chung."""
        os.environ["GEMINI_MODEL"] = "gemini-2.0-flash"
        os.environ["AI_MODEL"] = "gemini-1.5-pro"
        service = PythonAiService()
        self.assertEqual(service.gemini_model, "gemini-2.0-flash")

    def test_ai_model_used_when_gemini_model_not_set(self):
        """Kiểm tra khi không có GEMINI_MODEL thì AI_MODEL được sử dụng làm dự phòng."""
        os.environ["AI_MODEL"] = "gemini-1.5-pro"
        service = PythonAiService()
        self.assertEqual(service.gemini_model, "gemini-1.5-pro")

    def test_get_status_metadata(self):
        """Kiểm tra phương thức get_status trả về đầy đủ metadata bao gồm supportedGeminiModels."""
        os.environ["GEMINI_MODEL"] = "gemini-1.5-pro"
        service = PythonAiService()
        status = service.get_status()
        self.assertEqual(status["geminiModel"], "gemini-1.5-pro")
        self.assertIsInstance(status["supportedGeminiModels"], list)
        self.assertIn("gemini-1.5-flash", status["supportedGeminiModels"])
        self.assertIn("gemini-1.5-pro", status["supportedGeminiModels"])
        self.assertIn("gemini-2.0-flash", status["supportedGeminiModels"])
        self.assertIn("gemini-2.0-flash-lite", status["supportedGeminiModels"])

    def test_dynamic_call_model_override(self):
        """Kiểm tra khi gọi generate_macro_briefing hoặc generate_stock_deepdive fallback với model override."""
        service = PythonAiService()
        briefing = service.generate_macro_briefing({"regime": {"titleVi": "Thử Nghiệm"}}, model="gemini-2.0-flash")
        self.assertEqual(briefing["status"], "success")
        self.assertEqual(briefing["provider"], "offline-heuristic-engine")

        deepdive = service.generate_stock_deepdive("TEST", {}, {}, model="gemini-1.5-pro")
        self.assertEqual(deepdive["status"], "success")
        self.assertEqual(deepdive["provider"], "offline-heuristic-engine")


if __name__ == "__main__":
    unittest.main()
