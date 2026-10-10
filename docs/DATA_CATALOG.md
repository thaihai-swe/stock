# 📚 DATA CATALOG & ARCHITECTURE — BẢN ĐỒ DỮ LIỆU TOÀN DIỆN HỆ THỐNG

Tài liệu này lưu trữ toàn bộ đặc tả chi tiết từng nhóm dữ liệu, từng chỉ tiêu tài chính, nguồn trích xuất gốc, endpoint API, phương thức lấy và vị trí lưu trữ trong hệ thống **Stock Portfolio Manager & Enterprise Valuation Engine**. Đây là cẩm nang kỹ thuật phục vụ cho toàn bộ các chức năng hiện tại và các tính năng mở rộng tiếp theo.

---

## 1. Tổng Quan Kiến Trúc Lưu Trữ: "Local JSON First"

Toàn bộ dữ liệu của hệ thống được tổ chức theo triết lý **Local JSON First**:
1. **Thu thập từ nguồn gốc**: Python pipeline (`uv`) gọi trực tiếp các API chuẩn từ `vnstock`, TradingView, Yahoo Finance, HNX, SBV, TCBS.
2. **Làm sạch & Chuẩn hóa Taxonomy**: Đưa về đơn vị thống nhất (Tỷ VNĐ cho giá trị tuyệt đối, Triệu CP cho khối lượng, đ/cp cho EPS/BVPS/Thị giá).
3. **Lưu trữ Structured JSON trong `data/`**: Tạo các bản snapshot hoàn chỉnh, có thể đọc, sao lưu và kiểm tra trực tiếp mà không phụ thuộc vào database.
4. **Đồng bộ vào SQLite Database (`data/stock.db` / Turso Cloud)**: Lưu trữ các dữ liệu biến động như sổ lệnh giao dịch, danh mục tài khoản, nhật ký cổ tức.
5. **Cung cấp cho Frontend SPA**: React 18 tiêu thụ dữ liệu qua Express REST API.

---

## 2. Chi Tiết Từng Nhóm Dữ Liệu & Nguồn Cung Cấp

---

### PHÂN HỆ 1: BÁO CÁO TÀI CHÍNH (FINANCIAL STATEMENTS)
* **Nguồn cung cấp chính**: Thư viện Python `vnstock` (`vnstock.api.financial.Finance(source='VCI')`) & TCBS API (`apipubaws.tcbs.com.vn`).
* **Thời gian/Kỳ báo cáo**: 8 Quý gần nhất (`2023-Q3` → `2025-Q2`) và 5 Năm gần nhất (`2020` → `2024`).
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

---

### PHÂN HỆ 3: CỔ TỨC, CỔ ĐÔNG & BAN LÃNH ĐẠO (CORPORATE PROFILE)
* **Nguồn cung cấp**: Thư viện `vnstock` qua 2 sub-brokers `VCI` và `KBS`:
  * `c = Company(symbol='HPG', source='VCI')`
  * `c_kbs = Company(symbol='HPG', source='KBS')`
* **Vị trí lưu trữ**: `data/financials/<MÃ>.json` trong `corporateEvents` và `shareholders`.

| Nhóm Dữ Liệu | Lệnh Gọi Code | Các Trường Thông Tin Chi Tiết |
| :--- | :--- | :--- |
| **Lịch Sử Cổ Tức & Sự Kiện** | `c.events()` | • `event_title`: Tên sự kiện (Trả cổ tức đợt 1 năm 2024 bằng tiền)<br>• `public_date`: Ngày công bố thông tin<br>• `record_date`: Ngày đăng ký cuối cùng<br>• `exright_date`: Ngày giao dịch không hưởng quyền (GDKHQ)<br>• `value`: Số tiền cổ tức (VD: 1.000 đ/cp)<br>• `ratio`: Tỷ lệ trả cổ phiếu thưởng (VD: 10:1) |
| **Cơ Cấu Cổ Đông Lớn** | `c_kbs.shareholders()` | • `share_holder`: Tên cá nhân hoặc tổ chức (Trần Đình Long, Dragon Capital...)<br>• `quantity`: Số lượng cổ phiếu sở hữu<br>• `share_own_percent`: Tỷ lệ sở hữu phần trăm (%)<br>• `update_date`: Ngày cập nhật danh sách |
| **Ban Lãnh Đạo & HĐQT** | `c.officers()` | • `officer_name`: Họ tên lãnh đạo<br>• `officer_position`: Chức vụ (Chủ tịch HĐQT, Tổng Giám đốc)<br>• `officer_own_percent`: Tỷ lệ sở hữu cổ phần của lãnh đạo |
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

