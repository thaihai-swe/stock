# 📚 DATA CATALOG & ARCHITECTURE — BẢN ĐỒ DỮ LIỆU TOÀN DIỆN HỆ THỐNG

Tài liệu này lưu trữ toàn bộ đặc tả chi tiết từng nhóm dữ liệu, từng chỉ tiêu tài chính, nguồn trích xuất gốc, endpoint API, phương thức lấy và vị trí lưu trữ trong hệ thống **Stock Portfolio Manager & Enterprise Valuation Engine**. Đây là cẩm nang kỹ thuật phục vụ cho toàn bộ các chức năng hiện tại và các tính năng mở rộng tiếp theo.

> ⚙️ **Xem đặc tả luồng kỹ thuật tải dữ liệu nền và điều phối API tại:** [`docs/BACKGROUND_DATA_PIPELINE.md`](file:///Users/thaihai-swe/Desktop/stock/docs/BACKGROUND_DATA_PIPELINE.md).

---

## 1. Tổng Quan Kiến Trúc & Quản Trị Dữ Liệu 5 Tầng (Data Governance & Storage Tiering)

Toàn bộ hệ thống được phân định rạch ròi theo triết lý **Hybrid Storage 5 Tầng (Relational DB vs Local JSON vs Ephemeral Cache)**:

| Tầng Dữ Liệu | Đối Tượng Dữ Liệu | File / DB Lưu Trữ | Trạng Thái Git | Chu Kỳ Cập Nhật & Trigger | Mục Đích Sử Dụng |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TẦNG 1: ACID Relational Database** | Sổ lệnh Mua/Bán (`buy_orders`, `sell_orders`), cổ tức, watchlist, tài khoản, hàng đợi yêu cầu (`requested_stocks`), cấu hình | `data/stock.db` (Local) / Turso Cloud (Vercel) | **GITIGNORED (100%)** | Realtime khi user thao tác. Sao lưu/khôi phục qua `scripts/db_manager.py`. | Đảm bảo toàn vẹn giao dịch (ACID), bảo mật thông tin cá nhân. |
| **TẦNG 2: Ephemeral Intraday Cache** | Thị giá khớp lệnh realtime, điểm số VNINDEX & VN30 trong phiên | RAM Node.js + `data/prices_cache.json` | **GITIGNORED (100%)** | Trong phiên (9:00 - 15:00 T2-T6). Cache TTL 1h (`priceService.js`). | Phục vụ realtime UI mà không gây ô nhiễm lịch sử Git. |
| **TẦNG 3: Daily EOD Snapshot JSON** | TradingView Scanner 50+ chỉ số, Nhiệt kế VN-Index EOD, Vàng SJC/PNJ/TG, Dầu, Tỷ giá, 60 nến DNSE, Snapshot Hàng đợi yêu cầu | `data/fundamentals_cache.json`, `data/macro_valuation.json`, `data/financials/<MÃ>.json`, `data/requested_stocks.json`, `data/supported_stocks.json` | **COMMIT VỀ GIT** | **Daily EOD (18:00 T2-T6)**: GitHub Actions `daily-eod-sync.yml` (`run_pipeline.py --cadence daily`). | Đảm bảo web Vercel có số liệu EOD mới nhất và tự động nạp mã yêu cầu mới. |
| **TẦNG 4: Weekly Macro, Sector & AI Suite** | 95 Chỉ số TradingEconomics, 10 nhóm ngành GICS, Simply Wall St, Tin tức 30 ngày, AI Portfolio Stress-Tester, AI Stock Suite (Delta 6d) | `data/macro_indicators.json`, `data/sector_valuation_cache.json`, `data/market_valuation_history.json`, `data/portfolio_ai_insights.json`, `data/financials/<MÃ>.json` | **COMMIT VỀ GIT** | **Weekly (10:00 Sáng T7)**: GitHub Actions `weekly-macro-sync.yml` (`run_pipeline.py --cadence weekly`). | Cung cấp dữ liệu vĩ mô, luân chuyển ngành và toàn bộ nhận định AI 1 tuần/lần. |
| **TẦNG 5: Quarterly BCTC Repository** | 122+ chỉ tiêu BCTC 8 quý & 5 năm, 54 Ratios, Extended DuPont, DCF 3 kịch bản, Cổ đông | `data/financials/<MÃ>.json`, `data/vnindex_valuation_cache/` | **COMMIT VỀ GIT** | **Quarterly (Mùa BCTC)**: GitHub Actions `quarterly-bctc-sync.yml` (`run_pipeline.py --cadence quarterly`). | Kho tri thức phân tích chuyên sâu doanh nghiệp cho từng mã. |

### Bộ Điều Phối Dữ Liệu Thống Nhất (`scripts/run_pipeline.py`):
```bash
# 1. Chạy tác vụ EOD hằng ngày (10s)
python scripts/run_pipeline.py --cadence daily

# 2. Chạy tác vụ vĩ mô & ngành hằng tuần (10s)
python scripts/run_pipeline.py --cadence weekly

# 3. Chạy toàn bộ BCTC & DCF hằng quý (25s)
python scripts/run_pipeline.py --cadence quarterly

# 4. Chạy toàn diện hệ thống
python scripts/run_pipeline.py --cadence all

# 5. Quản lý sao lưu/phục hồi Database SQLite
python scripts/db_manager.py status
python scripts/db_manager.py export --output data/backups/backup.json
python scripts/db_manager.py import --input data/backups/backup.json
```


### Quy Chuẩn 3 Cấp Độ Nút Làm Mới Trên Giao Diện (3-Tier UI Refresh Standard):
Nhằm đảm bảo tính minh bạch, tránh gây nhầm lẫn giữa việc đọc DB (0ms), lấy giá sàn (<0.5s) và cào Python (15-25s), toàn bộ giao diện tuân thủ 3 cấp độ:

| Cấp Độ Nút | Biểu Tượng & Tên Nút Chuẩn | API Endpoint | Phạm Vi & Thao Tác Kỹ Thuật | Tầng Dữ Liệu Tác Động |
| :--- | :--- | :--- | :--- | :--- |
| **CẤP 1: Sổ Cái Nội Bộ** | 🔄 *(Header)*<br>`Tải lại sổ lệnh cá nhân từ Database` | `GET /api/data` | Đọc lại SQLite `stock.db` (lệnh mua/bán, cổ tức, ví tiền). Phản hồi ~50ms. | **Tầng 1 (ACID DB)** |
| **CẤP 2: Thị Giá Live Sàn** | ⚡ **Cập nhật giá sàn** / **Làm mới nến Live** | `GET /api/prices?force=true`<br>`GET /api/valuation/dnse-ohlc` | Bỏ qua cache 1h, lấy giá khớp lệnh thời gian thực từ sàn HOSE/HNX (VPS/DNSE). Phản hồi ~300ms. | **Tầng 2 (Ephemeral Cache)** |
| **CẤP 3: Python Pipeline** | 🔄 **Cập nhật BCTC & Định Giá [MÃ]** (3-5s)<br>🔄 **Đồng Bộ Vĩ Mô (Python)** (~20s)<br>🔄 **Đồng bộ EOD ngay** (~5s) | `POST /api/valuation/sync-single/:sym`<br>`POST /api/valuation/sync`<br>`POST /api/fundamentals/sync` | Kích hoạt Python crawler (TradingView, vnstock, BCTC 8Q&5Y, Yield TPCP, Vàng, Ngoại tệ). Có thông báo thời gian rõ ràng. | **Tầng 3, 4, 5 (JSON Repositories)** |

---

## 2. Chi Tiết Từng Nhóm Dữ Liệu & Nguồn Cung Cấp

---

### PHÂN HỆ 1: BÁO CÁO TÀI CHÍNH (FINANCIAL STATEMENTS)
* **Kiến trúc phân tầng thu thập 4 tầng (Cascading Multi-Source Fallback Architecture)**:
  1. **TẦNG 1: Nguồn chính (Primary Feed)**: **Yahoo Finance (`yfinance`, Ticker `<MÃ>.VN`) — BCTC Kiểm Toán Thật 100%** từ sàn niêm yết (HOSE/HNX). Thu thập bằng cơ chế Union cả 3 báo cáo để trích xuất tối đa toàn bộ các kỳ kiểm toán có sẵn (lên tới 6 Quý và 5 Năm).
  2. **TẦNG 2: Nguồn bổ sung & Dự phòng (Secondary / Fast API)**: **`vnstock 4.0` (Guest Mode — 100% Không Cần API Key)**. Trích xuất 4 Quý và 4 Năm chuẩn mực VAS TT200 từ VCI/KBS, cung cấp cơ cấu cổ đông lớn và lịch sử sự kiện cổ tức thực tế.
  3. **TẦNG 3: Cứu cánh Fallback & Lấp đầy lịch sử sâu (Deep Fallback & Historical Backfill)**: **CafeF HTML Scraper (`curl_cffi` + `BeautifulSoup`)**.
     - Tự động kích hoạt khi CẢ Yahoo Finance và vnstock đều thiếu dữ liệu (mã UPCoM mới, công ty nhỏ).
     - Hỗ trợ cào ngược về quá khứ sâu (2018–2021) qua cờ `--backfill-deep` để nối dài chuỗi thời gian lên 7–10 năm mà không ghi đè lên các kỳ kiểm toán đã có.
  4. **TẦNG 4: Dự phòng khẩn cấp (Emergency Fallback)**: **Vietstock Finance Scraper**.
  5. **Động cơ hợp nhất bảo toàn (`merge_financial_series`)**: Hợp nhất đa nguồn có phân cấp ưu tiên (T1 > T2 > T3 > T4), bảo đảm dữ liệu tầng dưới không ghi đè tầng trên, lấp đầy các khoảng trống và bảo toàn vĩnh viễn dữ liệu lịch sử trong kho.
* **Cam kết toàn vẹn dữ liệu (CRITICAL)**: **100% Số liệu thật từ Báo cáo kiểm toán**. Hệ thống đã **xóa bỏ hoàn toàn mọi thuật toán giả định và hệ số nội suy mùa vụ** (`seasonal_factors`, `margin_factors`, `y_growth`). Toàn bộ tính toán phân tích (Extended DuPont, 54 Ratios, 10 Mô hình định giá, DCF 3 kịch bản, Piotroski F-Score, Beneish M-Score) đều vận hành thuần túy trên các con số thật này.
* **Trạng thái kiểm toán & Metadata**:
  * Mã có BCTC: `_meta.status = "AUDITED_REAL_DATA"`, `_meta.source = "Yahoo Finance & vnstock Guest Mode Official Statements"`.
  * Mã chưa công bố BCTC hoặc chứng chỉ quỹ ETF: `_meta.status = "NO_AUDITED_DATA"` (hoặc `"ETF_INDEX_FUND"`), hiển thị minh bạch cho người dùng, tuyệt đối không tự chế số liệu.
* **Thời gian/Kỳ báo cáo & Cơ Chế Tích Lũy Lịch Sử Không Giới Hạn (Cumulative Merging)**:
  * **Cơ chế Upsert Hợp Nhất Không Phá Hủy (`merge_financial_series`)**: Hệ thống tự động gộp dữ liệu mới vào dữ liệu cũ trong kho theo khóa `period` (`YYYY-Qx`) và `year` (`YYYY`). Khi có quý/năm mới công bố, các kỳ cũ trong quá khứ được **bảo toàn nguyên vẹn vĩnh viễn**, giúp kho dữ liệu tự động tích lũy phình to (6Q, 8Q, 12Q, 16Q... và 5Y, 8Y, 10Y...) mà không bao giờ bị mất đi dù các API nguồn chỉ cung cấp rolling window ngắn hạn.
  * Giao diện React hiển thị nhãn động theo số lượng thực tế trong kho: `${quarterlyCount} Quý` và `${yearlyCount} Năm`.
* **Đơn vị chuẩn hóa**: **Tỷ đồng (Bn. VND)** đối với số tuyệt đối; **đồng/cổ phiếu** đối với EPS/BVPS.
* **Vị trí lưu trữ**: `data/financials/<MÃ>.json` (trong mảng `quarterly` và `yearly`).

#### A. Báo Cáo Kết Quả Kinh Doanh (Income Statement) — 25 Chỉ Tiêu
* **Phương thức gọi**: `f = Finance(symbol='HPG', source='VCI'); df = f.income_statement(period='quarter', lang='vi')`
* **Các chỉ tiêu chi tiết**:
  | Mã Chỉ Tiêu / Tên Tiếng Việt | Key trong JSON | Ý Nghĩa Phân Tích & Định Giá |
  | :--- | :--- | :--- |
  | **Doanh thu bán hàng và CCDV** | `grossRevenue` | Tổng doanh thu gộp chưa trừ giảm trừ |
  | **Các khoản giảm trừ doanh thu** | `revenueDeductions` | Chiết khấu thương mại, hàng bán bị trả lại |
  | **Doanh thu thuần** | `revenue` | Doanh thu cốt lõi sau giảm trừ |
  | **Giá vốn hàng bán (COGS)** | `costOfGoodsSold` | Chi phí sản xuất trực tiếp cấu thành sản phẩm |
  | **Lợi nhuận gộp** | `grossProfit` | Lợi nhuận gộp = `revenue - costOfGoodsSold` |
  | **Doanh thu hoạt động tài chính** | `financialIncome` | Thu tiền gửi tiết kiệm, lãi đầu tư, chênh lệch tỷ giá |
  | **Chi phí tài chính** | `financialExpense` | Chi phí vay nợ và lỗ tỷ giá |
  | **Trong đó: Chi phí lãi vay** | `interestExpense` | Lãi vay ngân hàng phải trả (tính ICR) |
  | **Chi phí bán hàng** | `sellingExpense` | Chi phí quảng cáo, vận chuyển, hoa hồng |
  | **Chi phí quản lý doanh nghiệp** | `adminExpense` | Chi phí văn phòng, lương ban giám đốc |
  | **Tổng chi phí hoạt động (SG&A)** | `operatingExpense` | Tổng chi phí bán hàng + Quản lý doanh nghiệp |
  | **Lợi nhuận thuần từ HĐKD (EBIT)** | `operatingProfit` | Lợi nhuận trước lãi vay và thuế từ mảng cốt lõi |
  | **Thu nhập khác & Chi phí khác** | `otherIncome` / `otherExpense` | Thanh lý tài sản, tiền bồi thường hợp đồng |
  | **Lợi nhuận trước thuế (EBT)** | `profitBeforeTax` | Lợi nhuận trước khi tính nghĩa vụ thuế Nhà nước |
  | **Chi phí thuế TNDN hiện hành** | `currentTaxExpense` | Thuế TNDN 20% phải nộp trong kỳ |
  | **Chi phí thuế TNDN hoãn lại** | `deferredTaxExpense` | Chênh lệch thuế tạm thời giữa kế toán và luật thuế |
  | **Lợi nhuận sau thuế hợp nhất** | `netProfitTotal` | Tổng lãi ròng hợp nhất của cả tập đoàn |
  | **Lợi ích cổ đông không kiểm soát** | `minorityInterest` | Phần lợi nhuận thuộc về cổ đông thiểu số công ty con |
  | **LNST Cổ đông Công ty mẹ** | `netIncome` | **Chỉ tiêu sống còn**: Dùng để tính EPS, ROE, P/E |
  | **Lãi cơ bản trên cổ phiếu (EPS)** | `eps` | EPS = `netIncome / Số CP lưu hành bình quân` |
  | **Lãi suy giảm trên cổ phiếu (Diluted EPS)** | `dilutedEps` | EPS sau khi tính quyền chọn ESOP/Trái phiếu chuyển đổi |

#### B. Bảng Cân Đối Kế Toán (Balance Sheet) — 122+ Chỉ Tiêu
* **Phương thức gọi**: `df = f.balance_sheet(period='quarter', lang='vi')`
* **Các nhóm chỉ tiêu chi tiết**:
  * **Tài Sản Ngắn Hạn (`shortTermAssets`)**:
    * *Tiền và tương đương tiền* (`cashAndEquivalents`): Tiền mặt tại quỹ, tiền gửi không kỳ hạn.
    * *Đầu tư tài chính ngắn hạn* (`shortTermInvestments`): Tiền gửi có kỳ hạn dưới 1 năm, chứng chỉ tiền gửi.
    * *Các khoản phải thu ngắn hạn* (`accountsReceivable`): Phải thu của khách hàng, trả trước cho người bán.
    * *Hàng tồn kho ròng* (`inventory`): Nguyên vật liệu, chi phí SXKD dở dang, thành phẩm (sau dự phòng).
    * *Tài sản ngắn hạn khác* (`otherCurrentAssets`): Thuế GTGT được khấu trừ, tạm ứng ngắn hạn.
  * **Tài Sản Dài Hạn (`longTermAssets`)**:
    * *Phải thu dài hạn* (`longTermReceivables`): Cho vay dài hạn, ký quỹ ký cược dài hạn.
    * *Tài sản cố định* (`fixedAssets`): TSCĐ hữu hình, vô hình, nhà xưởng máy móc (sau khấu hao luỹ kế).
    * *Bất động sản đầu tư* (`investmentProperties`): Đất đai, tòa nhà nắm giữ để cho thuê hoặc chờ tăng giá.
    * *Chi phí xây dựng cơ bản dở dang* (`constructionInProgress`): Công trình, nhà máy đang xây dựng (VD: Dung Quất 2 của HPG).
    * *Đầu tư tài chính dài hạn* (`longTermInvestments`): Đầu tư vào công ty liên doanh, liên kết, cổ phiếu dài hạn.
    * *Lợi thế thương mại* (`goodwill`): Chênh lệch giá trị khi M&A mua lại công ty con.
  * **Tổng Tài Sản (`totalAssets`)**: `shortTermAssets + longTermAssets`.
  * **Nợ Phải Trả (`totalDebt` / `totalLiabilities`)**:
    * *Nợ ngắn hạn* (`currentLiabilities`): Vay nợ ngắn hạn (`shortTermDebt`), Phải trả người bán ngắn hạn, Người mua trả tiền trước.
    * *Nợ dài hạn* (`longTermLiabilities`): Vay nợ dài hạn ngân hàng (`longTermDebt`), Trái phiếu phát hành dài hạn.
    * *Tổng nợ vay chịu lãi* (`interestBearingDebt`): `shortTermDebt + longTermDebt` (Dùng tính Đòn bẩy & WACC).
  * **Vốn Chủ Sở Hữu (`equity`)**:
    * *Vốn góp của chủ sở hữu* (`charterCapital`): Vốn điều lệ tính theo mệnh giá 10.000 đ/cp.
    * *Thặng dư vốn cổ phần* (`sharePremium`): Chênh lệch giá phát hành cổ phiếu thực tế so với mệnh giá.
    * *Quỹ đầu tư phát triển* (`investmentDevelopmentFund`): Lợi nhuận giữ lại trích lập quỹ tái đầu tư.
    * *Lợi nhuận sau thuế chưa phân phối* (`retainedEarnings`): Nguồn tiền chi trả cổ tức trong tương lai.
    * *Lợi ích của cổ đông không kiểm soát* (`minorityInterestEquity`).
  * **Tổng Nguồn Vốn**: `totalLiabilities + equity = totalAssets`.

#### C. Báo Cáo Lưu Chuyển Tiền Tệ (Cash Flow Statement) — 41 Chỉ Tiêu
* **Phương thức gọi**: `df = f.cash_flow(period='quarter', lang='vi')`
* **Các chỉ tiêu chi tiết**:
  * **Dòng tiền từ hoạt động kinh doanh (CFO - `cfo`)**:
    * Lợi nhuận trước thuế làm gốc, cộng ngược Khấu hao TSCĐ (`depreciation`), Dự phòng nợ xấu.
    * Biến động vốn lưu động: Tăng/giảm các khoản phải thu, Tăng/giảm tồn kho, Tăng/giảm các khoản phải trả.
    * Chi phí lãi vay đã trả thực tế trong kỳ, Thuế TNDN đã nộp thực tế.
    * *Lưu chuyển tiền thuần từ HĐKD (CFO)*: Đo lường chất lượng lợi nhuận (CFO > LNST là doanh nghiệp thu được tiền thật).
  * **Dòng tiền từ hoạt động đầu tư (CFI - `cfi`)**:
    * *Tiền chi mua sắm, xây dựng TSCĐ (CapEx - `capex`)*: Thường mang dấu âm (khoản tiền đầu tư mở rộng tài sản).
    * Tiền thu từ thanh lý, nhượng bán TSCĐ và tài sản dài hạn.
    * Tiền gửi tiết kiệm ngân hàng / Thu hồi tiền gửi tiết kiệm.
    * Tiền chi mua cổ phần / Tiền thu hồi đầu tư vào đơn vị khác.
    * Cổ tức và lợi nhuận được chia nhận được.
  * **Dòng tiền từ hoạt động tài chính (CFF - `cff`)**:
    * Tiền thu từ phát hành cổ phiếu, góp vốn chủ sở hữu.
    * Tiền thu từ đi vay (giải ngân ngân hàng, phát hành trái phiếu).
    * Tiền trả nợ gốc vay (trả nợ ngân hàng).
    * Cổ tức tiền mặt đã chi trả cho cổ đông.
  * **Dòng tiền tự do (Free Cash Flow - `freeCashFlow`)**:
    * Công thức tính toán: $FCF = CFO - |CapEx|$.

---

### PHÂN HỆ 2: BỘ 54 CHỈ SỐ TÀI CHÍNH & DUPONT (FINANCIAL RATIOS)
* **Nguồn cung cấp**: `vnstock` (`f.ratio(lang='vi')`) kết hợp module tính toán nội bộ `scripts/lib/valuation_models.py` và giá thị trường thời gian thực.
* **Vị trí lưu trữ**: `data/financials/<MÃ>.json` trong object `financialRatios`.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        BỘ 54 CHỈ SỐ TÀI CHÍNH                          │
├─────────────────┬─────────────────┬──────────────────┬─────────────────┤
│ 1. Định Giá     │ 2. Sinh Lời     │ 3. Thanh Khoản   │ 4. Hiệu Quả &   │
│                 │                 │                  │    Đòn Bẩy      │
│ • P/E, P/B, P/S │ • ROE, ROA      │ • Current Ratio  │ • Vòng quay TS  │
│ • P/CF          │ • ROIC, ROCE    │ • Quick Ratio    │ • Vòng quay kho │
│ • EV/EBITDA     │ • Biên gộp      │ • Cash Ratio     │ • DSO, DIO, DPO │
│ • Dividend Yield│ • Biên ròng     │ • Khả năng trả   │ • Chu kỳ CCC    │
│ • Vốn hóa TT    │ • EBITDA, EBIT  │   lãi vay (ICR)  │ • Nợ/VCSH, D/E  │
└─────────────────┴─────────────────┴──────────────────┴─────────────────┘
```

#### Phân Rã DuPont 3 Nhân Tố (DuPont ROE Decomposition):
* Công thức chuẩn hóa:
  $$ROE = \text{Biên Lợi Nhuận Ròng} \times \text{Vòng Quay Tổng Tài Sản} \times \text{Đòn Bẩy Tài Chính}$$
  $$\frac{LNST}{VCSH} = \frac{LNST}{Doanh\ Thu} \times \frac{Doanh\ Thu}{Tổng\ Tài\ Sản} \times \frac{Tổng\ Tài\ Sản}{VCSH}$$
* Giúp nhà đầu tư bóc tách rõ ROE tăng trưởng do:
  1. Doanh nghiệp nâng cao biên lợi nhuận (sức mạnh định giá sản phẩm).
  2. Tối ưu hóa hiệu suất sử dụng tài sản (bán hàng nhanh, vòng quay cao).
  3. Hay rủi ro do lạm dụng đòn bẩy tài chính vay nợ ngân hàng quá mức.

#### Phân Rã DuPont 5 Nhân Tố Mở Rộng (Extended 5-Factor DuPont):
* **Key trong JSON**: `data/financials/<MÃ>.json` trong object `extendedDupont`.
* **Công thức toán học 5 tầng**:
  $$ROE = \text{Tax Burden} \times \text{Interest Burden} \times \text{EBIT Margin} \times \text{Asset Turnover} \times \text{Financial Leverage}$$
  $$\frac{LNST}{VCSH} = \frac{LNST}{EBT} \times \frac{EBT}{EBIT} \times \frac{EBIT}{Revenue} \times \frac{Revenue}{Assets} \times \frac{Assets}{Equity}$$
* **Ý nghĩa 5 nhân tố**:
  1. `taxBurden` ($LNST / EBT$): Khả năng giữ lại lợi nhuận sau nghĩa vụ thuế thu nhập (chuẩn $\approx 0.80$ tương ứng thuế 20%).
  2. `interestBurden` ($EBT / EBIT$): Tỷ lệ bảo toàn lợi nhuận trước chi phí lãi vay (càng gần 1.0 nghĩa là gánh nặng lãi vay càng thấp).
  3. `operatingMargin` ($EBIT / Revenue$): Biên lợi nhuận hoạt động thuần túy trước thuế và lãi vay, phản ánh sức mạnh cốt lõi.
  4. `assetTurnover` ($Revenue / Assets$): Vòng quay tổng tài sản, phản ánh hiệu suất khai thác tài sản tạo doanh thu.
  5. `equityMultiplier` ($Assets / Equity$): Đòn bẩy tài chính đo bằng tỷ số Tổng tài sản trên Vốn chủ sở hữu.
* **Đánh giá tổng hợp**: Gán nhãn chất lượng nguồn sinh lời (`HIGH_QUALITY_OPERATING`, `FINANCIAL_LEVERAGE_DRIVEN`, `TAX_INTEREST_PRESSURE`, hoặc `BALANCED`).

#### Điểm Sức Khỏe Tài Chính 4 Trụ Cột (Financial Health Score 0–100):
* **Key trong JSON**: `data/financials/<MÃ>.json` trong object `healthScore`.
* **Cấu trúc 4 trụ cột trọng số**:
  | Trụ Cột | Trọng Số | Các Chỉ Số Đầu Vào | Ý Nghĩa Đánh Giá |
  | :--- | :---: | :--- | :--- |
  | **Thanh khoản (Liquidity)** | 25% | `currentRatio`, `quickRatio`, `cashRatio` | Khả năng đáp ứng nghĩa vụ nợ ngắn hạn |
  | **Khả năng sinh lời (Profitability)** | 30% | `roe`, `roa`, `netMargin`, `grossMargin` | Sức mạnh tạo lợi nhuận từ vốn và doanh thu |
  | **Cấu trúc vốn & Đòn bẩy (Leverage)** | 25% | `debtToEquity`, `financialLeverage`, `icr` | Mức độ an toàn nợ vay và năng lực trả lãi |
  | **Hiệu quả hoạt động (Operating Efficiency)** | 20% | `assetTurnover`, `receivablesTurnover`, `inventoryTurnover` | Tốc độ luân chuyển dòng vốn và hàng tồn kho |
* **Phân cấp xếp hạng**:
  * 80–100: `XUẤT SẮC` (Hạng AAA / Cực kỳ an toàn).
  * 65–79: `KHỎE MẠNH` (Hạng AA / Vững chắc).
  * 50–64: `TRUNG BÌNH` (Hạng BBB / Đạt chuẩn).
  * 35–49: `YẾU` (Hạng BB / Cần thận trọng).
  * < 35: `BÁO ĐỘNG` (Hạng C / Rủi ro cao).

#### Ma Trận Cảnh Báo Sớm & 6 Cờ Đỏ Rủi Ro (Early Warning & Red Flags):
* **Key trong JSON**: `data/financials/<MÃ>.json` trong object `earlyWarning`.
* **Thang điểm rủi ro**: `riskScore` (0–100, càng cao càng nguy hiểm) cùng trạng thái `riskLevel` (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
* **6 Cờ Đỏ Tự Động Quét**:
  1. `NEGATIVE_CFO`: Dòng tiền hoạt động kinh doanh (CFO) âm dù báo cáo LNST dương (lợi nhuận trên giấy tờ).
  2. `HIGH_DEBT_LEVERAGE`: Nợ vay chịu lãi / Vốn chủ sở hữu vượt ngưỡng nguy hiểm ($D/E > 2.0x$ với DN phi tài chính).
  3. `LOW_INTEREST_COVERAGE`: Hệ số bao phủ lãi vay $ICR < 1.5x$, có nguy cơ mất khả năng thanh toán nợ ngân hàng.
  4. `RAPID_RECEIVABLES_GROWTH`: Tốc độ tăng trưởng khoản phải thu vượt xa doanh thu (nguy cơ doanh thu ảo/chiếm dụng vốn).
  5. `INVENTORY_ACCUMULATION`: Tồn kho phình to bất thường trong khi vòng quay tồn kho suy giảm mạnh (ứ đọng vốn).
  6. `LIQUIDITY_PRESSURE`: Hệ số thanh toán hiện hành $Current\ Ratio < 1.0x$ (mất cân đối dòng tiền ngắn hạn).

#### Phân Tích Chỉ Số Đặc Thù Theo Ngành (Industry-Specific Metrics Router):
* **Key trong JSON**: `data/financials/<MÃ>.json` trong object `industrySpecific`.
* **Cơ chế Router tự động**: Nhận diện ngành từ sector/industry metadata và mã cổ phiếu (VD: `BANKING` cho VCB, MBB, ACB...; `REAL_ESTATE` cho VHM, DXG, NVL...; `MANUFACTURING` cho HPG, HSG...; `RETAIL` cho MWG, PNJ, FRT...; `TECHNOLOGY` cho FPT, CMG...).
* **Bộ chỉ số chuyên sâu từng ngành**:
  * **Ngân Hàng (Banking)**:
    * `nimProxy`: Biên lãi thuần ước tính ($Thu\ nhập\ lãi\ thuần / Tổng\ tài\ sản$).
    * `nplProxy`: Tỷ lệ nợ xấu ước tính.
    * `llrProxy`: Tỷ lệ bao phủ nợ xấu ($Dự\ phòng / Nợ\ xấu$).
    * `cirProxy`: Tỷ lệ chi phí trên thu nhập ($Chi\ phí\ HĐ / Tổng\ TOI$).
    * `casaProxy`: Tỷ lệ tiền gửi không kỳ hạn ước tính.
    * `ldrProxy`: Tỷ lệ dư nợ cho vay trên tiền gửi huy động.
  * **Bất Động Sản (Real Estate)**:
    * `inventoryToAssets`: Tỷ trọng quỹ đất & hàng tồn kho trên tổng tài sản.
    * `unearnedRevenueToDebt`: Tỷ lệ người mua trả tiền trước / Nợ vay (sức khỏe hấp thụ dự án).
    * `netDebtToEquity`: Nợ ròng / Vốn chủ sở hữu.
  * **Sản Xuất & Công Nghiệp (Manufacturing)**:
    * `cccDays`: Chu kỳ chuyển đổi tiền mặt Cash Conversion Cycle ($DIO + DSO - DPO$).
    * `capexToDepreciation`: Tỷ lệ đầu tư tái tài sản $CapEx / Khấu\ hao$ (mở rộng năng lực sản xuất).
    * `fixedAssetTurnover`: Vòng quay tài sản cố định nhà xưởng máy móc.
  * **Bán Lẻ & Hàng Tiêu Dùng (Retail)**:
    * `inventoryTurnoverDays`: Số ngày tồn kho trung bình ($DIO$).
    * `cashConversionDays`: Chu kỳ xoay vòng vốn lưu động.
    * `grossMarginTrend`: Xu hướng biên lợi nhuận gộp theo quý.
  * **Công Nghệ (Technology)**:
    * `revenuePerEmployee`: Doanh thu ước tính trên nhân sự.
    * `rdIntensityProxy`: Tỷ trọng đầu tư tài sản vô hình & công nghệ.
    * `softwareRecurringQuality`: Đánh giá biên ròng và chất lượng dòng tiền từ hợp đồng dịch vụ.

#### Bộ Chỉ Số Rủi Ro & Biến Động Thị Giá (Stock Risk & Performance Engine):
* **Key trong JSON**: `data/financials/<MÃ>.json` trong object `riskMetrics`.
* **Các chỉ tiêu định lượng tài chính cao cấp**:
  * `volatility30d`, `volatility90d`, `volatility1y`: Độ biến động giá hàng năm hóa (Annualized Historical Volatility) qua các khung thời gian 30 ngày, 90 ngày và 1 năm.
  * `maxDrawdown`: Mức sụt giảm tối đa từ đỉnh xuống đáy gần nhất trong chu kỳ 1 năm ($MDD \le 0\%$).
  * `var95`: Giá trị chịu rủi ro tham số ở mức tin cậy 95% (Value at Risk 95% theo ngày).
  * `sharpeRatio`: Tỷ suất Sharpe vượt trội so với lãi suất phi rủi ro TPCP 10Y Việt Nam ($R_f \approx 3.5\%$).
  * `sortinoRatio`: Tỷ suất Sortino chỉ phạt các biến động chiều giảm (Downside Deviation).
  * `beta`: Hệ số nhạy biến động thị giá so với VN-Index.

#### Chuỗi Dữ Liệu TTM Lăn 4 Quý (Trailing Twelve Months - TTM Rolling Series):
* **Key trong JSON**: `data/financials/<MÃ>.json` trong mảng `ttmSeries`.
* **Ý nghĩa**: Tính toán tổng trượt 4 quý liên tiếp cho các chỉ tiêu P&L (Doanh thu, Lợi nhuận gộp, EBIT, LNST, CFO, CapEx) và lấy giá trị cuối kỳ cho Bảng cân đối kế toán. Giúp triệt tiêu hoàn toàn yếu tố mùa vụ kinh doanh (VD: DN thủy sản, bán lẻ tiêu dùng cao điểm Q4) và phản ánh bức tranh kinh doanh 12 tháng gần nhất chân thực nhất.

#### Mô Hình DCF (FCFF) 3 Kịch Bản, Reverse DCF & Ma Trận Độ Nhạy Cảm:
* **Key trong JSON**: `data/financials/<MÃ>.json` trong object `dcfAnalysis`.
* **Công thức & Kiến trúc**:
  * **DCF 3 Kịch Bản**:
    $$PV_{\text{explicit}} = \sum_{t=1}^5 \frac{FCFF_t}{(1 + WACC)^t}, \quad Terminal\ Value = \frac{FCFF_5 \times (1 + g)}{WACC - g}, \quad PV_{\text{terminal}} = \frac{Terminal\ Value}{(1 + WACC)^5}$$
    $$Enterprise\ Value (EV) = PV_{\text{explicit}} + PV_{\text{terminal}}, \quad Equity\ Value = EV - NetDebt, \quad Fair\ Price = \frac{Equity\ Value}{Shares}$$
    - `basePrice`: Tăng trưởng theo CAGR kế hoạch, WACC theo ngành, $g_{\text{terminal}} = 3.0\%$.
    - `bullPrice`: Tăng trưởng $+3\%$, WACC $-0.5\%$, $g_{\text{terminal}} = 3.5\%$.
    - `bearPrice`: Tăng trưởng $-4\%$, WACC $+1.0\%$, $g_{\text{terminal}} = 2.0\%$.
    - **Miễn trừ Nhóm Ngân Hàng & Tài Chính (`NOT_APPLICABLE_FINANCIAL`)**:
      - Nhóm Ngân hàng, Bảo hiểm, Chứng khoán (`isFinancialSector = true`) được miễn trừ khỏi mô hình FCFF do dòng tiền gửi của khách hàng và hoạt động tín dụng chảy qua CFO làm sai lệch bản chất dòng tiền tự do. Hệ thống hiển thị thẻ khuyến nghị sử dụng DDM, Gordon P/B, RIM/EVA.
    - **Cơ chế Dòng Tiền Tự Do Chuẩn Hóa (`NORMALIZED_FCF`) cho Chu Kỳ Đại Đầu Tư**:
      - Khi doanh nghiệp kinh doanh cốt lõi tăng trưởng mạnh ($\text{LNST} > 0, \text{CFO} > 0$) nhưng đang trong đại chu kỳ đầu tư mở rộng công suất lớn (Growth CapEx như Hòa Phát Dung Quất 2 với CapEx 27.5k tỷ vượt CFO) dẫn đến FCF thô âm tạm thời, hệ thống tự động kích hoạt **Normalized FCFF** ($\text{CFO} - \text{Khấu hao duy trì}$, trong đó Maintenance CapEx lấy xấp xỉ chi phí khấu hao) với trạng thái `NORMALIZED_FCF` (`isNormalizedFcf = true`) kèm nhãn giải trình minh bạch.
    - **Sanity Check (Học từ LC-005)**: Nếu $FCF_0 \le 0$ do thua lỗ kinh doanh thực sự, kích hoạt cờ `NEGATIVE_FCF` và khuyến nghị dùng phương pháp thay thế EV/EBITDA, tuyệt đối không xuất giá âm.
  * **Đa Nguồn Dữ Liệu LCTT Độc Lập & Hợp Nhất Không Phá Hủy**:
    - Dữ liệu lưu chuyển tiền tệ (CFO, CapEx, Depr) được đối soát qua 4 nguồn: Yahoo Finance, vnstock (VCI VAS TT200), CafeF HTML Scraper và Cache cục bộ.
    - Bộ từ điển Universal Cash Flow Taxonomy nhận diện đầy đủ các biến thể danh pháp tiếng Việt và tiếng Anh.
    - Cơ chế Non-Destructive Field Merge bảo vệ dữ liệu đã kiểm toán không bị giá trị 0 hoặc null từ nguồn khác đè lên.
  * **Reverse DCF (Tốc độ tăng trưởng ngụ ý)**:
    - Thuật toán Binary Search tìm $g_{\text{implied}}$ sao cho $PV(FCFF, g, WACC) = \text{EV hiện tại}$.
    - Đưa ra góc nhìn trực quan: thị trường đang bi quan thái quá ($g_{\text{implied}} < 6\%$) hay kỳ vọng quá cao ($g_{\text{implied}} > 18\%$).
  * **Lộ Trình Tăng Trưởng Động (Dynamic Growth Fade)**:
    - Thay vì áp đặt danh sách tỷ lệ tăng trưởng cố định, động cơ tự động tính toán CAGR doanh thu thực tế 3-5 năm của doanh nghiệp từ chuỗi BCTC (`yearly`), kẹp trong biên độ an toàn $[3.0\%, 25.0\%]$ và phân rã suy giảm đều đặn về $g_{\text{terminal}} = 3.0\%$ qua 5 năm dự phóng.
  * **Bảng Độ Nhạy Cảm 2 Chiều (Sensitivity Matrix)**:
    - Ma trận 4 mức WACC ($10.0\%, 10.5\%, 11.0\%, 12.0\%$) $\times$ 3 mức Terminal Growth ($2.0\%, 3.0\%, 4.0\%$) liên kết động với tốc độ tăng trưởng thực tế.
  * **WACC Chuẩn Theo Ngành**:
    - Ngân hàng: $10.0\%$, Thép/SX: $10.5\%$, BĐS: $11.5\%$, Bán lẻ: $9.0\%$, Công nghệ: $9.0\%$, Dầu khí: $10.0\%$. Hiệu chỉnh theo Beta: $WACC = WACC_{\text{base}} + (\beta - 1.0) \times 1.5\%$.

#### Hồ Sơ Hành Vi Thị Trường Định Lượng & Wyckoff VAP (Quantitative Market Profile):
* **Key trong JSON**: `data/financials/<MÃ>.json` trong object `marketProfile`.
* **Nguồn Dữ Liệu Nến Phiên Thật**: Thu thập trực tiếp từ DNSE Historical Chart API (`https://services.entrade.com.vn/chart-api/v2/ohlcs/stock?resolution=1D`) kết hợp dự phòng cấp 2 qua Yahoo Finance (`<SYMBOL>.VN`). Đảm bảo 100% nến ngày (OHLCV) từ các phiên giao dịch thực tế của HOSE, HNX, UPCoM — triệt để loại bỏ dữ liệu giả lập sóng sin.
* **5 Nhóm Phân Tích Định Lượng (15-Block Methodology)**:
  1. **Volume at Price (VAP / Volume Profile)**: 10 dải giá với tổng khối lượng giao dịch tích lũy thực tế, xác định **Point of Control (POC)** (vùng kiểm soát thanh khoản lớn nhất), **HVN** (hỗ trợ/kháng cự cứng) và **LVN** (vùng trượt giá).
  2. **Xác Nhận Khối Lượng VPCI & Dòng Tiền**:
     - `vpci`: So sánh Vol ngắn hạn 5 phiên vs dài hạn 20 phiên ($VPCI > 1.05$: khối lượng xác nhận xu hướng).
     - `cmf`: Chaikin Money Flow ($CMF \ge 0.05$: tích lũy gom hàng; $CMF \le -0.05$: phân phối xả hàng).
     - `obvTrend`: Xu hướng dòng tiền On-Balance Volume.
  3. **Wyckoff Effort vs Result**: Nhận diện hiện tượng nỗ lực lớn nhưng kết quả giá co hẹp ($Volume \ge 1.7x$ nhưng biên độ giá $\le 0.75x$) $\rightarrow$ cảnh báo giai đoạn Hấp Thụ Cung (Absorption) hoặc Phân Phối đỉnh.
  4. **Rủi Ro Đuôi & Phân Phối Lợi Suất (Tail Risk)**:
     - `skewness` (độ lệch) & `kurtosis` (độ nhọn đuôi béo).
     - `var95`, `var99`: Giá trị chịu rủi ro lịch sử (VaR).
     - `es95`, `es99`: Expected Shortfall (CVaR - mức lỗ bình quân khi chạm 5% kịch bản xấu nhất).
  5. **Archetype Phân Loại Tính Cách Cổ Phiếu**:
     - `TREND_FOLLOWING` (Bám xu hướng), `ACCUMULATION_BREAKOUT` (Tích lũy bùng nổ), `RANGE_BOUND_CYCLICAL` (Dao động hộp), `TRAP_PRONE` (Biến động cao / Dễ bẫy giá). Tuân thủ nguyên tắc `neutral_descriptive_non_advice`.

#### Bản Tin Thời Sự & Bộ Đo Lường Tâm Lý 30 Ngày (Corporate News Digest & Sentiment):
* **Key trong JSON**: `data/financials/<MÃ>.json` trong object `newsDigest`.
* **Nguồn cung cấp sống**: Google News RSS đa truy vấn (Cổ tức & ĐHĐCĐ, KQKD & Lợi nhuận, Cổ phiếu & Thị trường) kết hợp `curl_cffi` (Chrome 120 TLS fingerprint impersonation) lấy tin tức tài chính thời gian thực từ CafeF, VnEconomy, Vietstock, Báo Tuổi Trẻ, Đầu Tư Chứng Khoán.
* **Động cơ khử trùng lặp (NLP Cross-source Deduplication)**:
  - Làm sạch tiêu đề: Gỡ bỏ hậu tố tòa soạn (` - CafeF`, ` - VnEconomy`), chuẩn hóa lowercase & ký tự đặc biệt.
  - Thuật toán đo độ tương đồng từ khóa: Token-set Jaccard Similarity ($\ge 0.65$ coi là bài báo dẫn lại nguồn, tự động lọc bỏ).
  - Khử trùng theo URL liên kết trực tiếp, bảo đảm 100% không có bài viết trùng lặp.
* **Đặc tả cấu trúc**:
  * `items`: 50 tin tức thực tế mới nhất (cập nhật theo ngày hiện hành) được phân loại vào 5 nhóm chức năng:
    - `biz`: Kết quả kinh doanh, doanh thu, lợi nhuận, sản lượng.
    - `sector`: Ngành nghề, đối thủ cạnh tranh, giá nguyên vật liệu, dự án.
    - `macro`: Vĩ mô, thuế, tỷ giá, chính sách Ngân hàng Nhà nước.
    - `disclosure`: Công bố thông tin, cổ tức, ESOP, giao dịch nội bộ.
    - `analyst`: Báo cáo phân tích CTCK & khuyến nghị giá mục tiêu.
  * `sentiment`:
    - `score`: Điểm số tâm lý tổng hợp từ $-100$ đến $+100$ dựa trên trọng số tác động (Rất cao: 2.0, Cao: 1.5, TB: 1.0, Thấp: 0.5).
    - `verdict`: `BULLISH` ($\ge +25$), `NEUTRAL` ($-25$ đến $+25$), `BEARISH` ($\le -25$).
    - `categoryScores`: Phân rã điểm tâm lý theo từng nhóm để phát hiện phân kỳ.
  * `tldr`: Executive Summary 3-4 câu tóm tắt toàn cảnh bản tin thời sự 30 ngày và 4 KPI highlight boxes.

---

### PHÂN HỆ 3: CỔ TỨC, CỔ ĐÔNG & BAN LÃNH ĐẠO (CORPORATE PROFILE)
* **Nguồn cung cấp**:
  * *Tầng 1 (`vnstock 4.0` Guest Mode — VCI Official)*: Trích xuất trực tiếp danh sách 60+ cổ đông lớn thật (`Company.shareholders()`) và lịch sử 50+ sự kiện doanh nghiệp, giao dịch nội bộ, chia cổ tức tiền mặt/cổ phiếu (`Company.events()`).
  * *Tầng 2 (Live NLP News Extraction)*: Trích xuất bổ sung các sự kiện cổ tức mới nhất từ feed tin tức thời gian thực của doanh nghiệp qua NLP Event Extractor (`scripts/lib/news_sentiment_engine.py`).
  * *Tầng 3 (Dynamic Annual Milestones)*: Các mốc sự kiện động năm hiện hành (VD: 2026), cam kết không tồn tại ngày cũ 2023–2024.
* **Vị trí lưu trữ**: `data/financials/<MÃ>.json` trong `corporateEvents` và `shareholders`.

| Nhóm Dữ Liệu | Lệnh Gọi Code | Các Trường Thông Tin Chi Tiết |
| :--- | :--- | :--- |
| **Lịch Sử Cổ Tức & Sự Kiện** | `Company(sym, source='VCI').events()` | • `date`: Ngày sự kiện thực tế (ISO YYYY-MM-DD)<br>• `type`: Phân loại sự kiện (Cổ tức tiền mặt, Cổ tức cổ phiếu, ĐHĐCĐ, Giao dịch nội bộ, Phát hành)<br>• `content`: Tiêu đề / nội dung công bố thông tin<br>• `ratio`: Tỷ lệ chi trả (10%, 15%...)<br>• `value`: Giá trị tiền mặt (đ/cp)<br>• `source` & `link`: Nguồn báo / link bài viết gốc |
| **Cơ Cấu Cổ Đông Lớn** | `Company(sym, source='VCI').shareholders()` | • `name`: Tên cá nhân hoặc tổ chức (Nội bộ, Ngoại khối, Quỹ, Đại chúng)<br>• `percentage`: Tỷ lệ sở hữu phần trăm (%)<br>• `quantity`: Số lượng cổ phiếu sở hữu<br>• `type`: Phân loại cổ đông (Cổ đông lớn, Nội bộ, Nước ngoài)<br>• `updateDate`: Ngày cập nhật kỳ báo cáo thực tế |
| **Ban Lãnh Đạo & HĐQT** | `Company(sym, source='VCI').officers()` | • `officer_name`: Họ tên lãnh đạo<br>• `officer_position`: Chức vụ (Chủ tịch HĐQT, Tổng Giám đốc)<br>• `officer_own_percent`: Tỷ lệ sở hữu cổ phần của lãnh đạo |
| **Công Ty Con & Liên Kết** | `c.subsidiaries()` | • `organ_name`: Tên công ty con<br>• `ownership_percent`: Tỷ lệ biểu quyết / Tỷ lệ sở hữu vốn (%) |
| **Lịch Sử Tăng Vốn Điều Lệ** | `c_kbs.capital_history()`| • `date`: Ngày có hiệu lực<br>• `charter_capital`: Vốn điều lệ sau khi tăng (đồng) |

---

### PHÂN HỆ 4: DỮ LIỆU KINH TẾ VĨ MÔ & LÃI SUẤT (MACRO VALUATION)
* **Tệp tin lưu trữ**: `data/macro_valuation.json`
* **Các chỉ tiêu, nguồn lấy và ý nghĩa**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CHỈ SỐ KINH TẾ VĨ MÔ                            │
├─────────────────────────┬───────────────────────┬──────────────────────┤
│ 1. VN-Index & P/E TT    │ 2. Đường Cong Lợi Suất│ 3. SBV & Liên Ngân   │
│ Nguồn: Vietstock / HNX  │ TPCP Việt Nam (8 kỳ)  │    Hàng              │
│ • P/E hiện tại: 13.15x  │ Nguồn: HNX Portal     │ Nguồn: SBV / VBMA    │
│ • P/E 5Y Mean: 14.20x   │ • VN 1Y, 2Y, 3Y, 5Y   │ • Lãi suất tái cấp   │
│ • Z-Score & Percentile  │ • VN 10Y (Rf): 3.45%  │   vốn: 4.5%          │
│ • Định giá: Vùng RẺ     │ • VN 15Y, 20Y         │ • Lãi suất O/N LNH   │
├─────────────────────────┼───────────────────────┼──────────────────────┤
│ 4. Tỷ Giá & Quốc Tế     │ 5. Hàng Hóa Toàn Cầu  │ 6. Vàng SJC & PNJ    │
│ Nguồn: Yahoo Finance    │ Nguồn: Yahoo Finance  │ Nguồn: PNJ Edge API  │
│ • USD/VND: 25.879       │ • Dầu Brent: 104 USD  │ • SJC Bán: 144.8 tr  │
│ • DXY Index: 102.2      │ • Vàng TG: 4.216 USD  │ • Nhẫn Bán: 144.3 tr │
│ • US 10Y Yield: 5.24%   │                       │ • TG Quy Đổi: 131.5tr│
└─────────────────────────┴───────────────────────┴──────────────────────┘
```

1. **VN-Index P/E & Phân Vị Định Giá Thị Trường Đa Chu Kỳ (Vietstock 2000–Hiện Tại)**:
   * *Nguồn trích xuất chính thức*: Endpoint API biểu đồ định giá Vietstock (`POST https://finance.vietstock.vn/Data/Valuation_GetRatiosMarketIndexForChart`) qua module `VietstockValuationFetcher` (`curl_cffi` impersonate Chrome 120, cache 24h tại `data/vnindex_valuation_cache/`).
   * *Tập dữ liệu lịch sử*: Hơn 316 kỳ quan sát hàng tháng liên tục từ năm 2000 đến hiện tại.
   * *Động cơ phân tích thống kê đa cửa sổ*: `scripts/lib/market_valuation_analyzer.py` tính toán song song trên 4 chu kỳ:
     * `five_year`: Chu kỳ kinh tế & tiền tệ 5 năm gần nhất.
     * `ten_year`: Chuẩn mực vĩ mô dài hạn 10 năm (Khuyến nghị mặc định).
     * `modern`: Giai đoạn thị trường hiện đại từ 2007 (Việt Nam gia nhập WTO).
     * `all_time`: Toàn cảnh lịch sử 25 năm từ ngày thành lập sàn HOSE.
   * *Bộ chỉ số thống kê trên từng cửa sổ*:
     * `mean`, `median`, `std`: Giá trị trung bình, trung vị và độ lệch chuẩn.
     * `zscore`: Điểm độ lệch chuẩn $z = \frac{x - \mu}{\sigma}$.
     * `percentile`: Điểm phân vị xếp hạng tương đối (0% - 100%).
     * `p10`, `p25`, `p75`, `p90`: Các mốc phân vị cắt ngưỡng phân phối xác suất.
     * `band`: Gán nhãn động 5 dải định giá (*Rất rẻ*, *Rẻ*, *Trung bình*, *Mắc*, *Rất mắc*).
     * `vsMedianPct`, `vsMeanPct`: Độ lệch tương đối (%) so với trung vị và trung bình lịch sử.
   * *Metrics dẫn xuất & Cảnh báo nâng cao*:
     * `peXpb`: Tích số Graham $P/E \times P/B$ (Đạt chuẩn an toàn khi $\le 22.5x$).
     * `roeProxy`: Tỷ suất sinh lời trên vốn chủ sở hữu ngụ ý của toàn thị trường $ROE \text{ proxy} = \frac{P/B}{P/E} \times 100\%$.
     * `compositeSignal`: Điểm định giá tổng hợp (0 - 100) kết hợp $30\% \cdot z_{PE} + 30\% \cdot z_{PB} + 20\% \cdot \text{Pctl}_{PE} + 20\% \cdot \text{Pctl}_{PB}$ đưa ra khuyến nghị (*MUA MẠNH*, *MUA TÍCH LŨY*, *TRUNG LẬP / GIỮ*, *HẠ TỶ TRỌNG*, *PHÒNG THỦ / BÁN*).
     * `extremeAlert`: Cờ cảnh báo tự động kích hoạt khi có độ lệch chuẩn cực đoan $|z| > 2.0$.
2. **Đường Cong Lợi Suất Trái Phiếu Chính Phủ (Government Bond Yield Curve)**:
   * *Nguồn trích xuất*: Cổng thông tin trái phiếu Sở GDCK Hà Nội (HNX - `https://hnx.vn/ModuleReportBonds/Bond_YieldCurve/SearchAndNextPageYieldCurveData`).
   * *Trường dữ liệu*: Lợi suất trúng thầu 8 kỳ hạn: 1 năm, 2 năm, 3 năm, 5 năm, 7 năm, 10 năm, 15 năm, 20 năm.
   * *Mục đích*: Lợi suất TPCP 10Y (`vn10yYield`) đại diện cho **Lãi suất phi rủi ro ($R_f$)** tại Việt Nam, là tham số đầu vào bắt buộc của mô hình Định giá Benjamin Graham ($Y$) và Mô hình chiết khấu Gordon DDM ($r$).
3. **Lãi Suất Điều Hành Ngân Hàng Nhà Nước (SBV Policy Rates)**:
   * *Nguồn trích xuất*: Cổng thông tin Ngân hàng Nhà nước Việt Nam (`sbv.gov.vn`) và Báo cáo tuần Hiệp hội Thị trường Trái phiếu (VBMA).
   * *Trường dữ liệu*: Lãi suất tái cấp vốn (`sbvRefinancingRate`), Lãi suất tái chiết khấu, Trần lãi suất tiền gửi.
4. **Lãi Suất Thị Trường Liên Ngân Hàng (Interbank Rates)**:
   * *Nguồn trích xuất*: SBV / VBMA.
   * *Trường dữ liệu*: Lãi suất qua đêm (Overnight), 1 tuần, 1 tháng. Đo lường mức độ dư thừa hoặc căng thẳng thanh khoản tiền đồng trong hệ thống ngân hàng.
5. **Thị Trường Tiền Tệ & Hàng Hóa Quốc Tế**:
   * *Nguồn trích xuất*: Yahoo Finance API (`query1.finance.yahoo.com` qua module `yfinance`).
   * *Trường dữ liệu*:
     * `us10yYield` (`^TNX`): Lợi suất trái phiếu kho bạc Mỹ 10 năm.
     * `usdVndRate` (`USDVND=X`): Tỷ giá USD/VND thị trường liên ngân hàng.
     * `dxy` (`DX-Y.NYB`): Chỉ số Dollar Index đo lường sức mạnh đồng bạc xanh.
     * `goldWorld` (`GC=F`): Giá vàng thế giới (USD/troy ounce).
     * `oilBrent` (`BZ=F`): Giá dầu thô Brent Biển Bắc (USD/thùng).
6. **Giá Vàng Trong Nước (Vàng Miếng SJC & Nhẫn Trơn PNJ 999.9)**:
   * *Nguồn trích xuất chính thức*: REST API Edge Cloud từ Công ty Vàng bạc Đá quý Phú Nhuận (PNJ) (`https://edge-api.pnj.io/ecom-frontend/v1/get-gold-price?zone=00`).
   * *Đặc tính kỹ thuật*:
     * Giao thức HTTPS GET trả về JSON thuần có cấu trúc, không cào HTML, không dùng regex, loại bỏ hoàn toàn nguy cơ sai lệch số liệu.
     * Tự động chuẩn hóa đơn vị tính: $\text{Giá (Triệu VNĐ/Lượng)} = \frac{\text{Giá PNJ (nghìn đồng/chỉ)}}{100}$ (1 lượng = 10 chỉ).
   * *Trường dữ liệu chi tiết*:
     * `sjcGoldBuy` / `sjcGoldSell`: Giá vàng miếng SJC 999.9 mua vào và bán ra (Triệu đồng/lượng).
     * `pnjGoldBuy` / `pnjGoldSell`: Giá nhẫn trơn PNJ 999.9 mua vào và bán ra (Triệu đồng/lượng).
     * `pnjUpdateDate`: Thời gian niêm yết chính thức từ PNJ (ví dụ `10/10/2026 10:08:48`).
   * *Cơ chế dự phòng & An toàn (Resilience & Sanity Bounds)*:
     * Bộ lọc kiểm tra giá trị hợp lệ: Giá bán bắt buộc phải nằm trong dải $50 - 300$ Triệu VNĐ/lượng.
     * Tự động phục hồi từ snapshot cache gần nhất trong `data/macro_valuation.json` khi request mạng gặp sự cố.
7. **Kho 95 Chỉ Số Kinh Tế Vĩ Mô TradingEconomics Vietnam**:
   * *Nguồn trích xuất*: TradingEconomics Vietnam (`tradingeconomics.com/vietnam/indicators`) qua `scripts/fetchers/tradingeconomics_fetcher.py`.
   * *Lưu trữ*: `data/macro_indicators.json` (phân chia 10 nhóm danh mục):
     1. **Tổng Quan (Overview)**: GDP, Lạm phát CPI, Thất nghiệp, Lãi suất, Cán cân thương mại, Nợ công/GDP.
     2. **GDP & Tăng Trưởng**: Tốc độ tăng trưởng GDP hàng quý, GDP danh nghĩa, GDP bình quân đầu người, Đóng góp ngành.
     3. **Thị Trường Lao Động (Labour)**: Tỷ lệ thất nghiệp, Dân số hoạt động kinh tế, Tăng trưởng lương tối thiểu.
     4. **Giá Cả & Lạm Phát (Prices)**: Lạm phát cơ bản (Core CPI), Chỉ số giá sản xuất (PPI), CPI thực phẩm & năng lượng.
     5. **Tiền Tệ & Ngân Hàng (Money)**: Cung tiền M2, Tăng trưởng tín dụng, Dự trữ ngoại hối (Foreign Reserves), Tiền gửi ngân hàng.
     6. **Thương Mại & Cán Cân (Trade)**: Kim ngạch xuất khẩu, Kim ngạch nhập khẩu, FDI đăng ký & FDI thực hiện, Kiều hối.
     7. **Tài Khóa Chính Phủ (Government)**: Thu ngân sách, Chi ngân sách, Thâm hụt ngân sách/GDP, Nợ công/GDP.
     8. **Thuế Suất (Taxes)**: Thuế TNDN (Corporate Tax), Thuế TNCN (Personal Income Tax), Thuế GTGT (Sales Tax/VAT).
     9. **Môi Trường Kinh Doanh (Business)**: Chỉ số Nhà quản trị mua hàng (S&P Global Vietnam Manufacturing PMI), Chỉ số sản xuất công nghiệp (IIP).
     10. **Tiêu Dùng & Bán Lẻ (Consumer)**: Doanh số bán lẻ hàng hóa, Niềm tin người tiêu dùng, Tín dụng tiêu dùng.
8. **Mô Hình Chu Kỳ Kinh Tế 5 Pha (Macro Regime Engine)**:
   * *Module tính toán*: `scripts/lib/macro_regime.py`.
   * *Nguyên lý*: Dựa trên ma trận tăng trưởng GDP và xu hướng lạm phát CPI (phương pháp chuẩn từ Bridgewater / Goldman Sachs / VimoVietnam):
     * **Pha 1: Phục hồi (Recovery)**: GDP tăng tốc, Lạm phát thấp → Môi trường tối ưu cho Cổ phiếu tăng trưởng.
     * **Pha 2: Mở rộng (Expansion)**: GDP tăng trưởng cao, Lạm phát bắt đầu tăng → Chu kỳ kinh doanh bùng nổ.
     * **Pha 3: Quá nhiệt (Overheating)**: Lạm phát vượt trần mục tiêu, SBV thắt chặt tiền tệ → Ưu tiên Hàng hóa / Tiền mặt.
     * **Pha 4: Suy thoái (Contraction/Stagflation)**: GDP suy giảm, Lạm phát cao hoặc đình lạm → Phòng thủ, Vàng, Trái phiếu.
     * **Pha 5: Chậm lại (Slowdown)**: GDP hạ nhiệt, Lạm phát hạ nhiệt → Chuẩn bị chuyển dịch sang chu kỳ nới lỏng mới.
   * *Điểm Rủi Ro Vĩ Mô (0 - 100)*: Phân rã 4 tầng rủi ro: Tiền tệ (30%), Tài khóa (25%), Lạm phát (25%), Thanh khoản (20%).
9. **Ma Trận Luân Chuyển 11 Nhóm Ngành HOSE (Sector Rotation)**:
   * *Phân loại*: Ngân hàng, Bất động sản, Thép & Vật liệu, Bán lẻ & Tiêu dùng, Công nghệ (FPT), Chứng khoán, Dầu khí, Điện nước & Tiện ích, Hóa chất & Phân bón, Vận tải & Cảng biển, Y tế & Dược phẩm.
   * *Trường dữ liệu*: Trạng thái khuyến nghị (Overweight, Neutral, Underweight), Điểm số tác động ròng (Net Impact Score) và Ma trận nhạy cảm trước 6 biến số vĩ mô.
10. **Cố Vấn Phân Bổ 4 Loại Tài Sản & Chênh Lệch Giá Vàng (Gold Arbitrage Regime)**:
   * *Khung phân bổ 4 lớp tài sản*: Tự động cân đối tỷ trọng giữa Cổ phiếu (Equity), Trái phiếu (Bond), Tiền mặt (Cash) và Vàng vật chất (Gold) theo Risk Bucket B0 - B4 và 4 tầng rủi ro vĩ mô.
   * *Mô hình tính toán chênh lệch giá vàng (`goldAdvisor`)*:
     * Công thức quy đổi giá vàng thế giới ra tiền đồng:
       $$\text{Giá TG Quy Đổi (VNĐ/lượng)} = \left(\frac{\text{Vàng TG (USD/oz)} \times \text{USD/VND}}{31.1034768}\right) \times 37.5$$
     * Phân tích Spread đa chiều:
       * `sjcSpreadPct`: Chênh lệch giá vàng miếng SJC bán ra so với TG quy đổi (%).
       * `pnjSpreadPct`: Chênh lệch giá nhẫn trơn PNJ 999.9 bán ra so với TG quy đổi (%).
     * Khuyến nghị hành động (`action`), tỷ trọng (`sizeHint`) và luận điểm vĩ mô (`reason`):
       * `Spread >= 10%`: **MUA PHÒNG THỦ** (5-10% danh mục) do nhu cầu phòng thủ tỷ giá gia tăng.
       * `Spread <= 3%`: **BÁN / TRÁNH MUA** (≤ 2% danh mục) do giá trong nước bão hòa, thích hợp chốt lời.
       * `3% < Spread < 10%`: **NẮM GIỮ** (3-5% danh mục) duy trì tỷ trọng tiêu chuẩn.

11. **Đồng Hồ Kinh Tế Vĩ Mô 4 Góc Phần Tư (`macroClock`)**:
    * *Cơ sở lý thuyết*: Mô hình 4 pha kinh điển kết hợp Tăng trưởng GDP và Lạm phát CPI (Bridgewater All-Weather Framework):
      * `goldilocks`: **Tăng Trưởng Vàng** (GDP cao >6.5%, CPI ổn định 3.5-5.5%). Ngành ưu tiên: Ngân hàng, Chứng khoán, Bán lẻ, Công nghệ.
      * `overheating`: **Mở Rộng Tăng Tốc / Quá Nhiệt** (GDP cao, CPI tăng >5.5%). Ngành ưu tiên: Bất động sản, Thép, Hóa chất, Năng lượng.
      * `stagflation`: **Đình Lạm** (GDP chậm lại <5.0%, CPI cao >5.5%). Ngành ưu tiên: Tiện ích điện nước, Dược phẩm, Tiền mặt, Vàng.
      * `reflation`: **Phục Hồi / Bơm Tiền** (GDP chạm đáy, CPI thấp <3.5%). Ngành ưu tiên: Chứng khoán, Công nghệ, Bán lẻ, Xây dựng.
    * *Trường dữ liệu*: `quadrant`, `quadrantKey`, `titleVi`, `desc`, `gdpPhase`, `gdpPhaseVi`, `gdpValue`, `inflationState`, `inflationStateVi`, `cpiValue`, `favoredSectors`, `avoidedSectors`.
12. **Phân Tích Đường Cong Lợi Suất & Thị Trường Nợ (`yieldCurveAnalysis`)**:
    * *Trường dữ liệu chi tiết*:
      * `vn10y`: Lợi suất TPCP 10Y Việt Nam (HNX).
      * `us10y`: Lợi suất TPCP 10Y Mỹ (Treasury 10Y).
      * `sbvRefinancingRate`: Lãi suất tái cấp vốn SBV.
      * `longShortSpread` (LSS): Độ lệch dốc kỳ hạn dài - ngắn ($LSS = VN10Y - SBV$).
      * `crossCountrySpread`: Chênh lệch quốc tế ($VN10Y - US10Y$), đo lường áp lực chênh lệch lãi suất và dòng vốn ngoại.
      * `inversionWarning`: Cờ cảnh báo đảo ngược kỳ hạn ($LSS < 0$).
      * `ycRegime`, `ycRegimeVi`: Phân loại cấu trúc đường cong (*Normal*, *Flat*, *Stress*, *Crisis*).
      * `ycStressIndex`: Chỉ số căng thẳng nợ thị trường (0 - 100).
      * `assessment`: Nhận định chuyên sâu cấu trúc kỳ hạn và thanh khoản tiền đồng.
13. **Ma Trận 3 Kịch Bản Thị Trường & Rủi Ro Đuôi (`scenarioMatrix` & `tailRisks`)**:
    * *3 Kịch bản định lượng (`scenarioMatrix`)*:
      * `base` (Kịch bản cơ sở, xác suất ~55%): Dải điểm VN-Index kỳ vọng, điều kiện vĩ mô, các ngành hưởng lợi & thận trọng, luận điểm đầu tư.
      * `bull` (Kịch bản tích cực, xác suất ~25%): Dải điểm VN-Index, điều kiện nới lỏng dòng vốn, nhóm ngành dẫn sóng High-Beta.
      * `bear` (Kịch bản thận trọng, xác suất ~20%): Dải điểm VN-Index, áp lực lạm phát/hút thanh khoản, nhóm ngành phòng thủ.
    * *Bộ 6 Rủi ro đuôi với ngưỡng kích hoạt toán học thực tế (`tailRisks` - zero placeholder)*:
      * `liquidity_squeeze`: Khủng hoảng thanh khoản tiền đồng (Lãi suất qua đêm >7.5% hoặc LSS <-1.5%).
      * `stagflation_shock`: Cú sốc đình lạm (CPI >6.5% kết hợp GDP <5.0%).
      * `credit_crunch`: Đóng băng tín dụng bất động sản (Tín dụng <9.0% hoặc SBV tăng lãi suất).
      * `external_shock`: Cú sốc tỷ giá ngoại vi (USD/VND >25.500 hoặc US 10Y >5.0%).
      * `soft_landing`: Hạ cánh mềm (CPI 3.5-4.5% và GDP >6.5%).
      * `bull_inflection`: Cơ hội bùng nổ vĩ mô (SBV hạ lãi suất, PMI >53, Tín dụng >14%).
    * `hasActiveTailRisk`, `criticalTailRiskCount`: Cờ nhận diện rủi ro đang kích hoạt trên thị trường.
14. **Độ Lệch Dẫn Dắt - Trễ & Độ Tin Cậy Mô Hình (`leadLagDivergence` & `confidence`)**:
    * *Đo lường độ lệch Sớm - Trễ (`leadLagDivergence`)*:
      * `leadingPct`: Điểm số nhóm chỉ báo sớm thị trường tài chính (Lãi suất liên ngân hàng, Tỷ giá, Giá dầu, Giá vàng).
      * `laggingPct`: Điểm số nhóm chỉ báo trễ kinh tế thực (GDP, Lạm phát CPI, Doanh số bán lẻ).
      * `divergence`: Độ lệch chênh lệch ($\Delta = Leading - Lagging$).
      * `signal`, `signalVi`: Cảnh báo sớm (*⚠️ LEADING WARNS*, *⚠️ LAGGING DRAGS*, *BALANCED*).
    * *Độ tin cậy mô hình (`confidence`)*:
      * `overall`: Điểm số tin cậy tổng thể (0 - 100).
      * `label`, `labelVi`: Phân cấp độ tin cậy (*HIGH / Cao*, *MEDIUM / Trung bình*, *LOW / Thấp*).
      * `dataQuality`: Điểm chất lượng dữ liệu nguồn.
      * `regimeStability`: Điểm ổn định pha chu kỳ kinh tế.
      * `signalClarity`: Điểm độ rõ nét của các tín hiệu định hướng.
15. **Phân Rã 6 Động Lực Vĩ Mô Cho 11 Nhóm Ngành Niêm Yết (`decomposition`)**:
    * Trong mỗi đối tượng ngành của `sectorRotation`, trường `decomposition` bóc tách chi tiết đóng góp điểm ròng từ:
          * `interbank`: Lãi suất liên ngân hàng qua đêm.
          * `sbvRate`: Lãi suất điều hành tái cấp vốn SBV.
          * `cpi`: Lạm phát CPI theo năm.
          * `usdVnd`: Tỷ giá thị trường liên ngân hàng USD/VND.
          * `oil`: Giá dầu thô Brent thế giới.
          * `pmi`: Chỉ số Nhà quản trị mua hàng PMI sản xuất.
    16. **Chỉ Số Định Giá Phân Khúc & Phong Cách Đầu Tư (`styleIndices` & `vn30Valuation`)**:
        * *Nguồn trích xuất*: Endpoint định giá lịch sử Vietstock (`Valuation_GetRatiosMarketIndexForChart` cho `VNINDEX`, `VN30`), dữ liệu quỹ ETF DCVFM / Dragon Capital (`FUEVFVND`, `FUEDCMID`) và động cơ tính toán định lượng `scripts/lib/macro_regime.py`.
        * *Phân khúc theo dõi*:
          * `VNINDEX`: Toàn thị trường HOSE (Broad Market, Beta 1.0).
          * `VN30`: Nhóm 30 cổ phiếu vốn hóa lớn nhất (Large-Cap Core, Beta 0.95), có chuỗi lịch sử P/E và P/B 17 năm độc lập từ Vietstock.
          * `VNDIAMOND`: Chỉ số các cổ phiếu kim cương hết room ngoại (Quality / Foreign Room, Beta 1.12), proxy qua ETF `FUEVFVND`.
          * `VNMIDCAP`: Chỉ số nhóm cổ phiếu vốn hóa trung bình (Growth / High Beta, Beta 1.28), proxy qua ETF `FUEDCMID`.
        * *Trường dữ liệu chi tiết*:
          * `code`, `name`, `etfProxy`: Mã định danh, tên phân khúc, mã chứng chỉ quỹ ETF đại diện.
          * `pe`, `pb`: P/E và P/B hiện tại của từng phân khúc.
          * `grahamIndex`: Tích số Benjamin Graham ($P/E \times P/B \le 22.5$).
          * `roeProxy`: Tỷ suất sinh lời vốn chủ sở hữu ngụ ý ($\frac{P/B}{P/E} \times 100\%$).
          * `beta`: Hệ số biến động Beta tương quan thị trường.
          * `yieldDiv`: Tỷ suất cổ tức bình quân phân khúc (%).
          * `style`: Phong cách đầu tư đặc trưng (*Toàn thị trường*, *Large-Cap Core*, *Chất lượng cao & Kín room*, *Tăng trưởng & Beta cao*).
          * `character`: Đặc tính vận động dòng vốn.
          * `verdict`: Nhận định định lượng & khuyến nghị.
        * *Định giá chuyên sâu VN30 (`vn30Valuation`)*: Mô hình phân tích thống kê 4 cửa sổ thời gian (5Y, 10Y, 2007, All-time), dải phân vị, z-score và composite signal tương tự VN-Index.
    17. **Báo Cáo Điều Hành Trọng Yếu (`executiveSummary`)**:
        * *Nguồn tham chiếu & chuẩn hóa*: Lấy cảm hứng từ cấu trúc phân tích điều hành chuyên nghiệp trong `ref-vn-macro-markets`.
        * *Trường dữ liệu*:
          * `keyRisks`: Danh sách 3 rủi ro cốt lõi của chu kỳ kinh tế hiện tại (`risk`, `level`, `mitigation`).
          * `catalysts`: Danh sách 3 động lực tăng trưởng thúc đẩy thị trường (`driver`, `timeline`, `impact`).
          * `keyTakeaways`: Danh sách 3 điểm nhấn điều hành then chốt, trong đó có `⭐ Insight Tổng Hợp` kết hợp định giá, thanh khoản và tâm lý vĩ mô.
    18. **Ma Trận Phân Bổ Đa Kịch Bản & Khẩu Vị Rủi Ro (`scenarioAllocation`)**:
        * *Nguyên lý*: Mở rộng mô hình phân bổ 4 tài sản truyền thống thành ma trận 4×3 tương thích với 3 kịch bản thị trường (Cơ sở, Tích cực, Thận trọng) kết hợp tùy biến theo Khẩu vị rủi ro và Khung thời gian đầu tư của nhà đầu tư.
        * *Trường dữ liệu*:
          * `base`, `bull`, `bear`: Tỷ trọng phân bổ tài sản cơ sở (Cổ phiếu, Trái phiếu, Tiền mặt, Vàng) theo từng kịch bản.
          * `profiles`: Ma trận điều chỉnh theo khẩu vị rủi ro:
            * `conservative`: Thận trọng (giảm tỷ trọng CP, tăng tiền/trái phiếu).
            * `balanced`: Cân bằng (giữ nguyên tỷ trọng chu kỳ).
            * `aggressive`: Tăng trưởng / Chấp nhận rủi ro (tăng tỷ trọng CP).
          * `horizons`: Ma trận điều chỉnh theo thời gian nắm giữ:
            * `short`: Ngắn hạn (<1 năm).
            * `medium`: Trung hạn (1-5 năm).
            * `long`: Dài hạn (>5 năm).
          * `currentBucket`: Risk Bucket vĩ mô hiện tại.
    19. **DNSE Multi-Index Intraday & OHLC Gateway**:
        * *Endpoint Backend*: `GET /api/valuation/dnse-ohlc?symbol=<CODE>&resolution=<1|D>`
        * *Nguồn cung cấp*: DNSE Charting API (`services.entrade.com.vn/chart-api/v2/ohlcs`).
        * *Khả năng chuyển đổi động*:
          * Chỉ số chuẩn: `VNINDEX`, `VN30`, `VN100`, `HNX`, `UPCOM`.
          * ETF / Phân khúc: Chuyển đổi mã ảo `VNDIAMOND` $\to$ mã ETF `FUEVFVND`, và `VNMIDCAP` $\to$ mã ETF `FUEDCMID` để nạp dữ liệu nến intraday và lịch sử chuẩn xác.
    20. **Dữ Liệu Định Giá 10 Ngành Thực Tế & Ma Trận Thiên Thời Hội Tụ (`sectorValuations` & `dualMatrix`)**:
        * *Nguồn trích xuất chính thức*: Cổng dữ liệu phân ngành chuẩn hóa quốc tế GICS Vietnam (`https://simplize.vn/co-phieu/nganh`) qua module độc lập `SectorValuationFetcher` (`scripts/fetchers/sector_valuation_fetcher.py`).
        * *Công nghệ bóc tách dữ liệu chuẩn hóa*: Sử dụng **BeautifulSoup4** và **pandas (`pd.read_html`)** bóc tách bảng HTML SSR trực tiếp (`<table>`), đồng nhất 100% với chuẩn kiến trúc của `TradingEconomicsFetcher`.
        * *Cơ chế dự phòng & Báo lỗi đa tầng*:
          * **Primary**: Thẻ HTML `<table>` parse bằng BeautifulSoup + pandas.
          * **Secondary Fallback**: Trích xuất JSON nội bộ `<script id="__NEXT_DATA__">`.
          * **Tertiary Fallback**: Phục hồi từ snapshot local cache (`data/sector_valuation_cache.json`, TTL 24h).
          * **Console Error Logging**: Bất kỳ trường dữ liệu nào (`P/E`, `P/B`, `Vốn hóa`, `% biến động`) bị rỗng, `NaN`, hoặc không ép kiểu số được đều được in cảnh báo chi tiết ra console kèm tên ngành, tên chỉ tiêu và giá trị thô gốc.
        * *Quy mô bao phủ*: Hơn 2.000 cổ phiếu trên cả 3 sàn (HOSE, HNX, UPCoM), tuyệt đối không lấy mẫu hay ngoại suy từ vài cổ phiếu lẻ.
        * *10 Nhóm ngành chuẩn GICS*:
          1. `VNFIN` (Tài chính - Ngân hàng, Chứng khoán, Bảo hiểm): 87 mã, Vốn hóa 3,17 triệu tỷ VNĐ.
          2. `VNREAL` (Bất động sản & KCN): 129 mã, Vốn hóa 2,75 triệu tỷ VNĐ.
          3. `VNIND` (Công nghiệp & Xây dựng): 457 mã, Vốn hóa 850.422 tỷ VNĐ.
          4. `VNCONS` (Tiêu dùng thiết yếu): 186 mã, Vốn hóa 735.421 tỷ VNĐ.
          5. `VNDISCR` (Tiêu dùng không thiết yếu & Bán lẻ): 196 mã, Vốn hóa 701.808 tỷ VNĐ.
          6. `VNENE` (Năng lượng & Dầu khí): 82 mã, Vốn hóa 501.213 tỷ VNĐ.
          7. `VNMAT` (Nguyên vật liệu & Thép): 259 mã, Vốn hóa 493.107 tỷ VNĐ.
          8. `VNIT` (Công nghệ thông tin): 36 mã, Vốn hóa 417.174 tỷ VNĐ.
          9. `VNUT` (Tiện ích Điện, Nước, Khí): 107 mã, Vốn hóa 253.328 tỷ VNĐ.
          10. `VNHEAL` (Y tế & Dược phẩm): 57 mã, Vốn hóa 61.022 tỷ VNĐ.
        * *Trường dữ liệu định lượng (`sectorValuations`)*:
          * `pe`, `pb`: P/E và P/B thực tế toàn ngành.
          * `divYield`: Tỷ suất cổ tức bình quân ngành (%).
          * `marketCapBn`: Tổng vốn hóa thị trường của ngành (Tỷ VNĐ).
          * `totalTickers`: Tổng số lượng mã cổ phiếu niêm yết trong ngành.
          * `netIncomeLtmGrowth`, `netIncomeEstGrowth`: Tốc độ tăng trưởng LNST trailing và dự phóng (%).
          * `pricePctChgYtd`, `pricePctChg1y`, `pricePctChg3y`, `pricePctChg5y`: Hiệu suất giá ngành theo các chu kỳ.
          * `valuationBand`, `valuationBadge`: Dải định giá ngành so với tương quan VN-Index (*Rất rẻ*, *Rẻ*, *Hợp lý*, *Hơi đắt*, *Đắt đỏ*).
        * *Ma Trận Thiên Thời Hội Tụ 4 Góc Phần Tư & Tác Động Vĩ Mô Hợp Nhất (`dualMatrix` & `sectorRotation`)*:
          * Chuẩn hóa 100% danh mục toàn hệ thống về đúng **10 Nhóm Ngành Chuẩn GICS Việt Nam (HOSE)** (`VNFIN`, `VNREAL`, `VNIND`, `VNCONS`, `VNDISCR`, `VNENE`, `VNMAT`, `VNIT`, `VNUT`, `VNHEAL`), loại bỏ triệt để danh sách 11 ngành tùy biến cũ.
          * Hợp nhất 2 chiều định lượng: Định Giá BCTC Toàn Sàn ($P/E$, $P/B$, Vốn hóa, Cổ tức) $\times$ Động Lực Vĩ Mô Chu Kỳ (Net Impact Score & Phân rã 6 biến số: Liên ngân hàng, SBV, CPI, USD/VND, Dầu Brent, PMI).
          * Mỗi nhóm ngành trong `dualMatrix.items` chứa trọn vẹn:
            - `decomposition`: Điểm tác động chi tiết của từng biến số trong 6 động lực vĩ mô (`interbank`, `sbvRate`, `cpi`, `usdVnd`, `oil`, `pmi`).
            - `rank`: Thứ hạng sức mạnh vĩ mô (#1 đến #10).
            - `actionTag`: Khuyến nghị vĩ mô (*Overweight*, *Accumulate*, *Neutral*, *Underweight*, *Reduce*).
          * 4 Phân vùng chiến lược:
            - `sweetSpot` (💎 Vùng Vàng Gom Mua): Vĩ mô ủng hộ ($Net \ge 0$) $\times$ Định giá rẻ ($P/E \le 11.5x$).
            - `valueTrap` (⚠️ Vùng Bẫy Giá Rẻ): Định giá rẻ nhưng vĩ mô bất lợi ($Net < 0$).
            - `momentum` (🔥 Vùng Quá Nhiệt): Vĩ mô mạnh mẽ nhưng định giá đắt ($P/E \ge 13.5x$).
            - `defense` (🛡️ Vùng Phòng Thủ / Tránh Né): Vĩ mô bất lợi và định giá không hấp dẫn.
          * *Giao diện người dùng (`SectorValuationHeatmap.jsx`)*: Hợp nhất toàn bộ dữ liệu định giá P/E và 6 động lực vĩ mô vào đúng **2 chế độ xem trực quan & bảng số liệu chuyên sâu**:
            1. **`💎 Ma Trận Thiên Thời & Bản Đồ Nhiệt`**: 4 Phân vùng chiến lược, tích hợp thẻ P/E Heatmap so sánh % chênh lệch với VN-Index, P/E Rank, Macro Rank và widget bung mở xem 6 động lực vĩ mô.
            2. **`📋 Bảng Toàn Diện & Phân Rã Vĩ Mô`**: Bảng tổng hợp đa chiều BCTC & vĩ mô, hỗ trợ mở rộng dòng (Expandable Row) phân tích chi tiết 6 động lực chu kỳ.
    21. **Bộ Phân Tích Vĩ Mô & Thị Trường Đa Kịch Bản Trí Tuệ Nhân Tạo (Macro Intelligence Suite - AI Enhanced)**:
        * *Nguồn sinh dữ liệu*: `scripts/generate_ai_insights.py --scope macro` (gọi phương thức `generate_macro_intelligence_suite` trong `scripts/lib/ai_service.py` bằng 1 request gộp duy nhất).
        * *Cơ chế lưu trữ & 2-tier Fallback*:
          * Tầng 1: `data/macro_valuation.json` lưu trực tiếp vào các key chuyên biệt.
          * Tầng 2: Đồng bộ song song vào `data/ai_insights_cache.json` để API `/api/valuation/macro` tự động merge nếu file chính bị làm mới bởi EOD pipeline.
          * Offline Heuristic Fallback: Nếu không có API Key AI hoặc kết nối proxy bị gián đoạn, hệ thống tự động sinh dữ liệu định lượng chất lượng cao từ các biến số vĩ mô thực tế mà không làm gián đoạn UI.
        * *Các trường dữ liệu cấu trúc chi tiết*:
          * **`aiScenarios` (3 Kịch Bản VN-Index Định Lượng Động)**:
            * `marketVerdict`: Nhận định tổng quan 1-2 câu về xu hướng chỉ số và tương quan P/E thị trường.
            * `scenarios.base` (Kịch bản Cơ sở): Xác suất động (phụ thuộc Risk Score), dải điểm mục tiêu, dải P/E kỳ vọng, dự phóng tăng trưởng EPS, các chất xúc tác vĩ mô (`macroCatalysts`), nhóm ngành dẫn dắt (`leadingSectors` kèm `thesis`), nhóm ngành thận trọng (`laggingSectors` kèm `risk`), tỷ trọng phân bổ tài sản chiến thuật (`tacticalAllocation`), khuyến nghị hành động (`actionSummary`).
            * `scenarios.bull` (Kịch bản Tích cực): Cấu trúc tương tự cho kịch bản hưng phấn & nới lỏng tiền tệ.
            * `scenarios.bear` (Kịch bản Thận trọng): Cấu trúc tương tự cho kịch bản phòng thủ & thắt chặt thanh khoản.
          * **`aiClockDynamics` (Động Lực Học Đồng Hồ Vĩ Mô)**:
            * `clockHandPosition`: Vị trí kim đồng hồ (VD: "2:30 (Cuối pha Mở Rộng — Chớm Tăng Nhiệt)").
            * `transitionVelocity`: Vận tốc chuyển dịch pha chu kỳ (CHẬM, TRUNG BÌNH, NHANH).
            * `dynamicsAnalysis`: Phân tích cơ chế xung lực giữa tăng trưởng GDP, lạm phát và thanh khoản SBV.
            * `historicalAnalog`: Thời kỳ lịch sử tương đồng (`period`) và bản chất tương đồng (`similarity`).
            * `sectorPlaybook`: Cẩm nang ngành (`favored`: các ngành ưu tiên, `cautious`: các ngành cần thận trọng).
          * **`aiYieldCurveDiagnosis` (Chẩn Đoán Thị Trường Nợ & Thanh Khoản Hệ Thống)**:
            * `curveStatus`: Trạng thái hình thái đường cong lợi suất TPCP và chênh lệch 10Y-2Y.
            * `bankingLiquidityImpact`: Tác động thanh khoản hệ thống NHTM và biên lãi ròng NIM.
            * `corporateDebtStress`: Mức độ áp lực đáo hạn trái phiếu doanh nghiệp và rủi ro tín dụng.
            * `equityMarketSignal`: Tương quan lợi tức thu nhập cổ phiếu (E/P) so với lợi suất trái phiếu 10Y (ERP).
          * **`aiMultiAssetStrategy` (Chiến Lược Phân Bổ Đa Tài Sản & Nhận Định Vàng)**:
            * `multiAssetThesis`: Luận điểm phân bổ tài sản tổng thể giữa Cổ phiếu, Trái phiếu, Vàng và Tiền mặt.
            * `goldArbitrageRationale`: Luận giải mức độ chênh lệch vàng SJC/PNJ so với thế giới và khuyến nghị đầu tư vàng.
            * `policyRiskAlert`: Cảnh báo rủi ro chính sách quản lý thị trường vàng từ Ngân hàng Nhà nước.
            * `recommendedAllocation`: Tỷ lệ phân bổ 4 lớp tài sản tối ưu.
          * **`aiStyleRotation` (Chiến Lược Luân Chuyển Phong Cách Đầu Tư)**:
            * `rotationHeadline`: Tiêu đề luận điểm dòng vốn tổ chức giữa các phân khúc.
            * `largeCapVsMidcap`: Phân tích đối chiếu giữa Large-Cap Blue-chips (VN30) và Midcap tăng trưởng.
            * `diamondForeignRoom`: Nhận định nhóm cổ phiếu kín room ngoại (VN Diamond) và định giá tương đối.
            * `actionableStrategy`: Khuyến nghị tỷ trọng phân bổ cụ thể giữa các phong cách đầu tư.
          * **`aiTailRiskAnalysis` (Kế Hoạch Dự Phòng & Chuỗi Dẫn Truyền Rủi Ro Đuôi)**:
            * `contingencyPlan`: Kế hoạch hành động ứng phó dự phòng khi các cảnh báo rủi ro đuôi kích hoạt.
            * `contagionChain`: Cơ chế dẫn truyền và mức độ lan tỏa rủi ro xuyên thị trường (Tỷ giá $\to$ Khối ngoại $\to$ Large-Cap $\to$ Thị trường chung).
          * **`aiSbvOmoDiagnosis` (Chẩn Đoán Thanh Khoản OMO & Liên Ngân Hàng Hàng Tuần)**:
            * `liquidityPosture`: Trạng thái thanh khoản hệ thống (`FLUSH`, `NEUTRAL`, `TIGHTENING`).
            * `headline`: Tiêu đề cô đọng về tình trạng bơm/hút tiền và tỷ giá USD/VND.
            * `strategicNarrative`: Phân tích sâu sắc cơ chế điều hành OMO, áp lực tỷ giá và thanh khoản tiền tệ.
            * `bankingNIMImpact`: Tác động chi phí vốn liên ngân hàng lên biên lãi ròng NIM ngành ngân hàng.
            * `equityMarketVerdict`: Tác động cụ thể đến thanh khoản và dòng tiền trên thị trường cổ phiếu.
            * `actionableAdvice`: Khuyến nghị tỷ trọng danh mục và quản trị đòn bẩy Margin.
          * **`aiInflationDiagnosis` (Kiểm Toán Sức Mua & Áp Lực Lạm Phát Hàng Tuần)**:
            * `cpiAssessment`: Đánh giá diễn biến CPI YoY và lạm phát lõi Core Inflation.
            * `purchasingPowerVerdict`: Nhận định về mức độ bào mòn sức mua của tiền mặt và tiền gửi tiết kiệm.
            * `assetProtectionRanking`: Bảng xếp hạng 4 kênh tài sản (Cổ phiếu, Vàng, Trái phiếu, Tiền gửi) theo khả năng phòng thủ lạm phát.
            * `hedgingStrategy`: Chiến lược phân bổ vốn dài hạn bảo toàn và tăng trưởng sức mua thực tế.

---

### PHÂN HỆ 5: THỊ GIÁ KHỚP LỆNH & CHỈ BÁO KỸ THUẬT (REALTIME & TECHNICALS)
* **Nguồn cung cấp**: TradingView Vietnam Scanner API (`POST https://scanner.tradingview.com/vietnam/scan`) & vnstock `Quote(source='VCI')`.
* **Tệp tin lưu trữ**: `data/fundamentals_cache.json` và `data/prices_cache.json`.

* **Trường dữ liệu chi tiết**:
  * *Dữ liệu phiên*: `close` (Thị giá), `change` (% tăng/giảm), `changeAbs` (Mức tăng giảm tuyệt đối), `volume` (Khối lượng khớp lệnh), `marketCap` (Vốn hóa), `sharesOutstanding` (Số lượng CP lưu hành).
  * *Chỉ báo kỹ thuật*:
    * `beta`: Hệ số Beta 1 năm so với VN-Index.
    * `recommendScore`: Điểm số khuyến nghị kỹ thuật từ -1 (Bán mạnh) đến +1 (Mua mạnh).
    * `techScore`: Điểm số xung lực kỹ thuật từ -3 (Tiêu cực) đến +3 (Tích cực).
  * *Thống kê chu kỳ & Biến động*:
    * `w1`, `m1`, `m3`, `m6`, `ytd`, `y1`, `y5`: Tỷ suất sinh lời chu kỳ từ 1 tuần đến 5 năm.
    * `high52w`, `low52w`: Đỉnh và Đáy 52 tuần.
    * `avgVol10d`, `avgVol30d`: Khối lượng giao dịch bình quân 10 phiên và 30 phiên.
    * `volatilityW`, `volatilityM`: Độ biến động giá tuần và tháng (%).

---

### PHÂN HỆ 6: DỮ LIỆU SỔ CÁI & QUẢN TRỊ DANH MỤC NỘI BỘ (INTERNAL LEDGER)
* **Nguồn cung cấp**: Người dùng nhập liệu và thuật toán khớp lệnh kế toán nội bộ.
* **Lưu trữ**: SQLite Database (`data/stock.db` / Turso Cloud).

```
┌────────────────────────────────────────────────────────────────────────┐
│                  HỆ THỐNG SỔ CÁI KHỚP LỆNH FIFO                        │
├─────────────────────┬─────────────────────┬────────────────────────────┤
│ 1. Sổ Lệnh Mua      │ 2. Sổ Lệnh Bán      │ 3. Sổ Cổ Tức               │
│ Bảng: buy_orders    │ Bảng: sell_orders   │ Bảng: dividends            │
│ • Ngày, Giá mua     │ • Ngày, Giá bán     │ • Cổ tức tiền mặt          │
│ • Khối lượng        │ • Khối lượng        │ • Cổ phiếu thưởng          │
│ • Phí giao dịch     │ • Phí & Thuế 0.1%   │ • Thuế TNCN 5%             │
│ • Giá vốn thực tế   │ • Giá vốn xuất FIFO │ • Tiền thực nhận           │
│ • Số lượng khả dụng │ • Lãi/Lỗ đã chốt    │                            │
│   (remaining_qty)   │   (Realized P/L)    │                            │
└─────────────────────┴─────────────────────┴────────────────────────────┘
```

1. **Sổ Lệnh Mua (`buy_orders`)**:
   * Quản lý giá mua, phí môi giới, tổng vốn đầu tư và số lượng cổ phiếu còn khả dụng (`remaining_qty`).
2. **Sổ Lệnh Bán (`sell_orders`)**:
   * Khi phát sinh lệnh bán, thuật toán **Khớp Lô Đa Chiến Lược (FIFO / Giá Vốn Cao Nhất / Giá Vốn Thấp Nhất)** tự động quét tìm các lô mua để đối trừ giá vốn.
   * Cơ chế phí đơn giản hóa: Phí bán được trừ trực tiếp vào đơn giá bán thực nhận (`net_price`), doanh thu thuần thực nhận (`net_revenue`), và tự động cộng vào số dư tiền mặt (`cash_balance`).
   * Xác định chính xác số tiền **Lãi/Lỗ Đã Thực Hiện (Realized P/L)** = `Khối lượng × (Giá bán thực nhận - Giá vốn gốc)` — đối soát hoàn hảo 100% trên toàn bộ giao diện.
   * Ghi nhận lịch sử chi tiết từng lô khớp vào cột `matched_lots` dạng JSON.
3. **Sổ Cổ Tức (`dividends`)**:
   * Ghi nhận cổ tức tiền mặt (tự động cộng tiền thực nhận vào số dư tiền mặt `cash_balance`).
   * Ghi nhận cổ tức bằng cổ phiếu (làm tăng số lượng nắm giữ và tự động điều chỉnh giá vốn bình quân).
4. **Sổ Theo Dõi & Quản Lý Vốn (`watchlist` & `app_settings`)**:
   * Lưu trữ số dư tiền mặt danh mục (`cash_balance`), hỗ trợ cả số âm (dư nợ Margin / ký quỹ).
   * Tự động điều chỉnh `cash_balance` khi phát sinh giao dịch Mua (-), Bán (+), Nhận Cổ Tức (+), hoặc Xóa/Undo lệnh.
   * Mục tiêu tỷ trọng cổ phiếu và cảnh báo vùng giá mua/bán gom tích lũy.

---

---

## 3. Kiến Trúc Module Thu Thập Dữ Liệu Độc Lập (`scripts/fetchers/`)

Hệ thống đã tách biệt hoàn toàn tầng kết nối, cào dữ liệu thô (Data Fetching Layer) ra khỏi tầng nghiệp vụ tính toán định giá và lưu trữ:

```
scripts/
├── fetchers/                         # ⭐ TẦNG THU THẬP DỮ LIỆU ĐỘC LẬP
│   ├── __init__.py                   # Export BaseFetcher, MarketFetcher, FinancialFetcher, MacroFetcher, TradingEconomicsFetcher, VietstockValuationFetcher
│   ├── base.py                       # BaseFetcher: HTTP session, Rate Limiting, SSL bypass, Auto-retry
│   ├── market_fetcher.py             # MarketFetcher: TradingView Scanner API, Realtime Quotes
│   ├── financial_fetcher.py          # FinancialFetcher: vnstock Finance/Company (KQKD, CĐKT, LCTT, Ratios, Events)
│   ├── macro_fetcher.py              # MacroFetcher: HNX Yield Curve (BeautifulSoup + Pandas pd.read_html + 5D Fallback), SBV Rates, Yahoo Finance, PNJ Edge API (SJC & PNJ Gold)
│   ├── vietstock_valuation_fetcher.py # VietstockValuationFetcher: Lịch sử định giá P/E, P/B VN-Index 25 năm từ Vietstock (BeautifulSoup Token Extraction)
│   ├── market_valuation_history_fetcher.py # MarketValuationHistoryFetcher: Lịch sử định giá P/E, P/S, Vốn hóa Google Sheets (Pandas pd.read_csv & Vectorized Statistics)
│   ├── sector_valuation_fetcher.py   # SectorValuationFetcher: Định giá 10 ngành GICS chuẩn hóa bằng BeautifulSoup + Pandas (Error Logging)
│   └── tradingeconomics_fetcher.py   # TradingEconomicsFetcher: 95 chỉ số vĩ mô 10 danh mục (BeautifulSoup + Pandas pd.read_html & Error Logging)
├── lib/                              # 🧮 TẦNG NGHIỆP VỤ & CHUẨN HÓA TOÁN HỌC
│   ├── financial_taxonomy.py         # Từ điển chuẩn hóa chỉ tiêu kế toán VN
│   ├── valuation_models.py           # Graham, DDM, EV/EBITDA, DuPont, CAGR
│   ├── valuation_engine.py           # Enterprise Stock Valuation Engine (Single Source of Truth)
│   ├── market_valuation_analyzer.py  # Động cơ thống kê 4 cửa sổ (5Y, 10Y, 2007, All), Composite Signal, Cảnh báo Z > 2
│   ├── macro_regime.py               # 5-Pha Regime, Risk Score 4 tầng, Luân chuyển 11 ngành, Arbitrage Vàng
│   ├── macro_advisor.py              # Z-Score, P/E Bands, Khuyến nghị phân bổ tài sản
│   └── rate_limiter.py               # Quản lý giới hạn tần suất gọi API
├── sync_fundamentals.py              # 🎮 CONTROLLER 1: Điều phối định giá & kỹ thuật (dùng MarketFetcher)
├── fetch_financial_reports.py        # 🎮 CONTROLLER 2: Điều phối BCTC 8Q/5Y & Ratios (dùng FinancialFetcher)
├── fetch_macro_valuation.py          # 🎮 CONTROLLER 3: Điều phối Vĩ mô, Regime, Định giá VN-Index Vietstock & 95 chỉ số
└── run_full_pipeline.py              # 🚀 ORCHESTRATOR: Chạy tuần tự toàn bộ luồng tự động
```

### Bảng Ánh Xạ Phân Trách Nhiệm Chi Tiết:

| Nhóm Dữ Liệu | Module Fetcher Độc Lập | Controller Điều Phối | Tệp Dữ Liệu Đích |
| :--- | :--- | :--- | :--- |
| **Thị Giá Realtime & 52 Chỉ Báo Kỹ Thuật** | `scripts/fetchers/market_fetcher.py` (`MarketFetcher`) | `scripts/sync_fundamentals.py` | `data/fundamentals_cache.json` |
| **BCTC 122+ Chỉ Tiêu, 54 Ratios, Cổ Tức & Cổ Đông** | `scripts/fetchers/financial_fetcher.py` (`FinancialFetcher`) | `scripts/fetch_financial_reports.py` | `data/financials/<MÃ>.json` |
| **Định Giá VN-Index Đa Chu Kỳ 25 Năm (Vietstock)** | `scripts/fetchers/vietstock_valuation_fetcher.py` & `market_valuation_analyzer.py` | `scripts/fetch_macro_valuation.py` | `data/macro_valuation.json` |
| **Vĩ Mô Tổng Quan, TPCP 10Y HNX, SBV & Vàng SJC/PNJ** | `scripts/fetchers/macro_fetcher.py` (`MacroFetcher`) | `scripts/fetch_macro_valuation.py` | `data/macro_valuation.json` |
| **Kho 95 Chỉ Số Kinh Tế Vĩ Mô 10 Nhóm** | `scripts/fetchers/tradingeconomics_fetcher.py` (`TradingEconomicsFetcher`) | `scripts/fetch_macro_valuation.py` | `data/macro_indicators.json` |
| **Lịch Sử Định Giá 10 Năm (P/E, P/S, Vốn Hóa Google Sheets)** | `scripts/fetchers/market_valuation_history_fetcher.py` | `scripts/fetch_macro_valuation.py` | `data/market_valuation_history.json` |
| **Nến Intraday 1 Phút & Nến Ngày Đa Chỉ Số (DNSE Live API: VNINDEX, VN30, VNDIAMOND, VNMIDCAP...)** | `DNSE Chart API` (`services.entrade.com.vn/chart-api/v2/ohlcs`) | Express Proxy (`/api/valuation/dnse-ohlc`) | In-memory Cache & Live React Chart |
| **Định Giá Phân Khúc (VN30, Diamond, Midcap) & 4x3 Ma Trận** | `scripts/lib/macro_regime.py` & Vietstock (`VN30`) | `scripts/fetch_macro_valuation.py` | `data/macro_valuation.json` |
| **Định Giá 10 Ngành Thực Tế & Ma Trận Thiên Thời (GICS)** | `scripts/fetchers/sector_valuation_fetcher.py` (`SectorValuationFetcher`) | `scripts/fetch_macro_valuation.py` | `data/macro_valuation.json` & `data/sector_valuation_cache.json` |
| **Báo Cáo Điều Hành Trọng Yếu (Executive Summary)** | `scripts/lib/macro_regime.py` | `scripts/fetch_macro_valuation.py` | `data/macro_valuation.json` |
| **Mô Hình 5 Pha Chu Kỳ, 10 Nhóm Ngành GICS & Vàng Arbitrage** | `scripts/lib/macro_regime.py` | `scripts/fetch_macro_valuation.py` | `data/macro_valuation.json` |
| **Điều Phối Toàn Bộ Pipeline Tự Động** | Toàn bộ các Fetchers trên | `scripts/run_full_pipeline.py` | Toàn bộ thư mục `data/` |
| **Sổ Lệnh Giao Dịch & Quản Trị Danh Mục** | Người dùng & Khớp lệnh FIFO | Server routes (`server/routes/`) | `data/stock.db` / Turso Cloud |

---

## 4. Ma Trận Single Source of Truth (SSOT) & Kiến Trúc Multi-Tier Fallback

Để triệt tiêu hoàn toàn sự mâu thuẫn số liệu và xung đột ghi đè giữa các module, hệ thống áp dụng nguyên tắc **Single Source of Truth (Mỗi trường dữ liệu chỉ có 1 nguồn thẩm quyền duy nhất)** kết hợp cùng **Kiến Trúc Fallback 3 Tầng**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   MÔ HÌNH MULTI-TIER FALLBACK 3 TẦNG                   │
├────────────────────────────────────────────────────────────────────────┤
│ TẦNG 1: NGUỒN CHÍNH THỨC THỜI GIAN THỰC (Primary Official Live Source) │
│ • Luôn ưu tiên gọi API trực tiếp khi chạy pipeline.                    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (Nếu API lỗi mạng / Timeout / Chặn IP)
┌───────────────────────────────────▼────────────────────────────────────┐
│ TẦNG 2: LOCAL CACHE GẦN NHẤT (Persistent Local Snapshot Cache)         │
│ • BẢO TOÀN NGUYÊN VẸN file cache hợp lệ đã có trong data/             │
│ • TUYỆT ĐỐI KHÔNG ghi đè dữ liệu rác, không tạo file rỗng.             │
│ • Ghi log cảnh báo và tiếp tục vận hành bình thường.                   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (CHỈ KHI file cache chưa từng tồn tại)
┌───────────────────────────────────▼────────────────────────────────────┐
│ TẦNG 3: ESTIMATION BASELINE (Structured Synthetic Bootstrap)           │
│ • CHỈ kích hoạt cho mã cổ phiếu HOÀN TOÀN MỚI chưa từng có trong data/ │
│ • Đánh dấu minh bạch: _meta.status = "ESTIMATED_BASELINE"              │
└────────────────────────────────────────────────────────────────────────┘
```

### Bảng Phân Định Single Source of Truth (SSOT):

| Nhóm Trường Thông Tin | Single Source of Truth (SSOT) | Phân Hệ Tiêu Thụ | Fallback Khi Gián Đoạn |
| :--- | :--- | :--- | :--- |
| **Thị Giá Khớp Lệnh Realtime** (`price`, `change`, `changePct`) | **VPS Market Datafeed API** (`server/services/priceService.js`) | Dashboard Hero Card, Sổ Cái FIFO, Header Mã | DNSE Entrade 1m $\rightarrow$ TradingView Close $\rightarrow$ `prices_cache.json` |
| **Thị Giá Chỉ Số VN-Index / VN30 & Scenario Matrix** | **DNSE Live Chart API** (`scripts/fetchers/macro_fetcher.py` & `priceService.js`) | Tab Vĩ Mô: Biểu đồ Intraday, Thước đo VN-Index, 3 Kịch Bản Scenario Matrix | VPS $\rightarrow$ DNSE $\rightarrow$ `data/macro_valuation.json` (`marketIndex.currentPoint`) |
| **Thị Giá Đóng Cửa & 52 Chỉ Báo Kỹ Thuật TTM** | **TradingView Scanner API** (`scripts/fetchers/market_fetcher.py`) | Screener, Xung lực kỹ thuật, Lưới định giá nhanh | Snapshot hợp lệ trong `data/fundamentals_cache.json` |
| **BCTC 122+ Chỉ Tiêu, 54 Ratios, Cổ Tức & Cổ Đông** | **`fetch_financial_reports.py`** (`vnstock/VCI`, `TCBS`) | Deep Dive BCTC 8Q/5Y, Phân rã DuPont, Lịch sử cổ tức | **Bảo toàn 100%** file `data/financials/<MÃ>.json` đã có. Chỉ dựng Baseline cho mã mới. |
| **Giá Vàng SJC & Nhẫn PNJ 999.9** | **PNJ Official Edge API** (`scripts/fetchers/macro_fetcher.py`) | Tab Vĩ Mô: Tư vấn chênh lệch vàng (Gold Arbitrage) | Snapshot gần nhất trong `data/macro_valuation.json` (Sanity bounds: 50-300 Tr) |
| **Lợi Suất TPCP 10Y (Lãi suất phi rủi ro $R_f$)** | **HNX Yield Curve Portal** (`scripts/fetchers/macro_fetcher.py`) | Mô hình Graham ($Y$), Gordon DDM ($r$), WACC | Cột 10Y TradingEconomics $\rightarrow$ Mặc định $3.45\%$ |
| **Tỷ Giá USD/VND Liên Ngân Hàng** | **Yahoo Finance `USDVND=X`** (`scripts/fetchers/macro_fetcher.py`) | Quy đổi giá vàng thế giới, Phân rã rủi ro tỷ giá | Cột Currency TradingEconomics $\rightarrow$ Mặc định $25.879$ |
| **Hàng Hóa Quốc Tế (Dầu Brent, Vàng TG)** | **Yahoo Finance `BZ=F`, `GC=F`** (`scripts/fetchers/macro_fetcher.py`) | Radar dẫn dắt vĩ mô, Arbitrage Vàng | Snapshot gần nhất trong `data/macro_valuation.json` |
| **95 Chỉ Số Thống Kê Vĩ Mô Quốc Gia** | **TradingEconomics Vietnam** (`scripts/fetchers/tradingeconomics_fetcher.py`) | Thư viện 95 chỉ số 10 phân nhóm, Động cơ 5 Pha Regime | Snapshot `data/macro_indicators.json` (hoặc Local Raw HTML Cache) |
| **Chuỗi Định Giá Lịch Sử 10 Năm (P/E, P/S, Cap)** | **Google Sheets (Simply Wall St)** (`scripts/fetchers/market_valuation_history_fetcher.py`) | Biểu đồ chu kỳ lịch sử VN-Index $\pm 1, 2$ SD (`MarketValuationHistoryChart.jsx`) | **Tầng 1**: `data/market_valuation_history.json`<br>**Tầng 2 (Zero-downtime Fallback)**: Bản nhúng trong `data/macro_valuation.json` |

### Quy Chuẩn Phòng Tránh Trùng Lặp Dữ Liệu & Bảo Toàn Fallback:
1. **Kiến trúc dữ liệu phân tầng & Fallback an toàn**:
   - `data/market_valuation_history.json` là file chuyên trách độc lập cung cấp chuỗi dữ liệu 4 chu kỳ và 6 chỉ số qua endpoint `/api/valuation/market-history`.
   - `data/macro_valuation.json` đồng thời duy trì một bản snapshot `marketValuationHistory` đóng vai trò là tầng fallback an toàn giúp giao diện UI luôn nạp được dữ liệu kể cả khi máy chủ backend chưa kịp khởi động lại hoặc khi mạng gián đoạn.
2. **Một file - Một script sở hữu**:
   - `data/fundamentals_cache.json` do `scripts/sync_fundamentals.py` sở hữu độc quyền.
   - `data/financials/<MÃ>.json` do `scripts/fetch_financial_reports.py` sở hữu độc quyền. `sync_fundamentals.py` tuyệt đối không được ghi vào thư mục này.
   - `data/macro_valuation.json` do `scripts/fetch_macro_valuation.py` sở hữu độc quyền.
   - `data/market_valuation_history.json` do `MarketValuationHistoryFetcher` sở hữu độc quyền.
3. **Phân biệt rõ mục đích sử dụng các chỉ số P/E**:
   - **Trailing P/E (TTM Multiple)** từ `fundamentals_cache.json`: Dùng cho so sánh nhanh đa mã.
   - **P/E BCTC từng kỳ** từ `financials/<MÃ>.json`: Dùng cho báo cáo lịch sử và DuPont.
   - **Target P/E (Định giá nội tại)** từ `valuationMatrix`: Dùng làm mốc giá trị hợp lý trong mô hình định giá.

---

## 5. Hệ Thống Động Cơ Định Giá Doanh Nghiệp (Enterprise Valuation Engine — `scripts/lib/valuation_engine.py`)

Hệ thống định giá doanh nghiệp được thiết kế dưới dạng **Mô-đun Độc Lập Chuyên Biệt (Single Source of Truth thuần Python 3.11)**, loại bỏ hoàn toàn việc tính toán rải rác hoặc trùng lặp giữa các tầng hệ thống.

### A. Kiến Trúc & Phân Định Trách Nhiệm:
```
┌────────────────────────────────────────────────────────────────────────┐
│             ENTERPRISE STOCK VALUATION ENGINE (PYTHON 3.11)            │
│                    scripts/lib/valuation_engine.py                     │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Pure Mathematical Models:                                           │
│    • calc_graham(eps, bvps, multiplier=22.5)                           │
│    • calc_ddm(dps, r=0.115, g=0.035)                                   │
│    • calc_pe_target(eps, multiple=11.5)                                │
│    • calc_pb_target(bvps, multiple=1.35)                               │
│    • calc_ev_ebitda(ebitda, net_debt, shares, multiple=7.5)             │
│    • calc_pcf(cfo, shares, multiple=8.0)                               │
│    • calc_ps_target(revenue, shares, multiple=1.1)                      │
│                                                                        │
│ 2. Consensus & Margin of Safety:                                       │
│    • calc_consensus_fair_value(candidates, close)                      │
│      -> fairValue, marginOfSafety (MoS %), upside / diffPercent (%),    │
│         valuationRating, ratingBadge                                   │
│    • Individual Model Diff Percentages (So với thị giá close):          │
│      -> grahamDiffPercent, ddmDiffPercent, peDiffPercent, pbDiffPercent,│
│         evEbitdaDiffPercent, pcfDiffPercent, psDiffPercent              │
│                                                                        │
│ 3. Quality & Momentum Synthesis:                                       │
│    • calc_dupont(net_income, revenue, total_assets, equity, roe)       │
│    • calc_tech_score(close, high_52, low_52, rec_score, beta)           │
│    • calc_fcf(cfo, capex) & calc_cagr(start_val, end_val, periods)     │
│                                                                        │
│ 4. Unified Engine Class:                                               │
│    • StockValuationEngine.evaluate(stock_dict) -> Full Valuation Matrix│
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
        ┌──────────────────────────┴──────────────────────────┐
        ▼                                                     ▼
┌──────────────────────────────────────┐     ┌───────────────────────────────────┐
│     scripts/sync_fundamentals.py     │     │  scripts/fetch_financial_reports  │
│  (Đồng bộ TradingView + Valuation)   │     │   (Đồng bộ BCTC chi tiết 8Q & 5Y) │
└──────────────────┬───────────────────┘     └─────────────────┬─────────────────┘
                   │                                           │
                   └─────────────────────┬─────────────────────┘
                                         ▼
                     ┌───────────────────────────────────────┐
                     │  data/fundamentals_cache.json         │
                     │  data/financials/<MÃ>.json            │
                     └───────────────────┬───────────────────┘
                                         ▼
                     ┌───────────────────────────────────────┐
                     │       Node.js Express REST API        │
                     │  (Chỉ đọc JSON Cache, KHÔNG tự tính)  │
                     └───────────────────────────────────────┘
```

### B. Bảng Đặc Tả 7 Mô Hình Định Giá Nội Tại:

| Mô Hình Định Giá | Công Thức Toán Học | Tham Số Mặc Định VN | Điều Kiện Áp Dụng |
| **1. Benjamin Graham Dynamic** | $V = EPS \times (PE_{\text{base}} + hs \times g) \times \frac{\text{Hằng số}_{\text{vn}}}{y}$ | $PE_{\text{base}} = \min(7.0, \max(3.0, PE_{\text{avg}}))$, $hs \in [0.8, 1.0]$, $g = 5.0\%$ cho ngành chu kỳ hoặc $\min(12\%, \text{CAGR})$ cho ngành tăng trưởng, $\text{Hằng số} = \max(4.4, VN10Y)$, $y = \max(5.0, VN10Y)$ | $EPS > 0$ |
| **2. Gordon DDM** | $V = \frac{DPS \times (1 + g)}{r - g}$ | $r = 11.5\%$ (WACC), $g = 3.5\%$ (GDP thận trọng) | $DPS > 0$ và $r > g$ |
| **3. P/E Mục Tiêu Ngành** | $V = EPS \times TargetPE$ | $TargetPE = 11.5x$ | $EPS > 0$ |
| **4. P/B Mục Tiêu Ngành** | $V = BVPS \times TargetPB$ | $TargetPB = 1.35x$ | $BVPS > 0$ |
| **5. EV / EBITDA Multiple** | $V = \frac{EBITDA \times Multiple - NetDebt}{Shares}$ | $Multiple = 7.5x$ | $EBITDA > 0$, $Shares > 0$ |
| **6. Price / Cash Flow (P/CF)** | $V = \frac{CFO \times Multiple}{Shares}$ | $Multiple = 8.0x$ | $CFO > 0$, $Shares > 0$ |
| **7. Price / Sales (P/S)** | $V = \frac{Revenue \times Multiple}{Shares}$ | $Multiple = 1.1x$ | $Revenue > 0$, $Shares > 0$ |

### C. Thang Đánh Giá Khuyến Nghị Biên An Toàn (Margin of Safety - MoS %):
* Công thức: $MoS = \frac{FairValue - Close}{FairValue} \times 100\%$
* **Thang phân loại**:
  * $MoS \ge 20\%$: `DEEP_VALUE` — **Rất Rẻ** (Biên an toàn $> 20\%$, màu xanh ngọc lục bảo `emerald`).
  * $5\% \le MoS < 20\%$: `ATTRACTIVE` — **Hấp Dẫn** (Vùng Mua gom $5 - 20\%$, màu xanh lá `green`).
  * $-5\% \le MoS < 5\%$: `FAIR` — **Hợp Lý** (Định giá cân bằng, màu xanh dương `blue`).
  * $-20\% \le MoS < -5\%$: `EXPENSIVE` — **Định Giá Cao** (Biên an toàn âm nhẹ, màu hổ phách `amber`).
  * $MoS < -20\%$: `RISKY` — **Rất Đắt / Rủi Ro** (Thị giá cao hơn giá trị nội tại $> 20\%$, màu đỏ hồng `rose`).

### D. Kiểm Thử Đơn Vị Tự Động (Unit Testing):
* Script thực thi: `scripts/test_valuation_engine.py` (bao phủ 24 test cases toàn diện cho: 7 mô hình toán học cơ bản, DuPont 3 nhân tố, DuPont 5 nhân tố mở rộng, Điểm Sức khỏe Tài chính 4 trụ cột, Cảnh báo sớm Red Flags, Phân tích đặc thù ngành, Mô hình DCF FCFF 3 kịch bản, Reverse DCF Implied Growth, Ma trận độ nhạy cảm WACC/g, Hồ sơ thị trường định lượng VAP/Wyckoff, Bản tin thời sự & Sentiment 30 ngày, Tech Score, **Bảng Giám Sát Cấu Trúc Lợi Suất 17 Dòng (Nelson-Siegel)**, **Mô Hình Kiểm Toán Gian Lận Beneish M-Score**, **Joel Greenblatt Magic Formula (EY% & ROIC%)**, **Điểm Uốn Dòng Tiền FCF Inflection & Accruals Ratio**).
* Lệnh chạy: `.venv/bin/python scripts/test_valuation_engine.py`.

---

### E. Đặc Tả Bộ Ba Phân Hệ Nâng Cấp Nâng Cao (Institutional Dossier & Yield Curve Monitor):

#### 1. Bảng Giám Sát Cấu Trúc Lợi Suất & Lãi Suất 17 Dòng (`data/macro_valuation.json` -> `yieldCurveMonitor`):
* **Cơ sở lý thuyết**: Kế thừa chuẩn lượng hóa VnBondLab & VN_MACRO_v4:
  * **17 Dòng đối chiếu song song VN vs US**: 8 Kỳ hạn TPCP Việt Nam (1Y-20Y), 3 Kỳ hạn Mỹ (2Y, 5Y, 10Y), Lãi suất điều hành SBV (4.5%), Lãi suất qua đêm liên ngân hàng ON, Tỷ giá USD/VND, Lạm phát CPI YoY, và P/E VN-Index.
  * **Độ cong Nelson-Siegel Curvature**: $2 \times Y_{5Y} - (Y_{2Y} + Y_{10Y})$. Đo lường mức độ lồi/lõm của đường cong tại kỳ hạn trung bình 5 năm.
  * **5 Hình thái đường cong chu kỳ (YC0 - YC4)**:
    * `YC0`: Bình thường / Cân bằng chu kỳ.
    * `YC1`: Dốc đứng mở rộng (Steepening) — Hỗ trợ mạnh nhóm cổ phiếu tài chính, ngân hàng, công nghiệp.
    * `YC2`: Phẳng dần (Flattening) — Cảnh báo chu kỳ tăng trưởng chậm lại.
    * `YC3`: Đảo ngược (Inversion) — Tín hiệu suy thoái / phòng thủ tiền mặt.
    * `YC4`: Dốc ngược đuôi ngắn (Humped) — Căng thẳng thanh khoản ngắn hạn.
  * **Chuỗi truyền dẫn 3 mắt xích (Transmission Links)**:
    * `Link A`: Tỷ giá USD/VND & Fed Funds rate tác động lên biên độ chính sách SBV.
    * `Link B`: Thanh khoản liên ngân hàng qua đêm (ON Rate) tác động mặt bằng huy động.
    * `Link C`: Lợi suất TPCP 10Y tác động lên chi phí vốn thị trường chứng khoán.
  * **Quyết định phân bổ tài sản (Asset Decision)**: So sánh Earnings Yield của VN-Index ($1 / PE$) với Lợi suất TPCP 10Y ($VN10Y$) để ra quyết định ưu tiên tài sản: `EQUITY_FAVORED` (ERP $> +2.5\%$), `BALANCED`, hoặc `BONDS_FAVORED`.

#### 2. Bộ Kiểm Toán Gian Lận Beneish M-Score (`data/financials/<MÃ>.json` -> `beneishMScore`):
* **Mô hình 8 biến số học thuật (Messod Beneish, 1999)**:
  $$M = -4.84 + 0.920 \times DSRI + 0.528 \times GMI + 0.404 \times AQI + 0.892 \times SGI + 0.115 \times DEPI - 0.172 \times SGAI + 4.037 \times TATA + 0.0327 \times LVGI$$
* **8 Chỉ số con**:
  1. $DSRI$: Tỷ lệ Khoản phải thu / Doanh thu. $DSRI > 1$ cảnh báo nới lỏng tín dụng hoặc doanh thu ảo.
  2. $GMI$: Biên gộp kỳ trước / Biên gộp kỳ này. $GMI > 1$ cho thấy biên gộp đang xói mòn.
  3. $AQI$: Chất lượng tài sản (Non-current assets ngoài TSCĐ). $AQI > 1$ nghi vấn vốn hóa chi phí vào tài sản.
  4. $SGI$: Tốc độ tăng trưởng doanh thu.
  5. $DEPI$: Tỷ lệ khấu hao kỳ trước / kỳ này. $DEPI > 1$ nghi vấn làm chậm khấu hao để tăng lãi.
  6. $SGAI$: Tỷ lệ chi phí SG&A / Doanh thu.
  7. $LVGI$: Đòn bẩy nợ kỳ này / kỳ trước.
  8. $TATA$: Tỷ lệ dồn tích trên tổng tài sản $(LNST - CFO) / TotalAssets$. $TATA$ âm sâu chứng minh tiền mặt thực tế dồi dào.
* **Ngưỡng phân loại**:
  * $M < -2.22$: **An toàn (Improbable Manipulator)** — Rủi ro gian lận BCTC rất thấp.
  * $-2.22 \le M \le -1.78$: **Vùng Xám (Grey Zone)** — Cần rà soát các khoản phải thu và chi phí dở dang.
  * $M > -1.78$: **Nguy cơ cao (Possible Manipulator)** — Cảnh báo dấu hiệu làm đẹp báo cáo.

#### 3. Joel Greenblatt Magic Formula (`data/financials/<MÃ>.json` -> `magicFormula`):
* **Earnings Yield (EY %)**:
  $$EY = \frac{EBIT}{EV} \times 100\% \quad (EV = MarketCap + TotalDebt - Cash)$$
* **Return on Capital (ROIC %)**:
  $$ROIC = \frac{EBIT}{NetWorkingCapital + NetFixedAssets} \times 100\%$$
* **Phân hạng 4 cấp độ (Tiers)**:
  * `TOP_TIER`: Hạng 1: Siêu Phẩm ($EY \ge 8.5\%$ & $ROIC \ge 15.0\%$) — Doanh nghiệp xuất sắc ở mức giá hời.
  * `QUALITY_GROWTH`: Hạng 2: Cổ phiếu tăng trưởng chất lượng (ROIC cao nhưng định giá đắt).
  * `VALUE_PLAY`: Hạng 3: Định giá rẻ nhưng hiệu quả sử dụng vốn trung bình.
  * `UNDERPERFORM`: Hạng 4: Kém hấp dẫn (Định giá đắt và hiệu quả vốn yếu).

#### 4. Giải Mã Điểm Uốn Dòng Tiền & Dồn Tích (`data/financials/<MÃ>.json` -> `fcfInflection`):
* **Nguyên lý Điểm Uốn Chu Kỳ Vốn (CapEx Peak Inflection)**:
  * Tỷ lệ tiền mặt kinh doanh $CFO / LNST \ge 1.0x$: Tiền mặt thật về công ty dồi dào, lợi nhuận thực chất.
  * $FCF \le 0$ tạm thời do $CapEx$ đạt đỉnh chu kỳ mở rộng đại công trình hoặc XDCB dở dang $> 15\%$ tổng tài sản.
  * Khi dự án hoàn thành đưa vào vận hành thương mại, CapEx sụt giảm mạnh và doanh thu bùng nổ $\rightarrow FCF$ đảo chiều dương kích hoạt sóng tái định giá (Multiple Expansion).
* **Thước đo Dồn tích (Accruals Ratio)**: $(LNST - CFO) / TotalAssets \le -0.03$ xếp hạng **Thượng Hạng (Top-Tier)**.

---

### PHÂN HỆ 7: HỆ THỐNG ĐỊNH GIÁ ĐỊNH LƯỢNG NÂNG CAO (ADVANCED VALUATION ENGINE — FAM v11.4P & QUANTITATIVE FRAMEWORK)
* **Tệp tin lưu trữ**: `data/fundamentals_cache.json` (`valuation`) và `data/financials/<MÃ>.json` (`valuationMultiples`).
* **Động cơ thực thi**: `scripts/lib/valuation_engine.py` (Enterprise Stock Valuation Engine - Single Source of Truth).
* **Đặc tả các khối dữ liệu mới**:

#### 1. Lưới 10 Mô Hình Định Lượng Độc Lập (`models10`):
* **Mô hình 1: Graham Dynamic Real-Data**: $V = EPS \times (PE_{\text{base}} + hs \times g) \times \frac{\text{Hằng số}_{\text{vn}}}{y}$ với $PE_{\text{base}} = \min(12.0, \max(4.0, PE_{\text{p50}}))$ (P/E trung vị chu kỳ 5 năm), $hs \in [0.8, 1.0]$ (hệ số nhạy cảm chất lượng doanh nghiệp theo ROE & cổ tức), $g = \min(20.0, \max(3.0, CAGR_{\text{5Y}}))$ (tốc độ tăng trưởng kép lợi nhuận thực tế), $\text{Hằng số}_{\text{vn}} = \max(4.4, VN10Y)$ và $y = \max(5.0, VN10Y)$ từ lợi suất TPCP 10Y HNX Portal thực tế.
* **Mô hình 2: P/E Median Chu Kỳ**: $V = EPS_{norm} \times PE_{med5Y}$.
* **Mô hình 3: Gordon P/B**: $V = BVPS \times \frac{ROE - g}{r - g}$ (Đặc biệt phù hợp cho Ngân hàng, Chứng khoán, Bảo hiểm).
* **Mô hình 4: Multi-Stage DCF**: Chiết khấu dòng tiền 3 pha (Tăng trưởng cao $\rightarrow$ Chuyển tiếp Fade $\rightarrow$ Vĩnh viễn).
* **Mô hình 5: DDM Consistency Fade**: Chiết khấu cổ tức kết hợp tỷ lệ suy giảm fade và bảo chứng dòng tiền FCF.
* **Mô hình 6: DCF FCFF (Free Cash Flow to Firm)**: Dòng tiền tự do doanh nghiệp chiết khấu theo WACC ngành.
* **Mô hình 7: FCFE (Free Cash Flow to Equity)**: Dòng tiền tự do vốn chủ $FCFE = CFO - CapEx + \text{Vay nợ ròng}$ chiết khấu theo Cost of Equity.
* **Mô hình 8: RIM / EVA (Residual Income Model)**: $V = BVPS + \sum \frac{RI_t}{(1+r)^t} + TV$ với $RI = BVPS \times (ROE - r)$.
* **Mô hình 9: Book NAV / P/B Chuẩn Hóa**: Định giá tài sản ròng kết hợp P/B mục tiêu chu kỳ ($V = BVPS \times PB_{\text{norm}}$) dựa trên 100% số liệu kế toán thực tế từ BCTC (với $PB_{\text{norm}}$ là median P/B chu kỳ 5 năm hoặc 1.0x cho Book NAV thuần túy).
* **Mô hình 10: Advanced Multiples**: EV/EBITDA ngành ($7.5x$) và EV/Sales ($1.5x$).
* **Ma trận 23 Phân Ngành GICS (`SECTOR_WEIGHTS_23`)**: Tự động gán trọng số $w_i$ phù hợp đặc thù ngành (Tài chính tắt hoàn toàn DCF/FCFF/FCFE/EV-EBITDA).
* **Thuật toán Lọc Ngoại Lai ±60% & Consensus (`consensusDetails`)**: Loại trừ các mô hình vượt quá $\pm 60\%$ so với median sơ bộ để bảo vệ giá trị hội tụ Consensus thận trọng.
* **Schema Chi Tiết Từng Phần Tử trong `models10`**:
  * `id` (string): Định danh mô hình (`graham`, `pe`, `pb`, `multi_stage_dcf`, `ddm`, `fcff`, `fcfe`, `rim`, `nav`, `evebitda`).
  * `name` (string): Tên mô hình ngắn gọn.
  * `fullName` (string): Tên đầy đủ kèm chỉ số thứ tự (ví dụ: `1. Benjamin Graham`).
  * `cleanName` (string): Tên hiển thị sạch đã loại bỏ số thứ tự thừa (ví dụ: `Benjamin Graham`).
  * `value` / `targetPrice` (number | null): Giá trị nội tại tính toán theo mô hình (VND).
  * `diffPercent` (number | null): % chênh lệch so với thị giá hiện tại ($P_0$).
  * `weight` (number): Trọng số hiệu dụng sau chuẩn hóa trong Consensus.
  * `baseWeight` (number): Trọng số cơ sở trước khi lọc ngoại lai theo phân ngành.
  * `suitability` (number): Hệ số phù hợp theo ngành (0.0 đến 1.0).
  * `suitabilityNote` (string): Ghi chú đặc thù phân ngành.
  * `isOutlier` (boolean): `true` nếu bị loại trừ do lệch quá $\pm 60\%$ so với median.
  * `outlierGapPct` (number): Độ lệch % so với median sơ bộ.
  * `formula` (string): Công thức toán học vắn tắt.
  * `formulaDetail` (string): Công thức toán học thế số chi tiết từ BCTC thực tế.
  * `parameters` (object): Bảng biến số đầu vào chi tiết dùng trong công thức thế số.
  * `statusNote` (string): Trạng thái áp dụng (`Phù hợp` hoặc lý do không áp dụng).

#### 2. Quy Chuẩn Xử Lý Dữ Liệu BVPS & Lưu Chuyển TTM 4 Quý (Accounting & Data Pipeline Standards):
* **Chuẩn hóa BVPS 3 Tầng Kế Toán & Thị Trường (3-Tier BVPS Hierarchy)**:
  * **Tầng 1 (Kế toán BCTC thực tế - Bắt buộc)**: $BVPS = \frac{\text{Vốn Chủ Sở Hữu (Equity)}}{\text{Số CP Lưu Hành (Shares)}}$. Nếu Equity tính bằng Tỷ đồng thì quy đổi chuẩn sang VNĐ ($Equity \times 10^9$).
  * **Tầng 2 (Thị trường tức thời TradingView/VPS)**: $BVPS = \text{round}\left(\frac{\text{Thị giá (Close)}}{P/B}\right)$ từ scanner real-time khi chưa có BCTC bóc tách.
  * **Tầng 3 (Fallback dự phòng)**: Lấy từ snapshot định giá lịch sử gần nhất.
  * *Loại bỏ vĩnh viễn*: Toàn bộ công thức fallback legacy rác không theo chuẩn kế toán (như phép chia qua tổng tài sản).
* **Khử Tính Mùa Vụ Dòng Tiền & Doanh Thu Bằng TTM Trượt 4 Quý Thực Tế**:
  * Các chỉ tiêu lưu chuyển thời kỳ (`revenue`, `netIncomeParent`, `cfo`, `capex`, `ebitda`) **bắt buộc** tính bằng tổng 4 quý trượt gần nhất ($\sum_{i=1}^{4} Q_i$) khi có đủ 4 quý.
  * Tuyệt đối tránh việc nhân 4 quý gần nhất ($Q_{latest} \times 4$) gây méo mó nghiêm trọng cho các nhóm ngành có tính chu kỳ/mùa vụ cao (như Bất động sản hạch toán bàn giao Q4, Bán lẻ tiêu dùng dịp Tết Q1).

#### 3. Bản Đồ 7 Vùng Giá Định Giá (`sevenPriceZones`):
* `Deep Value` ($< 0.75x$ Fair Value): Vùng giá trị sâu, biên an toàn vượt trội.
* `Safe Buy` ($0.75 - 0.85x$ Fair Value): Vùng mua an toàn (MoS 15-25%).
* `Accumulate` ($0.85 - 0.95x$ Fair Value): Vùng mua tích luỹ định kỳ DCA (MoS 5-15%).
* `Fair Range` ($0.95 - 1.10x$ Fair Value): Vùng thị giá hợp lý cân bằng.
* `Above Fair` ($1.10 - 1.20x$ Fair Value): Vùng chớm đắt.
* `Expensive` ($1.20 - 1.35x$ Fair Value): Vùng định giá cao.
* `Extreme Danger` ($> 1.35x$ Fair Value): Vùng bong bóng rủi ro.
* Kèm các ngưỡng quan trọng: `safeBuyPrice`, `acceptableBuyPrice`, `bearPrice` (-30% stress), `bullPrice` (+25% catalyst).

#### 3. Khung Ra Quyết Định Gated 3 Tầng (`threeLayerDecision`):
* **3 Tầng trọng số**:
  * Tầng 1: Định Giá $V_{40}$ (Trọng số 40%): Độ rẻ tương đối so với giá trị nội tại hội tụ và dải định giá lịch sử.
  * Tầng 2: Chất Lượng $Q_{35}$ (Trọng số 35%): Piotroski F-Score, Altman Z, M-Score, ROE, đòn bẩy.
  * Tầng 3: Thời Điểm $T_{25}$ (Trọng số 25%): RSI, Tech Score, Trend, Vị trí 52 tuần.
* **Điểm Composite /10**: Xếp hạng khuyến nghị 5 bậc (`STRONG BUY`, `ACCUMULATE`, `HOLD`, `REDUCE`, `AVOID`).
* **Cơ Chế Khóa Cổng (Gate Condition)**: Bắt buộc cả $V_{40} \ge 6.0$ VÀ $Q_{35} \ge 6.0$ mới mở cổng kích hoạt tín hiệu Mua.
* **Thặng Dư Giá Trị Kinh Tế ($ROE - CoE$ Spread)**: Đo lường phần bù tạo lập giá trị so với chi phí vốn chủ sở hữu.

#### 4. Bộ Quét 7 Bẫy Định Giá (`valuationTraps`):
* Nhận diện 7 bẫy định giá kinh điển: Value Trap, Book Trap, Cyclical Peak, Dividend Trap, Debt Stress, Share Dilution, Working Capital Stress.
* Điểm rủi ro bẫy `trapScore` (0-10) và nhãn `THẤP` / `TRUNG BÌNH` / `CAO`.
* **Cơ Chế Phạt Trần**: Khi rủi ro bẫy ở mức `CAO` ($\ge 4.0$), hệ thống tự động khóa trần khuyến nghị $\le 5.0/10$ (`HOLD`), ngăn ngừa mua vào các cổ phiếu rẻ giả tạo.

#### 5. Dải Băng Định Giá Lịch Sử 3 Tầng P25 - P50 - P75 (`historicalBands`):
* Thống kê phân vị chu kỳ định giá thực tế từ BCTC (P/E Band và P/B Band).
* **Cơ Chế Trung Vị $N$ Năm Động (Rolling $N$-Year Median)**: Nếu mã cổ phiếu không đủ 5 năm dữ liệu BCTC, hệ thống tự động tính trung vị của số năm hiện tại đang có ($N \ge 3$, $N=2$ lấy trung bình 2 năm, $N=1$ lấy đúng năm đó). Chỉ khi hoàn toàn không có năm nào ($N=0$), hệ thống mới dự phòng sang bội số ngành/mặc định.
* `peYearsUsed`: Số năm dữ liệu P/E thực tế được sử dụng để tính trung vị/phân vị.
* `pbYearsUsed`: Số năm dữ liệu P/B thực tế được sử dụng để tính trung vị/phân vị.
* `peMean`, `pbMean`: Giá trị Trung bình cộng số học (Arithmetic Mean) của $N$ năm lịch sử, phục vụ đối chiếu song song với Trung vị $P_{50}$.
* `peBand` (`p25`, `p50`, `p75`, `mean`, `current`, `yearsUsed`): Phân vị P/E, P/E trung bình và P/E hiện tại thực tế.
* `pbBand` (`p25`, `p50`, `p75`, `mean`, `current`, `yearsUsed`): Phân vị P/B, P/B trung bình và P/B hiện tại thực tế.
* `priceBands`: Mốc giá tương ứng: `peP25Price`, `peP50Price`, `peP75Price`, `pbP25Price`, `pbP50Price`, `pbP75Price`.
* `band25`, `band50`, `band75`, `bandPosition`, `bandWidthPct`: Mức giá tổng hợp các phân vị.
* **Chuẩn Hóa Công Thức Mô Hình**:
  - Mô hình 2 (P/E Chuẩn Hóa): `formula = "EPS × P/E Chuẩn Hóa (P50 Chu Kỳ)"`, tham số trả về `peMedian` ($P_{50}$), `peAvg` (Mean), `yearsUsed`, `isFallback`. Chuỗi thế số thực tế `formulaDetail` hiển thị cả Trung vị $N$ năm và P/E Trung bình.
  - Mô hình 3 (P/B Chuẩn Hóa): `formula = "BVPS × P/B Chuẩn Hóa (P50 Chu Kỳ)"` (hoặc Gordon Growth cho nhóm Tài chính), tham số trả về `pbMedian`, `pbAvg`, `yearsUsed`.
* Giao diện trực quan hoá bằng 2 Thang đo Gauge (P/E và P/B) định vị thị giá hiện tại so với các mốc phân vị kèm Lưới 6 mốc thị giá tương ứng, bảo đảm 100% dữ liệu tài chính thực tế và không sử dụng dữ liệu giả định/nội suy.
* `dcfScenarios`: Kết quả định giá Chiết khấu dòng tiền FCFF với 3 kịch bản `basePrice`, `bullPrice`, `bearPrice`, `fairPrice`, `wacc`, `terminalG`.

#### 6. Kiểm Toán Độ Bền Vững Cổ Tức (`dividendSustainability`):
* `fcfPayoutRatio`: Tỷ lệ chi trả cổ tức trên Dòng tiền tự do FCF ($< 60\%$ = rất an toàn; $> 100\%$ = cảnh báo bẫy cổ tức).
* `payoutRatio`: Tỷ lệ chi trả cổ tức trên LNST kế toán.
* `consistency`: Độ đều đặn lịch sử chi trả cổ tức 5 năm.
* `status`: Phân loại an toàn / rủi ro bẫy cổ tức.

#### 7. Phòng Thí Nghiệm FinVal Lab (`finvalLab`):
* Đối chiếu 16 chỉ tiêu tài chính cốt lõi giữa kỳ hiện tại (TTM) và Trung bình động 5 năm (5Y SMA):
  1. `eps`: Thu nhập trên mỗi cổ phiếu (đ/cp) — TTM 4 quý trượt vs SMA 5 năm.
  2. `bvps`: Giá trị sổ sách mỗi cổ phiếu (đ/cp) — Vốn chủ sở hữu / Số CP lưu hành.
  3. `pe`: Hệ số P/E (x) — Thị giá / EPS TTM vs Trung vị lịch sử P/E 5Y.
  4. `pb`: Hệ số P/B (x) — Thị giá / BVPS vs Trung vị lịch sử P/B 5Y.
  5. `roe`: Tỷ suất sinh lời trên vốn chủ sở hữu (%) — LNST / Vốn chủ sở hữu bình quân.
  6. `roa`: Tỷ suất sinh lời trên tổng tài sản (%) — LNST / Tổng tài sản bình quân.
  7. `roic`: Tỷ suất sinh lời trên vốn đầu tư (%) — $(LNST + Lãi\_vay \times 0.8) / (Vốn\_chủ + Nợ\_vay)$.
  8. `grossMargin`: Biên lợi nhuận gộp (%) — Lợi nhuận gộp / Doanh thu thuần.
  9. `netMargin`: Biên lợi nhuận ròng (%) — LNST Cổ đông công ty mẹ / Doanh thu thuần.
  10. `revenue`: Doanh thu thuần (Tỷ đồng).
  11. `netIncome`: Lợi nhuận sau thuế của Cổ đông Công ty mẹ (Tỷ đồng).
  12. `ebitda`: Lợi nhuận trước lãi vay, thuế và khấu hao (Tỷ đồng).
  13. `freeCashFlow`: Dòng tiền tự do FCF (Tỷ đồng) = $CFO - |CapEx|$.
  14. `debtToEquity`: Đòn bẩy tài chính Nợ vay / Vốn chủ (x).
  15. `currentRatio`: Hệ số thanh toán hiện hành (x) — Tài sản ngắn hạn / Nợ ngắn hạn.
  16. `cashRatio`: Hệ số tiền mặt (x) — Tiền & tương đương tiền / Nợ ngắn hạn.

---

### PHÂN HỆ 7: CẤU HÌNH THAM SỐ HỆ THỐNG (SYSTEM CONFIGURATION & CONSTANTS)
* **File lưu trữ**: `data/default-constant-value.json` (Tầng 1/3 - Commit Git để làm chuẩn mẫu, người dùng tùy biến cục bộ).
* **Mục đích**: Tập trung hóa toàn bộ các hằng số, tham số định giá, quy tắc vĩ mô, thuế phí giao dịch và rate limiting thành một tệp JSON duy nhất (Single Source of Truth), cho phép người dùng tùy biến mà không cần can thiệp mã nguồn.
* **Bộ điều phối**:
  - Python: `scripts/lib/config_loader.py` (Nạp cho `valuation_engine.py`, `macro_regime.py`, `rate_limiter.py`).
  - Node.js: `server/config/configLoader.js` (Nạp cho `server/config/constants.js`).
* **Cơ chế dự phòng**: Deep Merge Fallback tự động — nếu file bị xoá, sửa thiếu hoặc sai cú pháp, hệ thống tự động nạp bộ giá trị mặc định chuẩn để bảo đảm an toàn 100% không bị crash.

#### Ma Trận Nhóm Tham Số Cấu Hình:
1. **`valuation` (Định Giá Doanh Nghiệp)**:
   - `wacc`: 0.115 (11.5% Chi phí vốn bình quân thị trường chung).
   - `growthRate`: 0.035 (3.5% Tốc độ tăng trưởng dài hạn g).
   - `peMultiple`: 11.5 | `pbMultiple`: 1.35 | `evEbitdaMultiple`: 7.5 | `pcfMultiple`: 8.0 | `psMultiple`: 1.1 | `riskFreeRate`: 0.045.
   - `sectorWaccBenchmarks`: WACC cơ sở cho 11 nhóm ngành (BANKING: 10.0%, TECH: 9.0%, RETAIL: 9.0%, REAL_ESTATE: 11.5%, HEAVY_INDUSTRY: 10.5%, v.v.).
   - `waccAdjustment`: Điều chỉnh WACC theo Beta cổ phiếu (`betaSensitivity`: 0.015, `minWacc`: 7.5%, `maxWacc`: 16.0%).
   - `valuationTraps`: Trọng số và ngưỡng cảnh báo 7 bẫy định giá (`highRiskThreshold`: 4.0, `mediumRiskThreshold`: 2.0).
   - `sevenPriceZones`: Tỷ lệ phân định 7 vùng giá hành động (`deepValueRatio`: 0.75, `buyRatio`: 0.85, `fairLowRatio`: 0.95, `fairHighRatio`: 1.10, v.v.).
   - `methodSuitability`: Hệ số độ tin cậy mô hình cho từng nhóm ngành (`finGrahamSuitability`: 0.35, `nonFinRimSuitability`: 0.55, `nonFinNavSuitability`: 0.85).
   - `graham`: `maxMultiplier`: 22.5, `minMultiplier`: 4.0, `basePe`: 7.0, `growthFactor`: 1.0, `benchmarkYield`: 4.4.
   - `outlierFilter`: `outlierGapThreshold`: 0.60 (ngưỡng lọc ngoại lai ±60%), `minModels`: 2.
   - `marginOfSafety`: `strongBuyPct`: 15.0, `fairValuePct`: 0.0.
   - `sectorWeights`: Ma trận trọng số 10 mô hình định giá cho 23 nhóm ngành GICS/Vietstock.
2. **`financialAnalytics` (Phân Tích BCTC & Sức Khỏe Doanh Nghiệp)**:
   - `healthScore`: Trọng số 4 trụ cột cho doanh nghiệp phi tài chính vs ngân hàng (`pillarWeightsCorporate`, `pillarWeightsBanking`) và ngưỡng xếp hạng (`gradeThresholds`).
   - `beneishMScore`: Ngưỡng an toàn (`safeThreshold`: -2.22) và cảnh báo gian lận (`alertThreshold`: -1.78).
   - `magicFormula`: Ngưỡng phân loại Joel Greenblatt Magic Formula (`minEarningsYieldTopTier`: 9.0%, `minRoicTopTier`: 18.0%).
   - `dupontBenchmarks`: Ngưỡng quy chuẩn phân rã 5 nhân tố DuPont.
3. **`macro` (Kinh Tế Vĩ Mô & Chu Kỳ)**:
   - `phaseRules`: Ngưỡng quy tắc 6 động lực (sbv_refinancing_rate, interbank_rate, cpi_yoy, credit_growth_yoy, pmi, usdvnd) phân định 5 pha chu kỳ.
   - `riskScoreWeights`: Trọng số 4 tầng rủi ro vĩ mô (monetary: 0.35, growth: 0.25, price: 0.20, external: 0.20).
   - `vnindexPeBands`: Dải P/E định giá thị trường (deepValue: 11.5, cheap: 13.5, fair: 16.0, expensive: 18.0).
   - `goldArbitrage`: Thuế phí gia công vàng trong nước (1.5%) và ngưỡng chênh lệch giá vàng (high: 10%, low: 3%).
   - `marketValuationBands`: Cảnh báo z-score cực đoan (|z| > 2.0) và ngưỡng tích số Benjamin Graham (22.5).
   - `fallbackIndicators`: Giá trị dự phòng trung tâm cho 10 chỉ số vĩ mô khi thiếu dữ liệu nguồn sống (cpiYoY, interbankRate, sbvRefinancingRate, vn10yYield, us10yYield, usdvnd, oilBrent, pmi, creditGrowthYoY, gdpGrowthYoY).
4. **`tradingAndFees` (Giao Dịch, Thuế, Phí)**:
   - `personalIncomeTaxRate`: 0.001 (0.1% thuế TNCN khi bán CP).
   - `defaultBrokerFeeRate`: 0.0015 (0.15% phí môi giới mặc định).
   - `brokerFeePresets`: [0.0, 0.001, 0.0015].
   - `dividendCashTaxRate`: 0.05 (5.0% thuế TNCN cổ tức tiền mặt).
   - `riskFreeRateAnnual`: 0.045 (4.5% lãi suất tham chiếu Sharpe / Sortino).
   - `vnindexAnnualVolatility`: 18.0 (18% độ biến động chuẩn VN-Index).
   - `defaultBankInterestRate`: 5.0 (5.0%/năm lãi suất tiết kiệm tính chi phí cơ hội).
   - `tradingDaysPerYear`: 252.
   - `defaultTags`: Danh sách các thẻ gợi ý giao dịch.
5. **`systemAndNetwork` (Hệ Thống & Tần Suất Gọi API)**:
   - `serverPort`: 3001.
   - `inSessionTtlMs`: 3,600,000 (1 giờ).
   - `fundamentalsTtlMs`: 43,200,000 (12 giờ).
   - `httpTimeoutSeconds`: 30.
   - `httpMaxRetries`: 2.
   - `rateLimitsPerMinute`: VCI: 45, TCBS: 45, TRADINGVIEW: 60, DEFAULT: 45.
6. **`timeframeConfig` (Quản Trị Khung Thời Gian & Bộ Lọc Thống Nhất)**:
   - `defaultTimeframe`: `"ALL"`.
   - `definitions`: 13 mốc định nghĩa chuẩn (`1D`, `1W`, `1M`, `3M`, `6M`, `MTD`, `YTD`, `1Y`, `3Y`, `5Y`, `10Y`, `ALL`, `CUSTOM`) kèm số ngày, độ phân giải nến DNSE (`dnseResolution`: `'1'`, `'1D'`, `'1W'`, `'1M'`) và khóa hiệu suất TradingView (`perfKey`: `'w1'`, `'m1'`, `'m3'`, `'m6'`, `'ytd'`, `'y1'`, `'y5'`).
   - `presets`: Nhóm chu kỳ tùy biến cho từng phân hệ UI (`benchmark`, `portfolio`, `portfolioExtended`, `marketChart`, `valuationHistory`, `stockPerformance`).
   - Bộ điều phối: `src/utils/timeframe.js` & `src/utils/constants.js`.

---

### PHÂN HỆ 8: HÀNG ĐỢI YÊU CẦU MÃ CỔ PHIẾU & AUTO-BACKFILL ENGINE (`requested_stocks`)
* **Vị trí lưu trữ**:
  - Tầng 1 (ACID DB): Bảng `requested_stocks` trong SQLite (`data/stock.db`) và Turso Cloud.
  - Tầng 3 (Snapshot JSON): `data/requested_stocks.json`.
* **Mục đích**: Tự động ghi nhận các mã cổ phiếu mà người dùng tra cứu nhưng chưa có sẵn trong kho lưu trữ BCTC (`data/financials/<MÃ>.json`), đưa vào hàng đợi ưu tiên để chu kỳ quét Daily EOD (18:00) tự động tải dữ liệu sống và bổ sung vào `data/supported_stocks.json`.
* **Schema chuẩn 5 trường (Strict 5-Field Schema)**:
  1. `symbol` (TEXT PRIMARY KEY): Mã cổ phiếu được yêu cầu (ví dụ: `MWG`, `TCB`, `VNM`).
  2. `requested_at` (TEXT NOT NULL): Thời điểm người dùng gửi yêu cầu (ISO 8601 string, ví dụ: `2026-10-12T22:50:00Z`).
  3. `status` (TEXT DEFAULT 'PENDING'): Trạng thái xử lý (`PENDING`, `SYNCED`, `FAILED`).
  4. `synced_at` (TEXT): Thời điểm hoàn tất thu thập dữ liệu (hoặc `NULL` nếu chưa hoàn tất).
  5. `error_message` (TEXT): Thông báo lỗi nếu quá trình cào dữ liệu gặp sự cố (hoặc `NULL`).
* **Bộ điều phối & Chu kỳ vận hành**:
  - Python Engine: `scripts/lib/requested_stocks_manager.py` (API: `get_pending_requested_symbols`, `filter_missing_financials`, `mark_symbol_synced`, `mark_symbol_failed`, `add_to_supported_stocks`).
  - Daily EOD Sync: `scripts/run_pipeline.py --cadence daily` tự động rà soát hàng đợi lúc 18:00 T2-T6, kích hoạt cào TradingView + BCTC + DCF, tự động thêm vào `data/supported_stocks.json` và commit & push về Git.
  - Quarterly BCTC Sync: `.github/workflows/quarterly-bctc-sync.yml` kích hoạt `scripts/run_pipeline.py --cadence quarterly` định kỳ ngày 1 và ngày 15 các tháng 1, 4, 7, 10 lúc 09:00 sáng VN.

---

### PHÂN HỆ 9: TRUNG TÂM CẤU HÌNH VĨ MÔ & NỀN TẢNG AI STRATEGIC COPILOT (`macroConstants` & `aiMacroConfig`)
* **Vị trí lưu trữ**:
  - Gốc Single Source of Truth: `data/default-constant-value.json` (`macro.macroThresholds`, `macro.macroNarratives`, `macro.aiMacroConfig`).
  - Cổng nạp Node.js: `server/config/configLoader.js` & `server/config/constants.js` (`MACRO_THRESHOLDS`, `MACRO_NARRATIVES`, `AI_MACRO_CONFIG`).
  - Cổng nạp Python: `scripts/lib/config_loader.py` (`get_macro_thresholds()`, `get_macro_narratives()`, `get_ai_macro_config()`).
  - Snapshot Cache Runtime: `data/macro_valuation.json` -> trường `aiInsight`.

* **1. Bóc tách 100% Ngưỡng Số Liệu Đo Lường (`macroThresholds`)**:
  - `usdvnd`: `criticalHigh: 25900`, `high: 25600`, `bearishDriver: 26000`, `bullishDriver: 25000`, `externalShock: 25700`, `fallback: 25400`.
  - `interbankRate`: `criticalHigh: 6.5`, `high: 5.0`, `bearishDriver: 6.0`, `tightening: 5.5`, `bullishDriver: 3.0`, `liquidityCrisisSpread: 2.0`, `fallback: 4.5`.
  - `cpi`: `criticalHigh: 5.5`, `ceilingTarget: 4.5`, `bullish: 4.0`, `cool: 3.5`, `fallback: 3.63`.
  - `gdp`: `highGrowth: 6.5`, `moderateGrowth: 6.0`, `slowdown: 5.5`, `recessionAlert: 4.0`, `fallback: 6.5`.
  - `pmi`: `expansion: 51.0`, `neutral: 50.0`, `contraction: 49.0`, `fallback: 50.5`.
  - `credit`: `crunchThreshold: 10.0`, `optimalMin: 12.0`, `optimalMax: 16.5`, `fallback: 14.0`.
  - `oilBrent`: `criticalHigh: 95.0`, `extremeHigh: 105.0`, `low: 50.0`, `optimalMin: 65.0`, `optimalMax: 90.0`, `fallback: 75.0`.
  - `yieldCurve`: `vnFallback` (VN02Y, VN05Y, VN10Y, SBV rate, ON INBR, CPI, USD/VND, P/E), `usFallback` (US02Y, US05Y, US10Y, Fed Funds, US CPI), `slopeThresholds`, `levelThresholds`, `stressScores`, `transmissionLinks` (A, B, C), `assetDecisionErp`.
  - `marketValuation`: `meanPe: 14.2`, `stdPe: 2.1`, `grahamPePbThreshold: 22.5`, `zScoreExtreme: 2.0`.

* **2. Bóc tách Toàn Bộ Chuỗi Mô Tả & Luận Điểm Định Lượng (`macroNarratives`)**:
  - `phaseMeta`: Định danh, mô tả chi tiết, badge màu sắc của 5 pha kinh tế (Recovery, Expansion, Overheating, Slowdown, Recession).
  - `macroClock`: 4 góc phần tư chu kỳ kinh tế (Goldilocks/Expansion, Overheating, Stagflation, Reflation).
  - `scenarios`: 3 kịch bản dự phóng thị trường VN-Index (Cơ sở Base 55%, Tích cực Bull 25%, Thận trọng Bear 20%).
  - `tailRisks`: Danh mục các sự kiện rủi ro đuôi (Áp lực tỷ giá, Căng thẳng liên ngân hàng, Lạm phát đình trệ, Lợi suất TPCP bùng nổ).
  - `sectorQuadrants`: 4 vùng ma trận thiên thời & định giá GICS (Sweet Spot, Value Trap, Momentum, Defense).
  - `peBandsAdvice`: Khuyến nghị tỷ trọng Cổ phiếu vs Tiền mặt theo 5 dải P/E lịch sử VN-Index.
  - `compositeSignals`: 5 mức độ tín hiệu hội tụ định lượng (DEEP VALUE, VALUE BUY, HOLD, TRIM, DEFENSIVE).
  - `valuationWindows`: Định danh 4 cửa sổ thời gian (5 Năm, 10 Năm, Từ 2007, Toàn Bộ 25 Năm).
  - `yieldCurveRegimes`: 5 hình thái đường cong lợi suất TPCP (YC0 - YC4).
  - `transmissionStages`: 5 nấc chuỗi truyền dẫn rủi ro 3 mắt xích (FULL_TRANSMISSION, LIQUIDITY_SQUEEZE, EXTERNAL_TRAPPED, LOCAL_BOTTLENECK, BENIGN_MACRO).
  - `styleIndices`: 5 phân khúc phong cách đầu tư (VNINDEX, VN30, VNDIAMOND, VNMIDCAP, VN100).

* **3. Động Cơ AI Macro Strategist Copilot 2 Tầng (Two-Tier AI Engine)**:
  - **Tier 1: Cloud LLM (Gemini 1.5 Pro / OpenAI)**:
    - Kích hoạt khi có biến môi trường `GEMINI_API_KEY` hoặc `OPENAI_API_KEY`.
    - Truyền tải toàn bộ bối cảnh vĩ mô thời gian thực vào prompt điều hành, ràng buộc chặt chẽ theo JSON schema chuẩn hóa.
  - **Tier 2: Built-in Heuristic Quantitative CIO Engine (Offline 100%, 0ms, 0 chi phí)**:
    - Tự động kích hoạt làm fallback dự phòng khi không có API key hoặc kết nối mạng bị gián đoạn.
    - Tổng hợp tự động các mối tương quan liên thị trường giữa P/E, Z-Score, Lợi suất thực, Áp lực tỷ giá, Chuỗi truyền dẫn nợ và Nhóm ngành Sweet Spot, sinh bản tin CIO chuyên nghiệp.
  - **REST API Endpoints (Phục vụ dữ liệu 0ms từ Local JSON)**:
    - `GET /api/valuation/macro-summary`: Trả về toàn bộ dữ liệu vĩ mô kèm trường `aiInsight` đã tính toán sẵn.
    - `GET /api/valuation/macro/config`: Trả về toàn bộ thresholds, narratives và cấu hình vĩ mô.
  - **Cấu trúc trường `aiInsight` trong `macro_valuation.json`**:
    ```json
    {
      "status": "success",
      "provider": "gemini | openai | offline-heuristic-engine",
      "model": "Tên mô hình AI (vd: gemini-3.1-flash-lite) hoặc heuristic version",
      "updatedAt": "ISO 8601 timestamp",
      "headline": "Tiêu đề chiến lược cô đọng",
      "executiveSummary": "Đoạn văn 3-4 câu tóm tắt bức tranh vĩ mô và định hướng hành động",
      "macroRegimeAssessment": "Nhận định về pha chu kỳ, tăng trưởng GDP và lạm phát",
      "yieldCurveDiagnosis": "Chẩn đoán đường cong lợi suất, chi phí vốn và thanh khoản hệ thống",
      "sectorActionStrategy": "Chiến lược ngành và nhóm cổ phiếu ưu tiên đón sóng",
      "assetAllocationAdvice": "Khuyến nghị tỷ trọng Cổ phiếu vs Tiền mặt vs Vàng",
      "strategicTakeaways": ["Luận điểm 1", "Luận điểm 2", "Luận điểm 3"],
      "actionPlan": ["Hành động 1", "Hành động 2", "Hành động 3"],
      "riskAlerts": ["Cảnh báo rủi ro 1", "Cảnh báo rủi ro 2"]
    }
    ```

---

### PHÂN HỆ 10: HỆ SINH THÁI AI COPILOT CHUYÊN SÂU & BỘ ĐIỀU PHỐI NỀN (BACKGROUND AI SERVICE)
> 📘 **Đặc tả chi tiết nguyên lý suy luận, prompts và JSON schemas:** Xem tại [`docs/AI_INSIGHTS_ARCHITECTURE_AND_PROMPTS.md`](file:///Users/thaihai-swe/Desktop/stock/docs/AI_INSIGHTS_ARCHITECTURE_AND_PROMPTS.md).

* **Vị trí lưu trữ**:
  - Tầng 3 (Daily/Weekly Snapshot JSON): `data/macro_valuation.json` -> trường `aiInsight` (Báo cáo điều hành vĩ mô CIO) và `weeklyPulse` (Bản tin nhịp đập thị trường cuối tuần, commit về Git, phục vụ 0ms).
  - Tầng 4 (Weekly Market Pulse Cache Backup): `data/ai_insights_cache.json` -> trường `weeklyPulse`.
  - Tầng 5 (BCTC Snapshot): `data/financials/<MÃ>.json` -> trường `aiDeepDive` (Commit về Git, phục vụ phân tích định giá doanh nghiệp 0ms).
* **Mục đích & Kiến trúc tối ưu chi phí (Cost-Optimized Background Generation)**:
  - **Không gọi LLM thời gian thực theo từng cú nhấp chuột trên Client / Web**: Toàn bộ nội dung phân tích vĩ mô, nhịp đập tuần và thẩm định cổ phiếu được sinh trước trong các tác vụ nền định kỳ qua GitHub Actions (`weekly-macro-sync.yml`, `quarterly-bctc-sync.yml`) hoặc CLI `scripts/generate_ai_insights.py`. Daily EOD pipeline không gọi AI để loại bỏ nhiễu ngắn hạn và hoàn tất trong ~5s.
  - Frontend React đọc kết quả pre-computed ở tốc độ 0ms mà không tốn chi phí API hay chịu rủi ro nghẽn mạng/rate limit/timeout.
* **Hỗ trợ Đa Nhà Cung Cấp Chuẩn Mực (Multi-Provider Support)**:
  - **Google Gemini**: Direct REST API (`gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-2.0-flash`, `gemini-1.5-flash`, `gemini-3.1-flash-lite`, v.v.) kèm cơ chế **Smart Model Cascade** tự động chuyển model dự phòng khi gặp HTTP 503 / 429.
  - **OpenAI Standard API**: Hỗ trợ chuẩn `POST /v1/chat/completions`, tương thích 100% với OpenAI (GPT-4o, GPT-4o-mini), DeepSeek, Groq, OpenRouter, vLLM, và Ollama cục bộ. Hỗ trợ tự động xử lý cả JSON và Server-Sent Events (SSE).
  - **Cấu hình qua Biến Môi Trường (.env & GitHub Actions)**:
    - `AI_PROVIDER`: `auto` | `gemini` | `openai` | `heuristic`.
    - `GEMINI_API_KEY`: API key Google Gemini (Lấy miễn phí tại Google AI Studio).
    - `GEMINI_MODEL`: Tên mô hình Gemini ưu tiên (mặc định: `gemini-2.5-flash`).
    - `OPENAI_API_KEY`: API key OpenAI / DeepSeek / Groq / OpenRouter.
    - `OPENAI_MODEL`: Tên mô hình khi sử dụng OpenAI Standard API (ví dụ: `gpt-4o-mini`, `super-vip`).
    - `OPENAI_BASE_URL`: Base URL chuẩn OpenAI (mặc định: `https://api.openai.com/v1`).
    - `AI_MODEL`: Tên mô hình LLM chung (dự phòng cho cả hai provider).
  - **Động cơ Fallback Heuristic 2 Tầng**: Nếu không có API key hoặc LLM gặp sự cố, hệ thống tự động sinh báo cáo phân tích định lượng dựa trên các quy tắc tài chính học thuật (0ms, 0 chi phí, không bao giờ crash).

* **Cấu Trúc Chi Tiết Thẩm Định Cổ Phiếu Chuyên Sâu (`aiDeepDive` trong `data/financials/<MÃ>.json`)**:
  ```json
  {
    "recommendation": "🟢 MUA TÍCH LŨY GIÁ TRỊ | 🟡 NẮM GIỮ THEO DÕI | 🔴 CÂN NHẮC HẠ TỶ TRỌNG",
    "convictionScore": 85,
    "thesisHeadline": "Tiêu đề luận điểm đầu tư cốt lõi",
    "valuationConvergenceAnalysis": "Nhận định về biên an toàn MoS% và sự đồng thuận giữa 10 mô hình",
    "financialHealthCheck": "Đánh giá chất lượng BCTC: F-Score, M-Score, cấu trúc vốn, đòn bẩy D/E",
    "growthAndMoatAnalysis": "Lợi thế cạnh tranh kinh tế (Economic Moat), động lực tăng trưởng ROE/EPS",
    "catalysts": [
      "Động lực xúc tác 1 trong 6-12 tháng tới",
      "Động lực xúc tác 2"
    ],
    "downsideRisks": [
      "Rủi ro giảm giá 1 cần lưu ý",
      "Rủi ro giảm giá 2"
    ],
    "actionStrategy": "Chiến lược hành động: vùng giá gom, phương pháp DCA, phân bổ tỷ trọng NAV",
    "provider": "gemini | openai | offline-heuristic-engine",
    "model": "Tên model thực tế",
    "updatedAt": "ISO 8601 timestamp"
  }
  ```

* **Cấu Trúc Nhịp Đập Thị Trường Cuối Tuần (`weeklyPulse` trong `data/macro_valuation.json` & `data/ai_insights_cache.json`)**:
  ```json
  {
    "status": "success",
    "provider": "gemini | openai | offline-heuristic-engine",
    "model": "Tên model thực tế",
    "updatedAt": "ISO 8601 timestamp",
    "pulseHeadline": "Tiêu đề nhịp đập thị trường tuần cô đọng, bao quát xu hướng tuần",
    "weeklySummary": "Đoạn văn 3-4 câu tóm tắt bức tranh giao dịch tuần, biến động điểm số VN-Index, thanh khoản và tâm lý chung",
    "institutionalFlow": "Đánh giá chi tiết dòng tiền tổ chức (Khối ngoại, tự doanh) trong cả tuần",
    "keyDevelopments": [
      "Diễn biến 1 trọng yếu trong tuần",
      "Diễn biến 2",
      "Diễn biến 3"
    ],
    "weeklyLeadingSectors": [
      "Nhóm ngành dẫn dắt hút tiền mạnh nhất tuần",
      "Nhóm ngành phòng thủ / điều chỉnh"
    ],
    "nextWeekOutlook": "Kịch bản dự phóng và xu hướng vận động của thị trường cho tuần giao dịch tiếp theo",
    "actionableAdvice": "Chiến lược hành động khuyến nghị cho nhà đầu tư (tỷ trọng cổ phiếu, phương pháp DCA, quản trị rủi ro)"
  }
  ```

* **Cấu Trúc Phân Tích Tin Tức & Động Lực Tăng Trưởng NLP (`aiNewsAnalysis` trong `financials.newsDigest`)**:
  ```json
  {
    "overallSentiment": "Tích Cực | Trung Tính | Thận Trọng",
    "sentimentScore": 65,
    "executiveSummary": "Đoạn văn 2-3 câu tổng hợp sắc thái truyền thông 30 ngày qua",
    "catalysts": [
      "Động lực tăng trưởng kinh doanh 1",
      "Động lực 2"
    ],
    "keyRisks": [
      "Rủi ro pháp lý/thị trường 1",
      "Rủi ro 2"
    ],
    "catalystTimeline": "Ngắn hạn (1-3 tháng) | Trung hạn (6-12 tháng)",
    "status": "success",
    "provider": "gemini | openai | offline-heuristic-engine",
    "updatedAt": "ISO 8601 timestamp"
  }
  ```

* **Cấu Trúc Chẩn Đoán Kiểm Toán Pháp Y & Chất Lượng ROE (`aiAuditComment` trong `financials.forensicAnalysis`)**:
  ```json
  {
    "auditVerdict": "Sạch Sẽ & Minh Bạch | Cần Lưu Ý Kế Toán | Rủi Ro Thao Túng BCTC",
    "forensicDiagnosis": "Chẩn đoán chi tiết các biến số Beneish M-Score bất thường (DSRI, AQI, TATA) và tính minh bạch của BCTC",
    "dupontEarningsQuality": "Đánh giá chất lượng ROE: Thực chất từ biên ròng & vòng quay tài sản hay từ thủ thuật đòn bẩy nợ vay",
    "auditorChecklist": [
      "Câu hỏi kiểm toán chất vấn Ban Điều Hành tại ĐHCĐ 1",
      "Câu hỏi chất vấn 2"
    ],
    "status": "success",
    "provider": "gemini | openai | offline-heuristic-engine",
    "updatedAt": "ISO 8601 timestamp"
  }
  ```

* **Cấu Trúc Luận Giải Hội Tụ Định Giá & Độ Nhạy (`aiConvergence` trong `financials.valuationMultiples`)**:
  ```json
  {
    "convergenceHeadline": "Tiêu đề luận điểm hội tụ định giá ngắn gọn",
    "divergenceExplanation": "Giải thích lý do phân kỳ giữa DCF và các bội số P/E, P/B dựa trên chu kỳ tái đầu tư CapEx",
    "sensitivityStory": "Mô phỏng thử tải: Nếu chi phí vốn WACC tăng 1.5% do lãi suất thì biên an toàn MoS biến động ra sao",
    "preferredModelRecommendation": "Khuyến nghị mô hình định giá tin cậy nhất cho phân ngành đặc thù",
    "status": "success",
    "provider": "gemini | openai | offline-heuristic-engine",
    "updatedAt": "ISO 8601 timestamp"
  }
  ```

* **Cấu Trúc Dẫn Truyền Vĩ Mô Vào 10 Nhóm Ngành (`sectorTransmission` trong `data/macro_valuation.json`)**:
  ```json
  {
    "transmissionHeadline": "Tiêu đề thông điệp dẫn truyền vĩ mô vào ngành",
    "beneficiarySectors": [
      "Nhóm ngành hưởng lợi 1 kèm lý do dẫn truyền",
      "Nhóm ngành 2"
    ],
    "pressuredSectors": [
      "Nhóm ngành chịu áp lực chi phí vốn/tỷ giá 1",
      "Nhóm ngành 2"
    ],
    "portfolioAction": "Khuyến nghị luân chuyển danh mục thực chiến",
    "status": "success",
    "provider": "gemini | openai | offline-heuristic-engine",
    "updatedAt": "ISO 8601 timestamp"
  }
  ```

* **Danh Sách API Endpoints Backend Express (Phục vụ tĩnh 0ms từ JSON)**:
  - `GET /api/valuation/macro-summary`: Đọc `data/macro_valuation.json`, trả về kèm `aiInsight`, `weeklyPulse`, và `sectorTransmission`.
  - `GET /api/valuation/financials/:symbol`: Đọc `data/financials/<MÃ>.json`, trả về kèm `aiDeepDive`, `newsDigest.aiNewsAnalysis`, `forensicAnalysis.aiAuditComment`, và `valuationMultiples.aiConvergence`.

* **CLI Python Đồng Bộ Dữ Liệu AI (`scripts/generate_ai_insights.py`)**:
  ```bash
  # 1. Sinh nhận định Vĩ mô CIO
  .venv/bin/python scripts/generate_ai_insights.py --scope macro

  # 2. Sinh nhận định Nhịp Đập Thị Trường Cuối Tuần
  .venv/bin/python scripts/generate_ai_insights.py --scope weekly_market

  # 3. Sinh cả Vĩ mô CIO + Nhịp Đập Cuối Tuần
  .venv/bin/python scripts/generate_ai_insights.py --scope weekly

  # 4. Sinh nhận định Cổ phiếu Deep-Dive (cho 1 hoặc nhiều mã)
  .venv/bin/python scripts/generate_ai_insights.py --scope stocks --symbols HPG,VNM,TCB

  # 5. Sinh toàn bộ (Vĩ mô + Nhịp đập tuần + Tất cả cổ phiếu trong danh mục)
  .venv/bin/python scripts/generate_ai_insights.py --scope all
  ```

---

### PHÂN HỆ 9: QUY CHUẨN ĐỊNH DANH TRÍ TUỆ NHÂN TẠO & THUẬT TOÁN ĐỊNH LƯỢNG TRÊN GIAO DIỆN (UI INTELLIGENCE BADGING: AI VS HEURISTIC)

Nhằm đảm bảo tính minh bạch tuyệt đối đối với người sử dụng, hệ thống phân định rạch ròi 100% nguồn gốc của mọi nhận định, phân tích và khuyến nghị hiển thị trên giao diện:

| Thẻ Định Danh (Badge) | Màu Sắc & Nhận Diện | Định Nghĩa & Phạm Vi Áp Dụng | Cơ Chế Phân Giải Dữ Liệu |
| :--- | :--- | :--- | :--- |
| **`AI`** *(Trí Tuệ Nhân Tạo)* | Tím / Indigo (`bg-purple-100 text-purple-700 dark:bg-purple-950/90 dark:text-purple-300 border-purple-300/80`) | Nhận định ngôn ngữ tự nhiên được sinh bởi Large Language Model (OpenAI hoặc Google Gemini). Giao diện hiển thị nhãn tinh gọn `AI`, không hiển thị tên vendor hay model để giữ giao diện trung lập và chuyên nghiệp. Tooltip: *"Trí tuệ nhân tạo (AI Copilot)"*. | Đọc trường `provider`: chỉ hiển thị khi `provider === 'openai'` hoặc `provider === 'gemini'`. |
| **`H`** *(Heuristic & Định Lượng)* | Hổ phách / Amber (`bg-amber-100 text-amber-800 dark:bg-amber-950/90 dark:text-amber-300 border-amber-300/80`) | Công thức toán học định lượng tài chính, mô hình xác suất thống kê (DCF, Graham, Beneish, Altman Z, Dupont, Volume Profile, VaR), thuật toán phân loại dữ liệu, hoặc kịch bản dự phòng offline engine. Tooltip: *"Mô hình định lượng Heuristic / Thuật toán tài chính quy tắc"*. | Hiển thị cố định cho các khối định lượng toán học, hoặc **tự động chuyển đổi động** khi AI gặp sự cố (`provider === 'offline-heuristic-engine'`). |

#### Cơ Chế Tự Động Chuyển Đổi Động (Dynamic Fallback Detection):
* Component chuẩn [`src/components/common/IntelligenceBadge.jsx`](file:///Users/thaihai-swe/Desktop/stock/src/components/common/IntelligenceBadge.jsx) cung cấp hàm trợ năng `getIntelligenceSource(data)`:
  * Nếu `data?.provider === 'openai' || data?.provider === 'gemini'` -> Trả về `{ type: 'ai', provider, isFallback: false }` -> Hiển thị badge `AI` kèm tooltip *"Trí tuệ nhân tạo (AI Copilot)"*.
  * Nếu `data?.provider === 'offline-heuristic-engine'` hoặc không có AI metadata -> Trả về `{ type: 'heuristic', isFallback: true }` -> Tự động chuyển sang badge `H` kèm tooltip *"Mô hình định lượng Heuristic & Thuật toán tài chính quy tắc"*.
  * **Lưu ý**: Thông tin kỹ thuật `provider` và `model` được bảo toàn nguyên vẹn trong JSON cho mục đích kiểm toán dữ liệu và phân giải fallback, nhưng được loại bỏ 100% khỏi lớp hiển thị UI người dùng.

#### Bản Đồ Phân Phối Thẻ Trí Tuệ Trên Toàn Giao Diện:
1. **Tab VN-Index (`MarketDashboard.jsx`)**:
   - `MarketHeroStatusBar.jsx`: *4 KPI VN-Index, Nhiệt Kế Định Giá, Benjamin Graham & Vốn Hóa* -> `H`.
   - `MacroValuationWindowCard.jsx`: *Định Giá P/E Bands 4 Chu Kỳ & Nhiệt Kế Thị Trường* -> `H`.
   - `MarketValuationHistoryChart.jsx`: *Lịch Sử Định Giá 25 Năm Vietstock* -> `H`.
   - `StyleValuationComparison.jsx`: *So Sánh 4 Phân Khúc Vốn Hóa & Chỉ Số Benjamin Graham* -> `H`.
   - `SectorValuationHeatmap.jsx`: *Bản Đồ Nhiệt & Luân Chuyển 10 Ngành GICS* -> `H`.

2. **Tab Phân Tích Kinh Tế Vĩ Mô (`MacroDashboard.jsx`)**:
   - `MacroHeroStatusBar.jsx`: *4 KPI Pha Chu Kỳ, Khẩu Vị Thị Trường, Điểm Rủi Ro 4 Tầng & Phân Bổ 4 Lớp Tài Sản* -> `H`.
   - `ExecutiveSummaryCard.jsx`:
     - Tab 1: *Chiến Lược CIO* -> `AI` / `H` động.
     - Tab 2: *Nhịp Đập Tuần* -> `AI` / `H` động.
     - Tab 3: *Tổng Hợp 4 Trụ Cột* -> `H` (Tổng hợp quy chuẩn kinh tế).
   - `MacroRegimeRadarSection.jsx`: *Ma Trận Kịch Bản, Đồng Hồ Chu Kỳ, Pha Tăng Trưởng & Độ Lệch Pha* -> `H`.
   - `YieldCurveMonitorCard.jsx`: *Đường Cong Lợi Suất 17 Kỳ Hạn & Rủi Ro Đảo Ngược* -> `H`.
   - `MacroYieldCurveStressBox.jsx`: *Căng Thẳng Thanh Khoản Thị Trường Nợ LSS* -> `H`.
   - `MacroAllocationGoldSection.jsx`: *Phân Bổ Tài Sản Động & Arbitrage Giá Vàng* -> `H`.
   - `ScenarioAllocationMatrix.jsx`: *Ma Trận Phân Bổ Danh Mục 3 Kịch Bản* -> `H`.
   - `MacroIntermarketGrid.jsx`: *Lưới 6 Chỉ Số Liên Thị Trường* -> `H`.
   - `MacroTradingEconomicsTable.jsx`: *Thư Viện 95 Chỉ Số Kinh Tế TradingEconomics* -> `H`.
   - `OpportunityCostCard.jsx`: *So Sánh Chi Phí Cơ Hội Lãi Suất Tiết Kiệm* -> `H`.

3. **Tab Định Giá & Phân Tích Chuyên Sâu Cổ Phiếu (`ValuationDashboard.jsx`)**:
   - `StockCockpitHeader.jsx`:
     - *CFA Equity Research Copilot* -> `AI` / `H` động.
     - *Consensus Fair Value (Giá trị nội tại hội tụ)* -> `H`.
   - `FullResearchReportModal.jsx`:
     - Chương 1: *CFA Investment Thesis* -> `AI` / `H` động.
     - Chương 2: *10 Mô Hình Định Lượng & Độ Nhạy* -> `H`.
     - Chương 3: *Gian Lận BCTC Beneish M-Score* -> `H`.
     - Chương 4: *Công Thức Kỳ Diệu Joel Greenblatt* -> `H`.
     - Chương 5: *Dòng Tiền Tự Do FCF & Biến Số Kế Toán Accruals* -> `H`.
     - Chương 6: *Extended DuPont 5-Factor CFA* -> `H`.
     - Chương 7: *Sức Khỏe Tài Chính (Altman Z & Piotroski F)* -> `H`.
     - Chương 8: *Cấu Trúc Khối Lượng Volume Profile & Wyckoff* -> `H`.
     - Chương 9: *Đo Lường Rủi Ro Định Lượng (VaR & Sharpe)* -> `H`.
     - Chương 10: *Tổng Hợp Tin Tức & Khảo Sát Tâm Lý NLP* -> `H`.
   - Các Thẻ Định Lượng Độc Lập:
     - `ValuationSevenZonesCard.jsx`: *7 Vùng Biên An Toàn* -> `H`.
     - `ValuationTrapsCard.jsx`: *Nhận Diện 5 Bẫy Giá Trị* -> `H`.
     - `DcfValuationCard.jsx`: *DCF Chiết Khấu Dòng Tiền 3 Kịch Bản* -> `H`.
     - `ForensicAccountingCard.jsx`: *Kế Toán Pháp Y & M-Score* -> `H`.
     - `FinancialHealthCard.jsx`: *Khám Sức Khỏe Altman Z & Piotroski F* -> `H`.
     - `ExtendedDupontCard.jsx`: *DuPont 5 Nhân Tố Phân Rã ROE* -> `H`.
     - `FinValLabCard.jsx`: *Phòng Thí Nghiệm Tài Chính Định Lượng* -> `H`.
     - `DividendSustainabilityCard.jsx`: *Bền Vững Cổ Tức Tiền Mặt* -> `H`.
     - `NewsSentimentCard.jsx`: *Phân Tích Cảm Xúc Tin Tức Báo Chí* -> `H`.
     - `HistoricalValuationBandCard.jsx`: *Dải Băng Phân Vị P25-P50-P75 5Y* -> `H`.
     - `IndustrySpecificCard.jsx`: *Chỉ Số Đặc Thù Ngành Nghề GICS* -> `H`.
     - `StockRiskMetricsCard.jsx`: *Đo Lường Biến Động, VaR & Drawdown* -> `H`.
     - `MarketProfileCard.jsx`: *15-Block Market Profile & VAP* -> `H`.
     - `ValuationFormulasDeconstructionCard.jsx`: *Giải Phẫu 10 Công Thức Toán Học* -> `H`.






3. **Tab Tổng Quan Danh Mục (`Dashboard.jsx`)**:
   - `PortfolioStressTestCard.jsx`: *Đo Lường Sức Khỏe Danh Mục & Chịu Tải Vĩ Mô* -> `AI` / `H` động.
   - `OpportunityCostCard.jsx`: *So Sánh Chi Phí Cơ Hội Lãi Suất Tiết Kiệm* -> `H`.
   - `DashboardKpiMatrix.jsx`: *Chỉ Số Hiệu Quả & Rủi Ro Danh Mục (Sharpe, Beta, MaxDD)* -> `H`.
   - `DashboardHoldingsTable.jsx`: *Sổ Cái Vị Thế Nắm Giữ & P/L Tạm Tính* -> `H`.

---

### PHÂN HỆ 10: BÁO CÁO SỨC KHỎE DANH MỤC & CHỊU TẢI VĨ MÔ (PORTFOLIO AI STRESS-TEST)

* **Vị trí lưu trữ chính thức**: Bảng `portfolio_ai_insights` trong `data/stock.db` (Local) / Turso Cloud (Prod) — **TẦNG 1: ACID DATABASE (100% Phân Quyền Theo `user_id`)**.
* **Vị trí lưu trữ dự phòng (Fallback)**: `data/portfolio_ai_insights.json` (dành cho tài khoản demo & môi trường serverless).
* **Chu kỳ & Điều phối**:
  - **On-Demand**: Người dùng chủ động bấm *"⚡ Làm Mới AI"* trên Dashboard (`POST /api/portfolio/ai-stress-test/refresh`), cập nhật riêng danh mục của `user_id` đó trong 2-3s.
  - **Batch Job Hàng Tuần**: Sáng Thứ Bảy (10:00 AM) qua `run_pipeline.py --cadence weekly` (quét toàn bộ các user đang nắm giữ cổ phiếu, áp dụng Smart Delta Cache: chỉ sinh lại nếu `updated_at > 6 ngày`).
  - **0% AI calls khi phát sinh giao dịch**: Thao tác Mua, Bán, Cổ tức, Tiền mặt hoàn toàn không kích hoạt AI để đảm bảo hiệu năng tối đa.
* **Đặc tả Schema chi tiết (Bảng `portfolio_ai_insights`)**:
  | Trường Dữ Liệu | Kiểu Dữ Liệu | Ý Nghĩa Nghiệp Vụ & Nguồn Gốc |
  | :--- | :--- | :--- |
  | `user_id` | `TEXT (PK)` | Định danh người dùng (mặc định `'demo'`). Đảm bảo phân tách độc lập 100% dữ liệu giữa các tài khoản. |
  | `health_score` | `TEXT` | Xếp hạng sức khỏe danh mục: `A+`, `A`, `B+`, `B`, `C+`, `C`, `D`. |
  | `health_verdict` | `TEXT` | Thông điệp kết luận 1 câu ngắn gọn về độ cân bằng và sức chống chịu của danh mục. |
  | `portfolio_beta` | `REAL` | Hệ số Beta bình quân gia quyền của danh mục so với VN-Index. |
  | `cash_weight_pct` | `REAL` | Tỷ trọng đệm tiền mặt bảo vệ trên tổng NAV (%). |
  | `report_json` | `TEXT` | Chuỗi JSON đầy đủ chứa ma trận 3 tầng độ nhạy vĩ mô (`macroSensitivity`), 3 kịch bản chịu tải cực đoan (`stressTestScenarios`), và khuyến nghị tái cân bằng (`rebalancingRecommendations`). |
  | `status` | `TEXT` | Trạng thái sinh dữ liệu (`success` / `PENDING` / `failed`). Giá trị `PENDING` được gán khi người dùng bấm Làm Mới trên môi trường Online/Vercel để hàng đợi tự động xử lý trong lượt đồng bộ kế tiếp. |

  | `updated_at` | `TEXT (ISO)` | Thời điểm sinh báo cáo phân tích. Dùng để kiểm tra Smart Delta Cache (> 6 ngày). |

---

### PHÂN HỆ 11: KIỂM TOÁN AN TOÀN CỔ TỨC & KỶ LUẬT PHÂN BỔ VỐN (AI DIVIDEND AUDIT)

* **Vị trí lưu trữ**: Khối `aiDividendAudit` trong `data/financials/<MÃ>.json` (và bên trong `dividendSustainability`).
* **Chu kỳ & Điều phối**:
  - Hàng Tuần (Sáng Thứ Bảy) trong lượt gọi tuần tích hợp 5-trong-1 của cổ phiếu (`generate_ai_insights.py --scope stocks`).
  - Áp dụng Smart Delta Cache: Bỏ qua nếu dữ liệu AI đã sinh trong vòng 6 ngày.
* **Đặc tả Schema chi tiết**:
  | Trường Dữ Liệu | Kiểu Dữ Liệu | Ý Nghĩa Nghiệp Vụ & Nguồn Gốc |
  | :--- | :--- | :--- |
  | `safetyRating` | `string` | Đánh giá an toàn: `Vững Chắc (Safe)`, `Cần Theo Dõi (Borderline)`, hoặc `Nguy Cơ Bẫy Cổ Tức (Trap Risk)`. |
  | `fcfCoverageVerdict` | `string` | Kiểm toán cổ tức tiền mặt có được bảo chứng 100% bằng dòng tiền tự do FCF thực tế hay bằng nợ vay/bán tài sản. |
  | `trapRiskLevel` | `string` | Mức độ nguy cơ bẫy cổ tức: `Thấp`, `Trung Bình`, `Cao`. |
  | `capitalAllocationScore` | `number` | Điểm số kỷ luật phân bổ vốn của Ban Lãnh Đạo (thang điểm 0.0 - 10.0). |
  | `capitalAllocationDiagnosis` | `string` | Đánh giá hiệu quả phân bổ vốn: ROIC so với WACC, cân đối giữa tái đầu tư mở rộng CapEx, trả nợ vay và chia tiền mặt. |
  | `outlook3Y` | `string` | Dự phóng triển vọng duy trì hoặc cắt giảm cổ tức trong 1-3 năm tới. |
  | `redFlags` | `array` | Danh sách các cờ cảnh báo rủi ro bẫy cổ tức (mảng rỗng `[]` nếu an toàn). |
  | `updatedAt` | `string (ISO)` | Thời điểm sinh báo cáo kiểm toán. |

---

### PHÂN HỆ 12: CỐ VẤN KHÓA LỢI NHUẬN LINH HOẠT (SMART TRAILING STOP) & THƯỚC ĐO TỶ LỆ THƯỞNG / RỦI RO (R:R)

* **Vị trí lưu trữ**:
  - Cấu hình gốc: `data/default-constant-value.json` (`riskRewardConfig`).
  - Runtime Module: `src/utils/riskRewardAdvisor.js` (Re-exported qua `src/utils/constants.js`).
  - Giao diện trực quan: `src/components/dashboard/SmartProfitProtectionAdvisor.jsx`, `DashboardHoldingsTable.jsx`, `SellForm.jsx`, `StockCockpitHeader.jsx`.
* **Mục đích**: Bảo toàn tối đa thành quả lợi nhuận của nhà đầu tư, loại bỏ tâm lý "chốt non" hoặc "gồng lãi thành lỗ" bằng cơ chế Khóa Lãi 5 Bậc Thang thích ứng theo Beta, đồng thời đo lường định lượng tỷ lệ Thưởng / Rủi Ro (R:R) giữa Tiềm năng tăng giá (Consensus Fair Value) và Mức rủi ro sụt giảm (Trailing Stop).
* **Đặc tả Schema chi tiết (`riskRewardConfig`)**:
  | Trường Dữ Liệu | Kiểu Dữ Liệu | Giá Trị Mặc Định | Ý Nghĩa Nghiệp Vụ & Cơ Chế Toán Học |
  | :--- | :--- | :--- | :--- |
  | `defaultInitialStopLossPct` | `number` | `7.0%` | Mức cắt lỗ kỷ luật ban đầu tính từ giá vốn khi vị thế chưa sinh lời đáng kể (Pha 0). |
  | `breakevenTriggerPct` | `number` | `6.0%` | Ngưỡng kích hoạt Pha 1: Khi P/L $\ge +6\%$, Trailing Stop tự động dời lên Giá Hòa Vốn (Free Trade - rủi ro mất vốn về 0). |
  | `tier1ProfitTriggerPct` | `number` | `15.0%` | Ngưỡng kích hoạt Pha 2 (Khóa Lãi Bậc 1): Khi P/L $\ge +15\%$. |
  | `tier1LockMinPct` | `number` | `8.0%` | Mức lợi nhuận tối thiểu bảo toàn chắc chắn trong Pha 2 ($+8\%$ đến $+10\%$). |
  | `tier2ProfitTriggerPct` | `number` | `25.0%` | Ngưỡng kích hoạt Pha 3 (Khóa Lãi Bậc 2): Khi P/L $\ge +25\%$. |
  | `tier2LockMinPct` | `number` | `18.0%` | Mức lợi nhuận tối thiểu bảo toàn chắc chắn trong Pha 3 ($+18\%$ đến $+22\%$). |
  | `superProfitTriggerPct` | `number` | `40.0%` | Ngưỡng kích hoạt Pha 4 (Nước Rút Siêu Lãi): Khi P/L $\ge +40\%$. |
  | `superProfitBufferPct` | `number` | `5.0%` | Biên độ siết sát đỉnh cao nhất trong Pha 4 ($\text{Peak} \times (1 - 5\%)$). |
  | `defaultTrailingBufferPct` | `number` | `6.0%` | Biên độ Trailing Stop chuẩn cho cổ phiếu có $\beta = 1.0$. |
  | `betaSensitivity` | `number` | `3.0` | Độ nhạy điều chỉnh biên độ thở theo Beta: $\text{Buffer} = 6.0\% + (\beta - 1.0) \times 3.0\%$. |
  | `minBufferPct` / `maxBufferPct` | `number` | `4.5%` / `10.0%` | Giới hạn kẹp biên thở thích ứng tối thiểu và tối đa cho mọi cổ phiếu. |
  | `warningDistancePct` | `number` | `3.0%` | Khoảng cách cảnh báo đèn vàng khi thị giá tiệm cận Trailing Stop $\le 3\%$. |
  | `rrRatings` | `array` | 4 bậc | Phân loại ma trận R:R: `EXCELLENT` ($\ge 3:1$ - Kèo Vàng), `GOOD` ($\ge 2:1$), `FAIR` ($\ge 1.5:1$), `POOR` ($< 1.5:1$ - Bất Lợi). |
  | `protectionTiers` | `array` | 5 bậc | Danh mục 5 pha bảo vệ: `INITIAL` (0), `BREAKEVEN` (1), `TIER1_LOCK` (2), `TIER2_LOCK` (3), `SUPER_PROFIT` (4). |

---

### PHÂN HỆ 12.2: LƯỚI CHỐT LỜI KHOA HỌC 3 TẦNG (SCIENTIFIC 3-TIER TAKE-PROFIT GRID)

* **Vị trí lưu trữ**:
  - Cấu hình gốc: `data/default-constant-value.json` (`takeProfitGridConfig`).
  - Runtime Module: `src/utils/riskRewardAdvisor.js` (Hàm `calculateTakeProfitGrid`).
  - Giao diện trực quan: `src/components/dashboard/SmartProfitProtectionAdvisor.jsx`, `src/components/valuation/StockCockpitHeader.jsx`.
* **Mục đích**: Loại bỏ triệt để tâm lý "bán non mất hàng" hoặc "gồng lãi thành lỗ" bằng kế hoạch chia nhỏ vị thế thu hoạch lợi nhuận khoa học 3 tầng (30% - 40% - 30%) phối hợp nhịp nhàng với mốc Chặn Lãi (Trailing Stop).
* **Đặc tả Schema chi tiết (`takeProfitGridConfig`)**:
  | Trường Dữ Liệu | Kiểu Dữ Liệu | Giá Trị Mặc Định | Ý Nghĩa Nghiệp Vụ & Cơ Chế Toán Học |
  | :--- | :--- | :--- | :--- |
  | `tier1RatioPct` | `number` | `30.0%` | Tỷ trọng khối lượng khuyến nghị chốt lời ở Tầng 1 (Thu hồi vốn gốc). |
  | `tier1MinProfitPct` | `number` | `15.0%` | Ngưỡng lãi tối thiểu để kích hoạt Tầng 1 (+15% từ giá vốn). |
  | `tier1FairValueDiscountPct`| `number` | `12.0%` | Chiết khấu so với Fair Value để xác định cận dưới Tầng 1 ($\text{FairValue} \times 0.88$). |
  | `tier2RatioPct` | `number` | `40.0%` | Tỷ trọng khối lượng khuyến nghị chốt lời ở Tầng 2 (Hiện thực hóa theo định giá cơ bản). |
  | `tier2FairValueRatio` | `number` | `1.0` | Tỷ lệ định giá của Tầng 2 ($100\%$ Consensus Fair Value). |
  | `tier3RatioPct` | `number` | `30.0%` | Tỷ trọng khối lượng giữ lại ở Tầng 3 (Thả trôi bắt trọn siêu sóng / Trend Runner). |
  | `tier3BubblePremiumPct`| `number` | `20.0%` | Mức thặng dư quá nhiệt của Tầng 3 ($\text{FairValue} \times 1.20$). Điểm bán của 30% này theo Trailing Stop. |
  | `defaultFallbackGainPct` | `number` | `25.0%` | Mức tăng giả định mặc định nếu cổ phiếu chưa có dữ liệu định giá Consensus (+25%). |
  | `tiers` | `array` | 3 tầng | Mảng định nghĩa siêu dữ liệu cho 3 tầng: `tier` (1,2,3), `name`, `label`, `description`, `defaultSellPct`, `badge`. |

---

### PHÂN HỆ 13: RADAR BƠM/HÚT TIỀN NGÂN HÀNG NHÀ NƯỚC & THANH KHOẢN LIÊN NGÂN HÀNG (SBV OMO & INTERBANK RADAR)

* **Vị trí lưu trữ**:
  - Cấu hình gốc: `data/default-constant-value.json` (`sbvOmoRadarConfig`).
  - Dữ liệu nguồn: `data/macro_valuation.json` (`macro.interbankOvernight`, `macro.sbvRefinancingRate`, `macro.usdVndRate`, `aiSbvOmoDiagnosis`) và `data/macro_indicators.json`.
  - Runtime Module: `src/utils/sbvOmoRadar.js` (Re-exported qua `src/utils/constants.js`).
  - Giao diện trực quan: `src/components/macro/SbvOmoInterbankRadarCard.jsx` (Nhúng tại `src/components/macro/MacroRegimeRadarSection.jsx`).
* **Mục đích**: Nhận diện sớm các pha thắt chặt/nới lỏng thanh khoản tiền tệ của Ngân hàng Nhà nước Việt Nam (SBV), đo lường mức độ căng thẳng thị trường 2 và phát tín hiệu định hướng cho danh mục cổ phiếu.
* **Đặc tả Schema chi tiết (`sbvOmoRadarConfig`)**:
  | Trường Dữ Liệu | Kiểu Dữ Liệu | Giá Trị Mặc Định | Ý Nghĩa Nghiệp Vụ & Cơ Chế Toán Học |
  | :--- | :--- | :--- | :--- |
  | `interbankStressThreshold` | `number` | `6.0%` | Ngưỡng lãi suất liên ngân hàng qua đêm căng thẳng (Stress Threshold). |
  | `interbankComfortThreshold`| `number` | `3.0%` | Ngưỡng lãi suất liên ngân hàng thoải mái, tiền rẻ dồi dào. |
  | `interbankSpreadWarning` | `number` | `1.5%` | Chênh lệch cảnh báo giữa Lãi suất qua đêm LNH và Lãi suất tái cấp vốn SBV ($\text{ON} - \text{Refinancing} \ge 1.5\%$). |
  | `usdVndInterventionThreshold`| `number`| `25500` | Ngưỡng tỷ giá USD/VND nhạy cảm kích hoạt can thiệp OMO/bán ngoại tệ của SBV. |
  | `stressScoreWeights` | `object` | 4 trọng số | Trọng số chấm điểm Điểm Căng Thẳng Thanh Khoản: Lãi suất LNH (40%), Chênh lệch Spread (30%), Tỷ giá USD/VND (20%), Cung tiền M2 (10%). |
  | `postures` | `object` | 3 trạng thái | Phân loại trạng thái thanh khoản: `FLUSH` ($\le 35$ điểm - Dồi dào tiền rẻ), `NEUTRAL` (36-65 điểm - Cân bằng nhịp nhàng), `TIGHTENING` ($> 65$ điểm - Thắt chặt/hút tiền). |

---

### PHÂN HỆ 14: THƯỚC ĐO TĂNG TRƯỞNG SỨC MUA THỰC TẾ (INFLATION-ADJUSTED REAL RETURN)

* **Vị trí lưu trữ**:
  - Cấu hình gốc: `data/default-constant-value.json` (`inflationReturnConfig`).
  - Dữ liệu nguồn: `data/macro_valuation.json` (`macro.inflationCpi`, `macro.coreInflation`, `aiInflationDiagnosis`) và Sổ lệnh giao dịch cá nhân.
  - Runtime Module: `src/utils/inflationAdjuster.js` (Re-exported qua `src/utils/constants.js`).
  - Giao diện trực quan: `src/components/dashboard/RealPurchasingPowerCard.jsx` (Nhúng tại `src/components/dashboard/DashboardAnalyticsHub.jsx` qua tab `real_return`).
* **Mục đích**: Ứng dụng phương trình kinh tế lượng Fisher ($r_{\text{real}} = \frac{1 + r_{\text{nominal}}}{1 + i_{\text{cpi}}} - 1$), bóc tách lượng tiền bị lạm phát bào mòn (VNĐ Drag), và thiết lập bảng so sánh 4 kênh tài sản lớn (Danh mục cá nhân, VN-Index, Vàng SJC, Tiết kiệm ngân hàng).
* **Đặc tả Schema chi tiết (`inflationReturnConfig`)**:
  | Trường Dữ Liệu | Kiểu Dữ Liệu | Giá Trị Mặc Định | Ý Nghĩa Nghiệp Vụ & Cơ Chế Toán Học |
  | :--- | :--- | :--- | :--- |
  | `defaultBenchmarkSavingsRate`| `number` | `5.5%` | Lãi suất tiền gửi tiết kiệm 12 tháng bình quân của các NHTM để làm benchmark phi rủi ro. |
  | `defaultAnnualCpi` | `number` | `5.08%` | Tỷ lệ lạm phát CPI hàng năm mặc định dùng trong các phép tính chiết khấu sức mua. |
  | `realReturnBrackets` | `array` | 4 bậc | Thang đánh giá thành quả sức mua: `OUTPERFORM` ($> +10\%$), `BEAT_INFLATION` ($+3\%$ đến $+10\%$), `PRESERVED` ($0\%$ đến $+3\%$), `EROSION` ($< 0\%$ - Bị lạm phát bào mòn). |



