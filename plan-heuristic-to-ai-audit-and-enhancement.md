# 🧠 Kế Hoạch Toàn Diện: Kiểm Toán Hệ Thống Heuristic & Lộ Trình Nâng Cấp Sang Trí Tuệ Nhân Tạo (AI / Hybrid Dual-Engine)

> **Mục tiêu**: Tiến hành rà soát (audit) toàn diện toàn bộ các chức năng hiện đang dựa trên thuật toán quy tắc / định lượng cứng (Heuristic) trong nền tảng, phân định rõ ràng giữa những thành phần **bắt buộc giữ nguyên toán học chính xác** và những thành phần **cần nâng cấp sang AI** hoặc **Mô hình Lai (Hybrid Dual-Engine)**. Đặc biệt tập trung giải quyết 2 phân hệ trọng điểm: **3 Kịch Bản Định Giá VN-Index & Phân Bổ Ngành** và **Đồng Hồ Vĩ Mô (Macro Clock Framework)**.

---

## 1. Triết Lý Thiết Kế: "Math is Math, LLM is Synthesis"

Trước khi chuyển đổi bất kỳ tính năng nào, hệ thống phải tuân thủ nghiêm ngặt **3 nguyên tắc vàng**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. PURE HEURISTIC (H) - ĐỘNG CƠ ĐỊNH LƯỢNG NGUYÊN BẢN (100% Deterministic)   │
│    Toán học tài chính, sổ cái kế toán FIFO, công thức DCF, Z-Score, DuPont  │
│    -> TUYỆT ĐỐI KHÔNG để LLM tính nhẩm (tránh ảo giác sai lệch số học).      │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. HYBRID DUAL-ENGINE (H + AI) - MÔ HÌNH LAI ĐỈNH CAO (KHUYẾN NGHỊ CAO NHẤT)│
│    Heuristic tính toán khung biên giới hạn chuẩn (Base mathematical anchor) │
│    + AI đóng vai trò Chuyên gia phân tích giải trình động (Contextual thesis)│
│    -> Giữ vững độ tin cậy của số liệu + Khai phóng chiều sâu tư duy vĩ mô.   │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. PURE AI (AI) - TỔNG HỢP CHIẾN LƯỢC & PHÂN TÍCH ĐỊNH TÍNH                 │
│    Báo cáo điều hành CIO, Nhịp đập tuần, Đánh giá sự kiện tin tức, Luận điểm │
│    -> Khả năng xâu chuỗi thông tin đa chiều vượt trội hoàn toàn so với template.│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Bảng Ma Trận Kiểm Toán (System-Wide Heuristic vs AI Audit Matrix)

Dưới đây là kết quả kiểm tra toàn diện 18 chức năng trên cả 4 Tab của hệ thống:

| # | Phân Hệ / Chức Năng | File Mã Nguồn Hiện Tại | Trạng Thái Hiện Tại | Đánh Giá & Rủi Ro Heuristic | Khuyến Nghị Kiến Trúc | Độ Ưu Tiên |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **I** | **TAB KINH TẾ VĨ MÔ (MacroDashboard)** | | | | | |
| 1 | **3 Kịch Bản Định Giá VN-Index & Phân Bổ Ngành** *(User Focus)* | `scripts/lib/macro_regime.py` (`detect_scenarios_and_tail_risks`) & `MacroRegimeRadarSection.jsx` | ⚠️ **Heuristic 100%**: Dải điểm VN-Index cộng trừ cố định (-2% đến +3.5%, v.v.), điều kiện & ngành gán cứng theo mẫu. | Thiếu linh hoạt theo chu kỳ; không phản ánh kỳ vọng P/E forward và tăng trưởng EPS thực tế. | 🚀 **NÂNG CẤP HYBRID**: Heuristic neo P/E band thống kê + AI dự phóng kịch bản, xác suất động & phân bổ ngành. | **P0 (Cực Cao)** |
| 2 | **Đồng Hồ Vĩ Mô (Macro Clock Framework)** *(User Focus)* | `scripts/lib/macro_regime.py` (`analyze_macro_clock`) & `MacroRegimeRadarSection.jsx` | ⚠️ **Heuristic 100%**: Ánh xạ ma trận cố định 3x3 (GDP x CPI) ra 4 góc phần tư với mô tả tĩnh. | Bỏ qua các tín hiệu dẫn dắt (PMI, tín dụng, liên ngân hàng); không chỉ ra được vận tốc chuyển pha và bài học lịch sử tương đương. | 🚀 **NÂNG CẤP HYBRID**: Heuristic tính tọa độ X-Y + AI phân tích động lực học, vận tốc dịch chuyển & chiến lược thực chiến. | **P0 (Cực Cao)** |
| 3 | **Giám Sát Đường Cong Lợi Suất & LSS Stress** | `scripts/lib/yield_curve_monitor.py` & `YieldCurveMonitorCard.jsx` | ⚠️ **Heuristic 100%**: Tính chênh lệch VN10Y-2Y, LSS score (0-100), câu chẩn đoán dựa trên if-else. | Không giải thích được tác động cụ thể đến NIM ngân hàng, rủi ro đáo hạn trái phiếu DN và định giá cổ phiếu. | 🚀 **NÂNG CẤP HYBRID**: Giữ nguyên toán 17 kỳ hạn + Thêm AI Chẩn đoán Sức Khỏe Thị Trường Nợ & Thanh Khoản. | **P1 (Cao)** |
| 4 | **Cố Vấn 4 Lớp Tài Sản & Arbitrage Vàng** | `scripts/lib/macro_regime.py` (`recommend_gold`, `calculate_4asset_allocation`) & `MacroAllocationGoldSection.jsx` | ⚠️ **Heuristic 100%**: Tỷ lệ phân bổ cố định theo bucket rủi ro; so sánh giá vàng thuần túy công thức toán. | Khuyến nghị mua/bán vàng còn máy móc, chưa kết hợp bối cảnh tỷ giá USD/VND và chính sách quản lý vàng của SBV. | 🚀 **NÂNG CẤP HYBRID**: Giữ nguyên chênh lệch giá vàng + Thêm AI Multi-Asset Strategy luận giải thời điểm gom/bán. | **P2 (Trung Bình)** |
| 5 | **6 Cảnh Báo Rủi Ro Đuôi (Tail-Risks Triggers)** | `scripts/lib/macro_regime.py` (`detect_scenarios_and_tail_risks`) | ⚠️ **Heuristic 100%**: Kiểm tra vượt ngưỡng (interbank > sbv + 2%, cpi > 5.5%). | Đã rất chuẩn xác ở khâu phát hiện (trigger detection), nhưng phần diễn giải tác động thị trường còn là văn mẫu tĩnh. | 🔄 **GIỮ HEURISTIC TRIGGER + BỔ SUNG AI IMPACT**: Giữ nguyên cờ cảnh báo toán học, AI giải trình tác động dây chuyền khi có cờ kích hoạt. | **P2 (Trung Bình)** |
| 6 | **Báo Cáo Điều Hành CIO & Nhịp Đập Tuần** | `ExecutiveSummaryCard.jsx` | ✅ **AI 100%**: Đã tích hợp Gemini / OpenAI và cơ chế khôi phục dữ liệu 2 tầng. | Hoạt động xuất sắc. | 🟢 **DUY TRÌ HIỆN TẠI** | Hoàn tất |
| **II** | **TAB THỊ TRƯỜNG & VN-INDEX (MarketDashboard)** | | | | | |
| 7 | **Nhiệt Kế Định Giá VN-Index & Composite Signal** | `scripts/lib/market_valuation_analyzer.py` & `MacroValuationWindowCard.jsx` | 🔢 **Pure Math / Heuristic**: Z-score, Percentile 4 cửa sổ (5Y, 10Y, 2007, 25Y). | Đây là thống kê chuẩn xác, cần độ tin cậy toán học tuyệt đối. | 🛡️ **BẮT BUỘC GIỮ HEURISTIC** (Không dùng AI thay thế toán học). Có thể bổ sung AI Executive Snippet giải thích chu kỳ định giá. | **P2** |
| 8 | **Bản Đồ Luân Chuyển 10 Ngành GICS (Sector Rotation)** | `SectorValuationHeatmap.jsx` | ⚡ **Hybrid (Heuristic + AI)**: Xếp hạng Dual Sweet-Spot bằng toán + AI `sectorTransmission` giải trình vĩ mô sang ngành. | Đã là mô hình lai mẫu mực. | 🟢 **DUY TRÌ & TINH CHỈNH** | Hoàn tất |
| 9 | **So Sánh 4 Phân Khúc Phong Cách (VN30, Diamond, Midcap)** | `StyleValuationComparison.jsx` & `scripts/lib/macro_regime.py` | ⚠️ **Heuristic 100%**: Hiển thị bảng P/E, P/B, Beta tĩnh. | Người dùng chưa thấy được câu chuyện luân chuyển dòng vốn giữa Blue-chips vs Midcaps vs Cổ phiếu kín room ngoại. | 🚀 **NÂNG CẤP HYBRID**: Thêm AI Style Rotation Commentary nhận định sóng ngành và khẩu vị dòng tiền tổ chức. | **P2** |
| **III** | **TAB ĐỊNH GIÁ CỔ PHIẾU (ValuationDashboard)** | | | | | |
| 10 | **10 Mô Hình Định Lượng Cốt Lõi (Graham, DCF, RIM, DDM, Multiples)** | `scripts/lib/valuation_engine.py` | 🔢 **Pure Math**: Chiết khấu dòng tiền, WACC, công thức Graham, EV/EBITDA. | LLM không thể tính toán chính xác số học tài chính. Dùng AI tính toán sẽ làm mất uy tín nền tảng. | 🛡️ **BẮT BUỘC GIỮ HEURISTIC 100%** | Bất biến |
| 11 | **Bẫy Định Giá & Pháp Y Kế Toán (Valuation Traps & Forensic)** | `ValuationTrapsCard.jsx`, `ForensicAccountingCard.jsx` | ⚠️ **Heuristic 80%**: Tính Beneish M-Score, Altman Z, Piotroski F, quy tắc bẫy P/E thấp. | Chỉ số định lượng cho biết "có rủi ro", nhưng không phân tích được nguyên nhân sâu xa (do ghi nhận doanh thu ảo, phải thu tồn đọng, hay hàng tồn kho lỗi thời). | 🚀 **NÂNG CẤP HYBRID**: Giữ điểm số định lượng M-Score/Z-Score + Tích hợp nổi bật AI Forensic Auditor mổ xẻ chất lượng BCTC. | **P1 (Cao)** |
| 12 | **Phân Rã 5 Nhân Tố Extended DuPont** | `ExtendedDupontCard.jsx` | 🔢 **Heuristic**: Tính toán Tax Burden, Interest Burden, Operating Margin, Asset Turnover, Financial Leverage. | Toán học phân rã ROE rất chuẩn xác. | 🛡️ **GIỮ HEURISTIC LÕI** + AI giải thích điểm nghẽn làm suy giảm ROE. | **P2** |
| 13 | **CFA Copilot Thesis & Phân Tích Tin Tức NLP** | `StockCockpitHeader.jsx`, `NewsSentimentCard.jsx` | ✅ **AI 100%**: CFA Equity Research Thesis, 5 Catalysts/Headwinds, News Sentiment Score. | Đã áp dụng AI toàn diện. | 🟢 **DUY TRÌ HIỆN TẠI** | Hoàn tất |
| 14 | **Độ Bền Vững Cổ Tức (Dividend Sustainability)** | `DividendSustainabilityCard.jsx` | ⚡ **Hybrid**: Heuristic tính Payout ratio & FCF cover + AI Dividend Audit. | Đã có AI Audit trong backend, cần làm nổi bật hơn trên UI. | 🟢 **HOÀN THIỆN UI** | **P3** |
| **IV** | **TAB QUẢN LÝ DANH MỤC & DCA (Dashboard & DCA Planner)** | | | | | |
| 15 | **Sổ Cái FIFO & Lãi/Lỗ Danh Mục** | `stockAnalytics.js` & `data/stock.db` | 🔢 **Pure ACID Math**: Khớp lệnh FIFO, giá vốn trung bình, Realized/Unrealized P/L. | Sai lệch một con số là phá vỡ niềm tin của nhà đầu tư. | 🛡️ **BẮT BUỘC GIỮ HEURISTIC 100%** | Bất biến |
| 16 | **AI Portfolio Stress-Testing** | `PortfolioStressTestCard.jsx` | ✅ **AI 100%**: Mô phỏng 3 cú sốc vĩ mô (Tỷ giá, Lãi suất, Suy thoái) lên danh mục cá nhân hóa. | Đã áp dụng AI. | 🟢 **DUY TRÌ HIỆN TẠI** | Hoàn tất |
| 17 | **Kế Hoạch Gom DCA Đa Tầng (DCA Planner)** | `DcaPlannerView.jsx` | ⚠️ **Heuristic 100%**: Chia 3 hoặc 5 đợt mua dựa trên % giảm giá từ đỉnh và vùng định giá. | Kế hoạch mua còn máy móc theo mốc thời gian, chưa thích ứng với việc thị trường đang ở vùng tạo đáy hay rơi tự do. | 🚀 **NÂNG CẤP HYBRID**: Giữ mốc giá tính toán toán học + Thêm AI DCA Strategist gợi ý tốc độ giải ngân theo vĩ mô. | **P2** |