1. **VN-Index P/E & Phân Vị Định Giá Thị Trường**:
   * *Nguồn trích xuất*: Endpoint định giá thị trường Vietstock (`https://finance.vietstock.vn/dinh-gia-thi-truong`).
   * *Trường dữ liệu*: `currentPE`, `currentPB`, `historicalMeanPE` (Trung bình P/E 5 năm), `historicalStdPE` (Độ lệch chuẩn), `zScore`, `percentile` (Phân vị).
   * *Mục đích*: Xác định thị trường chung đang ở vùng **RẺ (Tích lũy)**, **HỢP LÝ (Nắm giữ)** hay **ĐẮT (Phòng thủ/Hạ tỷ trọng)**.
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
   * Khi phát sinh lệnh bán, thuật toán **FIFO (First-In, First-Out)** tự động quét tìm các lô mua cũ nhất để đối trừ giá vốn.
   * Tính toán doanh thu thuần sau thuế TNCN 0.1% và phí môi giới, từ đó xác định chính xác số tiền **Lãi/Lỗ Đã Thực Hiện (Realized P/L)**.
   * Ghi nhận lịch sử chi tiết vào cột `matched_lots` dạng JSON.
3. **Sổ Cổ Tức (`dividends`)**:
   * Ghi nhận cổ tức tiền mặt (tự động khấu trừ 5% thuế TNCN theo luật chứng khoán Việt Nam).
   * Ghi nhận cổ tức bằng cổ phiếu (làm tăng số lượng nắm giữ và tự động điều chỉnh giá vốn bình quân).
4. **Sổ Theo Dõi & Kế Hoạch (`watchlist` & `app_settings`)**:
   * Lưu trữ số dư tiền mặt danh mục (`cash_balance`).
   * Mục tiêu tỷ trọng cổ phiếu và cảnh báo vùng giá mua/bán gom tích lũy.

---

---

## 3. Kiến Trúc Module Thu Thập Dữ Liệu Độc Lập (`scripts/fetchers/`)

Hệ thống đã tách biệt hoàn toàn tầng kết nối, cào dữ liệu thô (Data Fetching Layer) ra khỏi tầng nghiệp vụ tính toán định giá và lưu trữ:

```
scripts/
├── fetchers/                         # ⭐ TẦNG THU THẬP DỮ LIỆU ĐỘC LẬP
│   ├── __init__.py                   # Export BaseFetcher, MarketFetcher, FinancialFetcher, MacroFetcher, TradingEconomicsFetcher
│   ├── base.py                       # BaseFetcher: HTTP session, Rate Limiting, SSL bypass, Auto-retry
│   ├── market_fetcher.py             # MarketFetcher: TradingView Scanner API, Realtime Quotes
│   ├── financial_fetcher.py          # FinancialFetcher: vnstock Finance/Company (KQKD, CĐKT, LCTT, Ratios, Events)
│   ├── macro_fetcher.py              # MacroFetcher: HNX Yield Curve, SBV Rates, Yahoo Finance, PNJ Edge API (SJC & PNJ Gold)
│   ├── market_valuation_history_fetcher.py # MarketValuationHistoryFetcher: Lịch sử định giá P/E, P/S, Vốn hóa Google Sheets
│   └── tradingeconomics_fetcher.py   # TradingEconomicsFetcher: 95 chỉ số vĩ mô 10 danh mục
├── lib/                              # 🧮 TẦNG NGHIỆP VỤ & CHUẨN HÓA TOÁN HỌC
│   ├── financial_taxonomy.py         # Từ điển chuẩn hóa chỉ tiêu kế toán VN
│   ├── valuation_models.py           # Graham, DDM, EV/EBITDA, DuPont, CAGR
│   ├── macro_regime.py               # 5-Pha Regime, Risk Score 4 tầng, Luân chuyển 11 ngành, Arbitrage Vàng
│   ├── macro_advisor.py              # Z-Score, P/E Bands, Khuyến nghị phân bổ tài sản
│   └── rate_limiter.py               # Quản lý giới hạn tần suất gọi API
├── sync_fundamentals.py              # 🎮 CONTROLLER 1: Điều phối định giá & kỹ thuật (dùng MarketFetcher)
├── fetch_financial_reports.py        # 🎮 CONTROLLER 2: Điều phối BCTC 8Q/5Y & Ratios (dùng FinancialFetcher)
├── fetch_macro_valuation.py          # 🎮 CONTROLLER 3: Điều phối Vĩ mô, Regime, Lịch sử định giá & 95 chỉ số
└── run_full_pipeline.py              # 🚀 ORCHESTRATOR: Chạy tuần tự toàn bộ luồng tự động
```

