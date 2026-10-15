#!/usr/bin/env python3
"""
scripts/lib/ai_service.py
Module dịch vụ AI dùng chung (Python AI Service):
Hỗ trợ cả Google Gemini REST API và OpenAI Standard API (/v1/chat/completions).
Tự động fallback sang Two-Tier Heuristic Engine 0ms nếu không có API Key.
"""

import os
import json
import time
import logging
from pathlib import Path
from typing import Any, Dict, Optional, List

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
        if prov in ("heuristic", "offline", "fallback"):
            return "heuristic_fallback"
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
            # Exponential Backoff Retry (up to 3 attempts on HTTP 429)
            for attempt in range(3):
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
                    elif resp.status_code == 429:
                        wait_s = 2.0 * (2 ** attempt)
                        logger.warning(f"⚠️ Gemini ({cur_model}) HTTP 429 Rate Limit. Tạm nghỉ {wait_s}s trước khi thử lại lần {attempt + 1}/3...")
                        time.sleep(wait_s)
                        continue
                    else:
                        last_error = f"Gemini ({cur_model}) HTTP {resp.status_code}: {resp.text[:200]}"
                        logger.warning(f"⚠️ {cur_model} trả về lỗi HTTP {resp.status_code}. Thử model tiếp theo...")
                        break
                except Exception as e:
                    last_error = f"Gemini ({cur_model}) error: {e}"
                    logger.warning(f"⚠️ Lỗi kết nối {cur_model}: {e}. Thử model tiếp theo...")
                    break

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

        # Exponential Backoff Retry (up to 3 attempts on HTTP 429)
        max_retries = 3
        timeout_s = int(os.environ.get("OPENAI_TIMEOUT", 75))
        for attempt in range(max_retries):
            try:
                resp = requests.post(url, headers=headers, json=payload, timeout=timeout_s)
                if resp.status_code == 200:
                    content_type = resp.headers.get("content-type", "")
                    raw = ""
                    if "text/event-stream" in content_type or resp.text.strip().startswith("data: "):
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
                elif resp.status_code == 429:
                    wait_s = 2.0 * (2 ** attempt)
                    logger.warning(f"⚠️ OpenAI ({target_model}) HTTP 429 Rate Limit. Tạm nghỉ {wait_s}s trước khi thử lại lần {attempt + 1}/{max_retries}...")
                    time.sleep(wait_s)
                    continue
                else:
                    raise RuntimeError(f"OpenAI ({target_model}) HTTP {resp.status_code}: {resp.text[:200]}")
            except Exception as e:
                if attempt < max_retries - 1 and ("429" in str(e) or "rate" in str(e).lower()):
                    wait_s = 2.0 * (2 ** attempt)
                    logger.warning(f"⚠️ OpenAI ({target_model}) gặp lỗi tốc độ {e}. Tạm nghỉ {wait_s}s...")
                    time.sleep(wait_s)
                    continue
                raise

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

        vnindex_raw = macro_data.get("marketIndex", {})
        compact_market = {
            "currentPoint": vnindex_raw.get("currentPoint") or vnindex_raw.get("close") or 1250,
            "currentPE": vnindex_raw.get("currentPE") or 13.5,
            "currentPB": vnindex_raw.get("currentPB") or 1.6,
            "peZone": vnindex_raw.get("historicalBands", {}).get("pe", {}).get("zone", "Hợp lý"),
        }
        dual_raw = macro_data.get("dualMatrix", {})
        compact_sectors = {
            "sweetSpot": [item.get("sectorName") for item in dual_raw.get("items", []) if item.get("quadrant") == "sweetSpot"],
            "avoid": [item.get("sectorName") for item in dual_raw.get("items", []) if item.get("quadrant") in ("avoid", "valueTrap")],
        }

        macro_summary = {
            "regime": macro_data.get("regime", {}),
            "riskAssessment": macro_data.get("riskAssessment", {}),
            "marketIndex": compact_market,
            "yieldCurveSummary": macro_data.get("yieldCurveMonitor", {}).get("summary", {}),
            "assetAllocation": macro_data.get("assetAllocation", {}),
            "sectors": compact_sectors,
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

    # =========================================================================
    # 7B. COMPREHENSIVE MACRO INTELLIGENCE SUITE (SCENARIOS, CLOCK, YIELD, GOLD, STYLE)
    # =========================================================================
    def generate_macro_intelligence_suite(
        self,
        macro_data: Dict[str, Any],
        model: Optional[str] = None,
        provider: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Sinh trọn gói toàn bộ phân hệ phân tích vĩ mô nâng cấp trong đúng 1 request duy nhất:
        1. aiScenarios: 3 Kịch bản VN-Index định lượng động & phân bổ ngành
        2. aiClockDynamics: Đồng hồ vĩ mô, kim chỉ giờ, vận tốc chuyển pha & tương quan lịch sử
        3. aiYieldCurveDiagnosis: Chẩn đoán thị trường nợ & thanh khoản hệ thống
        4. aiMultiAssetStrategy: Chiến lược phân bổ 4 tài sản & tư vấn vàng
        5. aiStyleRotation: Xu hướng luân chuyển dòng vốn giữa 4 phân khúc (VN30, Diamond, Midcap)
        6. aiTailRiskAnalysis: Chuỗi dẫn truyền rủi ro đuôi khi có cảnh báo kích hoạt
        """
        macro_data = macro_data or {}
        vnindex = macro_data.get("marketIndex", {})
        cur_pt = float(vnindex.get("currentPoint") or vnindex.get("close") or 1250.0)
        cur_pe = float(vnindex.get("currentPE") or 13.5)
        regime = macro_data.get("regime", {})
        clock_base = macro_data.get("macroClock", {})
        risk = macro_data.get("riskAssessment", {})
        risk_score = float(risk.get("riskScore", 45))
        yc = macro_data.get("yieldCurveMonitor", {}).get("summary", {})
        macro_indicators = macro_data.get("macro", {})
        gold_adv = macro_data.get("goldAdvisor", {})
        tail_risks = macro_data.get("tailRisks", [])
        has_active_tail = bool(macro_data.get("hasActiveTailRisk", False))

        # Phân bổ xác suất cơ sở động theo Risk Score
        if risk_score <= 40.0:
            prob_base, prob_bull, prob_bear = 55, 30, 15
        elif risk_score <= 60.0:
            prob_base, prob_bull, prob_bear = 50, 25, 25
        else:
            prob_base, prob_bull, prob_bear = 45, 20, 35

        def fallback():
            # Base ranges calculated around current point
            base_min = int(round(cur_pt * 0.98))
            base_max = int(round(cur_pt * 1.04))
            bull_min = int(round(cur_pt * 1.03))
            bull_max = int(round(cur_pt * 1.10))
            bear_min = int(round(cur_pt * 0.90))
            bear_max = int(round(cur_pt * 0.97))

            gdp_val = float(macro_indicators.get("gdpGrowthYoY", 6.8))
            cpi_val = float(macro_indicators.get("cpi", 3.8))
            prem_sjc = float(gold_adv.get("spreadSjcVsWorldPct", 12.5))

            return {
                "aiScenarios": {
                    "marketVerdict": f"VN-Index dao động tích lũy quanh vùng {cur_pt:,.0f} điểm (P/E {cur_pe:.1f}x), phân hóa theo năng lực tăng trưởng EPS thực tế của từng nhóm ngành.",
                    "scenarios": {
                        "base": {
                            "name": "Kịch Bản Cơ Sở (Base Case)",
                            "probability": prob_base,
                            "vnIndexTargetRange": f"{base_min:,} - {base_max:,}",
                            "targetPeRange": f"{max(11.5, cur_pe - 0.5):.1f}x - {cur_pe + 0.8:.1f}x",
                            "projectedEpsGrowth": "+10.0% – 12.5%",
                            "macroCatalysts": [
                                "SBV duy trì mặt bằng lãi suất điều hành hỗ trợ, tín dụng tăng trưởng mục tiêu 14-15%.",
                                "Tỷ giá USD/VND dao động trong biên độ quản lý, thanh khoản hệ thống liên ngân hàng giữ mức cân bằng.",
                                "Tháo gỡ pháp lý dự án bất động sản và đẩy mạnh giải ngân đầu tư công trọng điểm."
                            ],
                            "leadingSectors": [
                                {"sector": "Ngân Hàng", "thesis": "Tăng trưởng tín dụng ổn định, NIM giữ vững, trích lập dự phòng trong tầm kiểm soát."},
                                {"sector": "Bán Lẻ", "thesis": "Hưởng lợi trực tiếp từ sự phục hồi sức mua tiêu dùng nội địa và chính sách kích cầu."}
                            ],
                            "laggingSectors": [
                                {"sector": "Bất Động Sản Dân Dụng", "risk": "Tiến độ bán hàng và cấp phép dự án mới phân hóa mạnh giữa các chủ đầu tư."}
                            ],
                            "tacticalAllocation": {"equity": 60, "bond": 25, "cash": 10, "gold": 5},
                            "actionSummary": "Ưu tiên tích lũy từng phần các cổ phiếu đầu ngành có định giá rẻ và P/E chu kỳ hấp dẫn."
                        },
                        "bull": {
                            "name": "Kịch Bản Tích Cực (Bull Case)",
                            "probability": prob_bull,
                            "vnIndexTargetRange": f"{bull_min:,} - {bull_max:,}",
                            "targetPeRange": f"{cur_pe + 0.8:.1f}x - {cur_pe + 2.2:.1f}x",
                            "projectedEpsGrowth": "+14.0% – 18.0%",
                            "macroCatalysts": [
                                "Fed tiếp tục chu kỳ nới lỏng chính sách tiền tệ, khối ngoại đảo chiều mua ròng mạnh mẽ.",
                                "Hệ thống KRX và cơ chế Non-prefunding vận hành trơn tru, đẩy nhanh tiến trình nâng hạng FTSE Emerging Markets.",
                                "Lợi nhuận ròng toàn thị trường bứt phá vượt kỳ vọng của các định chế tài chính."
                            ],
                            "leadingSectors": [
                                {"sector": "Chứng Khoán", "thesis": "Thanh khoản thị trường bùng nổ vượt 25.000 tỷ/phiên, mảng tự doanh và cho vay margin tăng vọt."},
                                {"sector": "Công Nghệ Thông Tin", "thesis": "Đơn hàng xuất khẩu phần mềm bằng ngoại tệ tăng trưởng cao, hưởng lợi từ sóng AI và bán dẫn."}
                            ],
                            "laggingSectors": [
                                {"sector": "Tiện Ích Phòng Thủ", "risk": "Dòng tiền thông minh rút khỏi nhóm phòng thủ để luân chuyển sang cổ phiếu Beta cao."}
                            ],
                            "tacticalAllocation": {"equity": 75, "bond": 15, "cash": 7, "gold": 3},
                            "actionSummary": "Tận dụng đà tăng mở rộng tỷ trọng nhóm ngành dẫn dắt High-Beta và nắm giữ theo xu hướng."
                        },
                        "bear": {
                            "name": "Kịch Bản Thận Trọng (Bear Case)",
                            "probability": prob_bear,
                            "vnIndexTargetRange": f"{bear_min:,} - {bear_max:,}",
                            "targetPeRange": "11.2x - 12.3x",
                            "projectedEpsGrowth": "+2.0% – 5.0%",
                            "macroCatalysts": [
                                "Căng thẳng địa chính trị quốc tế đẩy giá dầu thô và cước vận tải tăng cao, gây áp lực lạm phát chi phí đẩy.",
                                "Chỉ số DXY tăng vọt buộc SBV phải phát hành tín phiếu hút ròng thanh khoản tiền đồng hoặc can thiệp bán ngoại tệ.",
                                "Áp lực đáo hạn trái phiếu doanh nghiệp gia tăng cục bộ tại một số tổ chức phát hành."
                            ],
                            "leadingSectors": [
                                {"sector": "Năng Lượng & Dầu Khí", "thesis": "Giá dầu thế giới neo cao hỗ trợ trực tiếp biên lợi nhuận nhóm thượng nguồn PVD, PVS."},
                                {"sector": "Tiêu Dùng Thiết Yếu", "thesis": "Nhu cầu hàng thiết yếu ít co giãn theo thu nhập, dòng tiền phòng thủ trú ẩn an toàn."}
                            ],
                            "laggingSectors": [
                                {"sector": "Bất Động Sản", "risk": "Áp lực chi phí tài chính gia tăng và thanh khoản dòng tiền suy yếu."},
                                {"sector": "Thép & Vật Liệu", "risk": "Biến động chi phí đầu vào và sức cầu tiêu thụ công trình chậm lại."}
                            ],
                            "tacticalAllocation": {"equity": 35, "bond": 35, "cash": 20, "gold": 10},
                            "actionSummary": "Nâng tỷ trọng tiền mặt và tài sản phòng thủ, kiên nhẫn chờ đợi điểm cân bằng định giá sâu."
                        }
                    }
                },
                "aiClockDynamics": {
                    "clockHandPosition": "2:30 (Cuối pha Mở Rộng — Chớm Tăng Nhiệt)",
                    "transitionVelocity": "TRUNG BÌNH (Moderate Drift)",
                    "dynamicsAnalysis": f"Kinh tế Việt Nam tiếp tục duy trì đà tăng trưởng cao với GDP {gdp_val:.1f}%. Tuy nhiên, áp lực lạm phát CPI ({cpi_val:.1f}%) và tỷ giá USD/VND đang đặt chính sách tiền tệ vào trạng thái cân bằng thận trọng.",
                    "historicalAnalog": {
                        "period": "Giai đoạn Quý 4/2017 – Quý 1/2018",
                        "similarity": "Sản xuất và xuất khẩu tăng tốc ấn tượng, tín dụng mở rộng mạnh nhưng lãi suất bắt đầu tạo đáy và chuẩn bị bước vào giai đoạn phân hóa."
                    },
                    "sectorPlaybook": {
                        "favored": ["Ngân Hàng Chất Lượng Cao", "Bán Lẻ", "Công Nghệ Thông Tin", "Khu Công Nghiệp FDI"],
                        "cautious": ["Bất Động Sản Đòn Bẩy Cao", "Xây Dựng Nhạy Chi Phí Lãi Vay", "Vật Liệu Nhạy Giá"]
                    }
                },
                "aiYieldCurveDiagnosis": {
                    "curveStatus": f"Đường cong lợi suất TPCP Việt Nam nằm ở trạng thái {yc.get('vnYcLabel', 'Bình thường dốc lên')}, chênh lệch 10Y-2Y phản ánh tâm lý ổn định của thị trường trái phiếu.",
                    "bankingLiquidityImpact": "Thanh khoản hệ thống ngân hàng được hỗ trợ bởi các công cụ OMO của SBV, biên lãi ròng NIM có dư địa phục hồi nhẹ.",
                    "corporateDebtStress": "Áp lực đáo hạn trái phiếu doanh nghiệp đang được các ngân hàng thương mại tái cơ cấu có chọn lọc, rủi ro vỡ nợ hệ thống ở mức thấp.",
                    "equityMarketSignal": "Lợi tức thu nhập E/P thị trường cổ phiếu (~7.4%) duy trì mức chênh lệch dương hấp dẫn so với lợi suất TPCP 10 năm (~4.4%)."
                },
                "aiMultiAssetStrategy": {
                    "multiAssetThesis": "Môi trường vĩ mô ủng hộ chiến lược phân bổ tập trung vào Cổ phiếu giá trị (60%) và Trái phiếu/Tiền gửi (25-30%), duy trì tỷ trọng Vàng ở mức phòng vệ hợp lý (5-10%).",
                    "goldArbitrageRationale": f"Chênh lệch giá vàng SJC so với vàng thế giới quy đổi đang ở mức {prem_sjc:.1f}%. Mức chênh lệch này cảnh báo nhà đầu tư cá nhân không nên mua đuổi vàng miếng SJC ở vùng giá chênh lệch cao.",
                    "policyRiskAlert": "Ngân hàng Nhà nước có thể tiếp tục can thiệp thị trường vàng qua các biện pháp quản lý hành chính và thanh tra giao dịch.",
                    "recommendedAllocation": {"equity": 60, "bond": 25, "cash": 10, "gold": 5}
                },
                "aiStyleRotation": {
                    "rotationHeadline": "Dòng vốn tổ chức ưu tiên rổ Kim Cương VN Diamond và Blue-chips VN30 có nền tảng phòng thủ vững chắc",
                    "largeCapVsMidcap": "Nhóm Large-Cap VN30 đóng vai trò giữ nhịp chỉ số trong khi VN Midcap có sự phân hóa cao, chỉ những mã có câu chuyện tăng trưởng EPS riêng biệt mới thu hút dòng tiền.",
                    "diamondForeignRoom": "Các cổ phiếu rổ VN Diamond tiếp tục được định giá cao hơn mặt bằng chung nhờ tỷ lệ sở hữu của khối ngoại luôn chạm trần (FSR).",
                    "actionableStrategy": "Chiến lược phân bổ: 50% VN30 đầu ngành, 30% VN Diamond hết room ngoại và 20% VN Midcap chọn lọc."
                },
                "aiTailRiskAnalysis": {
                    "contingencyPlan": "Duy trì kỷ luật dừng lỗ tại các ngưỡng hỗ trợ kỹ thuật trọng yếu và chủ động hạ tỷ lệ margin khi thị trường xuất hiện tín hiệu căng thẳng thanh khoản liên ngân hàng.",
                    "contagionChain": "Nếu tỷ giá USD/VND vượt đỉnh, áp lực rút vốn ròng của khối ngoại sẽ tác động trực tiếp lên nhóm cổ phiếu vốn hóa lớn VN30, sau đó lan tỏa sang tâm lý thị trường chung."
                }
            }

        sys_prompt = (
            "Bạn là Giám Đốc Chiến Lược Vĩ Mô & Thị Trường Vốn (Chief Macro & Capital Markets Strategist) hàng đầu tại Việt Nam.\n"
            "Dựa trên các số liệu vĩ mô, định giá VN-Index, đường cong lợi suất TPCP, phong cách thị trường và dữ liệu vàng được cung cấp, "
            "hãy lập Bản Phân Tích Vĩ Mô & Định Lượng Đa Kịch Bản (Macro Intelligence Suite) theo đúng cấu trúc JSON quy chuẩn.\n"
            "QUY TẮC BẮT BUỘC:\n"
            "- Viết bằng Tiếng Việt chuẩn mực, sắc sảo, ngôn từ tài chính chuyên nghiệp cấp quỹ đầu tư ngoại.\n"
            "- Phân tích sâu sắc cơ chế dẫn truyền kinh tế, chỉ ra đúng nguyên nhân và tác động thực tế.\n"
            "- Trả về DUY NHẤT một JSON object hợp lệ (không kèm markdown ```json hay giải thích ngoài lề) theo đúng schema sau:\n"
            "{\n"
            '  "aiScenarios": {\n'
            '    "marketVerdict": "Nhận định tổng quan 1-2 câu về xu hướng VN-Index",\n'
            '    "scenarios": {\n'
            '      "base": {\n'
            '        "name": "Kịch Bản Cơ Sở (Base Case)",\n'
            '        "probability": 55,\n'
            '        "vnIndexTargetRange": "1.280 - 1.340",\n'
            '        "targetPeRange": "13.2x - 14.0x",\n'
            '        "projectedEpsGrowth": "+10% - 12%",\n'
            '        "macroCatalysts": ["3 chất xúc tác vĩ mô/dòng tiền kích hoạt kịch bản"],\n'
            '        "leadingSectors": [{"sector": "Tên ngành", "thesis": "Luận điểm hưởng lợi"}],\n'
            '        "laggingSectors": [{"sector": "Tên ngành", "risk": "Luận điểm rủi ro"}],\n'
            '        "tacticalAllocation": {"equity": 60, "bond": 25, "cash": 10, "gold": 5},\n'
            '        "actionSummary": "Khuyến nghị hành động cô đọng"\n'
            '      },\n'
            '      "bull": { ...cùng cấu trúc... },\n'
            '      "bear": { ...cùng cấu trúc... }\n'
            '    }\n'
            '  },\n'
            '  "aiClockDynamics": {\n'
            '    "clockHandPosition": "Vị trí kim đồng hồ (ví dụ: 2:30 - Cuối pha Mở Rộng, Chớm Tăng Nhiệt)",\n'
            '    "transitionVelocity": "Vận tốc dịch chuyển (CHẬM / TRUNG BÌNH / NHANH)",\n'
            '    "dynamicsAnalysis": "Phân tích chi tiết động lực học từ GDP, CPI, PMI, Lãi suất và Tỷ giá",\n'
            '    "historicalAnalog": {\n'
            '      "period": "Giai đoạn lịch sử TTCK VN tương đồng nhất (ví dụ: Q4/2017 – Q1/2018)",\n'
            '      "similarity": "Điểm tương đồng chính về vĩ mô và diễn biến dòng tiền"\n'
            '    },\n'
            '    "sectorPlaybook": {\n'
            '      "favored": ["3 ngành đón đầu chu kỳ"],\n'
            '      "cautious": ["2 ngành nên thận trọng"]\n'
            '    }\n'
            '  },\n'
            '  "aiYieldCurveDiagnosis": {\n'
            '    "curveStatus": "Nhận định hình dạng và độ dốc đường cong TPCP Việt Nam",\n'
            '    "bankingLiquidityImpact": "Tác động đến thanh khoản ngân hàng, chi phí vốn và NIM",\n'
            '    "corporateDebtStress": "Áp lực đáo hạn trái phiếu doanh nghiệp và khả năng tái tài trợ",\n'
            '    "equityMarketSignal": "Tín hiệu phần bù rủi ro vốn chủ sở hữu ERP đối với thị trường cổ phiếu"\n'
            '  },\n'
            '  "aiMultiAssetStrategy": {\n'
            '    "multiAssetThesis": "Luận điểm phân bổ 4 lớp tài sản tối ưu",\n'
            '    "goldArbitrageRationale": "Nhận định độ lệch giá vàng SJC vs thế giới và thời điểm mua/bán",\n'
            '    "policyRiskAlert": "Cảnh báo rủi ro chính sách đối với vàng hoặc tỷ giá",\n'
            '    "recommendedAllocation": {"equity": 60, "bond": 25, "cash": 10, "gold": 5}\n'
            '  },\n'
            '  "aiStyleRotation": {\n'
            '    "rotationHeadline": "Thông điệp xu hướng luân chuyển giữa các phong cách vốn hóa",\n'
            '    "largeCapVsMidcap": "So sánh tương quan giữa VN30 và VN Midcap",\n'
            '    "diamondForeignRoom": "Nhận định về nhóm cổ phiếu kín room ngoại VN Diamond",\n'
            '    "actionableStrategy": "Chiến lược phân bổ tỷ trọng khuyến nghị"\n'
            '  },\n'
            '  "aiTailRiskAnalysis": {\n'
            '    "contingencyPlan": "Kế hoạch ứng phó kịch bản thiên nga đen / rủi ro đuôi",\n'
            '    "contagionChain": "Chuỗi tác động lan truyền vào các nhóm ngành"\n'
            '  }\n'
            "}"
        )

        compact_market = {
            "currentPoint": cur_pt,
            "currentPE": cur_pe,
            "currentPB": vnindex.get("currentPB"),
            "peZone": (vnindex.get("peBands") or {}).get("currentZone", "Fair Value"),
            "zScore": (vnindex.get("peBands") or {}).get("zScore"),
        }
        compact_yc = {
            "summary": yc,
            "links": macro_data.get("yieldCurveMonitor", {}).get("links", {}),
        }
        si = macro_data.get("styleIndices", [])
        compact_styles = [
            {"code": s.get("code"), "name": s.get("name"), "pe": s.get("pe"), "pb": s.get("pb"), "strategy": s.get("strategy")}
            for s in si
        ] if isinstance(si, list) else si

        context = {
            "marketIndex": compact_market,
            "regime": regime,
            "macroClock": clock_base,
            "riskAssessment": risk,
            "macroIndicators": macro_indicators,
            "yieldCurve": compact_yc,
            "goldAdvisor": gold_adv,
            "styleIndices": compact_styles,
            "hasActiveTailRisk": has_active_tail,
            "tailRisks": tail_risks,
        }
        user_prompt = f"Bức tranh vĩ mô, thị trường và định giá Việt Nam thực tế:\n{json.dumps(context, ensure_ascii=False, indent=2)}"

        return self.generate_json(sys_prompt, user_prompt, fallback_fn=fallback, model=model, provider=provider)

    # =========================================================================
    # 8. AI PORTFOLIO HEALTH & MACRO STRESS-TESTER (TAB DASHBOARD)
    # =========================================================================
    def generate_portfolio_stress_test(
        self,
        holdings: list,
        cash_balance: float,
        macro_data: Dict[str, Any],
        model: Optional[str] = None,
        provider: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Đánh giá sức khỏe danh mục, đo độ nhạy vĩ mô và mô phỏng 3 kịch bản chịu tải.
        Chỉ tốn đúng 1 LLM request duy nhất cho cả danh mục.
        """
        holdings = holdings or []
        cash_balance = float(cash_balance or 0)
        macro_data = macro_data or {}

        stock_val = sum(float(h.get("marketValue") or h.get("totalCost") or 0) for h in holdings)
        total_nav = stock_val + cash_balance
        cash_weight_pct = round((cash_balance / total_nav * 100), 1) if total_nav > 0 else 0.0

        # Ước tính Beta bình quân gia quyền danh mục
        weighted_beta = 0.0
        total_stock_weight = 0.0
        for h in holdings:
            w = float(h.get("weightPct") or 0)
            b = float(h.get("beta") or 1.05)
            weighted_beta += (w / 100.0) * b
            total_stock_weight += (w / 100.0)
        portfolio_beta = round(weighted_beta / total_stock_weight, 2) if total_stock_weight > 0 else 1.05

        def fallback():
            # Heuristic chấm điểm sức khỏe
            if cash_weight_pct >= 20 and len(holdings) >= 3:
                score = "A"
                verdict = "Danh mục có cơ cấu phòng thủ vững chắc với bộ đệm tiền mặt dồi dào, khả năng chịu tải vĩ mô vượt trội."
            elif cash_weight_pct >= 10:
                score = "B+"
                verdict = "Danh mục cân bằng tốt giữa tăng trưởng và an toàn, độ nhạy cảm lãi suất ở mức kiểm soát được."
            elif cash_weight_pct < 5 and portfolio_beta > 1.2:
                score = "C"
                verdict = "Danh mục có đòn bẩy thị trường cao và thiếu bộ đệm tiền mặt, dễ bị tổn thương nếu thị trường điều chỉnh."
            else:
                score = "B"
                verdict = "Danh mục hoạt động ổn định, cần theo dõi thêm tỷ trọng các nhóm ngành chu kỳ cao."

            scenarios = [
                {
                    "name": "SBV Tăng Lãi Suất Điều Hành +100bps",
                    "severity": "Vừa phải",
                    "estimatedImpactPct": round(-1 * max(2.5, portfolio_beta * 4.5 * (1 - cash_weight_pct / 100.0)), 1),
                    "description": "Chi phí vốn vay tăng tạo áp lực lên nhóm cổ phiếu chu kỳ cao (Bất động sản, Thép), nhưng nhóm Tiền gửi và Tiện ích giữ giá tốt."
                },
                {
                    "name": "Tỷ Giá USD/VND Vượt 26,000 & SBV Hút Tiền Tín Phiếu",
                    "severity": "Cao",
                    "estimatedImpactPct": round(-1 * max(3.5, portfolio_beta * 6.0 * (1 - cash_weight_pct / 100.0)), 1),
                    "description": "Thanh khoản liên ngân hàng thắt chặt gây áp lực bán hạ margin trên HOSE. Nhóm xuất khẩu và công nghệ chống chịu tốt hơn thị trường chung."
                },
                {
                    "name": "VN-Index Điều Chỉnh Kỹ Thuật -10% Về Ngưỡng Hỗ Trợ",
                    "severity": "Vừa phải",
                    "estimatedImpactPct": round(-1 * (10.0 * portfolio_beta * (1 - cash_weight_pct / 100.0)), 1),
                    "description": f"Với tỷ lệ đệm tiền mặt {cash_weight_pct}%, danh mục chịu mức sụt giảm thấp hơn biên độ điều chỉnh chung của chỉ số VN-Index."
                }
            ]

            return {
                "healthScore": score,
                "healthVerdict": verdict,
                "summary": f"Danh mục gồm {len(holdings)} mã cổ phiếu với tỷ trọng cổ phiếu {100 - cash_weight_pct:.1f}% và tiền mặt {cash_weight_pct:.1f}%. Hệ số Beta danh mục đạt {portfolio_beta}.",
                "portfolioBeta": portfolio_beta,
                "cashWeightPct": cash_weight_pct,
                "macroSensitivity": {
                    "interestRateRisk": "Trung bình (Có tiền mặt đệm và các mã kinh doanh cốt lõi ổn định)",
                    "fxRisk": "Thấp (Doanh nghiệp trong danh mục không chịu áp lực nợ ngoại tệ USD lớn)",
                    "cyclicalRisk": "Trung bình (Tỷ trọng nhóm ngành tài chính & chu kỳ ở mức kiểm soát)"
                },
                "stressTestScenarios": scenarios,
                "rebalancingRecommendations": [
                    "Duy trì tỷ lệ tiền mặt phòng thủ tối thiểu 15-20% để sẵn sàng giải ngân khi thị trường có nhịp rung lắc kỹ thuật.",
                    "Hạn chế mua đuổi các mã cổ phiếu có hệ số P/E vượt quá +1.5 độ lệch chuẩn lịch sử.",
                    "Ưu tiên tích lũy các doanh nghiệp chia cổ tức tiền mặt đều đặn nhằm tạo dòng tiền thặng dư tự nhiên."
                ],
                "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }

        if not holdings:
            fb = fallback()
            fb["status"] = "success"
            fb["provider"] = "offline-heuristic-engine"
            return fb

        payload = {
            "holdings": [
                {
                    "symbol": h.get("symbol"),
                    "shares": h.get("holdingQty") or h.get("shares") or 0,
                    "avgCost": h.get("avgCost") or 0,
                    "currentPrice": h.get("currentPrice") or 0,
                    "marketValue": h.get("marketValue") or 0,
                    "weightPct": h.get("weightPct") or 0,
                    "pnlPct": h.get("unrealizedPLPct") or h.get("pnlPct") or 0,
                    "beta": h.get("beta") or 1.05
                }
                for h in holdings
            ],
            "cashBalanceVND": cash_balance,
            "totalNavVND": total_nav,
            "cashWeightPct": cash_weight_pct,
            "portfolioBeta": portfolio_beta,
            "macroContext": {
                "regime": macro_data.get("regime", {}),
                "riskScore": macro_data.get("riskAssessment", {}).get("riskScore", 35),
                "marketPE": macro_data.get("marketIndex", {}).get("currentPE", 13.8),
                "usdVnd": macro_data.get("macro", {}).get("usdVnd"),
                "bondYield10Y": macro_data.get("macro", {}).get("bondYield10Y")
            }
        }

        sys_prompt = (
            "Bạn là Giám Đốc Quản Trị Rủi Ro & Danh Mục (Chief Risk Officer - CRO) am hiểu sâu sắc TTCK Việt Nam.\n"
            "Dựa trên cơ cấu danh mục nắm giữ thực tế, tỷ trọng vốn, tỷ lệ tiền mặt và bối cảnh vĩ mô hiện tại, "
            "hãy đánh giá sức khỏe danh mục, chẩn đoán độ nhạy vĩ mô và mô phỏng 3 kịch bản chịu tải (Stress-Test).\n"
            "Chỉ trả về JSON thuần (không kèm markdown) theo cấu trúc sau:\n"
            "{\n"
            '  "healthScore": "A+ | A | B+ | B | C+ | C | D",\n'
            '  "healthVerdict": "Nhận định ngắn gọn 1 câu về độ cân bằng và sức chịu tải của danh mục",\n'
            '  "summary": "Đoạn văn 2-3 câu phân tích cấu trúc tài sản (cổ phiếu vs tiền mặt, mức độ tập trung ngành, beta danh mục)",\n'
            '  "portfolioBeta": 1.15,\n'
            '  "cashWeightPct": 25.0,\n'
            '  "macroSensitivity": {\n'
            '    "interestRateRisk": "Mức độ rủi ro lãi suất (Thấp/Trung bình/Cao kèm lý do cụ thể)",\n'
            '    "fxRisk": "Mức độ rủi ro tỷ giá USD/VND (Thấp/Trung bình/Cao kèm lý do)",\n'
            '    "cyclicalRisk": "Mức độ rủi ro chu kỳ kinh tế (Thấp/Trung bình/Cao kèm lý do)"\n'
            '  },\n'
            '  "stressTestScenarios": [\n'
            '    {\n'
            '      "name": "SBV Tăng Lãi Suất Điều Hành +100bps",\n'
            '      "severity": "Nhẹ | Vừa phải | Cao",\n'
            '      "estimatedImpactPct": -4.2,\n'
            '      "description": "Giải thích tác động cụ thể lên các mã trong danh mục"\n'
            '    },\n'
            '    {\n'
            '      "name": "Tỷ Giá USD/VND Vượt 26,000 & SBV Hút Tiền Tín Phiếu",\n'
            '      "severity": "Cao",\n'
            '      "estimatedImpactPct": -6.5,\n'
            '      "description": "Giải thích tác động cụ thể"\n'
            '    },\n'
            '    {\n'
            '      "name": "VN-Index Điều Chỉnh Kỹ Thuật -10%",\n'
            '      "severity": "Vừa phải",\n'
            '      "estimatedImpactPct": -7.8,\n'
            '      "description": "Giải thích tác động cụ thể dựa trên tỷ trọng tiền mặt và beta"\n'
            '    }\n'
            '  ],\n'
            '  "rebalancingRecommendations": [\n'
            '    "Khuyến nghị tái cân bằng 1...",\n'
            '    "Khuyến nghị tái cân bằng 2...",\n'
            '    "Khuyến nghị tái cân bằng 3..."\n'
            '  ]\n'
            "}"
        )
        user_prompt = f"Bảng số liệu danh mục và bối cảnh vĩ mô:\n{json.dumps(payload, ensure_ascii=False, indent=2)}"

        res = self.generate_json(sys_prompt, user_prompt, fallback_fn=fallback, model=model, provider=provider)
        res["updatedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        return res

    # =========================================================================
    # 9. CONSOLIDATED STOCK INTELLIGENCE & DIVIDEND AUDITOR (1 CALL / MÃ)
    # =========================================================================
    def generate_stock_comprehensive_intel(
        self,
        symbol: str,
        fin_data: Dict[str, Any],
        val_eval: Optional[Dict[str, Any]] = None,
        news_data: Optional[Dict[str, Any]] = None,
        forensic_data: Optional[Dict[str, Any]] = None,
        dupont_data: Optional[Dict[str, Any]] = None,
        dividend_data: Optional[Dict[str, Any]] = None,
        model: Optional[str] = None,
        provider: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Gom 5 phân tích chuyên sâu của cổ phiếu vào ĐÚNG 1 LLM Request:
        1. CFA Thesis Deep Dive
        2. Semantic News NLP & Catalysts
        3. Forensic Auditing & Beneish M-Score
        4. Valuation 10-Model Convergence & MoS
        5. AI Dividend Safety & Capital Allocation Auditor (MỚI)
        ==> Giảm 75% API calls, triệt tiêu nguy cơ Throttling (Rate Limit 429).
        """
        fin_data = fin_data or {}
        val_eval = val_eval or fin_data.get("valuationMultiples") or fin_data.get("valuation", {})
        news_data = news_data or fin_data.get("newsDigest", {})
        forensic_data = forensic_data or {
            "beneishMScore": fin_data.get("beneishMScore", {}),
            "altmanZ": fin_data.get("healthScore", {}).get("altmanZ", {}),
            "forensicAnalysis": fin_data.get("forensicAnalysis", {})
        }
        dupont_data = dupont_data or fin_data.get("extendedDupont", {})
        dividend_data = dividend_data or fin_data.get("dividendSustainability", {})

        # Dữ liệu phục vụ kiểm toán cổ tức & phân bổ vốn
        fcf_ratio = dividend_data.get("fcfPayoutRatio")
        payout_ratio = dividend_data.get("payoutRatio")
        div_score = dividend_data.get("score")
        div_status = dividend_data.get("status", "Chưa đủ số liệu")

        def fallback():
            # Fallback 1: Deep Dive
            cur_price = val_eval.get("currentPrice", 0)
            fair_price = val_eval.get("fairPrice", 0)
            mos = val_eval.get("marginOfSafety", 0)
            rec = "MUA GOM TÍCH LŨY" if mos > 15 else ("THEO DÕI NẮM GIỮ" if mos > -10 else "CÂN NHẮC CHỐT LỜI")

            deep_dive = {
                "thesisHeadline": f"Luận Điểm Đầu Tư {symbol}: Định Giá Hợp Lý, Biên An Toàn {mos:.1f}%",
                "cfaSummary": f"{symbol} ghi nhận thị giá {cur_price:,.0f} đ so với giá trị nội tại hội tụ {fair_price:,.0f} đ. Doanh nghiệp duy trì nền tảng tài chính ổn định và vị thế ngành vững chắc.",
                "coreCatalysts": [
                    "Duy trì tăng trưởng doanh thu cốt lõi và mở rộng quy mô thị phần.",
                    "Biên lợi nhuận gộp cải thiện nhờ tối ưu hóa chi phí vận hành."
                ],
                "investmentRisks": [
                    "Biến động chu kỳ ngành và sức ép cạnh tranh thị trường.",
                    "Rủi ro chi phí vốn vay và thanh khoản chung."
                ],
                "recommendation": rec,
                "targetHorizon": "12 - 24 Tháng"
            }

            # Fallback 2: News
            news_nlp = {
                "overallSentiment": "Tích Cực" if mos > 0 else "Trung Tính",
                "sentimentScore": 60 if mos > 0 else 10,
                "executiveSummary": f"Dòng chảy thông tin báo chí 30 ngày qua của {symbol} duy trì sự ổn định, tập trung vào kết quả kinh doanh và hoạt động vận hành.",
                "catalysts": ["Tiến độ các dự án trọng điểm và kế hoạch chi trả cổ tức."],
                "keyRisks": ["Biến động giá nguyên vật liệu và sức mua thị trường."],
                "catalystTimeline": "Trung hạn (3-6 tháng)"
            }

            # Fallback 3: Forensic
            m_val = forensic_data.get("beneishMScore", {}).get("mScore", -2.5) if isinstance(forensic_data, dict) else -2.5
            forensic = {
                "auditVerdict": "Cần Lưu Ý Kế Toán" if (m_val and m_val > -1.78) else "Sạch Sẽ & Minh Bạch",
                "forensicDiagnosis": f"Hệ thống kế toán pháp y ghi nhận Beneish M-Score đạt {m_val:.2f}. Báo cáo tài chính phản ánh đúng chuẩn mực, không có dấu hiệu thao túng trọng yếu.",
                "dupontEarningsQuality": "Chất lượng lợi nhuận ổn định, cơ cấu ROE được hỗ trợ bởi hiệu quả kinh doanh cốt lõi thay vì lạm dụng đòn bẩy tài chính quá mức.",
                "auditorChecklist": [
                    "Theo dõi kỳ thu tiền bình quân và trích lập dự phòng phải thu.",
                    "Kiểm tra tiến độ tài sản dở dang dài hạn."
                ]
            }

            # Fallback 4: Convergence
            convergence = {
                "convergenceHeadline": f"Hội Tụ Định Giá {symbol}: Giá Trị Hợp Lý {fair_price:,.0f} đ",
                "divergenceExplanation": "Các mô hình định giá chiết khấu dòng tiền (DCF, FCFE) và bội số thị trường (P/E, P/B) có sự phân hóa phản ánh chu kỳ tái đầu tư vốn CapEx của doanh nghiệp.",
                "sensitivityStory": "Khi chi phí vốn WACC biến động ±1.5%, giá trị nội tại dao động trong biên độ an toàn, bảo vệ vị thế nhà đầu tư.",
                "preferredModelRecommendation": "Ưu tiên mô hình P/E trung vị chu kỳ kết hợp DCF 3 kịch bản."
            }

            # Fallback 5: Dividend Audit (MỚI)
            is_div_safe = fcf_ratio is not None and fcf_ratio <= 75
            is_div_trap = fcf_ratio is not None and fcf_ratio > 100
            div_rating = "Vững Chắc (Safe)" if is_div_safe else ("Nguy Cơ Bẫy Cổ Tức (Trap Risk)" if is_div_trap else "Cần Theo Dõi (Borderline)")

            dividend_audit = {
                "safetyRating": div_rating,
                "fcfCoverageVerdict": (
                    f"Cổ tức tiền mặt được bảo chứng an toàn bởi dòng tiền tự do FCF thặng dư sau chi phí đầu tư CapEx (FCF Payout Ratio: {fcf_ratio}%)."
                    if fcf_ratio is not None else
                    "Chính sách cổ tức tiền mặt duy trì đều đặn dựa trên nền tảng lợi nhuận kinh doanh ổn định."
                ),
                "trapRiskLevel": "Thấp" if is_div_safe else ("Cao" if is_div_trap else "Trung Bình"),
                "capitalAllocationScore": 8.0 if is_div_safe else (4.5 if is_div_trap else 6.5),
                "capitalAllocationDiagnosis": (
                    "Ban lãnh đạo thực hiện chính sách phân bổ vốn cân bằng: tái đầu tư mở rộng năng lực sản xuất với ROIC cao trong khi vẫn duy trì cổ tức tiền mặt kỷ luật cho cổ đông."
                    if is_div_safe else
                    "Cần lưu ý tốc độ giải ngân CapEx và tỷ lệ nợ vay để đảm bảo không làm loãng dòng tiền trả cổ tức trong tương lai."
                ),
                "outlook3Y": "Khả năng duy trì hoặc tăng nhẹ mức chi trả cổ tức tiền mặt trong 1-3 năm tới là khả thi nhờ dòng tiền hoạt động ổn định.",
                "redFlags": ["Cổ tức tiền mặt vượt dòng tiền FCF thặng dư"] if is_div_trap else []
            }

            return {
                "aiDeepDive": deep_dive,
                "aiNewsAnalysis": news_nlp,
                "aiAuditComment": forensic,
                "aiConvergence": convergence,
                "aiDividendAudit": dividend_audit,
                "status": "success",
                "provider": "offline-heuristic-engine",
                "model": "Quantitative Deterministic Heuristic v4.0"
            }

        # Tạo payload cô đọng gửi 1 prompt
        stock_context = {
            "symbol": symbol,
            "valuationSummary": {
                "currentPrice": val_eval.get("currentPrice"),
                "fairPrice": val_eval.get("fairPrice"),
                "marginOfSafety": val_eval.get("marginOfSafety"),
                "pe": val_eval.get("pe"),
                "pb": val_eval.get("pb"),
                "models": val_eval.get("models", {})
            },
            "forensicAudit": {
                "mScore": forensic_data.get("beneishMScore", {}).get("mScore"),
                "isManipulator": forensic_data.get("beneishMScore", {}).get("isManipulator"),
                "altmanZ": forensic_data.get("altmanZ", {}).get("zScore"),
                "extendedDupont": dupont_data
            },
            "dividendSustainability": {
                "fcfPayoutRatio": fcf_ratio,
                "accountingPayoutRatio": payout_ratio,
                "score": div_score,
                "status": div_status
            },
            "recentNews": [
                {"title": a.get("title", ""), "date": a.get("date", "")}
                for a in (news_data.get("articles", [])[:10] if isinstance(news_data, dict) else [])
            ]
        }

        sys_prompt = (
            f"Bạn là Trưởng Bộ Phận Nghiên Cứu Cổ Phiếu & Kiểm Toán Pháp Y (Head of Equity Research & Forensic Audit - CFA) am hiểu sâu sắc TTCK Việt Nam.\n"
            f"Hãy phân tích toàn diện mã cổ phiếu {symbol} dựa trên số liệu định lượng, kế toán pháp y, độ an toàn cổ tức và tin tức báo chí.\n"
            "QUY TẮC BẮT BUỘC:\n"
            "- Trả về DUY NHẤT một JSON object (không bọc markdown) chứa đầy đủ 5 phân hệ sau:\n"
            "{\n"
            '  "aiDeepDive": {\n'
            '    "thesisHeadline": "Tiêu đề luận điểm đầu tư CFA ngắn gọn, sắc bén",\n'
            '    "cfaSummary": "Đoạn văn 2-3 câu tổng hợp luận điểm định giá và vị thế doanh nghiệp",\n'
            '    "coreCatalysts": ["2 động lực tăng trưởng then chốt"],\n'
            '    "investmentRisks": ["2 rủi ro đầu tư trọng yếu"],\n'
            '    "recommendation": "MUA GOM TÍCH LŨY | THEO DÕI NẮM GIỮ | CÂN NHẮC CHỐT LỜI",\n'
            '    "targetHorizon": "12 - 24 Tháng"\n'
            '  },\n'
            '  "aiNewsAnalysis": {\n'
            '    "overallSentiment": "Tích Cực | Trung Tính | Thận Trọng",\n'
            '    "sentimentScore": 70,\n'
            '    "executiveSummary": "Đoạn văn 2 câu tổng hợp dòng chảy thông tin 30 ngày qua",\n'
            '    "catalysts": ["Động lực kinh doanh từ tin tức"],\n'
            '    "keyRisks": ["Rủi ro từ tin tức"],\n'
            '    "catalystTimeline": "Trung hạn (3-6 tháng)"\n'
            '  },\n'
            '  "aiAuditComment": {\n'
            '    "auditVerdict": "Sạch Sẽ & Minh Bạch | Cần Lưu Ý Kế Toán | Rủi Ro Thao Túng BCTC",\n'
            '    "forensicDiagnosis": "Đoạn văn 2 câu phân tích Beneish M-Score và chất lượng BCTC",\n'
            '    "dupontEarningsQuality": "Đánh giá chất lượng ROE: từ tăng trưởng thật hay đòn bẩy nợ",\n'
            '    "auditorChecklist": ["2 câu hỏi kiểm toán then chốt tại ĐHCĐ"]\n'
            '  },\n'
            '  "aiConvergence": {\n'
            '    "convergenceHeadline": "Tiêu đề luận giải hội tụ định giá",\n'
            '    "divergenceExplanation": "Giải thích tại sao các mô hình có độ chênh lệch (DCF vs P/E vs P/B)",\n'
            '    "sensitivityStory": "Thử tải độ nhạy khi chi phí vốn WACC tăng 1.5%",\n'
            '    "preferredModelRecommendation": "Mô hình định giá tin cậy nhất cho doanh nghiệp"\n'
            '  },\n'
            '  "aiDividendAudit": {\n'
            '    "safetyRating": "Vững Chắc (Safe) | Cần Theo Dõi (Borderline) | Nguy Cơ Bẫy Cổ Tức (Trap Risk)",\n'
            '    "fcfCoverageVerdict": "Đánh giá chi tiết cổ tức tiền mặt có được bảo chứng bằng dòng tiền tự do FCF thực tế hay không",\n'
            '    "trapRiskLevel": "Thấp | Trung Bình | Cao",\n'
            '    "capitalAllocationScore": 8.5,\n'
            '    "capitalAllocationDiagnosis": "Kiểm toán kỷ luật phân bổ vốn của Ban Lãnh Đạo (tái đầu tư mở rộng vs trả nợ vay vs chia cổ tức tiền mặt)",\n'
            '    "outlook3Y": "Dự phóng triển vọng duy trì hoặc cắt giảm cổ tức trong 1-3 năm tới",\n'
            '    "redFlags": ["Cờ cảnh báo nếu có, hoặc mảng rỗng [] nếu an toàn"]\n'
            '  }\n'
            "}"
        )
        user_prompt = f"Số liệu tài chính, định giá và kiểm toán của {symbol}:\n{json.dumps(stock_context, ensure_ascii=False, indent=2)}"

        res = self.generate_json(sys_prompt, user_prompt, fallback_fn=fallback, model=model, provider=provider)
        return res


# Singleton
ai_service = PythonAiService()