---

## 3. Thiết Kế Chuyên Sâu 2 Tính Năng Trọng Điểm

### 🎯 Phân Hệ 1: "3 Kịch Bản Định Giá VN-Index & Phân Bổ Ngành" (Scenario Valuation Matrix)

#### A. Vấn đề của Heuristic hiện tại:
- Hiện tại, `detect_scenarios_and_tail_risks` lấy thị giá hiện tại của VN-Index và nhân với các hằng số cố định:
  - Base: $-2.0\%$ đến $+3.5\%$
  - Bull: $+2.5\%$ đến $+8.5\%$
  - Bear: $-8.0\%$ đến $-2.5\%$
- Điều kiện và nhóm ngành được sinh từ các chuỗi văn bản mẫu (template strings) giống nhau qua các tuần.
- **Hạn chế**: Không gắn liền với kỳ vọng định giá P/E forward, triển vọng tăng trưởng lợi nhuận quý tiếp theo của các nhóm ngành trụ cột (Ngân hàng, Bất động sản, Thép), và các chất xúc tác vĩ mô thực sự (Quyết định của Fed, tiến độ tháo gỡ pháp lý, nới room tín dụng của SBV).

#### B. Mô Hình Nâng Cấp Hybrid Dual-Engine:
```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. HEURISTIC ENGINE (Khung Neo Định Lượng)                             │
│    - Lấy P/E Trailing hiện tại, EPS thị trường hiện tại.               │
│    - Tính các mốc P/E mục tiêu: Bear = 11.5x (Vùng rẻ lịch sử),        │
│      Base = 13.5x - 14.5x (Trung bình 5 năm), Bull = 16.0x - 17.5x.    │
│    - Xác định dải định giá cơ sở lý thuyết: VN-Index = P/E × EPS_est   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ 2. AI STRATEGIC SYNTHESIS (Trí Tuệ Nhân Tạo Dự Phóng Động)            │
│    - Input: Biến số vĩ mô thực (Tỷ giá, Lãi suất, Lạm phát, PMI, FDI), │
│             Kết quả kinh doanh quý toàn thị trường, Dòng vốn ngoại.   │
│    - Nhiệm vụ AI:                                                      │
│      1. Phân bổ lại xác suất thực tế (Dynamic Probability %) theo      │
│         tình hình vĩ mô thực (không fix cứng 55/25/20).               │
│      2. Định hình luận điểm cốt lõi (Core Investment Narrative) cho     │
│         từng kịch bản mang tính thời sự cao.                           │
│      3. Chỉ ra Chất Xúc Tác Kích Hoạt (Trigger Catalysts) cụ thể.      │
│      4. Xác định Top 3 Ngành Dẫn Sóng & Top 2 Ngành Cần Thận Trọng     │
│         kèm lập luận dẫn truyền kinh tế chi tiết.                      │
│      5. Khuyến nghị Tỷ trọng phân bổ 4 Lớp Tài Sản (Cổ/Trái/Tiền/Vàng) │
│         được cá nhân hóa trực tiếp cho từng kịch bản.                  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ 3. RESILIENT FALLBACK                                                  │
│    - Nếu không có AI Key hoặc API lỗi: Tự động dùng heuristic 0ms cũ. │
└────────────────────────────────────────────────────────────────────────┘
```