### Bảng Ánh Xạ Phân Trách Nhiệm Chi Tiết:

| Nhóm Dữ Liệu | Module Fetcher Độc Lập | Controller Điều Phối | Tệp Dữ Liệu Đích |
| :--- | :--- | :--- | :--- |
| **Thị Giá Realtime & 52 Chỉ Báo Kỹ Thuật** | `scripts/fetchers/market_fetcher.py` (`MarketFetcher`) | `scripts/sync_fundamentals.py` | `data/fundamentals_cache.json` |
| **BCTC 122+ Chỉ Tiêu, 54 Ratios, Cổ Tức & Cổ Đông** | `scripts/fetchers/financial_fetcher.py` (`FinancialFetcher`) | `scripts/fetch_financial_reports.py` | `data/financials/<MÃ>.json` |
| **Vĩ Mô Tổng Quan, TPCP 10Y HNX, SBV & Vàng SJC/PNJ** | `scripts/fetchers/macro_fetcher.py` (`MacroFetcher`) | `scripts/fetch_macro_valuation.py` | `data/macro_valuation.json` |
| **Kho 95 Chỉ Số Kinh Tế Vĩ Mô 10 Nhóm** | `scripts/fetchers/tradingeconomics_fetcher.py` (`TradingEconomicsFetcher`) | `scripts/fetch_macro_valuation.py` | `data/macro_indicators.json` |
| **Lịch Sử Định Giá 10 Năm (P/E, P/S, Vốn Hóa Google Sheets)** | `scripts/fetchers/market_valuation_history_fetcher.py` | `scripts/fetch_macro_valuation.py` | `data/market_valuation_history.json` |
| **Nến Intraday 1 Phút & Nến Ngày 11 Chỉ Số (DNSE Live API)** | `DNSE Chart API` (`api.dnse.com.vn/chart-api/v2/ohlcs`) | Express Proxy (`/api/valuation/dnse-ohlc`) | In-memory Cache & Live React Chart |
| **Mô Hình 5 Pha Chu Kỳ, 11 Nhóm Ngành & Vàng Arbitrage** | `scripts/lib/macro_regime.py` | `scripts/fetch_macro_valuation.py` | `data/macro_valuation.json` |
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
| :--- | :--- | :--- | :--- |
| **1. Benjamin Graham Number** | $V = \sqrt{22.5 \times EPS \times BVPS}$ | Hệ số kết hợp $22.5$ ($15 \times 1.5$) | $EPS > 0$ và $BVPS > 0$ |
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
* Script thực thi: `scripts/test_valuation_engine.py` (bao phủ 11 test cases cho toàn bộ 7 mô hình toán học, các trường hợp biên âm/rỗng, DuPont, Tech Score và Engine class).
* Lệnh chạy: `.venv/bin/python scripts/test_valuation_engine.py`.

