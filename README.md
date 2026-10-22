# 📈 Stock Portfolio Manager & Enterprise Valuation Engine

<div align="center">

![Stock Portfolio & Valuation Banner](https://img.shields.io/badge/Status-Production%20Ready-emerald?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)
![Vietnam Stock Exchange](https://img.shields.io/badge/Market-HOSE%20%7C%20HNX%20%7C%20UPCoM-red?style=for-the-badge)
![Theme Support](https://img.shields.io/badge/UI-Dark%20%7C%20Light%20Mode-indigo?style=for-the-badge)

**Nền tảng quản trị danh mục đầu tư chứng khoán cá nhân, kỷ luật giao dịch thực chiến và thẩm định giá trị nội tại doanh nghiệp chuyên sâu dành riêng cho Thị Trường Chứng Khoán Việt Nam.**

[🌟 Tính Năng Nổi Bật](#-7-phân-hệ-tính-năng-toàn-diện) • [🤖 AI Copilot Đa Provider](#-hệ-sinh-thái-ai-copilot-đa-provider-chạy-nền) • [🏗️ Kiến Trúc Hệ Thống](#-kiến-trúc-hệ-thống--quản-trị-dữ-liệu-5-tầng) • [⚙️ Cài Đặt](#-hướng-dẫn-cài-đặt--khởi-chạy) • [🧪 Kiểm Thử](#-quy-chuẩn-kiểm-thử-nghiệm-thu-verification-gate) • [📚 Tài Liệu](#-danh-mục-tài-liệu-kỹ-thuật)

</div>

---

## 🏛️ Kiến Trúc Hệ Thống & Quản Trị Dữ Liệu 5 Tầng

Hệ thống được thiết kế theo mô hình **Hybrid 3 Tầng** kết hợp cơ chế **Phân tầng dữ liệu 5 Tầng (Data Governance & Storage Tiering)** nhằm tối ưu hóa độ trễ truy vấn **0ms**, đảm bảo an toàn giao dịch tài chính (ACID) và duy trì chi phí vận hành ở mức tối thiểu.

### Mô Hình Hybrid 3 Tầng:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       1. TẦNG TRÌNH DIỄN (FRONTEND SPA)                     │
│    React 18 · Vite · Tailwind CSS · Recharts · Lucide Icons · Dark/Light    │
│    WCAG AAA Contrast · Code Splitting & Hover Prefetching · Responsive UI   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP / REST API (0ms Local JSON First)
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                    2. TẦNG ĐIỀU PHỐI (BACKEND & API GATEWAY)                │
│    Node.js Express / Vercel Serverless · server/services/ · server/routes/  │
│    Turso SQLite Cloud (Production) / data/stock.db (Local ACID Storage)     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ CLI Execution / IPC / JSON Repositories
┌──────────────────────────────────────▼──────────────────────────────────────┐
│             3. TẦNG ĐỊNH LƯỢNG & PIPELINE DỮ LIỆU (PYTHON 3.11 ENGINE)      │
│    Astral uv Virtualenv · scripts/run_pipeline.py · scripts/lib/            │
│    Multi-Source Feeds: Yahoo Finance, vnstock, TradingView, DNSE, HNX, PNJ  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Ma Trận Quản Trị Dữ Liệu 5 Tầng (Data Governance 5 Tiers):

| Tầng Dữ Liệu | Đối Tượng & Nội Dung | File / Database Lưu Trữ | Trạng Thái Git | Chu Kỳ Cập Nhật & Bộ Điều Phối | Mục Đích Sử Dụng |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TẦNG 1: ACID Database** | Sổ lệnh Mua/Bán FIFO (`buy_orders`, `sell_orders`), Cổ tức, Watchlist, Hàng đợi yêu cầu (`requested_stocks`), Số dư tiền mặt, Insight sức khỏe danh mục AI (`portfolio_ai_insights`). | `data/stock.db` (Local) / Turso Cloud (Prod) | **GITIGNORED (100%)** *(Tuyệt đối không commit)* | Realtime khi người dùng thao tác. Quản lý sao lưu/phục hồi qua `scripts/db_manager.py`. | Đảm bảo tính toàn vẹn giao dịch (ACID), bảo mật số liệu tài chính cá nhân. |
| **TẦNG 2: Ephemeral Cache** | Thị giá khớp lệnh realtime (VPS/DNSE), điểm số VN-Index & VN30 trong phiên. | RAM Node.js + `data/prices_cache.json` | **GITIGNORED (100%)** *(Tránh ô nhiễm diff Git)* | Trong phiên (9:00 - 15:00 T2-T6). Cache TTL 1h (`priceService.js`). | Phục vụ thị giá tức thời cho UI mà không tạo commit rác vào repo. |
| **TẦNG 3: Daily EOD Snapshot** | TradingView Scanner 50+ chỉ số, Nhiệt kế VN-Index EOD, Vàng SJC/PNJ/TG, Tỷ giá USD/VND, Nến DNSE, Bản tin EOD AI Pulse. | `data/fundamentals_cache.json`, `data/macro_valuation.json`, `data/ai_insights_cache.json` | **COMMIT VỀ GIT** | **Daily EOD (18:00 T2-T6)**: GitHub Actions `daily-eod-sync.yml` (`run_pipeline.py --cadence daily`). | Đảm bảo Web Vercel tải ngay số liệu EOD mới nhất với độ trễ 0ms. |
| **TẦNG 4: Weekly Macro & Sector** | 95 Chỉ số TradingEconomics, 10 nhóm ngành GICS Vietstock, Lịch sử P/E 10 năm, Báo cáo Macro Strategic CIO. | `data/macro_indicators.json`, `data/sector_valuation_cache.json`, `data/market_valuation_history.json` | **COMMIT VỀ GIT** | **Weekly (10:00 Sáng T7)**: GitHub Actions `weekly-macro-sync.yml` (`run_pipeline.py --cadence weekly`). | Cung cấp bức tranh vĩ mô toàn cảnh và ma trận luân chuyển ngành hàng tuần. |
| **TẦNG 5: Quarterly BCTC Repository** | 122+ chỉ tiêu BCTC 8Q & 5Y, 54 Ratios, Extended DuPont, DCF 3 kịch bản, Phân tích Stock Deep Dive AI. | `data/financials/<MÃ>.json`, `data/vnindex_valuation_cache/` | **COMMIT VỀ GIT** | **Quarterly (Mùa BCTC)**: GitHub Actions `quarterly-bctc-sync.yml` (`run_pipeline.py --cadence quarterly`). | Kho tri thức định giá nội tại chuyên sâu độc lập cho từng mã cổ phiếu. |

---

## 🌟 7 Phân Hệ Tính Năng Toàn Diện

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          7 PHÂN HỆ TÍNH NĂNG CHỦ LỰC                         │
├───────────────────────┬─────────────────────────────┬───────────────────────┤
│ 1. DASHBOARD NAV      │ 2. SỔ LỆNH & GIAO DỊCH      │ 3. LỊCH SỬ KHỚP LÔ    │
│    Quản trị tài sản   │    Khớp FIFO tự động        │    Sổ cái kiểm toán   │
│    Trailing Stop & R:R│    Thuế & phí chuẩn luật    │    Lot Inspector      │
├───────────────────────┼─────────────────────────────┼───────────────────────┤
│ 4. DCA PLANNER        │ 5. CHIẾN LƯỢC & KỶ LUẬT     │ 6. VĨ MÔ & VN-INDEX   │
│    Lưới gom đa tầng   │    Nhật ký 6 thẻ tâm lý     │    Regime 5 pha & OMO │
│    Kim tự tháp x2     │    Rà soát điểm mù WinRate  │    Đường cong lợi suất│
├───────────────────────┴─────────────────────────────┴───────────────────────┤
│ 7. ĐỊNH GIÁ DOANH NGHIỆP CHUYÊN SÂU (VALUATION COCKPIT WORKSPACE)           │
│    10 Mô hình định lượng · 7 Vùng giá · 4 Không gian làm việc · Pháp Y BCTC │
│    Cán cân lệnh Cá Mập vs Nhỏ Lẻ · Sổ tay Thuyết Minh BCTC · Sandbox Giả Định│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Phân Hệ 1: Dashboard Tổng Quan Danh Mục, Kỷ Luật Lợi Nhuận & Quản Trị Rủi Ro (`Dashboard.jsx`)

* **💎 Thước Đo Tài Sản Ròng (NAV)**: Tổng hợp tổng giá trị thị trường cổ phiếu đang nắm giữ, số dư tiền mặt khả dụng, tổng vốn đầu tư lũy kế và phân rã 4 phong cách quản trị rủi ro tiền mặt (`Phòng thủ cao`, `Cân bằng tối ưu`, `Tấn công chủ động`, `Full cổ phiếu`).
* **📋 Bảng Nắm Giữ Hợp Nhất & Sổ Cái Tinh Gọn (`DashboardHoldingsTable.jsx`)**: Hợp nhất màn hình tổng quan và sổ cái thành một bảng duy nhất với mật độ thông tin tối ưu, hỗ trợ bộ lọc nhanh (Tất cả, Đang Lãi, Đang Lỗ), tìm kiếm mã tức thì, sắp xếp đa trường dữ liệu và chuyển đổi linh hoạt giữa giao diện Bảng (Table) và Thẻ (Card) trên thiết bị di động.
* **🎯 Lưới Chốt Lời Khoa Học 3 Tầng Nội Dòng (Take-Profit Grid Accordion)**: Tích hợp trực tiếp dưới từng vị thế cổ phiếu trong bảng nắm giữ, phân rã tỷ lệ thu hoạch lợi nhuận chuẩn mực **30% - 40% - 30%**:
  * *Tầng 1 (Lô 1 - 30%)*: Thu hoạch bước đầu tại Giá Mục Tiêu 1 (định giá hội tụ chiết khấu nhẹ).
  * *Tầng 2 (Lô 2 - 40%)*: Hiện thực hóa phần lớn lợi nhuận tại Giá Mục Tiêu 2 (định giá nội tại hợp lý).
  * *Tầng 3 (Lô 3 - 30%)*: Thả trôi gặt hái siêu lợi nhuận theo cơ chế Trailing Stop động.
* **🛡️ Cố Vấn Khóa Lợi Nhuận Linh Hoạt (Smart Trailing Stop) & Thước Đo Thưởng / Rủi Ro (R:R)** (`SmartProfitProtectionAdvisor.jsx`):
  * **4 Chế Độ Kỷ Luật Thực Chiến**:
    1. *Cắt Lỗ Kỷ Luật (-7%)*: Bảo vệ an toàn tuyệt đối cho vốn gốc.
    2. *Bảo Vệ Hòa Vốn (Break-even)*: Nâng điểm dừng lỗ lên giá vốn ngay khi cổ phiếu tăng &ge; 8%.
    3. *Khóa Lãi Bậc 1 (Lock Profit 1)*: Khóa cứng tối thiểu 50% thặng dư lợi nhuận khi lãi &ge; 15%.
    4. *Khóa Lãi Siêu Chu Kỳ (Trailing Stop)*: Bám sát trailing stop cách đỉnh 8-10% khi cổ phiếu đạt mức siêu lãi &ge; 25%.
  * **Hệ Thống Đèn Tín Hiệu & Thước Đo R:R Trung Thực**: Đánh giá tương quan giữa Lợi Nhuận Kỳ Vọng và Rủi Ro Chịu Đựng, triệt tiêu hoàn toàn các số liệu ảo.
* **🩺 Đo Lường Sức Khỏe Danh Mục & Chịu Tải Vĩ Mô AI (`PortfolioStressTestCard.jsx`)**:
  * Động cơ Antigravity Portfolio Doctor & CRO đánh giá khả năng chịu tải của danh mục trước các cú sốc vĩ mô.
  * Phân rã độ nhạy cảm Beta danh mục, đo lường đệm tiền mặt an toàn.
  * **3 Kịch Bản Khủng Hoảng Stress-Test Cực Đoan**: VN-Index sụt giảm mạnh (-15%), Tỷ giá USD/VND tăng sốc, Ngân hàng Nhà nước đảo chiều tăng lãi suất.
* **⚡ Thước Đo Tăng Trưởng Sức Mua Thực Tế (`RealPurchasingPowerCard.jsx`)**:
  * Ứng dụng phương trình Fisher $r_{\text{real}} = \frac{1 + r_{\text{nom}}}{1 + i_{\text{cpi}}} - 1$ để bóc tách tỷ suất lợi nhuận thực tế sau khi đã khấu trừ lạm phát và chi phí sinh hoạt tại Việt Nam.
  * Đối chiếu cuộc đua tăng trưởng sức mua giữa 4 kênh tài sản: Cổ phiếu, Vàng/Bất động sản, Tiết kiệm ngân hàng và Tiền mặt.
* **📈 Tương Quan Lợi Nhuận vs VN-Index (`BenchmarkComparisonChart.jsx`)**: Biểu đồ trực quan so sánh tỷ suất sinh lời lũy kế của danh mục với chỉ số tham chiếu VN-Index theo thời gian thực.
* **📊 Bộ Biểu Đồ Phân Tích Chuyên Sâu**: Biểu đồ thác nước phân rã lợi nhuận (**Waterfall Return Chart**), Biểu đồ đóng góp P/L từng mã (**Stock Contribution Chart**), và Lãi/Lỗ theo từng tháng (**Monthly P/L Chart**).
* **🏦 So Kèo Chi Phí Cơ Hội (Chứng Khoán vs Gửi Tiết Kiệm Ngân Hàng)** (`OpportunityCostCard.jsx`): Tự động đối chiếu lợi nhuận đầu tư cổ phiếu với lãi suất gửi tiết kiệm tham chiếu (mặc định 6.0%/năm, presets `5.0%`, `6.0%`, `7.0%`, `8.0%`), tính toán thặng dư tài sản thực tế (**Alpha VND**) và tỷ suất sinh lời vượt trội (**Alpha %**).
* **⚡ Bộ Chỉ Số Sharpe & Sortino**: Đo lường tỷ suất sinh lời hàng năm bù đắp trên mức biến động chuẩn VN-Index **18.0%/năm** và tỷ lệ lệnh lỗ (Downside Deviation), phân hạng chất lượng danh mục: *Xuất sắc* (&ge;2.0), *Tốt* (&ge;1.0), *Khá* (&ge;0.0), *Dưới lãi tiết kiệm* (&lt;0.0).

---

### Phân Hệ 2: Sổ Lệnh & Giao Dịch Khớp Lô Thông Minh (`TradeOrderView.jsx`)

* **🛒 Form Đặt Mua Tinh Gọn (`BuyForm.jsx`)**:
  * Tự động nhận diện đơn giá (x1.000đ), cảnh báo nhầm lẫn mệnh giá.
  * Tính toán trực tiếp giá trị khớp, phí môi giới (presets `0%`, `0.1%`, `0.15%`) và tổng tiền thanh toán.
  * Gắn nhãn phân loại trường phái đầu tư (Dài hạn, Lướt sóng, Bắt đáy, Cơ bản, Cổ tức, Kỹ thuật).
* **💰 Form Bán Khớp Lô Tự Động (`SellForm.jsx`)**:
  * **Chuẩn Khớp FIFO (First-In, First-Out)**: Tự động đối chiếu sổ lệnh mua trong quá khứ, tự động chia tách lô (lot split) nếu bán một phần số lượng.
  * **Tùy Chọn Khớp Lô Linh Hoạt**: Cho phép chọn khớp theo *FIFO (Lô cũ nhất)*, *Giá thấp nhất (Tối đa hóa lãi hiển thị)*, hoặc *Giá cao nhất (Hạn chế thuế TNCN)*.
  * **Tính Toán Thuế TNCN & Phí Tự Động**: Tự động trích trừ thuế TNCN **0.1%** trên giá trị chuyển nhượng theo đúng Luật Thuế TTCK Việt Nam.
  * **Gắn Thẻ Kỷ Luật Bán**: Bắt buộc chọn 1 trong 6 lý do bán để phục vụ phân tích tâm lý giao dịch.
* **💵 Quản Lý Cổ Tức Đa Kênh (`DividendManager.jsx`)**: Theo dõi cổ tức bằng tiền mặt (tự động khấu trừ thuế TNCN **5.0%**) và cổ tức bằng cổ phiếu/thưởng cổ phiếu.

---

### Phân Hệ 3: Lịch Sử Giao Dịch & Sổ Cái FIFO (`TransactionHistory.jsx`)

* **📜 Bảng Lịch Sử Giao Dịch Đa Chiều**: Tra cứu, lọc theo mã cổ phiếu, loại giao dịch (Mua, Bán, Cổ tức), khoảng thời gian và nhãn chiến lược.
* **🔍 Thanh Tra Nguồn Gốc Lô Lệnh (`HistoryLotInspectorModal.jsx`)**: Cho phép mở xem chi tiết từng lệnh bán đã chốt lãi/lỗ được ghép từ những lô mua nào trong quá khứ, giá vốn từng lô và thời gian nắm giữ chính xác từng ngày.
* **🧾 Sổ Cái Lãi/Lỗ Tinh Gọn (`StockDetailModal.jsx`)**: Khi nhấp vào bất kỳ mã cổ phiếu nào, hệ thống hiển thị Sổ Cái Lãi/Lỗ FIFO thuần túy (Realized P/L, Unrealized P/L, Cổ tức đã nhận, ROI tích luỹ toàn thời gian), tách biệt 100% với giao diện phân tích định giá để đảm bảo tốc độ phản hồi tức thì.

---

### Phân Hệ 4: Kế Hoạch Mua Gom DCA Đa Tầng (`DcaPlannerView.jsx`)

* **🪜 Lập Kế Hoạch Mua Gom Theo Lưới Bước Giá (Grid Pyramiding)**: Thiết lập lộ trình giải ngân nhiều đợt khi cổ phiếu điều chỉnh giảm (bước giá presets `-2%`, `-3%`, `-5%`, `-7%` và số đợt gom `5`, `10`, `15`, `20` lần).
* **📐 4 Chiến Lược Phân Bổ Khối Lượng Gom Chuẩn Mực**:
  1. **🌟 Kim Tự Tháp x2 Mỗi 3 Đợt (`cluster3`)**: 100 &rarr; 100 &rarr; 100 &rarr; 200 &rarr; 200 &rarr; 200 &rarr; 400 cp... (Chiến lược mẫu tối ưu giá vốn an toàn).
  2. **📐 Khối Lượng Đều (`fixed`)**: 100 &rarr; 100 &rarr; 100 &rarr; 100 cp... (Dành cho nhà đầu tư tích sản định kỳ).
  3. **📈 Tăng Dần Đều (`linear`)**: 100 &rarr; 200 &rarr; 300 &rarr; 400 cp... (Tăng mạnh giải ngân khi giá càng chiết khấu sâu).
  4. **🚀 Gấp Đôi Mỗi Bước Martingale (`martingale`)**: 100 &rarr; 200 &rarr; 400 &rarr; 800 cp... (Gấp đôi vị thế hạ giá vốn thần tốc).
* **🎯 Giả Lập Vị Thế Sau Gom**: Tích hợp số lượng và giá vốn đang nắm giữ hiện tại, dự phóng chính xác giá vốn bình quân mới và điểm hòa vốn sau toàn bộ chiến dịch gom.

---

### Phân Hệ 5: Nhật Ký Chiến Lược & Kỷ Luật Tâm Lý (`StrategyAnalytics.jsx`)

* **🧠 Đánh Giá Hiệu Suất Theo Trường Phái**: Thống kê tỷ lệ thắng (Win Rate %), Tỷ số Thắng/Thua (Win/Loss Ratio), Lợi nhuận trung bình mỗi lệnh theo từng thẻ chiến lược (Dài hạn, Lướt sóng, Bắt đáy, Cơ bản, Cổ tức, Kỹ thuật).
* **🛑 Bóc Tách 6 Thẻ Tâm Lý & Kỷ Luật Giao Dịch (Trade Review Journal)**:
  * `🎯 Đạt mục tiêu`: Chốt lời chuẩn kế hoạch đã định (Disciplined).
  * `🛑 Cắt lỗ chuẩn`: Cắt lỗ dứt khoát theo kỷ luật, bảo vệ an toàn vốn (Disciplined).
  * `🏃 Chốt non`: Bán vội khi vừa chớm lời, sợ mất lãi (Emotional).
  * `😰 Cắt lỗ trễ`: Chần chừ để lỗ sâu, gồng lỗ vượt quá sức chịu đựng mới bán (Emotional).
  * `⚡ Bán hoảng / FOMO`: Bị tâm lý đám đông hoặc bảng điện chi phối (Emotional).
  * `🔄 Đảo hàng / Cơ cấu`: Tái phân bổ dòng tiền sang cơ hội khác tiềm năng hơn (Neutral).
* **⚠️ Tự Động Nhận Diện Điểm Mù Rủi Ro**: Tự động phát cảnh báo khi một chiến lược có **Win Rate &lt; 40.0%** hoặc ghi nhận lỗ ròng, hỗ trợ nhà đầu tư rà soát lại phương pháp chọn điểm mua và kỷ luật cắt lỗ.

---

### Phân Hệ 6: Phân Tích Kinh Tế Vĩ Mô, Thanh Khoản & Chu Kỳ (`MacroDashboard.jsx`)

Giao diện được cấu trúc thành **4 Phân Hệ Chuyên Trách** có lưu vết trạng thái người dùng (`localStorage`), kết hợp thanh trạng thái **Macro Hero Status Bar** phản ánh tức thì 4 chỉ số sinh mệnh kinh tế:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       4 PHÂN HỆ VĨ MÔ CHUYÊN TRÁCH                          │
├──────────────────────────────┬──────────────────────────────────────────────┤
│ 1. CHU KỲ 5 PHA & CLOCK      │ 2. THANH KHOẢN SBV & LỢI SUẤT TPCP           │
│    Regime 5 pha · Macro Clock│    Radar Bơm/Hút OMO · Lãi suất liên ngân hàng│
│    Điểm rủi ro 4 tầng (0-100)│    Đường cong 17 kỳ hạn · Hộp căng thẳng nợ  │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ 3. MA TRẬN KỊCH BẢN & PHÂN BỔ│ 4. THƯ VIỆN 95 CHỈ SỐ TRADINGECONOMICS       │
│    3 Kịch bản VN-Index       │    10 Nhóm chỉ số kinh tế Việt Nam           │
│    Cố vấn 4 lớp tài sản & Vàng│    Xuất báo cáo dữ liệu CSV 1-Click          │
└──────────────────────────────┴──────────────────────────────────────────────┘
```

#### 1. 🌀 Phân Hệ Chu Kỳ 5 Pha & Macro Clock (`regime`)
* **Executive Summary Vĩ Mô (`ExecutiveSummaryCard.jsx`)**: Bản tóm tắt điều hành vĩ mô cấp cao do AI tổng hợp, đánh giá pha chu kỳ, rủi ro chính sách tiền tệ và luận điểm phân bổ.
* **Macro Clock 4 Góc Phần Tư**: Mô hình hóa vị thế nền kinh tế dựa trên tương quan giữa Tăng Trưởng Kinh Tế (GDP) và Lạm Phát (CPI).
* **Mô Hình 5 Pha Chu Kỳ (Macro Regime)**: Phân định pha hiện tại (*Phục hồi*, *Mở rộng*, *Quá nhiệt*, *Chậm lại*, *Suy thoái*) dựa trên 6 động lực cốt lõi.
* **Điểm Rủi Ro Vĩ Mô 4 Tầng (Macro Risk Score 0-100)**: Phân rã 4 thành tố rủi ro độc lập: Tiền tệ (35%), Tăng trưởng (25%), Lạm phát (20%), Cú sốc tỷ giá ngoại biên (20%).
* **6 Tín Hiệu Sớm Dẫn Dắt & Độ Lệch Sớm - Trễ (Lead/Lag Divergence)**: Nhận diện sớm các điểm uốn vĩ mô trước khi phản ánh vào bảng giá.

#### 2. ⚡ Phân Hệ Thanh Khoản SBV & Lợi Suất TPCP (`liquidity`)
* **Radar Bơm/Hút Tiền SBV & Thanh Khoản Liên Ngân Hàng (`SbvOmoInterbankRadarCard.jsx`)**:
  * Giám sát hoạt động bơm/hút ròng tín phiếu & OMO của Ngân hàng Nhà nước.
  * Theo dõi lãi suất liên ngân hàng qua đêm (ON), 1W, 1M.
  * Đo lường độ lệch **Spread** giữa lãi suất liên ngân hàng và lãi suất tái cấp vốn SBV, nhận diện tức thì các trạng thái thị trường tiền tệ (*Tiền rẻ dồi dào*, *Thanh khoản cân bằng*, *Thắt chặt cục bộ*, *Căng thẳng thanh khoản*).
  * Chẩn đoán AI tác động tới biên lãi thuần (NIM) toàn hệ thống ngân hàng.
* **Giám Sát Đường Cong Lợi Suất TPCP 17 Kỳ Hạn (`YieldCurveMonitorCard.jsx`)**:
  * Theo dõi lợi suất trái phiếu chính phủ từ ngắn hạn (3M, 6M, 1Y) đến dài hạn (10Y, 15Y, 20Y, 30Y).
  * Phân loại 5 hình thái đường cong lợi suất (Bình thường, Đảo ngược, Đi ngang, Dốc mạnh, Dốc ngược).
* **Hộp Căng Thẳng Thị Trường Nợ & Rủi Ro Thanh Khoản (`MacroYieldCurveStressBox.jsx`)**: Phân tích chuỗi truyền dẫn rủi ro thanh khoản 3 mắt xích (TPCP &rarr; Lãi suất liên ngân hàng &rarr; Tỷ giá USD/VND).

#### 3. ⚖️ Phân Hệ Ma Trận Kịch Bản & Phân Bổ Đa Tài Sản (`allocation`)
* **Cảnh Báo Rủi Ro Đuôi Đột Biến (Tail-Risks Copilot)**: Tự động phát hiện các rủi ro thiên nga đen ngoại biên.
* **Ma Trận 3 Kịch Bản Thị Trường VN-Index (`ScenarioMatrixCard.jsx`)**: Dự phóng 3 kịch bản vận động chỉ số VN-Index (*Cơ sở - Base*, *Tích cực - Bull*, *Thận trọng - Bear*) kết hợp giữa AI Copilot và mô hình Heuristic định lượng.
* **Ma Trận Phân Bổ 4 Lớp Tài Sản Đa Kịch Bản (`ScenarioAllocationMatrix.jsx`)**: Tối ưu hóa tỷ trọng giữa Cổ phiếu, Trái phiếu, Vàng và Tiền mặt thích ứng linh hoạt theo từng kịch bản vĩ mô.
* **Thước Đo Chênh Lệch Giá Vàng SJC & PNJ (`MacroAllocationGoldSection.jsx`)**: Đo lường chênh lệch giữa giá vàng miếng SJC và vàng nhẫn PNJ 999.9 (kết nối trực tiếp PNJ Official Edge API) so với giá vàng thế giới quy đổi.
* **Chẩn Đoán AI Sức Mua & Lạm Phát Thực Tế (`aiInflationDiagnosis`)**: Phân tích chuyên sâu về rủi ro xói mòn tài sản danh nghĩa và chiến lược phòng hộ lạm phát.
* **Lưới 6 Chỉ Số Liên Thị Trường (`MacroIntermarketGrid.jsx`)**: USD/VND, TPCP 10Y, Lãi suất điều hành SBV, CPI, Dầu Brent, Vàng thế giới.

#### 4. 📑 Phân Hệ Thư Viện 95 Chỉ Số TradingEconomics (`indicators`)
* Tra cứu toàn diện 95 chỉ số kinh tế vĩ mô Việt Nam chia thành 10 phân nhóm chủ đề (Thị trường lao động, Giá cả, Tiền tệ, Thương mại, Doanh nghiệp, Người tiêu dùng...).
* Nhận diện xu hướng tức thời (▲ Tăng / ▼ Giảm / — Ổn định) so với kỳ trước.
* **Công Cụ Xuất Báo Cáo CSV 1-Click**: Cho phép trích xuất toàn bộ dữ liệu 95 chỉ số vĩ mô ra định dạng CSV phục vụ công tác nghiên cứu độc lập.

---

### Phân Hệ 7: Tra Cứu & Định Giá Doanh Nghiệp Chuyên Sâu (`ValuationDashboard.jsx`)

Phân hệ được thiết kế như một **Trạm Thẩm Định Cổ Phiếu Chuyên Sâu (Single-Stock Valuation Cockpit)**, loại bỏ hoàn toàn các bảng biểu rườm rà để tập trung 100% vào mã cổ phiếu đang phân tích:

* **Header Cockpit Ghim Cố Định (`StickyCockpitBar.jsx` & `StockCockpitHeader.jsx`)**: Ghim các chỉ số sống (Thị giá, Giá trị hội tụ, Biên an toàn MoS %, Tech Score, P/E, P/B) và thanh tìm kiếm nhanh mã cổ phiếu trên cả 3 sàn (HOSE, HNX, UPCoM).
* **Workspace ToC Bar (`WorkspaceToCBar.jsx`)**: Thanh mục lục điều hướng nhanh (Table of Contents) cho phép nhảy tức thì đến từng khu vực phân tích.
* **Khung Thẻ Thông Minh Chuẩn Hóa (`ValuationCardContainer.jsx`)**: Tích hợp nút thu gọn/mở rộng, badge phân loại nghiệp vụ, tối ưu hóa độ thoáng cho giao diện.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   4 KHÔNG GIAN LÀM VIỆC CHUYÊN SÂU (WORKSPACES)             │
├──────────────────────────────┬──────────────────────────────────────────────┤
│ 1. ĐỊNH GIÁ & QUYẾT ĐỊNH     │ 2. BÁO CÁO TÀI CHÍNH & CHỈ SỐ                │
│    AI Executive Summary      │    122+ Chỉ tiêu BCTC 8Q & 5Y (VAS/TT200)    │
│    7 Vùng giá & Khung 3 tầng │    Sổ tay Thuyết Minh BCTC (Notes)           │
│    Interactive Sandbox       │    54 Tỷ số Ratios & Extended DuPont 5 biến  │
│    6 Triết lý đầu tư kinh điển│    Chỉ số đặc thù ngành (NIM, CASA, CapEx)   │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ 3. PHÁP Y BCTC & SỨC KHỎE    │ 4. VẬN ĐỘNG THỊ TRƯỜNG & TÂM LÝ              │
│    Beneish M-Score (8 biến số)│    Active Tech Score & Market Profile Wyckoff│
│    Thước đo Chất lượng LN    │    Dòng lệnh Cá Mập (Order Flow CVD)         │
│    Điểm uốn FCF & Cổ tức bền │    Đo lường rủi ro & AI News Sentiment 30D   │
└──────────────────────────────┴──────────────────────────────────────────────┘
```

#### 1. 🎯 Không Gian 1: Định Giá & Quyết Định (`valuation-models`)
* **AI BCTC Executive Summary (`AiExecutiveSummaryCard.jsx`)**: Bản tóm tắt điều hành BCTC do AI tổng hợp, đánh giá tăng trưởng, chất lượng bảng cân đối kế toán, luận điểm định giá và cảnh báo rủi ro cốt lõi.
* **Bản Đồ 7 Vùng Định Giá & Khung Ra Quyết Định 3 Tầng (`ValuationSevenZonesCard.jsx`)**:
  * Phân chia thị giá thành 7 vùng: *Deep Value* (&lt;0.75x), *Mua An Toàn* (0.75–0.85x), *Tích Luỹ* (0.85–0.95x), *Hợp Lý* (0.95–1.10x), *Chớm Đắt* (1.10–1.20x), *Đắt* (1.20–1.35x), *Nguy Hiểm* (&gt;1.35x).
  * Đánh giá ma trận 3 tầng: Tầng 1 Định giá (V-Score), Tầng 2 Chất lượng (Q-Score ROE vs CoE), Tầng 3 Thời điểm (T-Score Xung lực kỹ thuật).
* **Phòng Thí Nghiệm Giả Định Định Giá (`InteractiveValuationSandboxCard.jsx`)**: Cho phép nhà đầu tư tự do tinh chỉnh các biến số nhạy cảm (WACC, tăng trưởng dài hạn $g$, P/E mục tiêu, biên lợi nhuận ròng) để quan sát sự thay đổi tức thời của giá trị nội tại.
* **Bộ Lọc 6 Triết Lý Đầu Tư Kinh Điển (`ClassicInvestmentPhilosophiesCard.jsx`)**: Đối chiếu doanh nghiệp với tiêu chuẩn khắt khe của Warren Buffett, Benjamin Graham, Peter Lynch, Joel Greenblatt, Philip Fisher và Walter Schloss.
* **7 Bẫy Định Giá Thường Gặp (`ValuationTrapsCard.jsx`)**: Cảnh báo sớm bẫy P/E thấp ảo do lợi nhuận đột biến, bẫy chu kỳ đỉnh, bẫy pha loãng cổ phiếu, bẫy dòng tiền âm.
* **Dải Định Giá Lịch Sử 5 Năm (`HistoricalValuationBandCard.jsx`)**: Định giá theo Median P/E Bands và P/B Bands qua các chu kỳ thị trường.
* **Lưới 10 Mô Hình Định Lượng Độc Lập**:
  1. *Benjamin Graham Dynamic Formula*: $V = EPS \times (PE_{\text{base}} + hs \times g) \times \frac{\text{Hằng số}_{\text{vn}}}{y}$
  2. *Chiết Khấu Cổ Tức Gordon DDM Fade Rate*: Cổ tức tiền mặt có kiểm toán dòng tiền bảo chứng.
  3. *Target P/E Multiple*: P/E mục tiêu theo trung vị chu kỳ 5 năm (Median 5Y).
  4. *Target P/B Ngành & Gordon Growth*: $V = BVPS \times \frac{ROE - g}{r - g}$
  5. *Chiết Khấu Dòng Tiền Doanh Nghiệp (DCF FCFF)*: Dòng tiền tự do 5 năm và Terminal Value.
  6. *Multi-Stage DCF*: Mô hình DCF 3 giai đoạn thích ứng với chu kỳ đầu tư vốn lớn.
  7. *Damodaran FCFE*: Chiết khấu dòng tiền tự do vốn chủ sở hữu ($CFO - CapEx + \Delta Debt$).
  8. *Thu Nhập Thặng Dư RIM / EVA*: Đo lường giá trị thặng dư kinh tế trên vốn chủ sở hữu.
  9. *Book NAV / P/B Chuẩn Hóa*: Giá trị sổ sách điều chỉnh theo mức định giá chuẩn.
  10. *Advanced Multiples EV/EBITDA & EV/Sales*: Bội số giá trị doanh nghiệp trên dòng tiền kinh doanh.
* **Mô Hình DCF 3 Kịch Bản & Reverse DCF (`DcfValuationCard.jsx`)**:
  * Tự động giải ngược bài toán tăng trưởng ngụ ý: Thị trường đang kỳ vọng dòng tiền tăng trưởng bao nhiêu %/năm để biện minh cho thị giá hiện tại.
  * Ma trận độ nhạy cảm 2 chiều giữa Chi phí vốn WACC (Hàng) và Tăng trưởng dài hạn $g$ (Cột).
  * Áp dụng quy chuẩn miễn trừ mô hình DCF cho nhóm Ngân Hàng/Tài Chính theo khuyến nghị **CFA Institute**.

#### 2. 📊 Không Gian 2: Báo Cáo Tài Chính & Chỉ Số (`financial-statements`)
* **3 Báo Cáo Tài Chính Chi Tiết VAS / TT200 (`FinancialStatementsView.jsx`)**: 122+ chỉ tiêu Bảng Cân Đối Kế Toán, Kết Quả Kinh Doanh và Lưu Chuyển Tiền Tệ trong 8 quý và 5 năm.
* **Sổ Tay Đính Kèm Thuyết Minh BCTC (`SmartStatementNotesCard.jsx`)**: Ghi chép, giải mã và lưu trữ các điểm trọng yếu trong Thuyết minh BCTC theo từng mã cổ phiếu (chi tiết nợ vay, khoản phải thu, hàng tồn kho, cam kết ngoại bảng).
* **Bộ 54 Chỉ Số Tài Chính Ratios (`FinancialRatiosView.jsx`)**: Nhóm thanh toán, khả năng sinh lời, hiệu quả vận hành và cấu trúc vốn.
* **Extended DuPont 5 Nhân Tố (`ExtendedDupontCard.jsx`)**: Phân rã $ROE = \text{Tax Burden} \times \text{Interest Burden} \times \text{EBIT Margin} \times \text{Asset Turnover} \times \text{Financial Leverage}$.
* **Chỉ Tiêu Đặc Thù Ngành (`IndustrySpecificCard.jsx`)**: Đo lường NIM, CASA, NPL, LDR, CIR cho Ngân Hàng; Tỷ lệ nợ/Vốn chủ, Hàng tồn kho và Doanh thu chưa thực hiện cho Bất Động Sản.

#### 3. 🛡️ Không Gian 3: Pháp Y BCTC & Sức Khỏe Doanh Nghiệp (`forensics-health`)
* **Mô Hình Kiểm Toán Gian Lận Beneish M-Score 8 Biến Số (`ForensicAccountingCard.jsx`)**: DSRI, GMI, AQI, SGI, DEPI, SGAI, LVGI, TATA nhằm phát hiện dấu hiệu thao túng lợi nhuận.
* **Thước Đo Chất Lượng Lợi Nhuận (`QualityOfEarningsCard.jsx`)**:
  * Kiểm tra chỉ số dồn tích Sloan Accruals Ratio.
  * So sánh tỷ lệ giữa Dòng tiền từ hoạt động kinh doanh (CFO) và Lợi nhuận sau thuế (LNST).
  * Nhận diện tỷ trọng lợi nhuận bất thường ngoài hoạt động cốt lõi.
* **Điểm Uốn Dòng Tiền Tự Do FCF & Chu Kỳ Vốn**: Phát hiện thời điểm bùng nổ dòng tiền tự do sau giai đoạn CapEx mở rộng.
* **Điểm Sức Khỏe Tài Chính 4 Trụ Cột (`FinancialHealthCard.jsx`)**: Đo lường tổng thể sức khỏe tài chính doanh nghiệp.
* **Bền Vững Cổ Tức Bằng Tiền Mặt (`DividendSustainabilityCard.jsx`)**: Đánh giá khả năng duy trì cổ tức tiền mặt dựa trên Free Cash Flow.
* **Cổ Đông Lớn & Lịch Sử Trả Cổ Tức (`ShareholdersAndEventsView.jsx`)**: Danh sách ban lãnh đạo, giao dịch nội bộ và lịch sử chi trả cổ tức.

#### 4. 📈 Không Gian 4: Vận Động Thị Trường & Tâm Lý Dòng Tiền (`market-dynamics`)
* **Thước Đo Kỹ Thuật Động (Active Tech Score)**: Tổng hợp RSI, MACD, MA20/50/200, ADX, Bollinger Bands và xung lực dòng tiền.
* **Market Profile & Wyckoff Point of Control (`MarketProfileCard.jsx`)**: Xác định POC (Point of Control) và Vùng giá trị Value Area (VAH, VAL).
* **Giám Sát Cán Cân Lệnh Cá Mập vs Nhỏ Lẻ (`OrderFlowDynamicsCard.jsx`)**:
  * Bóc tách dòng tiền thông minh (Smart Money) so với dòng tiền cá nhân nhỏ lẻ (Retail).
  * Khối lượng khớp lệnh chủ động Mua/Bán và Delta khối lượng tích lũy (Cumulative Volume Delta - CVD).
  * Phát hiện các lệnh lớn (Big Trades & Blocks) nhận diện hành vi gom hàng hoặc xả hàng kín.
* **Đo Lường Rủi Ro Biến Động (`StockRiskMetricsCard.jsx`)**: Beta so với VN-Index, Giá trị chịu rủi ro (VaR 95%), Mức sụt giảm tối đa Maximum Drawdown (MDD).
* **Phân Tích Tâm Lý Tin Tức AI 30 Ngày (`NewsSentimentCard.jsx`)**: Quét và phân loại tin tức báo chí, tính điểm Sentiment Score (-100 đến +100).

---

### Phân Hệ Bổ Sung: Toàn Cảnh Thị Trường VN-Index (`MarketDashboard.jsx`)

* **Chỉ Số Trực Tuyến & Biểu Đồ Kỹ Thuật DNSE**: Cập nhật biểu đồ nến kỹ thuật 1D, 1M, 6M, 1Y cho VNINDEX, VN30, VN Diamond, VN Midcap, VN100.
* **Nhiệt Kế Định Giá VN-Index 4 Cửa Sổ Thời Gian**: Theo dõi dải P/E Bands 5 nấc (*5 năm*, *10 năm*, *Hiện đại từ 2007*, *25 năm toàn thời gian*), điểm phân phối chuẩn Z-Score và tín hiệu tổng hợp Composite Signal.
* **Lịch Sử Định Giá 25 Năm Vietstock**: Chuỗi thời gian P/E, P/S, Vốn hóa toàn thị trường từ năm 2000 đến nay.
* **So Sánh 4 Phong Cách Vốn Hóa & Đầu Tư**: Đối chiếu tương quan định giá P/E, P/B, Beta và dòng vốn giữa Blue-chips VN30, Kim Cương VN Diamond (hết room ngoại), Midcap và VN-Index.
* **Bản Đồ Luân Chuyển 10 Nhóm Ngành GICS**: Ma trận Thiên thời & Cơ bản (Dual Sweet-Spot Matrix), P/E Heatmap và Vòng quay luân chuyển 10 ngành.

---

## 🤖 Hệ Sinh Thái AI Copilot Đa Provider Chạy Nền

Hệ thống được trang bị bộ động cơ AI Copilot chuyên sâu, hỗ trợ kiến trúc **Đa Nhà Cung Cấp (Multi-Provider)** và vận hành theo cơ chế **Sinh dữ liệu chạy nền (Background Scheduled Generation)** nhằm bảo đảm tốc độ hiển thị **0ms**, loại bỏ 100% rủi ro nghẽn mạng và tiết kiệm tối đa chi phí gọi API:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    KIẾN TRÚC AI COPILOT ĐA PROVIDER & CHẠY NỀN              │
├─────────────────────────────────────────────────────────────────────────────┤
│  PROVIDER 1: Google Gemini (gemini-1.5-flash / gemini-1.5-pro / gemini-2.0) │
│  PROVIDER 2: OpenAI Standard API (GPT-4o, DeepSeek, Groq, OpenRouter, Ollama)│
│  FALLBACK:   Built-in Deterministic Heuristic Engine (Offline 0ms, 0 cost)  │
├─────────────────────────────────────────────────────────────────────────────┤
│  CHẾ ĐỘ VẬN HÀNH: Background Pipeline & GitHub Actions (EOD, Weekly, Qtrly) │
│  CACHE SNAPSHOT:  data/ai_insights_cache.json & data/financials/<MÃ>.json   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1. Hỗ Trợ Đa Nhà Cung Cấp Chuẩn Mực:
* **Google Gemini**: Hỗ trợ SDK chính thức và Direct REST API với tùy biến model qua `GEMINI_MODEL` (`gemini-1.5-flash`, `gemini-1.5-pro`, `gemini-2.0-flash`, `gemini-2.0-flash-lite`).
* **OpenAI Standard API**: Hỗ trợ chuẩn `POST /v1/chat/completions` với Bearer Token, tương thích hoàn toàn với:
  * OpenAI Official (`gpt-4o-mini`, `gpt-4o`)
  * DeepSeek (`deepseek-chat`)
  * Groq Cloud (`llama-3.3-70b-versatile`)
  * OpenRouter (`deepseek/deepseek-chat`)
  * Local LLM Ollama / vLLM (`llama3.1`, `qwen2.5`)
* **Two-Tier Fallback Heuristic Engine**: Nếu người dùng không cài đặt API Key hoặc kết nối mạng bị gián đoạn, hệ thống **tự động kích hoạt bộ động cơ phân tích định lượng deterministic** tích hợp sẵn, sinh báo cáo chuyên môn sâu mà không phát sinh lỗi.

### 2. 5 Chuyên Viên Phân Tích AI Personas:
1. **🌐 Macro Strategic CIO**: Tổng hợp tương quan liên thị trường, pha chu kỳ kinh tế, đường cong lợi suất và đưa ra chiến lược phân bổ tài sản.
2. **🩺 Antigravity Portfolio Doctor & CRO**: Rà soát tỷ trọng vốn, tỷ trọng tiền mặt, hệ số Sharpe, đòn bẩy và rủi ro sụt giảm NAV, thực hiện mô phỏng stress-test 3 kịch bản cực đoan.
3. **🏢 Senior Equity Research Analyst (Stock Copilot - CFA)**: Thẩm định điểm hội tụ 10 mô hình định lượng, rà soát 7 bẫy định giá, kiểm tra năng lực dòng tiền FCF và vùng mua/bán an toàn.
4. **🪜 Quantitative Execution Trader (DCA Advisor)**: Đánh giá tính khả thi của lưới mua gom theo bước giá, mức độ chịu nhiệt tài khoản và tối ưu giá vốn trung bình.
5. **🎯 Trading Psychology & Discipline Coach**: Nhận diện thiên kiến tâm lý (FOMO, gồng lỗ, chốt non), phân tích Win Rate theo chiến lược và củng cố kỷ luật giao dịch.

### 3. Cơ Chế Sinh Dữ Liệu Chạy Nền Tiết Kiệm Chi Phí:
* **Không gọi LLM theo từng cú nhấp chuột**: Các báo cáo phân tích vĩ mô, nhịp đập thị trường và định giá doanh nghiệp được sinh tự động trong các tác vụ nền định kỳ qua GitHub Actions hoặc lệnh CLI [`scripts/run_pipeline.py`](./scripts/run_pipeline.py).
* Kết quả phân tích được lưu trữ sẵn vào `data/ai_insights_cache.json` và trường `aiDeepDive` trong `data/financials/<MÃ>.json`.
* Giao diện React đọc trực tiếp dữ liệu từ file JSON trong **0ms**, triệt tiêu nguy cơ cháy hạn ngạch (Rate Limit Quota).

---

## 🎨 Chuẩn Hóa Giao Diện Dark / Light Mode Toàn Diện

Toàn bộ giao diện hệ thống được chuẩn hóa nghiêm ngặt trên nền tảng **Tailwind CSS** với cơ chế bảo vệ kép chống lỗi hiển thị:

* **Bổ Sung Bảng Màu Dịu Mắt (`tailwind.config.js`)**: Bổ sung hai shade màu chuẩn hóa `slate-750` (`#243044`) và `slate-850` (`#172033`) cho cả hai bảng màu `slate` và `gray`.
* **Chuẩn Tương Phản WCAG AAA**: Toàn bộ nhãn văn bản, badge, bảng dữ liệu và card đồ thị đều bảo đảm tương phản sắc nét trong Light Mode (nền trắng/sáng) và dịu mắt, không lóa trong Dark Mode (nền tối sâu).
* **Bộ Thành Phần Giao Diện Tái Sử Dụng**: Khung `ValuationCardContainer.jsx`, `Modal.jsx`, `SubTabNav.jsx`, `LoadingState.jsx` và `EmptyState.jsx` đồng nhất 100% phong cách thiết kế trên toàn bộ các tab.

---

## 🎯 Cấu Hình Trung Tâm Single Source of Truth

Toàn bộ các "magic numbers", tỷ lệ chiết khấu, ngưỡng rủi ro và nội dung mô tả nhận định trong hệ thống đều được tập trung hóa tại tệp [`data/default-constant-value.json`](./data/default-constant-value.json), cho phép tùy biến linh hoạt mà không cần sửa mã nguồn:

* **`valuation`**: WACC cơ sở 11.5%, Benchmark WACC 11 ngành, Ngưỡng lọc ngoại lai ±60%, Ma trận trọng số 10 mô hình cho 23 nhóm ngành.
* **`financialAnalytics`**: Trọng số 4 trụ cột sức khỏe tài chính, Ngưỡng gian lận Beneish M-Score (-2.22 / -1.78), Ngưỡng Magic Formula.
* **`macro`**: Ngưỡng 6 động lực chu kỳ vĩ mô, Trọng số 4 tầng rủi ro vĩ mô, Dải P/E Bands 5 nấc VN-Index, 5 hình thái đường cong lợi suất TPCP, Lãi suất tái cấp vốn SBV tham chiếu.
* **`portfolioAnalytics`**: Lãi suất tiết kiệm mặc định 6.0%, Độ biến động VN-Index 18.0%, 4 phong cách rủi ro tiền mặt, 5 tầng tỷ trọng vốn, Thang điểm Sharpe.
* **`profitProtectionAdvisor`**: 4 chế độ kỷ luật khóa lãi/cắt lỗ, tỷ lệ phân bổ lưới chốt lời 3 tầng (30% - 40% - 30%), ngưỡng Trailing Stop động.
* **`dcaPlannerConfig`**: Bước giá giảm mặc định 3.0%, 4 chiến lược kim tự tháp gom hàng, Presets đợt gom và lô cơ sở.
* **`strategyAndDiscipline`**: Ngưỡng cảnh báo Win Rate 40.0%, 6 thẻ kỷ luật bán, Các mẫu template nhận định tự động.
* **`taxAndFees`**: Thuế TNCN bán cổ phiếu 0.1%, Thuế cổ tức tiền mặt 5.0%, Biểu phí môi giới và ghi chú pháp lý.
* **`aiEngineHub`**: Cấu hình Provider, Models, Temperature, MaxTokens và System Prompts cho 5 AI Personas.

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy

### 1. Yêu Cầu Môi Trường
* **Node.js**: Phiên bản 18.x hoặc 20.x trở lên.
* **Python**: Phiên bản 3.11.x (Quản lý môi trường ảo **bắt buộc dùng `uv`**, tuyệt đối không dùng `pip`).
* **Astral uv**: Cài đặt qua lệnh `curl -LsSf https://astral.sh/uv/install.sh | sh` hoặc `brew install uv`.

### 2. Cài Đặt Mã Nguồn & Thư Viện

```bash
# 1. Clone mã nguồn
git clone https://github.com/<your-username>/stock.git
cd stock

# 2. Cài đặt thư viện Frontend & Backend Node.js
npm install

# 3. Khởi tạo môi trường ảo Python 3.11 với uv
uv venv .venv --python 3.11

# 4. Cài đặt các thư viện định lượng tài chính chuẩn
uv pip install --python .venv/bin/python pandas requests beautifulsoup4 yfinance curl_cffi lxml numpy
```

### 3. Thiết Lập Biến Môi Trường (.env)

Sao chép tệp mẫu [`.env.example`](./.env.example) thành `.env` và điền các tham số mong muốn:

```bash
cp .env.example .env
```

Các biến môi trường cơ bản:
```ini
# Chế độ lưu trữ DB: 'local' (dùng data/stock.db offline) hoặc 'turso' (dùng Cloud SQLite)
DB_MODE=local
PORT=3001

# Cấu hình Turso Cloud (Tùy chọn cho Production / Vercel)
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=

# Cấu hình AI Copilot (Tùy chọn)
AI_PROVIDER=auto
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
# Hoặc sử dụng OpenAI / DeepSeek / Groq:
# OPENAI_API_KEY=your_openai_or_deepseek_key_here
# OPENAI_BASE_URL=https://api.openai.com/v1
# OPENAI_MODEL=deepseek-chat
```

### 4. Khởi Chạy Ứng Dụng

```bash
# Khởi chạy đồng thời Backend Express (Port 3001) và Frontend Vite (Port 5173)
npm run dev

# Khởi chạy cưỡng bức chế độ Local SQLite (data/stock.db)
npm run dev:local

# Khởi chạy chế độ Turso Cloud SQLite
npm run dev:turso
```

Mở trình duyệt tại địa chỉ: **`http://localhost:5173`**.

---

## ⚡ Bộ Điều Phối Pipeline Dữ Liệu Thống Nhất

Hệ thống tích hợp bộ điều phối dữ liệu hợp nhất [`scripts/run_pipeline.py`](./scripts/run_pipeline.py) phục vụ tự động hóa toàn bộ luồng thu thập dữ liệu và sinh nội dung phân tích AI:

```bash
# 1. Chạy Tác Vụ EOD Hằng Ngày (~10 giây)
# Quét TradingView Scanner 50+ chỉ số, tỷ giá, vàng, nến DNSE, AI Daily Pulse, giải quyết hàng đợi requested_stocks
python scripts/run_pipeline.py --cadence daily

# 2. Chạy Tác Vụ Vĩ Mô & Ngành Hằng Tuần (~10 giây)
# Cào 95 chỉ số TradingEconomics, P/E 10 nhóm ngành GICS, lịch sử định giá, AI Macro Briefing
python scripts/run_pipeline.py --cadence weekly

# 3. Chạy Toàn Bộ BCTC & DCF Hằng Quý (~25 giây)
# Cào BCTC 8 quý & 5 năm, 10 mô hình định giá, 54 ratios, DuPont, AI Stock Deep Dive
python scripts/run_pipeline.py --cadence quarterly

# 4. Chạy BCTC cho một hoặc nhiều mã cụ thể
python scripts/run_pipeline.py --cadence quarterly --symbols "HPG,SSI,VND"

# 5. Chạy Đồng Bộ Toàn Diện Hệ Thống
python scripts/run_pipeline.py --cadence all

# 6. Quản Lý Sao Lưu & Phục Hồi Database SQLite
python scripts/db_manager.py status
python scripts/db_manager.py export --output data/backups/my_backup.json
python scripts/db_manager.py import --input data/backups/my_backup.json
```

---

## 🧪 Quy Chuẩn Kiểm Thử Nghiệm Thu (Verification Gate)

Mọi thay đổi mã nguồn trong hệ thống đều phải vượt qua bộ 4 bài kiểm thử nghiệm thu nghiêm ngặt trước khi triển khai:

```bash
# 1. Chạy 36 Unit Test Cases Động Cơ Định Giá & Phân Tích Tài Chính (Python)
.venv/bin/python scripts/test_valuation_engine.py

# 2. Chạy 6 Unit Test Cases Cố Vấn Khóa Lãi Trailing Stop & Risk-Reward Advisor (Node.js)
node scripts/test_risk_reward_advisor.js

# 3. Chạy 6 Unit Test Cases SBV OMO Radar & Sức Mua Thực Tế Fisher Inflation (Node.js)
node scripts/test_macro_radar_and_real_return.js

# 4. Kiểm tra tính toàn vẹn Build Frontend Vite Production
npm run build
```

---

## 📚 Danh Mục Tài Liệu Kỹ Thuật

* 🤖 **[`AGENTS.md`](./AGENTS.md)**: Cẩm nang vận hành dành cho AI Agent, quy chuẩn môi trường `uv`, nguyên tắc cấm `git add/push` và 6 bẫy số liệu TTCK Việt Nam.
* 🌐 **[`docs/DEPLOYMENT_AND_ENV_CONFIG_GUIDE.md`](./docs/DEPLOYMENT_AND_ENV_CONFIG_GUIDE.md)**: Cẩm nang cấu hình biến môi trường & triển khai hệ thống (GitHub Actions vs Vercel vs Local, AI Multi-Provider, Turso Cloud).
* 📚 **[`docs/DATA_CATALOG.md`](./docs/DATA_CATALOG.md)**: Bản đồ dữ liệu toàn diện 10 phân hệ, đặc tả chi tiết 122+ chỉ tiêu BCTC, 54 Ratios, và schema AI Copilot.
* ⚙️ **[`docs/BACKGROUND_DATA_PIPELINE.md`](./docs/BACKGROUND_DATA_PIPELINE.md)**: Đặc tả kỹ thuật các tác vụ nền, luồng điều phối API và GitHub Actions cron jobs.
* 💡 **[`docs/reference_knowledge/`](./docs/reference_knowledge/)**: Kho tri thức tài chính học thuật, công thức định giá Damodaran, Benjamin Graham và kiểm toán BCTC.
* 📋 **[`.env.example`](./.env.example)**: Tệp mẫu hướng dẫn cấu hình biến môi trường toàn diện.

---

<div align="center">

Phát triển với sự cẩn trọng cao nhất về tính toàn vẹn dữ liệu tài chính • **Stock Portfolio Manager & Enterprise Valuation Engine**

</div>