#### C. Schema Dữ Liệu AI Kịch Bản Mới (`scenarioMatrix.aiScenarios`):
```json
{
  "scenarios": {
    "base": {
      "name": "Kịch Bản Cơ Sở (Base Case)",
      "probability": 50,
      "vnIndexTargetRange": "1.280 - 1.340",
      "targetPeRange": "13.2x - 14.0x",
      "projectedEpsGrowth": "+10% - 12%",
      "macroCatalysts": [
        "SBV duy trì lãi suất điều hành ổn định, hỗ trợ tăng trưởng tín dụng 14-15%",
        "Áp lực tỷ giá USD/VND hạ nhiệt dần về cuối quý",
        "Tiến độ tháo gỡ quy định ký quỹ Non-prefunding hỗ trợ nâng hạng FTSE"
      ],
      "leadingSectors": [
        {"sector": "Ngân Hàng", "thesis": "Tăng trưởng tín dụng hồi phục, trích lập dự phòng giảm dần."},
        {"sector": "Bán Lẻ", "thesis": "Sức mua phục hồi mạnh nhờ chính sách giảm thuế VAT và tăng lương cơ sở."}
      ],
      "laggingSectors": [
        {"sector": "Bất Động Sản Dân Dụng", "risk": "Tiến độ cấp phép dự án mới còn chậm, áp lực trái phiếu đáo hạn."}
      ],
      "tacticalAssetAllocation": {"equity": 60, "bond": 25, "cash": 10, "gold": 5},
      "cioActionSummary": "Chiến lược tích lũy: Ưu tiên gom cổ phiếu cơ bản đầu ngành tại các nhịp điều chỉnh kỹ thuật."
    },
    "bull": { ... },
    "bear": { ... }
  },
  "marketRegimeVerdict": "Thị trường đang nghiêng về kịch bản tích lũy mở rộng với xác suất tích cực tăng dần.",
  "updatedAt": "2026-10-15T00:00:00Z",
  "provider": "gemini",
  "model": "gemini-2.0-flash"
}
```

