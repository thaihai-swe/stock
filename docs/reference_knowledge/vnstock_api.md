# vnstock API Reference — Cẩm Nang Lấy Dữ Liệu Chứng Khoán Việt Nam

Tài liệu được bảo tồn vĩnh viễn từ hệ thống Equity Research VN.

## Cài đặt thư viện
```bash
pip install vnstock --upgrade
```

Từ phiên bản mới, import qua submodules:
```python
from vnstock.api.quote import Quote
from vnstock.api.financial import Finance
from vnstock.api.company import Company
from vnstock.api.listing import Listing
```

---

## 1. Finance — Báo Cáo Tài Chính & Chỉ Số
```python
from vnstock.api.financial import Finance
f = Finance(symbol='HPG', source='VCI')

# 1. Bảng cân đối kế toán (CDKT)
bs = f.balance_sheet(period='quarter', lang='vi')

# 2. Báo cáo kết quả kinh doanh (KQKD)
inc = f.income_statement(period='quarter', lang='vi')

# 3. Báo cáo lưu chuyển tiền tệ (LCTT)
cf = f.cash_flow(period='quarter', lang='vi')

# 4. Ratios tính sẵn
ratios = f.ratio(lang='vi')
```

---

## 2. Company — Tin Tức, Sự Kiện & Cổ Đông
```python
from vnstock.api.company import Company
c = Company(symbol='HPG', source='VCI')

# Thông tin tổng hợp (vốn hóa, thị giá, target price)
overview = c.overview()

# 50 tin tức mới nhất
news = c.news()

# 50 sự kiện công bố thông tin, cổ tức
events = c.events()

# Lịch sử vốn điều lệ & chia tách (source='KBS')
c_kbs = Company(symbol='HPG', source='KBS')
cap_history = c_kbs.capital_history()
```

---

## 3. Thứ Tự Ưu Tiên Nguồn Dữ Liệu
1. **Ưu tiên #1**: vnstock API qua nguồn `VCI` (Vietcombank Securities) — Dữ liệu chuẩn mực, ít trễ, không bị bot detection như web scraping.
2. **Ưu tiên #2**: Nguồn bổ sung `KBS` (KBS Securities) cho lịch sử chia tách, tăng vốn điều lệ và danh sách cổ đông lớn.
3. **Ưu tiên #3**: WebSearch đối chiếu số liệu kiểm toán độc lập (PDF trang Quan hệ cổ đông DN).
