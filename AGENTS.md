# 🤖 AGENTS.md — Cẩm Nang Vận Hành Dành Cho AI Agent

Dont run git add and git push
Always upate data_catalog.md when you add new data source or new field.

Tài liệu này là quy chuẩn kỹ thuật và nguyên tắc vận hành cao nhất dành cho các AI Agent (Antigravity, Codex, Pair-Programmer) khi làm việc trên codebase **Stock Portfolio Manager & Enterprise Valuation Engine**. Mọi thay đổi mã nguồn, dữ liệu và quy trình phát triển đều phải tuân thủ nghiêm ngặt các quy tắc dưới đây.

---

## 1. Tổng Quan Dự Án & Kiến Trúc Hệ Thống

Dự án là nền tảng quản trị danh mục đầu tư chứng khoán cá nhân và định giá doanh nghiệp chuyên sâu dành riêng cho **Thị Trường Chứng Khoán Việt Nam (HOSE, HNX, UPCoM)**.

### Mô Hình Hybrid 3 Tầng:
```
┌─────────────────────────────────────────────────────────────┐
│                 1. FRONTEND: SPA (React 18 + Vite)          │
│   Tailwind CSS · Recharts · Lucide Icons · Dark/Light Mode   │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / REST API
┌──────────────────────────────▼──────────────────────────────┐
│           2. BACKEND & API (Node.js Express / Vercel)       │
│  server/routes/ · server.js · Turso SQLite Cloud / Local DB │
└──────────────────────────────┬──────────────────────────────┘
                               │ IPC / CLI Execution / JSON
┌──────────────────────────────▼──────────────────────────────┐
│          3. DATA PIPELINE & VALUATION ENGINE (Python 3.11)  │
│  scripts/sync_fundamentals.py · fetch_financial_reports.py  │
│  Multi-source Data: TradingView, Yahoo, HNX, TCBS, VCI      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Tiêu Chuẩn Môi Trường & Quản Lý Gói (CRITICAL)

### 🐍 Python: BẮT BUỘC DÙNG `uv`, TUYỆT ĐỐI KHÔNG DÙNG `pip`
* **Quy tắc vàng**: **KHÔNG ĐƯỢC** chạy `pip install` hoặc `python3 -m pip install`. Mọi thao tác quản lý gói và môi trường Python phải thông qua **`uv`**.
* **Đường dẫn binary `uv`**: `~/.local/bin/uv` hoặc `uv` (nếu có trong PATH).
* **Môi trường ảo (Virtualenv)**: Đặt tại `.venv/` (sử dụng Python 3.11).
  * Tạo venv: `uv venv .venv --python 3.11`
  * Cài đặt gói: `uv pip install --python .venv/bin/python <package_name>`
  * Chạy script: `.venv/bin/python scripts/<script_name>.py` hoặc `uv run --python .venv/bin/python scripts/<script_name>.py`
* **Thư viện chuẩn của hệ thống**:
  `pandas`, `requests`, `beautifulsoup4`, `yfinance`, `curl_cffi`, `lxml`, `numpy`.

### ⚛️ Node.js & Frontend:
* Quản lý gói: `npm install`, `npm run dev`.
* **Quy tắc nghiệm thu bắt buộc (Verification Gate)**:
  Mỗi khi sửa đổi bất kỳ component hoặc tiện ích nào trong thư mục `src/`, Agent **bắt buộc phải chạy `npm run build`** để đảm bảo không có lỗi cú pháp, thiếu biến hoặc gãy import.

---

## 3. Triết Lý Lưu Trữ Dữ Liệu: "Local JSON First"

Toàn bộ dữ liệu tài chính, định giá và thị trường đều được thu thập và lưu trữ dưới dạng **JSON có cấu trúc tại thư mục `data/`** trước khi đồng bộ vào cơ sở dữ liệu SQLite (`data/stock.db` hoặc Turso Cloud):

| File Dữ Liệu | Mục Đích & Nội Dung |
| :--- | :--- |
| `data/fundamentals_cache.json` | Snapshot định giá cơ bản, chỉ số P/E, P/B, ROE, Beta, Tech Score của tất cả các mã. |
| `data/macro_valuation.json` | Dữ liệu vĩ mô: VN-Index, 5-Phase Regime, Risk Score 4 tầng, Phân bổ 4 tài sản, Cố vấn vàng SJC. |
| `data/macro_indicators.json` | 95 chỉ số vĩ mô TradingEconomics theo 10 phân nhóm (GDP, Lạm phát, Lao động, Tiền tệ, Cán cân...). |
| `data/market_valuation_history.json` | Chuỗi dữ liệu định giá lịch sử thị trường 4 chu kỳ (1Y, 3Y, 5Y, 10Y): Absolute P/E, P/E, P/S, Vốn hóa, Doanh thu, Lợi nhuận từ Google Sheets Simply Wall St. |
| `data/financials/<SYMBOL>.json` | Dữ liệu BCTC chi tiết 8 quý & 5 năm (122+ chỉ tiêu), 54 chỉ số Ratios, DuPont 3 nhân tố, Cổ tức & Cổ đông. |
| `data/supported_stocks.json` | Danh sách các mã cổ phiếu được cấu hình theo dõi định giá. |
| `data/prices_cache.json` | Cache thị giá khớp lệnh thời gian thực. |
| `data/stock.db` | SQLite Database lưu trữ sổ lệnh mua/bán, danh mục nắm giữ, lịch sử nhận cổ tức và tài khoản. |

> 📌 **Chi tiết toàn diện về schema, nguồn dữ liệu và ma trận trường thông tin:** Xem tại [`docs/DATA_CATALOG.md`](file:///Users/thaihai-swe/Desktop/stock/docs/DATA_CATALOG.md).


---

## 4. Quy Chuẩn Giao Diện Người Dùng (UI / UX Architecture)

Khi phát triển hoặc sửa đổi UI, các Agent phải tuân thủ nghiêm ngặt 3 phân định độc lập sau:

### A. Popup Chi Tiết Cổ Phiếu (`StockDetailModal.jsx`) — SỔ CÁI LÃI/LỖ THUẦN TÚY (FIFO P/L LEDGER)
* Khi người dùng nhấp vào một mã cổ phiếu tại Dashboard hoặc Lịch sử giao dịch:
  * **Chỉ hiển thị Sổ Cái Lãi/Lỗ Tinh Gọn theo Chuẩn FIFO**:
    1. **Header Sổ Cái**: Mã CP, Trạng thái vị thế (*Đang nắm giữ* kèm số lượng hoặc *Đã tất toán vị thế*).
    2. **Hero Card**: Tổng P/L tích luỹ toàn thời gian (đã chốt + chưa chốt + cổ tức), ROI %, Tổng vốn mua vào, Số lượt giao dịch & khoảng thời gian.
    3. **3 Trụ Cột**: Realized P/L (Lãi/lỗ đã chốt), Unrealized P/L (Lãi/lỗ tạm tính), Tổng Cổ Tức tiền mặt đã nhận.
    4. **Vị Thế Hiện Tại**: Số lượng nắm giữ, Giá vốn bình quân, Thị giá, Tổng giá trị thị trường, Tỷ suất tạm tính.
    5. **Nhật Ký Sổ Cái Giao Dịch**: Lịch sử chi tiết từng lệnh Mua, Bán (P/L từng lô theo chuẩn FIFO), Cổ tức có bộ lọc tiện lợi.
  * **TUYỆT ĐỐI KHÔNG**: Không hiển thị thông tin mô tả công ty hay Thước đo vị thế 52 tuần (52W Range Slider) tại modal này (để giữ modal nhẹ, tập trung 100% vào sổ cái lệnh và lãi lỗ).
  * Cung cấp nút điều hướng: **`🎯 Sang Tab Định Giá`** để chuyển thẳng người dùng sang tab Định Giá và tự động mở đúng mã đó (nơi có đầy đủ thông tin doanh nghiệp & thước đo 52 tuần).

### B. Tab Vĩ Mô & VN-Index (`MacroDashboard.jsx`) — MACRO REGIME & MARKET THERMOMETER
* **Giao diện tập trung toàn diện cho phân tích kinh tế vĩ mô & chu kỳ thị trường**:
  1. **Nhiệt Kế Định Giá VN-Index**: P/E Bands 5 năm (Rất rẻ &lt;11.5x đến Rất đắt &gt;18x), P/B, Z-Score và các chỉ số liên thị trường (USD/VND, TPCP 10Y, Lãi suất SBV, SJC, Brent).
  2. **Chu Kỳ Kinh Tế 5 Pha (Macro Regime)**: Xác định pha hiện tại (Phục hồi, Mở rộng, Quá nhiệt, Suy thoái, Chậm lại), Tăng trưởng GDP vs Lạm phát, Tâm lý Risk-On / Risk-Off.
  3. **Điểm Rủi Ro Vĩ Mô (0-100)**: Phân rã 4 tầng rủi ro (Tiền tệ, Tài khóa, Lạm phát, Thanh khoản).
  4. **Bản Đồ Luân Chuyển & Định Giá 10 Nhóm Ngành GICS (Sector Valuation & Rotation)**: Hợp nhất dữ liệu P/E Heatmap và 6 Động Lực Vĩ Mô vào 2 chế độ xem chất lượng cao: (1) Ma Trận Thiên Thời & Bản Đồ Nhiệt và (2) Bảng Số Liệu Toàn Diện & Phân Rã Vĩ Mô.
  5. **Cố Vấn Phân Bổ 4 Loại Tài Sản & Chênh Lệch Giá Vàng**: Phân bổ Cổ phiếu, Trái phiếu/Tiền mặt, Vàng, Ngoại tệ + Đo độ chênh lệch vàng miếng SJC & nhẫn PNJ 999.9 (từ PNJ Official Edge API) so với giá quốc tế quy đổi.
  6. **Kho 95 Chỉ Số TradingEconomics**: Tra cứu 10 phân nhóm kinh tế vĩ mô có tìm kiếm tức thì.

### C. Tab Định Giá Cổ Phiếu (`ValuationDashboard.jsx`) — SINGLE-STOCK DEEP DIVE
* **Loại bỏ hoàn toàn**:
  * Các khối vĩ mô và chỉ số VN-Index (đã chuyển sang `MacroDashboard.jsx`).
  * Các tag gợi ý nhanh (Quick Tags) gây rối mắt.
  * Bảng định giá đa mã (Multi-stock table) rườm rà.
* **Giao diện tập trung chuyên sâu cho 1 mã đang tra cứu**:
  1. **Khung Tra Cứu Tự Do**: Cho phép nhập bất kỳ mã cổ phiếu nào trên cả 3 sàn (HOSE, HNX, UPCoM). Nếu là mã mới chưa có trong cache, hệ thống tự động kích hoạt pipeline cào dữ liệu thời gian thực và sinh BCTC.
  2. **Hero Card Giá Trị Nội Tại Hội Tụ**: Điểm hội tụ từ 6 mô hình định giá, tính toán Biên An Toàn (MoS %) và đưa ra khuyến nghị hành động (*Mua gom tích luỹ*, *Theo dõi nắm giữ*, *Cân nhắc chốt lời*).
  3. **Lưới 6 Mô Hình Định Giá Độc Lập**:
     * Benjamin Graham Formula ($V = EPS \times (8.5 + 2g) \times \frac{4.4}{Y}$)
     * Chiết khấu Cổ tức Gordon DDM ($V = \frac{D_1}{r - g}$)
     * EV / EBITDA Multiple
     * Price / Cash Flow (P/CF Multiple)
     * Target P/E Multiple
     * Target P/B Multiple
  4. **Mô Tả Doanh Nghiệp, Xung Lực Kỹ Thuật & Thước Đo Vị Thế 52 Tuần**: Tên đầy đủ, mô tả ngành nghề kinh doanh, sàn niêm yết, khối lượng khớp lệnh, Thước đo vị thế giá 52 tuần (Đáy 52W — Thị giá hiện tại — Đỉnh 52W kèm % từ đáy), Beta, Tech Score, Hiệu suất từ 1 tuần đến 5 năm.
  5. **4 Chế Độ Xem Báo Cáo Tài Chính Chuyên Sâu**:
     * *BCTC Chi Tiết*: 122+ chỉ tiêu KQKD, CĐKT, LCTT trong 8 quý và 5 năm.
     * *54 Chỉ Số Tài Chính & DuPont*: Phân rã 3 nhân tố ROE (Biên ròng × Vòng quay tài sản × Đòn bẩy tài chính).
     * *Cổ Tức & Cổ Đông*: Lịch sử chi trả cổ tức và danh sách cổ đông lớn.
     * *Giải Phẫu Công Thức*: Chi tiết công thức toán học, tham số lãi suất và WACC.
  6. **Raw JSON Inspector**: Xem trực tiếp, tìm kiếm và sao chép nội dung các file JSON trong hệ thống.

---

## 5. Cẩm Nang Xử Lý Dữ Liệu & "6 Bẫy Số Liệu TTCK Việt Nam"

Tất cả các module trích xuất dữ liệu tài chính cần tham chiếu tài liệu tại `docs/reference_knowledge/`:

1. **Bẫy Biến Động Số Lượng Cổ Phiếu**: Cổ tức bằng cổ phiếu, thưởng cổ phiếu và ESOP làm thay đổi số lượng cổ phiếu lưu hành liên tục. **Không dùng số CP cố định** để tính EPS/BVPS cho các năm cũ.
2. **Bẫy Đơn Vị Tính**: Phân biệt rõ giữa *Nghìn đồng*, *Triệu đồng*, *Tỷ đồng* và *Đồng/cổ phiếu*. Luôn chuẩn hóa đơn vị trước khi đưa vào công thức định giá.
3. **Bẫy LNST Cổ Đông Công Ty Mẹ**: Định giá cổ phiếu niêm yết **bắt buộc** dùng Lợi nhuận sau thuế của Cổ đông Công ty mẹ (Net Income to Parent Company), không dùng Lợi nhuận sau thuế Hợp nhất.
4. **Bẫy Giá Chưa Điều Chỉnh (Unadjusted Price)**: Khi tính P/E và P/B trong quá khứ, phải đối chiếu giá thị trường tại thời điểm đó với EPS/BVPS tương ứng hoặc quy đổi theo hệ số điều chỉnh (Split-adjusted).
5. **Bẫy Vốn Hóa Thị Trường (Market Cap)**: Trích xuất trực tiếp vốn hóa thị trường từ API nguồn hoặc tính bằng `Giá_thị_trường × Số_CP_lưu_hành_hiện_tại`.
6. **Bẫy Dữ Liệu BCTC Chưa Kiểm Toán**: BCTC Quý 4 chưa kiểm toán thường có sự điều chỉnh chênh lệch lớn sau khi kiểm toán công bố vào tháng 3 - tháng 4 năm sau.

---

## 6. Quy Tắc Sandbox & Thực Thi Terminal

* **Sandbox Ưu Tiên**: Mọi lệnh shell cần cố gắng chạy trong chế độ tiêu chuẩn (`BypassSandbox: false`).
* **Bypass Sandbox Khi Cần Thiết**: Chỉ bật `BypassSandbox: true` cho:
  * Lệnh build Vite (`npm run build` yêu cầu quyền ghi file tạm tại root project).
  * Lệnh chạy mạng hoặc công cụ nhị phân bên ngoài (`uv`, `git`).
* **Tính Nhất Quán**: Khi re-run lệnh với `BypassSandbox: true`, giữ nguyên `toolAction` và `toolSummary`. Không dùng cú pháp `cd` trong các câu lệnh.

---

## 7. Cấu Trúc Thư Mục Chuẩn

```
stock/
├── AGENTS.md                          # Cẩm nang vận hành AI Agent (File này)
├── package.json                       # Cấu hình dự án Frontend (React + Vite)
├── vite.config.js                     # Cấu hình Vite bundler
├── server.js                          # Express Server chính (Local/Production)
├── server/
│   └── routes/
│       ├── valuationRoutes.js         # API endpoints cho định giá, BCTC, sync JSON
│       └── ...
├── src/
│   ├── App.jsx                        # Root React Component & Tab Router
│   ├── components/
│   │   ├── Dashboard.jsx              # Tab Tổng quan danh mục
│   │   ├── MacroDashboard.jsx         # Tab Phân tích Vĩ Mô, Regime 5 pha & VN-Index
│   │   ├── ValuationDashboard.jsx     # Tab Tra cứu & Định giá cổ phiếu chuyên sâu
│   │   ├── StockDetailModal.jsx       # Modal Sổ cái Lãi/Lỗ thuần túy
│   │   ├── TransactionHistory.jsx     # Tab Lịch sử mua/bán & FIFO P/L
│   │   ├── DcaPlannerView.jsx         # Tab Kế hoạch DCA đa tầng
│   │   └── ...
│   └── utils/
│       ├── api.js                     # Client API connector
│       ├── format.js                  # Định dạng tiền tệ, ngày tháng, màu sắc P/L
│       └── stockAnalytics.js          # Thuật toán tính toán hiệu suất danh mục
├── scripts/
│   ├── fetchers/                      # Phân hệ thu thập dữ liệu độc lập
│   │   ├── base.py                    # BaseFetcher (HTTP, rate limiting, retry)
│   │   ├── market_fetcher.py          # MarketFetcher (TradingView Scanner, Quotes)
│   │   ├── financial_fetcher.py       # FinancialFetcher (vnstock/TCBS BCTC, Ratios, Events)
│   │   ├── macro_fetcher.py           # MacroFetcher (HNX Yield, SBV, Yahoo, SJC)
│   │   ├── vietstock_valuation_fetcher.py # VietstockValuationFetcher (Lịch sử định giá P/E, P/B VN-Index 25 năm)
│   │   ├── market_valuation_history_fetcher.py # MarketValuationHistoryFetcher (Định giá lịch sử Google Sheets)
│   │   └── tradingeconomics_fetcher.py # TradingEconomicsFetcher (95 chỉ số vĩ mô 10 nhóm)
│   ├── sync_fundamentals.py           # Controller đồng bộ định giá & kỹ thuật
│   ├── fetch_financial_reports.py     # Controller trích xuất 122+ chỉ tiêu BCTC & 54 Ratios
│   ├── fetch_macro_valuation.py       # Controller định giá vĩ mô & nhiệt kế VN-Index
│   ├── run_full_pipeline.py           # Điều phối toàn bộ luồng dữ liệu tự động
│   ├── test_valuation_engine.py       # Bộ Unit Test kiểm thử 11 test cases định giá
│   └── lib/
│       ├── valuation_engine.py        # Enterprise Stock Valuation Engine (Single Source of Truth)
│       ├── valuation_models.py        # Backward Compatibility Bridge re-exporting engine
│       ├── market_valuation_analyzer.py # Động cơ phân tích thống kê 4 cửa sổ, Composite Signal & Cảnh báo Z>2
│       ├── financial_taxonomy.py      # Từ điển chuẩn hóa chỉ tiêu BCTC Việt Nam
│       ├── macro_regime.py            # Logic 5-pha Regime, Risk Score 4 tầng, Luân chuyển 10 ngành GICS
│       ├── macro_advisor.py           # Logic phân tích kinh tế vĩ mô & chu kỳ lãi suất
│       └── rate_limiter.py            # Quản lý giới hạn tần suất gọi API
├── data/
│   ├── fundamentals_cache.json        # Cache định giá & kỹ thuật
│   ├── macro_valuation.json           # Cache vĩ mô, chu kỳ regime & lãi suất
│   ├── macro_indicators.json          # Cache 95 chỉ số TradingEconomics theo 10 phân nhóm
│   ├── market_valuation_history.json  # Cache định giá lịch sử 10 năm P/E, P/S, Vốn hóa Google Sheets
│   ├── vnindex_valuation_cache/       # Cache dữ liệu định giá Vietstock VN-Index 25 năm
│   ├── supported_stocks.json          # Danh sách mã được hỗ trợ
│   ├── financials/                    # BCTC JSON chuẩn hóa từng mã (<MÃ>.json)
│   └── stock.db                       # SQLite Database
└── docs/
    └── reference_knowledge/           # Cẩm nang tri thức tài chính & công thức định giá
```