---

### 🧭 Phân Hệ 2: "Đồng Hồ Vĩ Mô" (Macro Clock Framework)

#### A. Vấn đề của Heuristic hiện tại:
- Hiện tại, hàm `analyze_macro_clock` chỉ kiểm tra 2 điều kiện: GDP (>6.5%, <5.5%, hay ở giữa) và CPI (>5.5%, <3.5%, hay ở giữa), sau đó tra bảng `clock_map` gồm 9 ô để ra 1 trong 4 góc phần tư:
  - Goldilocks (Tăng trưởng cao, lạm phát thấp)
  - Overheating (Tăng trưởng cao, lạm phát cao)
  - Stagflation (Tăng trưởng thấp, lạm phát cao)
  - Reflation (Tăng trưởng thấp, lạm phát thấp)
- **Hạn chế lớn**:
  - Không phản ánh được **Vận Tốc & Quỹ Đạo Dịch Chuyển (Clock Movement Velocity & Trajectory)**: Kim đồng hồ đang quay theo chiều thuận hay nghịch? Đang ở đầu pha hay sắp chuyển sang pha kế tiếp?
  - Bỏ qua các biến số nhạy cảm dẫn dắt của Việt Nam: Lãi suất liên ngân hàng qua đêm (Interbank ON), Tăng trưởng cung tiền M2, Tỷ giá USD/VND, và PMI ngành sản xuất.
  - Các khuyến nghị nhóm ngành yêu thích / tránh xa bị đóng khung cứng nhắc, không phản ánh sự thay đổi cấu trúc ngành.

#### B. Mô Hình Nâng Cấp Hybrid Dual-Engine:
```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. HEURISTIC ENGINE (Định Vị Tọa Độ Không Gian 2D)                     │
│    - Tính tọa độ chuẩn hóa X (GDP Growth vs Tiềm năng dài hạn).        │
│    - Tính tọa độ chuẩn hóa Y (CPI Inflation vs Mục tiêu Quốc hội 4.5%). │
│    - Xác định Góc phần tư cơ sở (Base Quadrant: 1, 2, 3, hoặc 4).       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ 2. AI MACRO CLOCK DYNAMICS (Động Cơ Phân Tích Động Học Chu Kỳ)        │
│    - Input: Tọa độ cơ sở + Chuỗi thời gian 3 tháng của PMI, Tín dụng,  │
│             Liên ngân hàng, Tỷ giá, Lợi suất TPCP 10Y.                 │
│    - Nhiệm vụ AI:                                                      │
│      1. Xác định Vị Trí Kim Đồng Hồ Chi Tiết (Clock Hand Position, ví  │
│         dụ: "2 giờ - Chớm bước vào pha Tăng Nhiệt").                  │
│      2. Đánh giá Vận Tốc & Xu Hướng Dịch Chuyển (Transition Velocity): │
│         Đang tiến nhanh vào Overheating hay có khả năng duy trì        │
│         Goldilocks nhờ kiểm soát tốt lạm phát?                         │
│      3. So sánh Tương Quan Lịch Sử (Historical Analog): Tình trạng     │
│         hiện tại giống nhất với giai đoạn nào của TTCK VN (ví dụ:      │
│         giống giai đoạn Quý 3/2017 hay Quý 1/2021)?                    │
│      4. Khuyến nghị Bàn Cờ Luân Chuyển Ngành (Sector Playbook):        │
│         Các nhóm ngành đang đón đầu dòng tiền thông minh trong 3-6     │
│         tháng tới.                                                     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ 3. UI RENDERING: Trực quan hóa Đồng hồ kim quay SVG + Card AI Insight │
│    kèm nút chuyển đổi xem góc nhìn Heuristic gốc và Phân tích AI.     │
└────────────────────────────────────────────────────────────────────────┘
```

