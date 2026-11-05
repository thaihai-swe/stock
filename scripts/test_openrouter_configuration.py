#!/usr/bin/env python3
"""
scripts/test_openrouter_configuration.py
Bộ kiểm thử tự động toàn diện kiểm tra cơ chế phân giải và cấu hình OPENROUTER_MODEL & Provider.
"""

import os
import sys
import unittest
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
ROOT_DIR = CURRENT_DIR.parent
sys.path.insert(0, str(CURRENT_DIR))

from lib.ai_service import PythonAiService, ai_service


class TestOpenRouterConfiguration(unittest.TestCase):
    def setUp(self):
        # Lưu trữ trạng thái env gốc
        self.orig_env = {
            "OPENROUTER_MODEL": os.environ.get("OPENROUTER_MODEL"),
            "AI_MODEL": os.environ.get("AI_MODEL"),
            "AI_PROVIDER": os.environ.get("AI_PROVIDER"),
            "OPENROUTER_API_KEY": os.environ.get("OPENROUTER_API_KEY"),
            "OPENROUTER_BASE_URL": os.environ.get("OPENROUTER_BASE_URL"),
            "DISABLE_DOTENV": os.environ.get("DISABLE_DOTENV"),
        }
        os.environ["DISABLE_DOTENV"] = "1"
        for k in ["OPENROUTER_MODEL", "AI_MODEL", "AI_PROVIDER", "OPENROUTER_API_KEY", "OPENROUTER_BASE_URL"]:
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
        """Kiểm tra khi không có biến môi trường thì fallback về cấu hình mặc định của OpenRouter."""
        service = PythonAiService()
        self.assertEqual(service.openrouter_model, "deepseek/deepseek-chat")
        self.assertEqual(service.openrouter_base_url, "https://openrouter.ai/api/v1")
        self.assertIn("deepseek/deepseek-chat", service.SUPPORTED_OPENROUTER_MODELS)
        self.assertIn("anthropic/claude-3.5-sonnet", service.SUPPORTED_OPENROUTER_MODELS)
        self.assertIn("meta-llama/llama-3.3-70b-instruct", service.SUPPORTED_OPENROUTER_MODELS)

    def test_openrouter_model_env_override(self):
        """Kiểm tra khi đặt biến OPENROUTER_MODEL thì được nhận diện chính xác."""
        os.environ["OPENROUTER_MODEL"] = "anthropic/claude-3.5-sonnet"
        service = PythonAiService()
        self.assertEqual(service.openrouter_model, "anthropic/claude-3.5-sonnet")

    def test_openrouter_model_takes_precedence_over_ai_model(self):
        """Kiểm tra độ ưu tiên: OPENROUTER_MODEL luôn ưu tiên hơn AI_MODEL chung."""
        os.environ["OPENROUTER_MODEL"] = "deepseek/deepseek-r1"
        os.environ["AI_MODEL"] = "anthropic/claude-3.5-sonnet"
        service = PythonAiService()
        self.assertEqual(service.openrouter_model, "deepseek/deepseek-r1")

    def test_ai_model_used_when_openrouter_model_not_set(self):
        """Kiểm tra khi không có OPENROUTER_MODEL thì AI_MODEL được sử dụng làm dự phòng."""
        os.environ["AI_MODEL"] = "qwen/qwen-2.5-72b-instruct"
        service = PythonAiService()
        self.assertEqual(service.openrouter_model, "qwen/qwen-2.5-72b-instruct")

    def test_get_status_metadata(self):
        """Kiểm tra phương thức get_status trả về đầy đủ metadata bao gồm supportedOpenRouterModels."""
        os.environ["OPENROUTER_MODEL"] = "meta-llama/llama-3.3-70b-instruct"
        service = PythonAiService()
        status = service.get_status()
        self.assertEqual(status["openrouterModel"], "meta-llama/llama-3.3-70b-instruct")
        self.assertEqual(status["openrouterBaseUrl"], "https://openrouter.ai/api/v1")
        self.assertIsInstance(status["supportedOpenRouterModels"], list)
        self.assertIn("deepseek/deepseek-chat", status["supportedOpenRouterModels"])
        self.assertIn("deepseek/deepseek-r1", status["supportedOpenRouterModels"])
        self.assertIn("anthropic/claude-3.5-sonnet", status["supportedOpenRouterModels"])

    def test_resolve_provider_logic(self):
        """Kiểm tra logic resolve_provider: có key thì openrouter, không key thì fallback."""
        service = PythonAiService()
        self.assertEqual(service.resolve_provider(), "heuristic_fallback")

        os.environ["OPENROUTER_API_KEY"] = "sk-or-v1-dummy-key"
        service.refresh_env()
        self.assertEqual(service.resolve_provider(), "openrouter")

    def test_dynamic_call_model_override(self):
        """Kiểm tra khi gọi generate_macro_briefing hoặc generate_stock_deepdive fallback với model override."""
        service = PythonAiService()
        briefing = service.generate_macro_briefing({"regime": {"titleVi": "Thử Nghiệm"}}, model="deepseek/deepseek-chat")
        self.assertEqual(briefing["status"], "success")
        self.assertEqual(briefing["provider"], "offline-heuristic-engine")

        deepdive = service.generate_stock_deepdive("TEST", {}, {}, model="anthropic/claude-3.5-sonnet")
        self.assertEqual(deepdive["status"], "success")
        self.assertEqual(deepdive["provider"], "offline-heuristic-engine")


if __name__ == "__main__":
    unittest.main()
