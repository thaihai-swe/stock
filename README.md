# 📈 Stock Portfolio Manager & Enterprise Valuation Engine

Hệ thống quản trị danh mục đầu tư chứng khoán cá nhân và định giá doanh nghiệp chuyên sâu dành riêng cho **Thị Trường Chứng Khoán Việt Nam (HOSE, HNX, UPCoM)**.

---

## 🌟 Tính Năng Nổi Bật

* **📊 Quản Trị Danh Mục & Sổ Cái Khớp Lệnh FIFO**: Tự động tính toán giá vốn bình quân, Realized P/L từng lô bán, Unrealized P/L so với thị giá thời gian thực, quản lý cổ tức tiền mặt & cổ tức bằng cổ phiếu (khấu trừ thuế TNCN 5%).
* **🏢 Tra Cứu & Định Giá Doanh Nghiệp (Single-Stock Deep Dive)**:
  * Tra cứu bất kỳ mã cổ phiếu nào trên cả 3 sàn HOSE, HNX, UPCoM.
  * **Hero Card Giá Trị Nội Tại Hội Tụ**: Tính điểm hội tụ từ 6 mô hình định giá độc lập kèm Biên An Toàn (MoS %) và khuyến nghị hành động (*Mua gom tích lũy*, *Theo dõi nắm giữ*, *Cân nhắc chốt lời*).
  * **Lưới 6 Mô Hình Định Giá Độc Lập**: Benjamin Graham, Chiết khấu Cổ tức Gordon DDM, EV/EBITDA, P/CF, Target P/E, Target P/B.
  * **4 Chế Độ Xem Báo Cáo Tài Chính Chuyên Sâu**: 122+ chỉ tiêu BCTC (8 quý & 5 năm), 54 Chỉ số Ratios & DuPont 3 nhân tố, Lịch sử cổ tức & cơ cấu cổ đông lớn, Giải phẫu công thức toán học & tham số WACC.
  * **Raw JSON Inspector**: Trực quan hóa và tải trực tiếp dữ liệu thô.
* **🪜 Kế Hoạch Mua Gom DCA Đa Tầng**: Thiết lập lộ trình phân bổ vốn theo từng vùng giá mục tiêu.
* **🌐 Chỉ Số Kinh Tế Vĩ Mô & Khung Lãi Suất**: Theo dõi VN-Index, Lợi suất TPCP 10Y, Lãi suất điều hành SBV, Tỷ giá USD/VND, Vàng SJC, Dầu Brent và khuyến nghị tỷ trọng cổ phiếu/tiền mặt.

---

## 📖 Tài Liệu Tham Khảo Kỹ Thuật

* **🤖 [Cẩm Nang Vận Hành AI Agent (AGENTS.md)](./AGENTS.md)**: Quy chuẩn kỹ thuật cao nhất cho các AI coding agent, tiêu chuẩn môi trường `uv` và các quy tắc kiểm thử bắt buộc.
* **📚 [Bản Đồ Dữ Liệu & Nguồn Cung Cấp (DATA_CATALOG.md)](./docs/DATA_CATALOG.md)**: Đặc tả toàn bộ schema, cấu trúc lưu trữ Local JSON First, các nguồn dữ liệu gốc (TradingView, Yahoo, HNX, SBV, TCBS, VCI) và ma trận chỉ tiêu tài chính.
* **💡 [Cẩm Nang Tri Thức & 6 Bẫy Số Liệu](./docs/reference_knowledge/)**: Các công thức định giá, ước tính WACC, phân rã DuPont và cách phòng tránh sai số số liệu tài chính Việt Nam.

---

## 🚀 Khởi Động Dự Án

### 1. Cài đặt môi trường & Thư viện

```bash
# Frontend & Backend Node.js
npm install

# Môi trường ảo Python (Bắt buộc dùng uv, không dùng pip)
uv venv .venv --python 3.11
uv pip install --python .venv/bin/python pandas requests beautifulsoup4 yfinance curl_cffi lxml numpy
```

### 2. Chạy ứng dụng

```bash
# Khởi chạy ứng dụng Web (Frontend + Backend)
npm run dev

# Đồng bộ dữ liệu định giá & BCTC tự động
.venv/bin/python scripts/run_full_pipeline.py
```