#### C. Schema Dữ Liệu AI Đồng Hồ Vĩ Mô Mới (`macroClock.aiDynamics`):
```json
{
  "clockHandPosition": "2:30 (Cuối pha Mở Rộng — Chớm Tăng Nhiệt)",
  "currentQuadrant": "Expansion / Overheating Transition",
  "transitionVelocity": "TRUNG BÌNH (Moderate Drift)",
  "transitionAnalysis": "Kinh tế duy trì đà tăng trưởng cao nhưng bắt đầu xuất hiện áp lực chi phí vốn ngắn hạn do tỷ giá USD neo cao. Tín hiệu PMI mở rộng giúp giữ vững đà sản xuất.",
  "historicalAnalog": {
    "period": "Giai đoạn Quý 4/2017 – Quý 1/2018",
    "similarity": "Tăng trưởng kinh tế bùng nổ, tín dụng mở rộng mạnh nhưng lãi suất bắt đầu rục rịch chạm đáy chu kỳ."
  },
  "sectorRotationPlaybook": {
    "accumulate": ["Ngân hàng có chất lượng tài sản sạch", "Hàng hóa & Thép", "Công nghệ thông tin"],
    "trim": ["Bất động sản đầu cơ đòn bẩy cao", "Xây dựng nhạy cảm chi phí lãi vay"]
  },
  "updatedAt": "2026-10-15T00:00:00Z",
  "provider": "gemini"
}
```

---

## 4. Các Tính Năng Tiềm Năng Cao Khác Sẽ Được Nâng Cấp

Ngoài 2 phân hệ trọng điểm trên, kế hoạch đề xuất nâng cấp thêm 3 tính năng có ROI (giá trị mang lại / chi phí token) cao nhất:

### 1. Giám Sát Đường Cong Lợi Suất & Rủi Ro Đảo Ngược (Yield Curve & Debt Market Stress)
- **Hiện trạng**: Chỉ hiển thị biểu đồ 17 điểm lợi suất TPCP và điểm LSS (Long-Short Spread) thuần túy định lượng.
- **Nâng cấp AI**: Thêm khối **"AI Debt Market & Liquidity Diagnosis"**:
  - Phân tích độ dốc đường cong TPCP Việt Nam phản ánh kỳ vọng chính sách nới lỏng hay thắt chặt.
  - Đánh giá chênh lệch lợi suất VN10Y vs US10Y và sức ép rút vốn ròng của khối ngoại.
  - Phân tích rủi ro áp lực đáo hạn trái phiếu doanh nghiệp (Bond Maturity Wall) đối với thanh khoản hệ thống.

### 2. Pháp Y Báo Cáo Tài Chính & Bẫy Định Giá Cổ Phiếu (Valuation Traps & Forensic Auditor)
- **Hiện trạng**: Thẻ `ValuationTrapsCard.jsx` chỉ kiểm tra các điều kiện if-else (P/E < 8 và tăng trưởng lợi nhuận âm $\rightarrow$ Bẫy chu kỳ).
- **Nâng cấp AI**: Tích hợp khối **"AI Forensic Auditor Synthesis"**:
  - Đọc sâu bảng lưu chuyển tiền tệ (CFO) đối chiếu với lợi nhuận kế toán (Net Income).
  - Đánh giá khoản phải thu và tồn kho bất thường qua các quý.
  - Đưa ra kết luận khách quan: *Định giá rẻ thực sự (Deep Value Opportunity)* hay *Bẫy giá trị nguy hiểm (Value Trap)*.

