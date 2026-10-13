# 🤖 KIẾN TRÚC NHẬN ĐỊNH AI & HỆ THỐNG PROMPTS ĐIỀU HÀNH
### (AI Insights Engine · Two-Tier Architecture · JSON Schemas · Gemini/OpenAI Prompts)

Tài liệu này là đặc tả kỹ thuật chi tiết về cơ chế vận hành, cấu trúc trường dữ liệu, nguyên lý suy luận và hệ thống prompt của phân hệ **AI Copilot & Nhận Định Chiến Lược Nền (Background AI Insights Engine)** trong nền tảng *Stock Portfolio Manager & Enterprise Valuation Engine*.

---

## 📑 MỤC LỤC
1. [Bản Chất Nhận Định: AI Tự Viết vs Mẫu Câu Heuristic Điền Số](#1-bản-chất-nhận-định-ai-tự-viết-vs-mẫu-câu-heuristic-điền-số)
2. [Cơ Chế Vận Hành Hai Tầng (Two-Tier Architecture)](#2-cơ-chế-vận-hành-hai-tầng-two-tier-architecture)
3. [Chi Tiết Các Dữ Liệu & Thông Tin Trả Về](#3-chi-tiết-các-dữ-liệu--thông-tin-trả-về)
   - [A. Báo Cáo Chiến Lược Vĩ Mô CIO (`aiInsight`)](#a-báo-cáo-chiến-lược-vĩ-mô-cio-aiinsight)
   - [B. Báo Cáo Thẩm Định Cổ Phiếu Chuyên Sâu (`aiDeepDive`)](#b-báo-cáo-thẩm-định-cổ-phiếu-chuyên-sâu-aideepdive)
   - [C. Nhịp Đập Thị Trường Cuối Tuần (`weeklyPulse`)](#c-nhịp-đập-thị-trường-cuối-tuần-weeklypulse)
4. [Hệ Thống System Prompts & Ngữ Cảnh Đầu Vào (Context Data)](#4-hệ-thống-system-prompts--ngữ-cảnh-đầu-vào-context-data)
5. [Cơ Chế Tự Động Phục Hồi Đa Mô Hình (Multi-Model Resilient Fallback)](#5-cơ-chế-tự-động-phục-hồi-đa-mô-hình-multi-model-resilient-fallback)
6. [Hướng Dẫn Thực Thi Pipeline & Kiểm Tra Kết Quả](#6-hướng-dẫn-thực-thi-pipeline--kiểm-tra-kết-quả)

---

## 1. Bản Chất Nhận Định: AI Tự Viết vs Mẫu Câu Heuristic Điền Số

Hệ thống phân định rạch ròi giữa hai phương thức sinh nhận định:

| Tiêu Chí | 🧠 TẦNG 1: LLM THỰC THỤ (Gemini / OpenAI) | ⚙️ TẦNG 2: HEURISTIC DETERMINISTIC ENGINE |
| :--- | :--- | :--- |
| **Điều kiện kích hoạt** | Có cấu hình `GEMINI_API_KEY` hoặc `OPENAI_API_KEY` hợp lệ. | Không có API Key, mạng bị ngắt, hoặc LLM lỗi. |
| **Bản chất câu chữ** | **AI Tự Suy Luận & Tự Viết 100%**: LLM đọc bức tranh số liệu vĩ mô/BCTC và tự sinh bài phân tích định tính bằng văn phong chuyên gia đầu tư (CIO/CFA). | **Mẫu Câu Điền Số (Rule-Based Templates)**: Hệ thống tính toán sẵn các chỉ số định lượng (Z-Score, MoS %, ERP) và điền các biến đó vào khung câu tiếng Việt chuẩn bị sẵn. |
| **Tính đa dạng & Sâu sắc** | Ngữ nghĩa biến đổi phong phú theo bối cảnh thị trường, có khả năng liên kết đa chiều (ví dụ: tác động của tỷ giá USD/VND lên chính sách can thiệp thanh khoản liên ngân hàng của SBV). | Cố định, mang tính kỹ thuật máy móc nhằm bảo đảm 100% tính chính xác của các ngưỡng định lượng. |
| **Nhãn định danh trong JSON** | `"provider": "gemini"` hoặc `"openai"`<br>`"model": "gemini-3.1-flash-lite"`, v.v. | `"provider": "offline-heuristic-engine"`<br>`"model": "Quantitative Deterministic Heuristic v4.0"` |

---

## 2. Cơ Chế Vận Hành Hai Tầng (Two-Tier Architecture)

```
                    ┌──────────────────────────────────────────────┐
                    │  KÍCH HOẠT PIPELINE: generate_ai_insights.py │
                    └──────────────────────┬───────────────────────┘
                                           │
                        Kiểm tra cấu hình API Key trong .env / Secrets?
                                           │
                         ┌─────────────────┴─────────────────┐
                       Có │                                   │ Không
                          ▼                                   ▼
        ┌───────────────────────────────────┐ ┌───────────────────────────────────┐
        │  GỬI SỐ LIỆU ĐẦU VÀO TỚI GOOGLE   │ │ KÍCH HOẠT FALLBACK NỘI BỘ         │
        │  GEMINI / OPENAI REST API         │ │ (Rule-based Quantitative Heuristic│
        └─────────────────┬─────────────────┘ └─────────────────┬─────────────────┘
                          │                                     │
                 HTTP 200 │              Lỗi 503/429/Timeout   │
                          │        ┌────────────────────────────┘
                          ▼        ▼
        ┌────────────────────────────────────────────────────────┐
        │ TỰ ĐỘNG CHUYỂN TIẾP MODEL TIẾP THEO:                   │
        │ gemini-3.5-flash-lite ➔ gemini-3.5-flash ➔ gemini-3.1  │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │ GHI KẾT QUẢ VÀO FILE SNAPSHOT TĨNH (LOCAL JSON FIRST)   │
        │ • data/macro_valuation.json  (aiInsight & weeklyPulse) │
        │ • data/financials/<MÃ>.json  (aiDeepDive)              │
        │ • data/ai_insights_cache.json (weeklyPulse backup)     │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │ FRONTEND REACT HIỂN THỊ TỨC THÌ (0ms LATENCY)          │
        └────────────────────────────────────────────────────────┘
```

---

## 3. Chi Tiết Các Dữ Liệu & Thông Tin Trả Về

### A. Báo Cáo Chiến Lược Vĩ Mô CIO (`aiInsight`)
Được lưu tại trường `aiInsight` trong file [`data/macro_valuation.json`](file:///Users/thaihai-swe/Desktop/stock/data/macro_valuation.json), hiển thị tại tab **Vĩ Mô & VN-Index** (Thẻ *"Điều Hành Chiến Lược CIO"*).

```json
{
  "headline": "Chiến Lược CIO: Tận Dụng Vùng Định Giá 'Deep Value' Trong Pha Mở Rộng Tín Dụng",
  "executiveSummary": "Thị trường đang ở pha mở rộng với tăng trưởng tín dụng mạnh mẽ, tạo nền tảng cho sự phục hồi lợi nhuận doanh nghiệp. Mặc dù áp lực tỷ giá gây căng thẳng thanh khoản ngắn hạn, định giá VN-Index ở vùng 'Rất rẻ' (P/E 10.72x) mang lại biên an toàn lớn cho chiến lược tích lũy cổ phiếu giá trị.",
  "macroRegimeAssessment": "Nền kinh tế đang trong giai đoạn Expansion (Mở rộng) với chỉ số PMI trên 50 và tăng trưởng tín dụng ấn tượng. Chính sách tiền tệ của SBV duy trì sự linh hoạt, tuy nhiên áp lực từ tỷ giá USD/VND đang tạo ra những gợn sóng về thanh khoản liên ngân hàng, đòi hỏi sự thận trọng trong việc sử dụng đòn bẩy tài chính (margin).",
  "yieldCurveDiagnosis": "Đường cong lợi suất TPCP đang ở trạng thái phân hóa, phản ánh kỳ vọng về sự ổn định vĩ mô dài hạn. Phần bù rủi ro vốn chủ sở hữu (ERP) ở mức 4.84% cho thấy cổ phiếu đang hấp dẫn hơn đáng kể so với trái phiếu, củng cố luận điểm ưu tiên phân bổ vào thị trường chứng khoán.",
  "sectorActionStrategy": "Tập trung giải ngân vào nhóm 'Sweet Spot' bao gồm Tài chính (Ngân hàng, Chứng khoán), Bất động sản & KCN, và Nguyên vật liệu. Đây là các nhóm ngành có định giá thấp, hưởng lợi trực tiếp từ chu kỳ mở rộng tín dụng và sự phục hồi của dòng vốn đầu tư trực tiếp.",
  "assetAllocationAdvice": "Khuyến nghị phân bổ danh mục: 50% Cổ phiếu (tập trung nhóm giá trị), 30% Trái phiếu (phòng thủ), 15% Tiền mặt (để linh hoạt giải ngân), và 5% Vàng (phòng vệ rủi ro tỷ giá).",
  "strategicTakeaways": [
    "Tận dụng vùng định giá P/E dưới 11.5x để tích lũy cổ phiếu dẫn dắt theo phương pháp DCA.",
    "Ưu tiên các doanh nghiệp có khả năng tăng trưởng lợi nhuận thực tế thay vì các cổ phiếu đầu cơ theo sóng.",
    "Duy trì tỷ trọng tiền mặt hợp lý để sẵn sàng ứng phó với các biến động thanh khoản ngắn hạn từ áp lực tỷ giá."
  ],
  "actionPlan": [
    "Giải ngân từng phần vào các cổ phiếu đầu ngành trong nhóm Tài chính và Bất động sản đang có định giá rẻ.",
    "Cơ cấu lại danh mục, loại bỏ các cổ phiếu thuộc nhóm 'Value Trap' hoặc các ngành có triển vọng tăng trưởng lợi nhuận thấp.",
    "Theo dõi sát sao diễn biến tỷ giá USD/VND và các động thái điều tiết thanh khoản từ SBV để điều chỉnh tỷ lệ margin."
  ],
  "riskAlerts": [
    "Áp lực tỷ giá kéo dài có thể gây thắt chặt thanh khoản, ảnh hưởng đến nhóm ngành nhạy cảm với lãi suất.",
    "Rủi ro từ các biến số vĩ mô bên ngoài có thể làm gián đoạn đà phục hồi của dòng vốn ngoại trên thị trường."
  ],
  "status": "success",
  "provider": "gemini",
  "model": "gemini-3.1-flash-lite",
  "updatedAt": "2026-10-13T15:03:36.282367+00:00"
}
```

---

### B. Báo Cáo Thẩm Định Cổ Phiếu Chuyên Sâu (`aiDeepDive`)
Được lưu tại trường `aiDeepDive` trong file [`data/financials/<MÃ>.json`](file:///Users/thaihai-swe/Desktop/stock/data/financials/), hiển thị tại tab **Định Giá** khi người dùng tra cứu mã cổ phiếu.

**Ví dụ thực tế đã sinh cho cổ phiếu HPG (Tập đoàn Hòa Phát):**
```json
{
  "recommendation": "🟢 MUA TÍCH LŨY GIÁ TRỊ",
  "convictionScore": 85,
  "thesisHeadline": "HPG: Vị thế đầu ngành thép với lợi thế quy mô và chu kỳ phục hồi lợi nhuận bền vững",
  "valuationConvergenceAnalysis": "Kết quả định giá hội tụ từ 10 mô hình cho thấy HPG đang giao dịch tại vùng giá hấp dẫn với biên an toàn (MoS) đạt 27.1%. Các mô hình DCF và RIM phản ánh giá trị nội tại cao hơn đáng kể so với thị giá hiện tại, trong khi P/E (7.53x) và P/B (1.35x) thấp hơn trung bình 5 năm, xác nhận cổ phiếu đang bị định giá thấp so với tiềm năng tăng trưởng ROE 18.16%.",
  "trapAssessment": "Không phát hiện bẫy định giá (Trap Score 0.0). HPG duy trì bảng cân đối kế toán lành mạnh với tỷ lệ nợ/vốn chủ sở hữu 0.7, dòng tiền hoạt động ổn định và không có dấu hiệu suy giảm lợi nhuận giả tạo hay pha loãng cổ phiếu bất lợi cho cổ đông.",
  "catalysts": [
    "Dự án Dung Quất 2 đi vào vận hành thương mại giúp tăng công suất thép cuộn cán nóng (HRC) thêm 5.6 triệu tấn/năm.",
    "Sự phục hồi của thị trường bất động sản nội địa thúc đẩy nhu cầu tiêu thụ thép xây dựng.",
    "Chi phí nguyên vật liệu đầu vào ổn định và biên lợi nhuận gộp cải thiện nhờ tối ưu hóa quy trình sản xuất."
  ],
  "keyRisks": [
    "Biến động giá nguyên liệu thô (quặng sắt, than cốc) ảnh hưởng trực tiếp đến biên lợi nhuận gộp.",
    "Rủi ro từ các biện pháp phòng vệ thương mại và thuế chống bán phá giá tại các thị trường xuất khẩu trọng điểm.",
    "Áp lực lãi vay từ các khoản nợ dài hạn phục vụ đầu tư dự án lớn trong môi trường lãi suất biến động."
  ],
  "targetPriceHorizon12M": "35512",
  "status": "success",
  "provider": "gemini",
  "model": "gemini-3.1-flash-lite",
  "updatedAt": "2026-10-13T15:04:30.322623+00:00"
}
```

---

### C. Nhịp Đập Thị Trường Cuối Tuần (`weeklyPulse`)
Được lưu tại trường `weeklyPulse` trong file [`data/macro_valuation.json`](file:///Users/thaihai-swe/Desktop/stock/data/macro_valuation.json) và [`data/ai_insights_cache.json`](file:///Users/thaihai-swe/Desktop/stock/data/ai_insights_cache.json), hiển thị tại tab **Vĩ Mô & VN-Index** (Thẻ *"Điều Hành Chiến Lược"* &rarr; Tab *"📅 Nhịp Đập Tuần"*).

> 💡 **Tại sao chuyển từ Daily sang Weekly?**  
> Các biến động từng phiên mang nhiều tiếng ồn ngắn hạn (nhiễu kỹ thuật, đáo hạn phái sinh, lệnh cơ cấu ATC). Bản tin cuối tuần tổng hợp toàn bộ 5 phiên giao dịch, giúp nhà đầu tư nhìn rõ bức tranh dòng tiền tổ chức (khối ngoại/tự doanh), luân chuyển nhóm ngành và chuẩn bị kịch bản cho tuần tiếp theo một cách điềm tĩnh và kỷ luật.

**Ví dụ thực tế sinh bởi OpenAI (`super-vip`):**
```json
{
  "pulseHeadline": "VN-Index Tích Lũy Thăm Dò Quanh Vùng Cân Bằng: Dòng Tiền Tái Định Vị Khi Định Giá Lọt 'Vùng Vàng' Chu Kỳ Tăng Trưởng",
  "weeklySummary": "Thị trường khép lại tuần giao dịch trong trạng thái giằng co tích lũy biên độ hẹp quanh ngưỡng 1.735 điểm, phản ánh tâm lý thận trọng nhưng vững vàng của dòng tiền trước vùng kháng cự kỹ thuật. Thanh khoản duy trì ổn định với hơn 800 triệu cổ phiếu mỗi phiên, cho thấy áp lực bán tháo hoàn toàn vắng bóng và thị trường chủ yếu đang diễn ra quá trình thay máu dòng tiền. Nền tảng định giá P/E 10.72x tiếp tục đóng vai trò 'chốt chặn' an toàn vững chắc, xác nhận VN-Index đang trong giai đoạn kiến tạo nền giá vững chắc cho chu kỳ mở rộng trung - dài hạn.",
  "institutionalFlow": "Dòng tiền lớn ghi nhận động thái cơ cấu danh mục rõ nét: chủ động hạ tỷ trọng chốt lời tại nhóm tăng trưởng định giá cao (đặc biệt là Công nghệ) và phân bổ ngược trở lại các nhóm ngành vốn hóa lớn đang ở vùng chiết khấu định giá hấp dẫn như Tài chính - Ngân hàng và Bất động sản. Khối tự doanh và các quỹ nội duy trì trạng thái hấp thụ ròng trong các nhịp rung lắc, đóng vai trò nâng đỡ chỉ số và ngăn chặn các nhịp giảm sâu đột ngột.",
  "keyDevelopments": [
    "VN-Index kiểm định vững chắc nền giá kỹ thuật và giữ vững vùng hỗ trợ trung hạn.",
    "Dòng tiền phân hóa mạnh mẽ, có sự rút lui khỏi nhóm đầu cơ để trở lại nhóm cổ phiếu cơ bản có câu chuyện phục hồi lợi nhuận.",
    "Khối ngoại và tổ chức tái cơ cấu danh mục, hạ áp lực bán ròng khi tỷ giá USD/VND hạ nhiệt."
  ],
  "weeklyLeadingSectors": [
    "Nhóm dẫn dắt: Tài chính - Ngân hàng, Bất động sản KCN và Bán lẻ giữ nhịp chỉ số.",
    "Nhóm điều chỉnh tích lũy: Công nghệ thông tin và Hóa chất chịu áp lực chốt lời ngắn hạn sau nhịp tăng nóng."
  ],
  "nextWeekOutlook": "VN-Index được dự báo sẽ tiếp tục dao động tích lũy trong vùng biên độ 1.720 – 1.750 điểm nhằm hấp thụ lượng cung lơ lửng. Xu hướng luân chuyển dòng tiền từ nhóm cổ phiếu định giá đắt sang nhóm cổ phiếu cơ bản có định giá chiết khấu sâu (P/E dưới 10x) sẽ diễn ra rõ nét hơn. Kịch bản bứt phá vượt mốc 1.750 điểm có thể được kích hoạt ngay khi nhóm Tài chính và Bất động sản hoàn tất nhịp tích lũy.",
  "actionableAdvice": "Chiến lược ưu tiên: Giữ tỷ trọng cổ phiếu ở mức 60-70%, kiên nhẫn tích lũy từng phần (DCA) tại các nhịp võng giá đối với các mã cơ bản, tránh mua đuổi trong các phiên hưng phấn.",
  "status": "success",
  "provider": "openai",
  "model": "super-vip",
  "updatedAt": "2026-10-13T15:31:02.123456+00:00"
}
```

---

## 4. Hệ Thống System Prompts & Ngữ Cảnh Đầu Vào (Context Data)

### A. Prompt Cho Báo Cáo Chiến Lược Vĩ Mô CIO
* **File nguồn:** [`scripts/lib/ai_service.py`](file:///Users/thaihai-swe/Desktop/stock/scripts/lib/ai_service.py) (`generate_macro_briefing`)
* **Ngữ cảnh số liệu truyền vào (`user_prompt`):**
  - Pha chu kỳ Regime 5 pha (`titleVi`, `gdpGrowth`, `inflation`, `phaseColor`).
  - Điểm số rủi ro vĩ mô 4 tầng (`riskScore`, `riskBucket`, `monetaryRisk`, `fiscalRisk`, `inflationRisk`, `liquidityRisk`).
  - Định giá thị trường VN-Index (`currentPE`, `pbRatio`, `peBands`, `medianPE5Y`).
  - Đường cong lợi suất TPCP (`yieldCurveSummary`, `transChainStage`, `equityRiskPremium`, `earningsYield`).
  - Khuyến nghị phân bổ tài sản (`recommendedEquityPct`, `recommendedCashPct`, `stance`).
  - Ma trận ngành Sweet Spot (`sweetSpotSectors`, `peHeatmap`).
* **System Prompt:**
  ```text
  Bạn là Giám đốc Đầu tư Chiến lược (Chief Investment Officer - CIO) hàng đầu am hiểu sâu sắc thị trường chứng khoán Việt Nam (HOSE, HNX, UPCoM).
  Dựa trên bức tranh số liệu vĩ mô, đường cong lợi suất TPCP, định giá VN-Index và ma trận ngành được cung cấp, hãy viết Báo cáo Chiến lược Điều hành CIO sắc bén, khách quan, giàu chiều sâu tài chính.
  QUY TẮC BẮT BUỘC:
  - Viết bằng Tiếng Việt chuẩn mực, thuật ngữ tài chính chuẩn xác.
  - Tự tổng hợp nhận định định tính chuyên sâu từ các con số, tuyệt đối không lặp lại nguyên văn số liệu một cách sáo rỗng.
  - Trả về duy nhất một JSON object hợp lệ (không kèm markdown ```json hay giải thích thừa).
  ```

---

### B. Prompt Cho Báo Cáo Định Giá Cổ Phiếu Chuyên Sâu
* **File nguồn:** [`scripts/lib/ai_service.py`](file:///Users/thaihai-swe/Desktop/stock/scripts/lib/ai_service.py) (`generate_stock_deepdive`)
* **Ngữ cảnh số liệu truyền vào (`user_prompt`):**
  - Mã cổ phiếu và thị giá hiện tại (`quote`).
  - Giá trị hợp lý hội tụ và Biên an toàn (`fairPrice`, `marginOfSafety`).
  - Kết quả 10 mô hình định lượng (Graham, Gordon DDM, DCF, FCFE, RIM, Target P/E, P/B, P/S, EV/EBITDA, Book NAV).
  - Vị thế 7 vùng giá và Thước đo 52 tuần (`sevenPriceZones`).
  - Bộ kiểm định bẫy định giá (`valuationTraps`: Bẫy nợ vay, bẫy suy giảm, bẫy thanh khoản).
  - Các chỉ số tài chính cơ bản (`financialRatios`: ROE, ROA, Debt/Equity, CFO, CapEx).
* **System Prompt:**
  ```text
  Bạn là Chuyên gia Phân tích Cấp cao (Senior Equity Research Analyst - CFA) chuyên sâu định giá cổ phiếu {symbol} niêm yết tại TTCK Việt Nam.
  Dựa trên kết quả định giá hội tụ từ 10 mô hình lượng hóa, sức khỏe tài chính và bẫy định giá, hãy viết báo cáo thẩm định cổ phiếu chuyên sâu.
  Chỉ trả về JSON thuần (không kèm markdown) theo cấu trúc schema chuẩn.
  ```

---

### C. Prompt Cho Bản Tin Nhịp Đập Thị Trường Cuối Tuần
* **File nguồn:** [`scripts/lib/ai_service.py`](file:///Users/thaihai-swe/Desktop/stock/scripts/lib/ai_service.py) (`generate_weekly_market_pulse`)
* **Ngữ cảnh số liệu truyền vào (`user_prompt`):**
  - Diễn biến giao dịch 5 phiên trong tuần của VN-Index và VN30 (`marketIndex`).
  - Dòng tiền tổ chức (khối ngoại, tự doanh mua/bán ròng tuần).
  - Luân chuyển nhóm ngành và ma trận thiên thời (`sectorRotation`, `dualMatrix`).
  - Pha chu kỳ vĩ mô và điểm số rủi ro hệ thống (`regime`, `riskAssessment`).
* **System Prompt:**
  ```text
  Bạn là Trưởng Ban Phân Tích Chiến Lược Thị Trường (Head of Market Strategy) của một định chế tài chính uy tín tại Việt Nam.
  Dựa trên diễn biến giao dịch của tuần vừa qua (Weekly Market Wrap), dữ liệu định giá VN-Index, chu kỳ vĩ mô và luân chuyển nhóm ngành GICS, hãy viết Bản Tin Nhịp Đập Thị Trường Cuối Tuần (Weekly Market Pulse) sắc sảo, cô đọng, khách quan và giàu giá trị hành động cho nhà đầu tư.
  QUY TẮC BẮT BUỘC:
  - Viết bằng Tiếng Việt chuẩn mực, thuật ngữ tài chính chính xác.
  - Tập trung phân tích bức tranh tổng thể 1 tuần giao dịch, loại bỏ các biến động nhiễu từng phiên ngắn hạn.
  - Tự nhận định định tính sâu sắc từ các con số, tuyệt đối không lặp lại số liệu máy móc.
  - Trả về duy nhất một JSON object hợp lệ theo schema.
  ```

---

## 5. Cơ Chế Tự Động Phục Hồi Đa Mô Hình (Multi-Model Resilient Fallback)

Trong môi trường thực tế, Google Gemini có thể gặp tình trạng quá tải cục bộ (**HTTP 503 High Demand**) hoặc chạm ngưỡng tần suất (**HTTP 429 Rate Limit**). 

Hệ thống đã tích hợp cơ chế **tự động thử lại chuỗi mô hình thông minh (Smart Model Cascade)**:

```python
models_to_try = [target_model]
for alt in ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.1-pro-preview", "gemini-3.1-flash-lite", "gemini-1.5-flash"]:
    if alt not in models_to_try:
        models_to_try.append(alt)
```

- Nếu `gemini-3.5-flash-lite` bị timeout hoặc 503 &rarr; Hệ thống tự động chuyển ngay sang `gemini-3.5-flash`.
- Nếu `gemini-3.5-flash` chạm ngưỡng &rarr; Hệ thống chuyển sang `gemini-3.1-flash-lite` và hoàn thành thành công trong vài giây.
- Nếu người dùng cấu hình OpenAI (`AI_PROVIDER=openai`) &rarr; Hệ thống kết nối trực tiếp đến endpoint OpenAI (`http://localhost:20128/v1` hoặc official) với cơ chế tự động xử lý cả JSON và Server-Sent Events (SSE).
- Nếu toàn bộ các mô hình bên ngoài đều không phản hồi &rarr; Hệ thống tự động kích hoạt **Tầng 2 Heuristic Deterministic Engine**, đảm bảo pipeline không bao giờ bị dừng đột ngột.

---

## 6. Hướng Dẫn Thực Thi Pipeline & Kiểm Tra Kết Quả

Bạn có thể chạy kiểm tra bộ sinh AI trực tiếp từ terminal qua binary `.venv/bin/python`:

### A. Sinh Nhận Định Vĩ Mô Hàng Tuần:
```bash
.venv/bin/python scripts/generate_ai_insights.py --scope macro
```
*Kết quả ghi vào:* [`data/macro_valuation.json`](file:///Users/thaihai-swe/Desktop/stock/data/macro_valuation.json).

### B. Sinh Bản Tin Nhịp Đập Thị Trường Cuối Tuần:
```bash
.venv/bin/python scripts/generate_ai_insights.py --scope weekly_market
```
*Kết quả ghi vào:* [`data/macro_valuation.json`](file:///Users/thaihai-swe/Desktop/stock/data/macro_valuation.json) và [`data/ai_insights_cache.json`](file:///Users/thaihai-swe/Desktop/stock/data/ai_insights_cache.json).

### C. Sinh Cả Vĩ Mô CIO + Nhịp Đập Cuối Tuần:
```bash
.venv/bin/python scripts/generate_ai_insights.py --scope weekly
```

### D. Sinh Báo Cáo Thẩm Định Cho Danh Sách Cổ Phiếu Cụ Thể:
```bash
.venv/bin/python scripts/generate_ai_insights.py --scope stocks --symbols HPG,PNJ,VNM
```
*Kết quả ghi vào:* [`data/financials/HPG.json`](file:///Users/thaihai-swe/Desktop/stock/data/financials/HPG.json), `data/financials/PNJ.json`, v.v.

### E. Sinh Toàn Bộ (Vĩ Mô + Nhịp Đập Tuần + Toàn Bộ Cổ Phiếu Đã Lưu):
```bash
.venv/bin/python scripts/generate_ai_insights.py --scope all
```

### F. Kiểm Tra Trực Tiếp Kết Quả Qua CLI:
```bash
# Xem nhận định vĩ mô vừa sinh:
python3 -c "import json; d=json.load(open('data/macro_valuation.json')); print(json.dumps(d.get('aiInsight', {}), ensure_ascii=False, indent=2))"

# Xem nhịp đập thị trường cuối tuần:
python3 -c "import json; d=json.load(open('data/macro_valuation.json')); print(json.dumps(d.get('weeklyPulse', {}), ensure_ascii=False, indent=2))"

# Xem nhận định cổ phiếu HPG vừa sinh:
python3 -c "import json; d=json.load(open('data/financials/HPG.json')); print(json.dumps(d.get('aiDeepDive', {}), ensure_ascii=False, indent=2))"
```
