# 📈 Stock Portfolio Manager & Enterprise Valuation Engine

<div align="center">

![Stock Portfolio & Valuation Banner](https://img.shields.io/badge/Status-Production%20Ready-emerald?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)
![Vietnam Stock Exchange](https://img.shields.io/badge/Market-HOSE%20%7C%20HNX%20%7C%20UPCoM-red?style=for-the-badge)

**Nền tảng quản trị danh mục đầu tư chứng khoán cá nhân, kỷ luật giao dịch thực chiến và thẩm định giá trị nội tại doanh nghiệp chuyên sâu dành riêng cho Thị Trường Chứng Khoán Việt Nam.**

[🌟 Tính Năng Nổi Bật](#-7-phân-hệ-tính-năng-toàn-diện) • [🤖 AI Copilot Đa Provider](#-hệ-sinh-thái-ai-copilot-đa-provider-chạy-nền) • [🏗️ Kiến Trúc Hệ Thống](#-kiến-trúc-hệ-thống--quản-trị-dữ-liệu-5-tầng) • [⚙️ Cài Đặt](#-hướng-dẫn-cài-đặt--khởi-chạy) • [📚 Tài Liệu](#-danh-mục-tài-liệu-kỹ-thuật)

</div>

---

## 🏛️ Kiến Trúc Hệ Thống & Quản Trị Dữ Liệu 5 Tầng

Hệ thống được thiết kế theo mô hình **Hybrid 3 Tầng** kết hợp cơ chế **Phân tầng dữ liệu 5 Tầng (Storage Tiering)** nhằm tối ưu hóa độ trễ truy vấn **0ms**, đảm bảo an toàn giao dịch tài chính (ACID) và duy trì chi phí vận hành ở mức tối thiểu.

### Mô Hình Hybrid 3 Tầng:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       1. TẦNG TRÌNH DIỄN (FRONTEND SPA)                     │
│    React 18 · Vite · Tailwind CSS · Recharts · Lucide Icons · Dark/Light    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP / REST API (0ms Cache First)
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                    2. TẦNG ĐIỀU PHỐI (BACKEND & API GATEWAY)                │
│    Node.js Express / Vercel Serverless · server/services/ · server/routes/  │
│    Turso SQLite Cloud (Production) / data/stock.db (Local ACID Storage)     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ CLI Execution / IPC / JSON Repositories
┌──────────────────────────────────────▼──────────────────────────────────────┐
│             3. TẦNG ĐỊNH LƯỢNG & PIPELINE DỮ LIỆU (PYTHON 3.11 ENGINE)      │
│    Astral uv Virtualenv · scripts/run_pipeline.py · scripts/lib/            │
│    Multi-Source Feeds: Yahoo Finance, vnstock 4.0, CafeF, Vietstock, DNSE   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Ma Trận Quản Trị Dữ Liệu 5 Tầng (Data Governance 5 Tiers):

| Tầng Dữ Liệu | Đối Tượng & Nội Dung | File / Database Lưu Trữ | Trạng Thái Git | Chu Kỳ Cập Nhật & Bộ Điều Phối | Mục Đích Sử Dụng |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TẦNG 1: ACID Database** | Sổ lệnh Mua/Bán FIFO (`buy_orders`, `sell_orders`), Cổ tức, Watchlist, Hàng đợi yêu cầu (`requested_stocks`), Số dư tiền mặt. | `data/stock.db` (Local) / Turso Cloud (Prod) | **GITIGNORED (100%)** *(Tuyệt đối không commit)* | Realtime khi người dùng thao tác. Quản lý sao lưu/phục hồi qua `scripts/db_manager.py`. | Đảm bảo tính toàn vẹn giao dịch (ACID), bảo mật số liệu tài chính cá nhân. |
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
├───────────────────────┼─────────────────────────────┼───────────────────────┤
│ 4. DCA PLANNER        │ 5. CHIẾN LƯỢC & KỶ LUẬT     │ 6. VĨ MÔ & VN-INDEX   │
│    Lưới gom đa tầng   │    Nhật ký 6 thẻ tâm lý     │    Regime 5 pha       │
├───────────────────────┴─────────────────────────────┴───────────────────────┤
│ 7. ĐỊNH GIÁ DOANH NGHIỆP CHUYÊN SÂU (VALUATION DEEP DIVE)                   │
│    10 Mô hình định lượng · 7 Vùng giá · Khung 3 tầng · Kiểm toán BCTC       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Phân Hệ 1: Dashboard Tổng Quan Danh Mục & Phân Bổ NAV (`Dashboard.jsx`)
* **💎 Thước Đo Tài Sản Ròng (NAV)**: Tổng hợp tổng giá trị thị trường cổ phiếu đang nắm giữ, số dư tiền mặt khả dụng và tổng vốn đầu tư lũy kế.
* **🛡️ 4 Phong Cách Quản Trị Rủi Ro Tiền Mặt (`riskPostures`)**:
  * *Phòng thủ cao* (Tiền mặt &ge; 50%): Giữ tỷ trọng tiền mặt lớn để săn hàng giảm giá sâu.
  * *Cân bằng tối ưu* (Tiền mặt &ge; 20%): Cơ cấu danh mục chuẩn mực, hài hòa giữa tăng trưởng và an toàn.
  * *Tấn công chủ động* (Tiền mặt &ge; 5%): Tận dụng tối đa dòng vốn đón sóng tăng giá.
  * *Full 100% Cổ phiếu* (Tiền mặt &lt; 5%): Toàn bộ tài sản nằm ở cổ phiếu, chịu rủi ro biến động thị trường cao nhất.
* **🏦 So Kèo Chi Phí Cơ Hội (Chứng Khoán vs Gửi Tiết Kiệm Ngân Hàng)**: Tự động đối chiếu lợi nhuận đầu tư cổ phiếu với lãi suất gửi tiết kiệm tham chiếu (mặc định 6.0%/năm, presets `[5.0, 6.0, 7.0, 8.0]%`), tính toán thặng dư tài sản thực tế (**Alpha VND**) và tỷ suất sinh lời vượt trội (**Alpha %**).
* **⚡ Bộ Chỉ Số Sharpe & Sortino Đo Lường Rủi Ro**: Đo lường tỷ suất sinh lời hàng năm (Annualized Return) bù đắp trên mức biến động chuẩn VN-Index **18.0%/năm** và tỷ lệ lệnh lỗ (Downside Deviation), phân hạng chất lượng danh mục: *Xuất sắc* (&ge;2.0), *Tốt* (&ge;1.0), *Khá* (&ge;0.0), *Dưới lãi tiết kiệm* (&lt;0.0).
* **📊 Trực Quan Hóa Đồ Thị Toàn Diện**: Biểu đồ thác nước lợi nhuận (**Waterfall Chart**), Biểu đồ đóng góp P/L từng mã (**Stock Contribution Chart**), và Lãi/Lỗ theo tháng (**Monthly P/L Chart**).

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
* **🔍 Thanh Tra Nguồn Gốc Lô Lệnh (Lot Inspector Modal)**: Cho phép mở xem chi tiết từng lệnh bán đã chốt lãi/lỗ được ghép từ những lô mua nào trong quá khứ, giá vốn từng lô và thời gian nắm giữ chính xác từng ngày.
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

### Phân Hệ 6: Phân Tích Kinh Tế Vĩ Mô & Nhiệt Kế VN-Index (`MacroDashboard.jsx`)
* **🔄 Chu Kỳ Kinh Tế 5 Pha (Macro Regime)**: Tự động phân định pha kinh tế hiện tại (*Phục hồi*, *Mở rộng*, *Quá nhiệt*, *Chậm lại*, *Suy thoái*) dựa trên 6 động lực cốt lõi: Lãi suất tái cấp vốn SBV, Lãi suất liên ngân hàng ON, CPI YoY, Tăng trưởng tín dụng, PMI sản xuất và Tỷ giá USD/VND.
* **🛡️ Điểm Rủi Ro Vĩ Mô 4 Tầng (Macro Risk Score 0-100)**: Phân rã 4 thành tố rủi ro độc lập: Tiền tệ (35%), Tăng trưởng (25%), Lạm phát (20%), Cú sốc tỷ giá ngoại biên (20%).
* **🌡️ Nhiệt Kế Định Giá VN-Index 25 Năm**: Theo dõi dải P/E Bands 5 nấc từ năm 2000 đến nay (*Rất rẻ &lt;11.5x*, *Hấp dẫn 11.5–13.5x*, *Hợp lý 13.5–16.0x*, *Đắt 16.0–18.0x*, *Quá đắt &gt;18.0x*), phân phối chuẩn Z-Score và cảnh báo cực đoan $|Z| > 2.0$.
* **📈 Giám Sát Đường Cong Lợi Suất TPCP (Yield Curve Monitor & Stress Box)**: Theo dõi lợi suất kỳ hạn VN02Y, VN05Y, VN10Y, phân loại 5 hình thái đường cong (YC0 - YC4), chẩn đoán chuỗi truyền dẫn rủi ro thanh khoản 3 mắt xích.
* **🗺️ Bản Đồ Luân Chuyển 10 Nhóm Ngành GICS**: Phân bổ các nhóm ngành vào 4 góc phần tư ma trận thiên thời: *Thiên thời (Sweet Spot)*, *Bẫy giá trị (Value Trap)*, *Đà tăng trưởng (Momentum)*, *Phòng thủ (Defense)*.
* **👑 Thước Đo Chênh Lệch Giá Vàng SJC & PNJ**: Đo lường mức chênh lệch giữa giá vàng miếng SJC và vàng nhẫn PNJ 999.9 (tích hợp trực tiếp từ PNJ Official Edge API) so với giá vàng quốc tế quy đổi.
* **📚 Kho 95 Chỉ Số Kinh Tế TradingEconomics**: Tra cứu toàn diện số liệu kinh tế vĩ mô Việt Nam qua 10 phân nhóm có bộ lọc tức thì.

---

### Phân Hệ 7: Tra Cứu & Định Giá Cổ Phiếu Chuyên Sâu (`ValuationDashboard.jsx`)
* **🔍 Khung Tra Cứu Tự Do Cả 3 Sàn (HOSE, HNX, UPCoM)**: Nhập bất kỳ mã cổ phiếu nào. Nếu mã chưa có trong kho lưu trữ, hệ thống tự động ghi nhận vào hàng đợi `requested_stocks` và kích hoạt pipeline tải dữ liệu sống.
* **🎯 Hero Card Giá Trị Nội Tại Hội Tụ**: Điểm hội tụ từ 10 mô hình định lượng độc lập sau khi **loại bỏ ngoại lai ±60%** và **chuẩn hóa trọng số ngành** (Sector Weights), tính toán Biên An Toàn (**MoS %**) và đưa ra khuyến nghị: *Mua gom tích luỹ*, *Theo dõi nắm giữ*, *Cân nhắc chốt lời*.
* **📐 Lưới 10 Mô Hình Định Lượng Độc Lập**:
  1. **Benjamin Graham Dynamic Formula**: $V = EPS \times (PE_{\text{base}} + hs \times g) \times \frac{\text{Hằng số}_{\text{vn}}}{y}$
  2. **Chiết Khấu Cổ Tức Gordon DDM Fade Rate**: Chiết khấu dòng tiền cổ tức có kiểm toán FCF bảo chứng.
  3. **Target P/E Multiple**: P/E mục tiêu theo trung vị chu kỳ 5 năm (Median 5Y).
  4. **Target P/B Ngành & Gordon Growth**: $V = BVPS \times \frac{ROE - g}{r - g}$
  5. **Chiết Khấu Dòng Tiền Tự Do Doanh Nghiệp (DCF FCFF)**: Dòng tiền tự do doanh nghiệp 5 năm và giá trị kết thúc Terminal Value.
  6. **Multi-Stage DCF**: Mô hình DCF 3 giai đoạn thích ứng với chu kỳ vốn lớn.
  7. **Damodaran FCFE**: Chiết khấu dòng tiền tự do vốn chủ sở hữu ($CFO - CapEx + \Delta Debt$).
  8. **Thu Nhập Thặng Dư RIM / EVA**: Đo lường giá trị gia tăng trên vốn chủ sở hữu vượt trên chi phí vốn CoE.
  9. **Book NAV / P/B Chuẩn Hóa**: Giá trị sổ sách điều chỉnh P/B lịch sử.
  10. **Advanced Multiples EV/EBITDA & EV/Sales**: Bội số giá trị doanh nghiệp trên năng lực tạo lợi nhuận hoạt động.
* **🗺️ Bản Đồ 7 Vùng Định Giá & Khung Ra Quyết Định 3 Tầng**:
  * Phân chia thị giá thành 7 vùng: *Deep Value* (&lt;0.75x), *Mua An Toàn* (0.75–0.85x), *Tích Luỹ* (0.85–0.95x), *Hợp Lý* (0.95–1.10x), *Chớm Đắt* (1.10–1.20x), *Đắt* (1.20–1.35x), *Nguy Hiểm* (&gt;1.35x).
  * Đánh giá ma trận 3 tầng: Tầng 1 Định giá (V-Score), Tầng 2 Chất lượng (Q-Score ROE vs CoE), Tầng 3 Thời điểm (T-Score Xung lực kỹ thuật).
* **🛡️ Phân Hệ Kiểm Toán Tài Chính & Sàng Lọc Lượng Hóa Cao Cấp**:
  * **Beneish M-Score**: Mô hình kiểm toán gian lận báo cáo tài chính 8 biến số chuẩn học thuật (DSRI, GMI, AQI, SGI, DEPI, SGAI, LVGI, TATA) phát hiện nguy cơ thao túng lợi nhuận.
  * **Joel Greenblatt Magic Formula**: Sàng lọc doanh nghiệp chất lượng cao với Earnings Yield &ge; 8.5% và ROIC &ge; 15.0%.
  * **Điểm Uốn FCF & Thước Đo Dồn Tích Accruals**: Nhận diện điểm bùng nổ chu kỳ vốn sau giai đoạn mở rộng CapEx.
* **🔄 Reverse DCF & Ma Trận Độ Nhạy Cảm 2 Chiều**:
  * Giải ngược bài toán tăng trưởng ngụ ý: Thị trường đang kỳ vọng dòng tiền doanh nghiệp tăng trưởng bao nhiêu %/năm để biện minh cho thị giá hiện tại.
  * Ma trận độ nhạy cảm 2 chiều giữa Chi phí vốn WACC (Hàng) và Tăng trưởng dài hạn g (Cột).
  * Tự động áp dụng quy chuẩn miễn trừ mô hình DCF cho nhóm Ngân Hàng/Tài Chính theo khuyến nghị của **CFA Institute**.
* **📊 4 Chế Độ Xem Báo Cáo Tài Chính Chuyên Sâu**: 122+ chỉ tiêu BCTC 8 quý và 5 năm, 54 Chỉ số Ratios & Extended DuPont 5 nhân tố, Danh sách cổ đông lớn & lịch sử chi trả cổ tức, và Raw JSON Inspector.

---

## 🤖 Hệ Sinh Thái AI Copilot Đa Provider Chạy Nền

Hệ thống được trang bị bộ động cơ AI Copilot chuyên sâu, hỗ trợ kiến trúc **Đa Nhà Cung Cấp (Multi-Provider)** và vận hành theo cơ chế **Sinh dữ liệu chạy nền (Background Scheduled Generation)** nhằm bảo đảm tốc độ hiển thị **0ms**, loại bỏ 100% rủi ro nghẽn mạng và tiết kiệm tối đa chi phí gọi API.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    KIẾN TRÚC AI COPILOT ĐA PROVIDER & CHẠY NỀN              │
├─────────────────────────────────────────────────────────────────────────────┤
│  PROVIDER 1: Google Gemini (gemini-1.5-flash / gemini-1.5-pro / gemini-2.0-flash)   │
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
2. **🩺 Antigravity Portfolio Doctor & CRO**: Rà soát tỷ trọng vốn, tỷ trọng tiền mặt, hệ số Sharpe, đòn bẩy và rủi ro sụt giảm NAV, đưa ra hành động tái cân bằng danh mục.
3. **🏢 Senior Equity Research Analyst (Stock Copilot - CFA)**: Thẩm định điểm hội tụ 10 mô hình định lượng, rà soát 7 bẫy định giá, kiểm tra năng lực dòng tiền FCF và vùng mua/bán an toàn.
4. **🪜 Quantitative Execution Trader (DCA Advisor)**: Đánh giá tính khả thi của lưới mua gom theo bước giá, mức độ chịu nhiệt tài khoản và tối ưu giá vốn trung bình.
5. **🎯 Trading Psychology & Discipline Coach**: Nhận diện thiên kiến tâm lý (FOMO, gồng lỗ, chốt non), phân tích Win Rate theo chiến lược và củng cố kỷ luật giao dịch.

### 3. Cơ Chế Sinh Dữ Liệu Chạy Nền Tiết Kiệm Chi Phí:
* **Không gọi LLM theo từng cú nhấp chuột**: Các báo cáo phân tích vĩ mô, nhịp đập thị trường và định giá doanh nghiệp được sinh tự động trong các tác vụ nền định kỳ qua GitHub Actions hoặc lệnh CLI [`scripts/run_pipeline.py`](file:///Users/thaihai-swe/Desktop/stock/scripts/run_pipeline.py).
* Kết quả phân tích được lưu trữ sẵn vào `data/ai_insights_cache.json` và trường `aiDeepDive` trong `data/financials/<MÃ>.json`.
* Giao diện React đọc trực tiếp dữ liệu từ file JSON trong **0ms**, triệt tiêu nguy cơ cháy hạn ngạch (Rate Limit Quota).

---

## 🎯 Cấu Hình Trung Tâm Single Source of Truth

Toàn bộ các "magic numbers", tỷ lệ chiết khấu, ngưỡng rủi ro và nội dung mô tả nhận định trong hệ thống đều được tập trung hóa tại tệp [`data/default-constant-value.json`](file:///Users/thaihai-swe/Desktop/stock/data/default-constant-value.json), cho phép tùy biến linh hoạt mà không cần sửa mã nguồn:

* **`valuation`**: WACC cơ sở 11.5%, Benchmark WACC 11 ngành, Ngưỡng lọc ngoại lai ±60%, Ma trận trọng số 10 mô hình cho 23 nhóm ngành.
* **`financialAnalytics`**: Trọng số 4 trụ cột sức khỏe tài chính, Ngưỡng gian lận Beneish M-Score (-2.22 / -1.78), Ngưỡng Magic Formula.
* **`macro`**: Ngưỡng 6 động lực chu kỳ vĩ mô, Trọng số 4 tầng rủi ro vĩ mô, Dải P/E Bands 5 nấc VN-Index, 5 hình thái đường cong lợi suất TPCP.
* **`portfolioAnalytics`**: Lãi suất tiết kiệm mặc định 6.0%, Độ biến động VN-Index 18.0%, 4 phong cách rủi ro tiền mặt, 5 tầng tỷ trọng vốn, Thang điểm Sharpe.
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

Sao chép tệp mẫu [`.env.example`](file:///Users/thaihai-swe/Desktop/stock/.env.example) thành `.env` và điền các tham số mong muốn:

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

Hệ thống tích hợp bộ điều phối dữ liệu hợp nhất [`scripts/run_pipeline.py`](file:///Users/thaihai-swe/Desktop/stock/scripts/run_pipeline.py) phục vụ tự động hóa toàn bộ luồng thu thập dữ liệu và sinh nội dung phân tích AI:

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

Mọi thay đổi mã nguồn trong hệ thống đều phải vượt qua bộ quy chuẩn kiểm thử nghiêm ngặt:

```bash
# 1. Chạy 36 Unit Test Cases Bộ Động Cơ Định Giá & Phân Tích Tài Chính
.venv/bin/python scripts/test_valuation_engine.py

# 2. Kiểm thử chạy nền AI Service Dry-Run (Không ghi đè dữ liệu)
.venv/bin/python scripts/generate_ai_insights.py --scope daily_market --dry-run
.venv/bin/python scripts/generate_ai_insights.py --scope macro --dry-run

# 3. Kiểm tra tính toàn vẹn Build Frontend Vite
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