### 3. Cố Vấn Phân Bổ Đa Tài Sản & Arbitrage Giá Vàng (Multi-Asset & Gold Strategy)
- **Hiện trạng**: Công thức toán học so sánh chênh lệch giá vàng SJC/PNJ với vàng thế giới và đưa ra lời khuyên mua/bán cố định.
- **Nâng cấp AI**: Thêm phân tích chiến lược tài sản:
  - Khi chênh lệch vàng SJC vượt $+15-18\%$, AI đưa ra cảnh báo rủi ro can thiệp chính sách từ SBV (đấu thầu vàng, thanh tra).
  - Đề xuất tỷ lệ phân bổ tối ưu giữa Cổ phiếu, Trái phiếu, Tiền gửi và Vàng dựa trên chênh lệch lợi tức ERP (Equity Risk Premium) so với lãi suất tiết kiệm 12 tháng.

---

## 5. Kiến Trúc Kỹ Thuật Backend & Dữ Liệu (Backend Architecture)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       scripts/lib/ai_service.py                             │
│  + generate_macro_scenarios_ai(macro_data, current_vnindex)                 │
│  + generate_macro_clock_dynamics_ai(macro_data, historical_clock)           │
│  + generate_yield_curve_diagnosis_ai(yield_data, macro_data)                │
│  (Tất cả đều hỗ trợ song song Gemini REST, OpenAI API & Heuristic Fallback) │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                  scripts/generate_ai_insights.py                            │
│  - Chạy nền theo chu kỳ Weekly (Sáng Thứ 7) hoặc On-demand qua CLI          │
│  - Gom chung vào 1 Request Macro đa năng để TIẾT KIỆM TOKEN & TRÁNH RATE-LIMIT│
│  - Lưu trực tiếp vào data/macro_valuation.json & data/ai_insights_cache.json │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                Bảo Toàn Khả Năng Đọc 0ms Phía Frontend                      │
│  - React Components đọc trực tiếp từ cache JSON 0ms qua Express Server.     │
│  - Giữ vững 2-tier resilience (nếu pipeline EOD chạy, không làm mất AI).    │
│  - Có cờ hiển thị IntelligenceBadge (AI vs H) rõ ràng, minh bạch.          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Chiến Lược Tiết Kiệm Chi Phí & Tối Ưu Tốc Độ:
- **Gom Cụm Prompt (Batched Macro Intelligence Request)**:
  Thay vì gọi 3-4 cuộc gọi API riêng lẻ cho Kịch bản, Đồng hồ vĩ mô và Đường cong lợi suất (dễ dính lỗi rate-limit 429), ta gộp vào **1 request duy nhất** trong `generate_macro_insights`:
  ```python
  # 1 Request duy nhất sinh trọn gói:
  # - CIO Executive Briefing
  # - Dynamic 3-Scenario Matrix
  # - Macro Clock Dynamics & Clock Hand
  # - Yield Curve Stress Diagnosis
  ```
- **Smart Delta Caching**: Chỉ gọi AI khi bước sang tuần mới hoặc khi các biến số vĩ mô cốt lõi (CPI, GDP, Lãi suất SBV) có thay đổi thực tế.

---

## 6. Lộ Trình Triển Khai Chi Tiết (Implementation Roadmap)

### Giai Đoạn 1: Mở Rộng AI Service & Thiết Kế Prompt Backend (Ưu tiên P0)
- [ ] Bổ sung hàm `generate_macro_intelligence_suite` trong `scripts/lib/ai_service.py` xử lý Kịch Bản Vĩ Mô Động + Đồng Hồ Vĩ Mô Đa Chiều + Chẩn Đoán Đường Cong Lợi Suất.
- [ ] Xây dựng Heuristic Fallback phong phú, chi tiết để đảm bảo hệ thống chạy mượt mà ngay cả khi chạy hoàn toàn offline không có internet/API key.
- [ ] Cập nhật `scripts/generate_ai_insights.py` ghi nhận các trường dữ liệu mới vào `data/macro_valuation.json` và `data/ai_insights_cache.json`.

