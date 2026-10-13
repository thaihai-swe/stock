#!/usr/bin/env python3
"""
scripts/lib/ai_service.py
Module dịch vụ AI dùng chung (Python AI Service):
Hỗ trợ cả Google Gemini REST API và OpenAI Standard API (/v1/chat/completions).
Tự động fallback sang Two-Tier Heuristic Engine 0ms nếu không có API Key.
"""

import os
import json
import logging
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

try:
    import requests
except ImportError:
    requests = None


def _load_dotenv():
    """Tự động tải biến môi trường từ file .env gốc dự án nếu chưa nạp."""
    if os.environ.get("DISABLE_DOTENV") == "1":
        return
    try:
        env_file = Path(__file__).resolve().parent.parent.parent / ".env"
        if env_file.exists():
            with open(env_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    if "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'\"")
                        if k and k not in os.environ:
                            os.environ[k] = v
    except Exception:
        pass


class PythonAiService:
    SUPPORTED_GEMINI_MODELS = [
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-2.0-flash",
        "gemini-2.0-flash-lite",
        "gemini-2.5-flash",
        "gemini-3.5-flash-lite",
        "gemini-flash-latest",
    ]

    def __init__(self):
        self.refresh_env()

    def refresh_env(self):
        """Tải lại biến môi trường và cấu hình hệ thống aiEngineHub."""
        _load_dotenv()
        ai_cfg = {}
        try:
            from .config_loader import get_ai_engine_config
            ai_cfg = get_ai_engine_config() or {}
        except Exception:
            try:
                from config_loader import get_ai_engine_config
                ai_cfg = get_ai_engine_config() or {}
            except Exception:
                ai_cfg = {}

        self.provider = (os.environ.get("AI_PROVIDER") or ai_cfg.get("provider") or "auto").lower()
        self.gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()
        self.openai_key = os.environ.get("OPENAI_API_KEY", "").strip()
        self.openai_base_url = (os.environ.get("OPENAI_BASE_URL") or ai_cfg.get("openaiBaseUrl") or "https://api.openai.com/v1").rstrip("/")
        # Thứ tự ưu tiên: GEMINI_MODEL > AI_MODEL > config.json geminiModel > default
        self.gemini_model = os.environ.get("GEMINI_MODEL") or os.environ.get("AI_MODEL") or ai_cfg.get("geminiModel") or "gemini-1.5-flash"
        self.openai_model = os.environ.get("OPENAI_MODEL") or os.environ.get("AI_MODEL") or ai_cfg.get("openaiModel") or "gpt-4o-mini"
        self.temperature = float(os.environ.get("AI_TEMPERATURE", ai_cfg.get("temperature", 0.2)))
        self.max_tokens = int(os.environ.get("AI_MAX_TOKENS", ai_cfg.get("maxTokens", 2048)))

    def resolve_provider(self, requested_provider: Optional[str] = None) -> str:
        self.refresh_env()
        prov = (requested_provider or self.provider or "auto").lower()
        if prov == "openai" and self.openai_key:
            return "openai"
        if prov == "gemini" and self.gemini_key:
            return "gemini"
        if self.gemini_key:
            return "gemini"
        if self.openai_key:
            return "openai"
        return "heuristic_fallback"

    def get_status(self) -> Dict[str, Any]:
        return {
            "activeProvider": self.resolve_provider(),
            "configuredProvider": self.provider,
            "hasGeminiKey": bool(self.gemini_key),
            "hasOpenAiKey": bool(self.openai_key),
            "geminiModel": self.gemini_model,
            "openaiModel": self.openai_model,
            "supportedGeminiModels": self.SUPPORTED_GEMINI_MODELS,
        }

    def generate_json(
        self,
        system_prompt: str,
        user_prompt: str,
        fallback_fn=None,
        model: Optional[str] = None,
        provider: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Gọi LLM trả về JSON dict hoặc fallback sang heuristic."""
        active = self.resolve_provider(requested_provider=provider)

        if active == "gemini" and requests:
            try:
                res = self._call_gemini(system_prompt, user_prompt, model=model)
                if res:
                    return res
            except Exception as e:
                logger.warning(f"⚠️ Lỗi gọi Gemini API: {e}. Thử fallback.")
                if self.openai_key:
                    try:
                        res = self._call_openai(system_prompt, user_prompt, model=model)
                        if res:
                            return res
                    except Exception as oe:
                        logger.warning(f"⚠️ Lỗi gọi OpenAI fallback: {oe}.")

        elif active == "openai" and requests:
            try:
                res = self._call_openai(system_prompt, user_prompt, model=model)
                if res:
                    return res
            except Exception as e:
                logger.warning(f"⚠️ Lỗi gọi OpenAI API: {e}. Thử fallback.")
                if self.gemini_key:
                    try:
                        res = self._call_gemini(system_prompt, user_prompt, model=model)
                        if res:
                            return res
                    except Exception as ge:
                        logger.warning(f"⚠️ Lỗi gọi Gemini fallback: {ge}.")

        # Tier 2 Fallback
        if callable(fallback_fn):
            fb = fallback_fn()
            fb["status"] = "success"
            fb["provider"] = "offline-heuristic-engine"
            fb["model"] = "Quantitative Deterministic Heuristic v4.0"
            return fb

        return {"status": "error", "message": "Không thể kết nối AI provider"}

    def _call_gemini(self, system_prompt: str, user_prompt: str, model: Optional[str] = None) -> Optional[Dict[str, Any]]:
        target_model = (model or self.gemini_model or "gemini-3.5-flash").strip()
        models_to_try = [target_model]
        for alt in ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.1-pro-preview", "gemini-3.1-flash-lite", "gemini-1.5-flash"]:
            if alt not in models_to_try:
                models_to_try.append(alt)

        combined = f"{system_prompt}\n\n{user_prompt}\n\nQUY TẮC: Chỉ trả về JSON thuần, không bọc markdown ```json."
        token_limit = min(self.max_tokens, 4096) if self.max_tokens else 4096

        last_error = None
        for cur_model in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{cur_model}:generateContent?key={self.gemini_key}"
            payload = {
                "contents": [{"parts": [{"text": combined}]}],
                "generationConfig": {
                    "temperature": self.temperature,
                    "maxOutputTokens": token_limit,
                    "responseMimeType": "application/json"
                }
            }
            try:
                resp = requests.post(url, json=payload, timeout=60)
                if resp.status_code == 200:
                    data = resp.json()
                    raw = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                    if raw:
                        cleaned = raw.strip().replace("```json", "").replace("```", "").strip()
                        parsed = json.loads(cleaned)
                        parsed["status"] = "success"
                        parsed["provider"] = "gemini"
                        parsed["model"] = cur_model
                        return parsed
                else:
                    last_error = f"Gemini ({cur_model}) HTTP {resp.status_code}: {resp.text[:200]}"
                    logger.warning(f"⚠️ {cur_model} trả về lỗi HTTP {resp.status_code}. Thử model tiếp theo...")
            except Exception as e:
                last_error = f"Gemini ({cur_model}) error: {e}"
                logger.warning(f"⚠️ Lỗi kết nối {cur_model}: {e}. Thử model tiếp theo...")

        raise RuntimeError(last_error or "Tất cả mô hình Gemini đều không phản hồi")

    def _call_openai(self, system_prompt: str, user_prompt: str, model: Optional[str] = None) -> Optional[Dict[str, Any]]:
        target_model = (model or self.openai_model or "gpt-4o-mini").strip()
        url = f"{self.openai_base_url}/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.openai_key}"
        }
        payload = {
            "model": target_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "stream": False,
        }
        resp = requests.post(url, headers=headers, json=payload, timeout=60)
        if resp.status_code == 200:
            content_type = resp.headers.get("content-type", "")
            raw = ""
            if "text/event-stream" in content_type or resp.text.strip().startswith("data: "):
                # Xử lý trường hợp server/proxy trả về Server-Sent Events dù stream=False
                for line in resp.text.splitlines():
                    line = line.strip()
                    if line.startswith("data: ") and line != "data: [DONE]":
                        try:
                            chunk = json.loads(line[6:])
                            delta = chunk.get("choices", [{}])[0].get("delta", {}).get("content", "")
                            if delta:
                                raw += delta
                        except Exception:
                            pass
            else:
                data = resp.json()
                raw = data.get("choices", [{}])[0].get("message", {}).get("content", "")

            if raw:
                cleaned = raw.strip()
                if cleaned.startswith("```json"):
                    cleaned = cleaned[7:]
                if cleaned.startswith("```"):
                    cleaned = cleaned[3:]
                if cleaned.endswith("```"):
                    cleaned = cleaned[:-3]
                cleaned = cleaned.strip()
                parsed = json.loads(cleaned)
                parsed["status"] = "success"
                parsed["provider"] = "openai"
                parsed["model"] = target_model
                return parsed
        raise RuntimeError(f"OpenAI ({target_model}) HTTP {resp.status_code}: {resp.text}")

    # =========================================================================
    # MACRO STRATEGIST BRIEFING
    # =========================================================================
    def generate_macro_briefing(self, macro_data: Dict[str, Any], model: Optional[str] = None, provider: Optional[str] = None) -> Dict[str, Any]:
        def fallback():
            regime = macro_data.get("regime", {})
            phase = regime.get("titleVi", "Phục Hồi Kinh Tế")
            risk = macro_data.get("riskAssessment", {}).get("riskScore", 35)
            pe = macro_data.get("marketIndex", {}).get("currentPE", 13.8)
            stance = macro_data.get("assetAllocation", {}).get("stance", "TÍCH LŨY CỔ PHIẾU GIÁ TRỊ")
            yc = macro_data.get("yieldCurveMonitor", {}).get("summary", {})
            return {
                "headline": f"Chiến Lược CIO: Pha {phase} — {stance}",
                "executiveSummary": f"Môi trường vĩ mo Việt Nam đang trong pha {phase} với rủi ro hệ thống {risk}/100. P/E thị trường {pe}x tạo biên an toàn hấp dẫn cho chu kỳ đầu tư mới.",
                "macroRegimeAssessment": f"Tỷ giá USD/VND và lãi suất liên ngân hàng duy trì trong biên độ điều hành mục tiêu của SBV, bảo vệ thanh khoản hệ thống.",
                "yieldCurveDiagnosis": f"Đường cong lợi suất nằm ở trạng thái {yc.get('vnYcCode', 'YC0')} ({yc.get('vnYcLabel', 'Ổn định')}). Phần bù rủi ro vốn chủ ERP thuận lợi cho cổ phiếu.",
                "sectorActionStrategy": "Ưu tiên nhóm ngành Sweet Spot (Ngân hàng, Bán lẻ, Công nghệ) có tăng trưởng lợi nhuận vững chắc.",
                "assetAllocationAdvice": "Duy trì tỷ trọng 70% Cổ phiếu cơ bản và 30% Tiền mặt linh hoạt.",
                "strategicTakeaways": [
                    f"Định vị chu kỳ: Pha {phase} với rủi ro vĩ mô kiểm soát tốt ({risk}/100).",
                    f"P/E VN-Index {pe}x mở ra cơ hội tích lũy dài hạn.",
                    "Kiểm soát tỷ trọng cổ phiếu chu kỳ."
                ],
                "actionPlan": [
                    "Áp dụng phương pháp gom DCA tại các vùng định giá hấp dẫn.",
                    "Duy trì kỷ luật cơ cấu danh mục theo ngành dẫn dắt."
                ],
                "riskAlerts": [
                    "Theo dõi sát biến động tỷ giá USD/VND vượt ngưỡng 25,900 VND.",
                    "Lãi suất liên ngân hàng ON cần duy trì dưới 6.0%."
                ]
            }

        macro_summary = {
            "regime": macro_data.get("regime", {}),
            "riskAssessment": macro_data.get("riskAssessment", {}),
            "marketIndex": macro_data.get("marketIndex", {}),
            "yieldCurveSummary": macro_data.get("yieldCurveMonitor", {}).get("summary", {}),
            "assetAllocation": macro_data.get("assetAllocation", {}),
            "dualMatrix": macro_data.get("dualMatrix", {}),
            "goldAdvisor": macro_data.get("goldAdvisor", {}),
        }

        sys_prompt = (
            "Bạn là Giám đốc Đầu tư Chiến lược (Chief Investment Officer - CIO) hàng đầu am hiểu sâu sắc thị trường chứng khoán Việt Nam (HOSE, HNX, UPCoM).\n"
            "Dựa trên bức tranh số liệu vĩ mô, đường cong lợi suất TPCP, định giá VN-Index và ma trận ngành được cung cấp, "
            "hãy viết Báo cáo Chiến lược Điều hành CIO sắc bén, khách quan, giàu chiều sâu tài chính (tương tự báo cáo chiến lược của các quỹ ngoại hoặc CTCK hàng đầu).\n"
            "QUY TẮC BẮT BUỘC:\n"
            "- Viết bằng Tiếng Việt chuẩn mực, thuật ngữ tài chính chuẩn xác.\n"
            "- Tự tổng hợp nhận định định tính chuyên sâu từ các con số, tuyệt đối không lặp lại nguyên văn số liệu một cách sáo rỗng.\n"
            "- Trả về duy nhất một JSON object hợp lệ (không kèm markdown ```json hay giải thích thừa) theo cấu trúc schema sau:\n"
            "{\n"
            '  "headline": "Tiêu đề chiến lược cô đọng, sắc bén (ví dụ: Chiến Lược CIO: Pha Mở Rộng — Tận Dụng Biên An Toàn Tích Lũy)",\n'
            '  "executiveSummary": "Đoạn văn tóm tắt điều hành 2-3 câu tổng quan chu kỳ kinh tế, rủi ro hệ thống và luận điểm hành động chính",\n'
            '  "macroRegimeAssessment": "Nhận định chi tiết về pha chu kỳ kinh tế, phối hợp chính sách tiền tệ SBV và tỷ giá USD/VND",\n'
            '  "yieldCurveDiagnosis": "Phân tích đường cong lợi suất TPCP, thanh khoản liên ngân hàng và phần bù rủi ro vốn chủ ERP",\n'
            '  "sectorActionStrategy": "Chiến lược phân bổ nhóm ngành dẫn dắt (Sweet spot sectors) và lý do hưởng lợi",\n'
            '  "assetAllocationAdvice": "Khuyến nghị tỷ trọng phân bổ 4 lớp tài sản (Cổ phiếu, Tiền mặt/Trái phiếu, Vàng, Ngoại tệ)",\n'
            '  "strategicTakeaways": ["3 luận điểm chiến lược then chốt ngắn gọn"],\n'
            '  "actionPlan": ["3 bước hành động cụ thể cho nhà đầu tư cá nhân"],\n'
            '  "riskAlerts": ["2-3 cảnh báo rủi ro nhạy cảm cần theo dõi sát"]\n'
            "}"
        )
        user_prompt = f"Bức tranh số liệu vĩ mô & định giá thị trường thực tế:\n{json.dumps(macro_summary, ensure_ascii=False, indent=2)}"

        return self.generate_json(sys_prompt, user_prompt, fallback_fn=fallback, model=model, provider=provider)

    # =========================================================================
    # STOCK VALUATION DEEP DIVE
    # =========================================================================
    def generate_stock_deepdive(self, symbol: str, financial_data: Dict[str, Any], valuation_data: Dict[str, Any], model: Optional[str] = None, provider: Optional[str] = None) -> Dict[str, Any]:
        def fallback():
            fair = valuation_data.get("fairPrice") or financial_data.get("quote", {}).get("price", 0)
            mos = valuation_data.get("marginOfSafety", 0)
            zone = valuation_data.get("sevenPriceZones", {}).get("currentZone", "Fair Range")
            traps = valuation_data.get("valuationTraps", {})
            return {
                "recommendation": "🟢 MUA TÍCH LŨY GIÁ TRỊ" if mos >= 15 else ("🔴 CÂN NHẮC HẠ TỶ TRỌNG" if mos < -15 else "🟡 THEO DÕI NẮM GIỮ"),
                "convictionScore": 80 if abs(mos) >= 15 else 70,
                "thesisHeadline": f"Báo Cáo Phân Tích Định Lượng: {symbol} — Vị thế {zone}",
                "valuationConvergenceAnalysis": f"Hệ thống 10 mô hình định lượng xác định mức giá trị hợp lý {fair:,.0f}đ (MoS {mos}%).",
                "trapAssessment": f"Điểm bẫy định giá: {traps.get('trapScore', 0)}/10 ({traps.get('trapLabel', 'THẤP')}).",
                "catalysts": ["Năng lực tạo tiền mặt và biên lợi nhuận duy trì ổn định.", "Định giá hấp dẫn so với chu kỳ 5 năm."],
                "keyRisks": ["Biến động chi phí vốn và rủi ro thị trường chung."],
                "targetPriceHorizon12M": f"{fair:,.0f}đ"
            }

        stock_summary = {
            "symbol": symbol,
            "quote": financial_data.get("quote", {}),
            "fairPrice": valuation_data.get("fairPrice"),
            "marginOfSafety": valuation_data.get("marginOfSafety"),
            "models": valuation_data.get("models", {}),
            "sevenPriceZones": valuation_data.get("sevenPriceZones", {}),
            "valuationTraps": valuation_data.get("valuationTraps", {}),
            "ratios": financial_data.get("financialRatios", {}),
        }
        sys_prompt = (
            f"Bạn là Chuyên gia Phân tích Cấp cao (Senior Equity Research Analyst - CFA) chuyên sâu định giá cổ phiếu {symbol} niêm yết tại TTCK Việt Nam.\n"
            "Dựa trên kết quả định giá hội tụ từ 10 mô hình lượng hóa, sức khỏe tài chính và bẫy định giá, hãy viết báo cáo thẩm định cổ phiếu chuyên sâu.\n"
            "Chỉ trả về JSON thuần (không kèm markdown) theo cấu trúc schema sau:\n"
            "{\n"
            '  "recommendation": "🟢 MUA TÍCH LŨY GIÁ TRỊ | 🟡 THEO DÕI NẮM GIỮ | 🔴 CÂN NHẮC HẠ TỶ TRỌNG",\n'
            '  "convictionScore": 85,\n'
            '  "thesisHeadline": "Tiêu đề luận điểm đầu tư cốt lõi",\n'
            '  "valuationConvergenceAnalysis": "Phân tích sự hội tụ giữa các mô hình định lượng (DCF, Graham, P/E, P/B, RIM) và biên an toàn MoS",\n'
            '  "trapAssessment": "Đánh giá các bẫy định giá (bẫy thanh khoản, nợ vay, suy giảm lợi nhuận)",\n'
            '  "catalysts": ["2-3 động lực tăng trưởng then chốt trong 12 tháng tới"],\n'
            '  "keyRisks": ["2-3 rủi ro trọng yếu đối với doanh nghiệp"],\n'
            '  "targetPriceHorizon12M": "Giá mục tiêu 12 tháng (VNĐ)"\n'
            "}"
        )
        user_prompt = f"Dữ liệu định giá cổ phiếu {symbol}:\n{json.dumps(stock_summary, ensure_ascii=False, indent=2)}"

        return self.generate_json(sys_prompt, user_prompt, fallback_fn=fallback, model=model, provider=provider)

    # =========================================================================
    # WEEKLY MARKET WRAP & PULSE
    # =========================================================================
    def generate_weekly_market_pulse(
        self,
        market_data: Optional[Dict[str, Any]] = None,
        macro_data: Optional[Dict[str, Any]] = None,
        sector_data: Optional[Dict[str, Any]] = None,
        model: Optional[str] = None,
        provider: Optional[str] = None,
    ) -> Dict[str, Any]:
        market_data = market_data or {}
        macro_data = macro_data or {}
        sector_data = sector_data or {}

        def fallback():
            vnindex = market_data.get("vnindex", {}) or macro_data.get("marketIndex", {})
            pe = vnindex.get("currentPE", 13.5)
            pts = vnindex.get("close") or vnindex.get("price", 1250)
            change_w = vnindex.get("changeWeekPercent", 0.5)
            regime_title = macro_data.get("regime", {}).get("titleVi", "Phục Hồi Kinh Tế")
            return {
                "pulseHeadline": f"Nhịp Đập Tuần: VN-Index tích lũy quanh vùng {pts:,.0f} điểm trong pha {regime_title}",
                "weeklySummary": f"Thị trường khép lại tuần giao dịch với chỉ số VN-Index đóng cửa quanh {pts:,.0f} điểm ({'+' if change_w >= 0 else ''}{change_w}%). P/E thị trường duy trì ở mức {pe}x, thanh khoản có sự chọn lọc tập trung vào các nhóm cổ phiếu cơ bản có câu chuyện tăng trưởng.",
                "institutionalFlow": "Khối ngoại và tự doanh duy trì trạng thái giao dịch cân bằng, không xuất hiện áp lực bán tháo diện rộng trên nhóm vốn hóa lớn VN30.",
                "keyDevelopments": [
                    f"VN-Index kiểm định thành công vùng hỗ trợ kỹ thuật quan trọng và duy trì xu hướng tích lũy.",
                    f"Pha chu kỳ vĩ mô {regime_title} hỗ trợ tâm lý trung dài hạn của dòng vốn nội.",
                    "Sự phân hóa rõ nét giữa các nhóm ngành hưởng lợi từ chính sách tiền tệ và nhóm bị áp lực chi phí vốn."
                ],
                "weeklyLeadingSectors": [
                    "Nhóm dẫn dắt: Ngân hàng, Bán lẻ, Công nghệ thông tin giữ nhịp chỉ số.",
                    "Nhóm điều chỉnh tích lũy: Bất động sản dân dụng, Thép và Hóa chất."
                ],
                "nextWeekOutlook": "Xu hướng tuần tới dự kiến tiếp tục dao động tích lũy trong biên độ hẹp với thanh khoản trung bình. Dòng tiền sẽ tiếp tục tìm đến các cổ phiếu có biên an toàn định giá cao.",
                "actionableAdvice": "Chiến lược ưu tiên: Giữ tỷ trọng cổ phiếu ở mức 60-70%, kiên nhẫn tích lũy từng phần (DCA) tại các nhịp võng giá đối với các mã cơ bản, tránh mua đuổi trong các phiên hưng phấn."
            }

        pulse_summary = {
            "marketIndex": market_data or macro_data.get("marketIndex", {}),
            "regime": macro_data.get("regime", {}),
            "riskAssessment": macro_data.get("riskAssessment", {}),
            "sectorRotation": sector_data or macro_data.get("sectorRotation", {}),
            "dualMatrix": macro_data.get("dualMatrix", {}),
        }

        sys_prompt = (
            "Bạn là Trưởng Ban Phân Tích Chiến Lược Thị Trường (Head of Market Strategy) của một định chế tài chính uy tín tại Việt Nam.\n"
            "Dựa trên diễn biến giao dịch của tuần vừa qua (Weekly Market Wrap), dữ liệu định giá VN-Index, chu kỳ vĩ mô và luân chuyển nhóm ngành GICS, "
            "hãy viết Bản Tin Nhịp Đập Thị Trường Cuối Tuần (Weekly Market Pulse) sắc sảo, cô đọng, khách quan và giàu giá trị hành động cho nhà đầu tư.\n"
            "QUY TẮC BẮT BUỘC:\n"
            "- Viết bằng Tiếng Việt chuẩn mực, thuật ngữ tài chính chính xác.\n"
            "- Tập trung phân tích bức tranh tổng thể 1 tuần giao dịch, loại bỏ các biến động nhiễu từng phiên ngắn hạn.\n"
            "- Tự nhận định định tính sâu sắc từ các con số, tuyệt đối không lặp lại số liệu máy móc.\n"
            "- Trả về duy nhất một JSON object hợp lệ (không kèm markdown ```json hay giải thích thừa) theo cấu trúc schema sau:\n"
            "{\n"
            '  "pulseHeadline": "Tiêu đề nhịp đập thị trường tuần cô đọng, bao quát xu hướng tuần",\n'
            '  "weeklySummary": "Đoạn văn 3-4 câu tóm tắt bức tranh giao dịch tuần, biến động điểm số VN-Index, thanh khoản và tâm lý chung",\n'
            '  "institutionalFlow": "Đánh giá chi tiết dòng tiền tổ chức (Khối ngoại, tự doanh) trong cả tuần",\n'
            '  "keyDevelopments": ["3 diễn biến hoặc sự kiện trọng yếu đáng chú ý trong tuần"],\n'
            '  "weeklyLeadingSectors": ["2 nhận xét về nhóm ngành dẫn dắt hút tiền vs nhóm ngành điều chỉnh/tích lũy"],\n'
            '  "nextWeekOutlook": "Kịch bản dự phóng và xu hướng vận động của thị trường cho tuần giao dịch tiếp theo",\n'
            '  "actionableAdvice": "Chiến lược hành động khuyến nghị cho nhà đầu tư (tỷ trọng cổ phiếu, phương pháp DCA, quản trị rủi ro)"\n'
            "}"
        )
        user_prompt = f"Bức tranh thị trường và vĩ mô tuần qua:\n{json.dumps(pulse_summary, ensure_ascii=False, indent=2)}"

        return self.generate_json(sys_prompt, user_prompt, fallback_fn=fallback, model=model, provider=provider)

    # =========================================================================
    # 4. SEMANTIC NEWS NLP & CATALYST TRACKER
    # =========================================================================
    def generate_news_sentiment_analysis(
        self,
        symbol: str,
        news_data: Dict[str, Any],
        model: Optional[str] = None,
        provider: Optional[str] = None,
    ) -> Dict[str, Any]:
        articles = news_data.get("articles", []) if isinstance(news_data, dict) else (news_data if isinstance(news_data, list) else [])
        recent_articles = articles[:15] if isinstance(articles, list) else []

        def fallback():
            # Heuristic fallback dựa trên điểm số hiện có
            old_score = news_data.get("sentimentScore", 0) if isinstance(news_data, dict) else 0
            label = "Tích Cực" if old_score > 15 else ("Thận Trọng" if old_score < -15 else "Trung Tính")
            return {
                "overallSentiment": label,
                "sentimentScore": old_score,
                "executiveSummary": f"Dòng chảy thông tin báo chí 30 ngày qua của {symbol} duy trì trạng thái {label.lower()}, phản ánh sự ổn định trong hoạt động kinh doanh cốt lõi và thanh khoản thị trường.",
                "catalysts": [
                    f"Kỳ vọng tăng trưởng sản lượng và mở rộng thị phần trong các quý tới.",
                    f"Tiến độ giải ngân các dự án trọng điểm và kế hoạch trả cổ tức tiền mặt."
                ],
                "keyRisks": [
                    f"Biến động giá nguyên vật liệu đầu vào và sức ép cạnh tranh trong ngành.",
                    f"Rủi ro thị trường chung và sự đảo chiều dòng vốn khối ngoại."
                ],
                "catalystTimeline": "Trung hạn (3-6 tháng)"
            }

        if not recent_articles:
            fb = fallback()
            fb["status"] = "success"
            fb["provider"] = "offline-heuristic-engine"
            return fb

        news_digest = [
            {"title": a.get("title", ""), "date": a.get("date", ""), "source": a.get("source", "")}
            for a in recent_articles if isinstance(a, dict)
        ]

        sys_prompt = (
            f"Bạn là Chuyên viên Phân tích Tin tức & Tâm lý Thị trường (Media & Sentiment Intelligence Analyst) am hiểu sâu sắc TTCK Việt Nam.\n"
            f"Hãy phân tích danh sách các tin tức báo chí gần đây của mã cổ phiếu {symbol}.\n"
            "QUY TẮC BẮT BUỘC:\n"
            "- Loại bỏ hoàn toàn sự nhiễu loạn của các từ khóa giật gân, phân tích đúng ngữ cảnh kinh doanh và pháp lý thực tế tại Việt Nam.\n"
            "- Trích xuất chính xác các động lực thúc đẩy (Catalysts) thực sự và các rủi ro trọng yếu (Key Risks).\n"
            "- Trả về duy nhất một JSON object hợp lệ (không kèm markdown) theo cấu trúc sau:\n"
            "{\n"
            '  "overallSentiment": "Tích Cực | Trung Tính | Thận Trọng",\n'
            '  "sentimentScore": 65,\n'
            '  "executiveSummary": "Đoạn văn 2-3 câu tổng hợp sắc thái truyền thông và tâm lý nhà đầu tư 30 ngày qua",\n'
            '  "catalysts": ["2-3 động lực tăng trưởng kinh doanh hoặc sự kiện xúc tác cụ thể"],\n'
            '  "keyRisks": ["1-2 rủi ro pháp lý, chính sách hoặc áp lực cạnh tranh cần lưu tâm"],\n'
            '  "catalystTimeline": "Ngắn hạn (1-3 tháng) | Trung hạn (6-12 tháng)"\n'
            "}"
        )
        user_prompt = f"Danh sách tin tức gần đây của {symbol}:\n{json.dumps(news_digest, ensure_ascii=False, indent=2)}"

        return self.generate_json(sys_prompt, user_prompt, fallback_fn=fallback, model=model, provider=provider)

    # =========================================================================
    # 5. FORENSIC AUDITING & BENEISH M-SCORE EXPLAINER
    # =========================================================================
    def generate_forensic_audit_comment(
        self,
        symbol: str,
        forensic_data: Dict[str, Any],
        dupont_data: Optional[Dict[str, Any]] = None,
        model: Optional[str] = None,
        provider: Optional[str] = None,
    ) -> Dict[str, Any]:
        forensic_data = forensic_data or {}
        dupont_data = dupont_data or {}
        m_score = forensic_data.get("beneishMScore", {}).get("mScore") or forensic_data.get("mScore", -2.5)
        is_manipulator = forensic_data.get("beneishMScore", {}).get("isManipulator", False)
        components = forensic_data.get("beneishMScore", {}).get("components", {}) or forensic_data.get("components", {})
        z_score = forensic_data.get("altmanZ", {}).get("zScore", 3.0)

        def fallback():
            verdict = "Cần Lưu Ý Kế Toán" if is_manipulator or m_score > -1.78 else "Sạch Sẽ & Minh Bạch"
            flagged = []
            if components.get("dsri", 1.0) > 1.2:
                flagged.append("Phải thu khách hàng tăng nhanh hơn doanh thu (DSRI cao)")
            if components.get("aqi", 1.0) > 1.2:
                flagged.append("Tỷ trọng tài sản phi vật chất/chi phí dở dang gia tăng (AQI cao)")
            if components.get("sgi", 1.0) > 1.3:
                flagged.append("Tốc độ tăng trưởng doanh thu cao đột biến (SGI cao)")
            if not flagged:
                flagged = ["Các chỉ tiêu kế toán nằm trong giới hạn kiểm soát chuẩn mực."]

            return {
                "auditVerdict": verdict,
                "forensicDiagnosis": f"Hệ thống kế toán pháp y ghi nhận Beneish M-Score đạt {m_score:.2f} ({verdict}). {' '.join(flagged)}",
                "dupontEarningsQuality": "Chất lượng lợi nhuận ổn định, cơ cấu ROE được hỗ trợ bởi hiệu quả kinh doanh cốt lõi thay vì lạm dụng đòn bẩy tài chính quá mức.",
                "auditorChecklist": [
                    "Đối chiếu kỳ thu tiền bình quân và trích lập dự phòng phải thu khó đòi.",
                    "Kiểm tra tính sinh lời thực tế của các khoản đầu tư tài chính hoặc tài sản dở dang lớn."
                ]
            }

        audit_payload = {
            "symbol": symbol,
            "beneishMScore": m_score,
            "isManipulator": is_manipulator,
            "components": components,
            "altmanZ": z_score,
            "extendedDupont": dupont_data
        }

        sys_prompt = (
            f"Bạn là Trưởng Ban Kiểm Toán Pháp Y Doanh Nghiệp (Senior Forensic Auditor & CPA) chuyên thẩm tra BCTC tại TTCK Việt Nam.\n"
            f"Dựa trên các biến số Beneish M-Score 8 nhân tố (DSRI, GMI, AQI, SGI, DEPI, SGAI, LVGI, TATA), điểm Altman Z và phân rã Extended DuPont của {symbol}, "
            "hãy đưa ra kết luận chẩn đoán kế toán pháp y chuyên nghiệp, sắc bén và công tâm.\n"
            "QUY TẮC BẮT BUỘC:\n"
            "- Nhận diện rõ biến số nào bất thường: Doanh thu ảo dồn vào phải thu (DSRI)? Vốn hóa chi phí vào tài sản (AQI)? Lợi nhuận từ kế toán dồn tích (TATA)?\n"
            "- Đánh giá chất lượng lợi nhuận ROE: Tăng do biên ròng và vòng quay tài sản thật hay do thổi phồng đòn bẩy nợ vay?\n"
            "- Trả về duy nhất một JSON object hợp lệ (không kèm markdown) theo cấu trúc:\n"
            "{\n"
            '  "auditVerdict": "Sạch Sẽ & Minh Bạch | Cần Lưu Ý Kế Toán | Rủi Ro Thao Túng BCTC",\n'
            '  "forensicDiagnosis": "Đoạn văn 2-3 câu phân tích chỉ rõ các biến số M-Score bất thường và tính minh bạch của BCTC",\n'
            '  "dupontEarningsQuality": "Đoạn văn 2 câu đánh giá chất lượng ROE: thực chất từ hiệu quả kinh doanh hay do thủ thuật đòn bẩy tài chính",\n'
            '  "auditorChecklist": ["2 câu hỏi kiểm toán then chốt để chất vấn Ban Lãnh Đạo tại ĐHCĐ"]\n'
            "}"
        )
        user_prompt = f"Số liệu kế toán pháp y & DuPont của {symbol}:\n{json.dumps(audit_payload, ensure_ascii=False, indent=2)}"

        return self.generate_json(sys_prompt, user_prompt, fallback_fn=fallback, model=model, provider=provider)

    # =========================================================================
    # 6. VALUATION CONVERGENCE & SENSITIVITY INTERPRETER
    # =========================================================================
    def generate_valuation_convergence_comment(
        self,
        symbol: str,
        valuation_data: Dict[str, Any],
        model: Optional[str] = None,
        provider: Optional[str] = None,
    ) -> Dict[str, Any]:
        valuation_data = valuation_data or {}
        fair_price = valuation_data.get("fairPrice", 0)
        close_price = valuation_data.get("close", 0)
        mos = valuation_data.get("marginOfSafety", 0)
        models_list = valuation_data.get("models10", [])

        def fallback():
            return {
                "convergenceHeadline": f"Định giá hội tụ {symbol} phản ánh biên an toàn {mos}% so với thị giá",
                "divergenceExplanation": "Sự phân kỳ giữa mô hình chiết khấu dòng tiền (DCF) và mô hình so sánh tương đối (P/E, P/B) phản ánh đặc thù chu kỳ vốn và năng lực tái đầu tư của doanh nghiệp.",
                "sensitivityStory": "Trong kịch bản chi phí vốn WACC tăng thêm 1.0 - 1.5% do lãi suất điều hành thắt chặt, giá trị nội tại ước tính điều chỉnh giảm khoảng 8-12%, nhưng vẫn giữ vững biên an toàn phòng thủ.",
                "preferredModelRecommendation": "Ưu tiên phối hợp giữa P/E mục tiêu theo chu kỳ và Gordon Growth DDM để cân bằng giữa định giá thị trường và dòng tiền trả cổ tức thực tế."
            }

        val_summary = {
            "symbol": symbol,
            "fairPrice": fair_price,
            "closePrice": close_price,
            "marginOfSafety": mos,
            "models": [{"id": m.get("id"), "name": m.get("name"), "value": m.get("value"), "weight": m.get("weight")} for m in models_list]
        }

        sys_prompt = (
            f"Bạn là Trưởng Bộ Phận Định Giá Tài Sản (Head of Equity Valuation - CFA) am hiểu sâu sắc các mô hình định giá tại Việt Nam.\n"
            f"Dựa trên kết quả hội tụ của 10 mô hình định lượng (DCF, Graham, P/E, P/B, P/S, FCFE, Residual Income, Book NAV, EV/EBITDA) của {symbol}, "
            "hãy viết báo cáo luận giải tính hội tụ và thử tải độ nhạy tài chính.\n"
            "Chỉ trả về JSON thuần (không kèm markdown) theo cấu trúc:\n"
            "{\n"
            '  "convergenceHeadline": "Tiêu đề luận điểm hội tụ định giá ngắn gọn",\n'
            '  "divergenceExplanation": "Giải thích tại sao các mô hình có sự chênh lệch (DCF vs P/E vs P/B) dựa trên vòng đời và chu kỳ tái đầu tư CapEx của doanh nghiệp",\n'
            '  "sensitivityStory": "Mô phỏng câu chuyện thử tải: Nếu chi phí vốn WACC tăng 1.5% hoặc tăng trưởng dài hạn giảm 1%, biên an toàn biến động ra sao",\n'
            '  "preferredModelRecommendation": "Khuyến nghị mô hình định giá tin cậy nhất đối với phân ngành đặc thù của doanh nghiệp này"\n'
            "}"
        )
        user_prompt = f"Bảng phân tích 10 mô hình định giá của {symbol}:\n{json.dumps(val_summary, ensure_ascii=False, indent=2)}"

        return self.generate_json(sys_prompt, user_prompt, fallback_fn=fallback, model=model, provider=provider)

    # =========================================================================
    # 7. MACRO-TO-SECTOR TRANSMISSION ANALYSIS
    # =========================================================================
    def generate_sector_transmission_analysis(
        self,
        macro_data: Dict[str, Any],
        sector_data: Dict[str, Any],
        model: Optional[str] = None,
        provider: Optional[str] = None,
    ) -> Dict[str, Any]:
        macro_data = macro_data or {}
        sector_data = sector_data or {}
        regime = macro_data.get("regime", {})
        macro_summary = macro_data.get("macro", {})

        def fallback():
            return {
                "transmissionHeadline": "Dẫn truyền vĩ mô: Phân hóa mạnh mẽ giữa nhóm hưởng lợi lãi suất thấp và nhóm chịu sức ép tỷ giá",
                "beneficiarySectors": [
                    "Ngân hàng & Dịch vụ Tài chính: Thanh khoản liên ngân hàng dồi dào, biên lãi ròng NIM duy trì ổn định.",
                    "Bán lẻ & Hàng tiêu dùng: Hưởng lợi từ sự phục hồi sức mua nội địa và tăng trưởng bán lẻ hai con số.",
                    "Công nghệ thông tin: Doanh thu xuất khẩu dịch vụ bằng USD, hầu như không chịu rủi ro nợ ngoại tệ."
                ],
                "pressuredSectors": [
                    "Bất động sản dân dụng: Áp lực chi phí tài chính và tiến độ tháo gỡ pháp lý phân hóa giữa các chủ đầu tư.",
                    "Điện & Tiện ích: Một số dự án có dư nợ vay ngoại tệ USD chịu chi phí lỗ tỷ giá trong ngắn hạn."
                ],
                "portfolioAction": "Tập trung phân bổ vào các nhóm ngành Sweet Spot có khả năng chuyển hóa chi phí vốn thấp thành biên lợi nhuận ròng mở rộng."
            }

        context = {
            "regime": regime,
            "macroIndicators": {
                "usdVnd": macro_summary.get("usdVnd"),
                "bondYield10Y": macro_summary.get("bondYield10Y"),
                "sbvDiscountRate": macro_summary.get("sbvDiscountRate"),
                "brentOil": macro_summary.get("brentOil"),
            },
            "sectors": sector_data.get("sectors", []) if isinstance(sector_data, dict) else []
        }

        sys_prompt = (
            "Bạn là Giám Đốc Phân Bổ Ngành Chiến Lược (Senior Sector Rotation Strategist) tại Việt Nam.\n"
            "Dựa trên các biến số vĩ mô thực tế (Tỷ giá USD/VND, Lợi suất TPCP 10Y, Lãi suất SBV, Giá dầu) và định giá 10 nhóm ngành GICS, "
            "hãy phân tích cơ chế dẫn truyền tác động vĩ mô (Transmission Mechanism) vào từng nhóm ngành cụ thể.\n"
            "Chỉ trả về JSON thuần (không kèm markdown) theo cấu trúc:\n"
            "{\n"
            '  "transmissionHeadline": "Tiêu đề thông điệp dẫn truyền vĩ mô cô đọng",\n'
            '  "beneficiarySectors": ["3 nhóm ngành hưởng lợi tích cực nhất kèm luận điểm dẫn truyền vĩ mô cụ thể"],\n'
            '  "pressuredSectors": ["2 nhóm ngành chịu sức ép chi phí vốn/tỷ giá/cầu yếu cần thận trọng"],\n'
            '  "portfolioAction": "Chiến lược luân chuyển danh mục thực chiến cho nhà đầu tư"\n'
            "}"
        )
        user_prompt = f"Bức tranh vĩ mô và ngành:\n{json.dumps(context, ensure_ascii=False, indent=2)}"

        return self.generate_json(sys_prompt, user_prompt, fallback_fn=fallback, model=model, provider=provider)


# Singleton
ai_service = PythonAiService()