### Giai Đoạn 2: Tích Hợp Dữ Liệu & Bảo Vệ Pipeline (Ưu tiên P0)
- [ ] Cập nhật `scripts/fetch_macro_valuation.py` để bảo tồn các trường AI mới (`scenarioMatrix.aiScenarios`, `macroClock.aiDynamics`, `yieldCurveAnalysis.aiDiagnosis`) không bị ghi đè khi pipeline EOD chạy.
- [ ] Đồng bộ hóa định dạng trong `server/routes/valuationRoutes.js` cho route `/api/valuation/macro-insights`.
- [ ] Cập nhật tài liệu `docs/DATA_CATALOG.md` với các trường dữ liệu AI mới.

### Giai Đoạn 3: Nâng Cấp Giao Diện Người Dùng (UI / UX Enhancements) (Ưu tiên P0 & P1)
- [ ] **Tại Card 3 Kịch Bản (`MacroRegimeRadarSection.jsx`)**:
  - Thêm nhãn `IntelligenceBadge` phân biệt nguồn gốc dữ liệu.
  - Bổ sung tab/toggle chuyển đổi linh hoạt giữa: **"Góc Nhìn AI Động" (AI Synthesis)** và **"Định Lượng Neo (Heuristic Base)"**.
  - Hiển thị dải P/E mục tiêu, luận điểm xúc tác vĩ mô và top ngành dẫn dắt từ AI.
- [ ] **Tại Card Đồng Hồ Vĩ Mô (`MacroRegimeRadarSection.jsx`)**:
  - Thêm thông tin vị trí kim đồng hồ (Clock Hand), vận tốc dịch chuyển và tương quan lịch sử.
  - Hiển thị danh mục khuyến nghị phân bổ ngành thực chiến của AI.
- [ ] **Tại Card Đường Cong Lợi Suất (`YieldCurveMonitorCard.jsx`)**:
  - Tích hợp hộp chẩn đoán thanh khoản & thị trường nợ từ AI.

### Giai Đoạn 4: Kiểm Thử, Đo Lường & Tối Ưu (Verification & Polish)
- [ ] Chạy test thử nghiệm với cả 2 chế độ:
  1. Offline Heuristic Fallback (không có API key) $\rightarrow$ Đảm bảo UI hiển thị hoàn hảo, không lỗi crash.
  2. Live AI Generation (Gemini 2.0 Flash / OpenAI) $\rightarrow$ Đảm bảo sinh nội dung sắc bén, chuẩn văn phong tài chính Việt Nam.
- [ ] Chạy kiểm thử hệ thống: `test_valuation_engine.py` (đảm bảo 36/36 tests passed).
- [ ] Chạy `npm run build` để nghiệm thu giao diện không có lỗi linter/cú pháp.

---

## 7. Các Quyết Định Cần Người Dùng Định Hướng (Decisions for User Alignment)

1. **Về Cơ Chế Hiển Thị Trên Giao Diện (UI Presentation)**:
   - *Lựa chọn A (Khuyến nghị)*: Mặc định hiển thị góc nhìn **AI Tổng Hợp**, kèm theo nút gạt (Toggle) nhỏ *"Xem Công Thức Heuristic"* để người dùng đối chiếu số liệu định lượng nguyên bản khi cần.
   - *Lựa chọn B*: Hiển thị song song cả 2 góc nhìn cạnh nhau trên cùng một thẻ.

2. **Về Tần Suất Sinh Dữ Liệu AI Vĩ Mô (Execution Cadence)**:
   - *Lựa chọn A (Khuyến nghị)*: Tự động chạy mỗi sáng Thứ Bảy lúc 10:00 (Weekly Cadence) qua GitHub Actions, kết hợp nút bấm *"Làm mới AI"* theo yêu cầu trên giao diện hoặc qua lệnh CLI `python scripts/generate_ai_insights.py --scope macro`.
   - *Lựa chọn B*: Chạy mỗi ngày sau giờ đóng cửa giao dịch EOD (18:00 T2-T6) (tiêu tốn nhiều token hơn nhưng cập nhật liên tục).

3. **Phạm Vi Triển Khai Đợt 1**:
   - Triển khai ngay 2 phân hệ cốt lõi: **3 Kịch Bản Định Giá VN-Index** + **Đồng Hồ Vĩ Mô**, sau đó mở rộng sang **Yield Curve** và **Valuation Traps** ở đợt tiếp theo?
