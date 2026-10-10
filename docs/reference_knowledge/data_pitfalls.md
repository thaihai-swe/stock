# 9 Bẫy Dữ Liệu Đặc Thù Thị Trường Chứng Khoán Việt Nam (Data Pitfalls Guide)

Tài liệu được bảo tồn vĩnh viễn từ hệ thống Equity Research VN.

## Bảng Xếp Hạng Mức Độ Rủi Ro

| Mức Độ | Bẫy Dữ Liệu | Tác Động Thực Tế |
|---|---|---|
| 🔴 **CRITICAL** | **5B. Split-adjustment consistency** | P/E, P/B sai hoàn toàn, dẫn đến kết luận định giá sai lệch |
| 🟠 **CAO** | **1. Số CP lưu hành thay đổi liên tục** | EPS/BVPS sai lệch do mẫu số tăng qua cổ phiếu thưởng/cổ tức CP |
| 🟠 **CAO** | **3. LNST vs LN trước thuế vs LNST CĐ mẹ** | Dùng nhầm lợi nhuận làm ROE và biên lợi nhuận sai |
| 🟡 **TRUNG BÌNH** | **2. Đơn vị tính (Tỷ vs Triệu vs Nghìn)** | BVPS bị phình to 1,000x hoặc thu nhỏ 1,000x |
| 🟡 **TRUNG BÌNH** | **4. Dữ liệu cũ trong Search Results** | Lấy nhầm kỳ báo cáo năm trước thay vì năm kiểm toán mới nhất |
| 🟡 **TRUNG BÌNH** | **5. Split-adjusted price khi so sánh giá** | So sánh giá danh nghĩa quá khứ bị sai khi chưa điều chỉnh chia tách |
| 🟢 **THẤP** | **6. Vốn hóa sai format (Trùng B + tỷ)** | Hiển thị "₫136.5B tỷ" vừa trùng lặp đơn vị vừa sai số |
| 🟠 **CAO** | **8. Qualitative claims sai (Tin blind subagent)** | Nhầm lẫn thông tin lãnh đạo, công ty con, bên liên quan |
| 🟡 **TRUNG BÌNH** | **9. Báo cáo thiếu biểu đồ (Visual Gap)** | Báo cáo chỉ toàn bảng số liệu, không có biểu đồ dòng tiền/xu hướng |

---

## 1. Bẫy 5B: Split-adjustment consistency (RỦI RO NGHIÊM TRỌNG)
- **Vấn đề**: Khi giá cổ phiếu đã được điều chỉnh chia tách (split-adjusted) nhưng EPS/BVPS vẫn lấy số liệu gốc trong BCTC cũ (chưa điều chỉnh theo số lượng cổ phiếu mới), dẫn đến tỷ số P/E, P/B bị bóp méo nghiêm trọng.
- **Quy tắc vàng**: Nếu công ty có chia tách/chia cổ tức cổ phiếu trong kỳ phân tích $\rightarrow$ **LUÔN điều chỉnh EPS/BVPS/shares về CÙNG một cơ sở (base) với thị giá hiện tại** trước khi tính định giá P/E, P/B cross-year.

---

## 2. Bẫy 1: Số Cổ Phiếu Lưu Hành Thay Đổi Qua Các Năm
- **Vấn đề**: Doanh nghiệp Việt Nam thường xuyên trả cổ tức bằng cổ phiếu (như HPG, VCB, MBB, SSI). Dùng một số cổ phiếu cố định cho cả 5 năm sẽ làm EPS và BVPS các năm quá khứ sai lệch hoàn toàn.
- **Cách xử lý**: Lấy chính xác số cổ phiếu bình quân lưu hành từng năm từ BCTC kiểm toán hoặc tính toán `CP = LNST / EPS`.

---

## 3. Bẫy 2: Đơn Vị Tính (BVPS Phình 1,000 Lần)
- **Vấn đề**: Nhầm lẫn giữa tỷ đồng và triệu đồng dẫn đến `VCSH (145 tỷ) / CP (7.69 tỷ) * 1000 = 18,866,697 đ` (phình 1,000x).
- **Công thức chuẩn**: `VCSH [tỷ đồng] / Số CP [tỷ cp] = đồng/cp` (tỷ / tỷ = 1, không cần nhân 1,000).

---

## 4. Bẫy 3: Phân Biệt Ba Mức Lợi Nhuận
1. **Lợi nhuận trước thuế (PBT)** — Không dùng để tính EPS.
2. **Lợi nhuận sau thuế hợp nhất (PAT)** — Bao gồm cả phần của cổ đông không kiểm soát.
3. **Lợi nhuận sau thuế của Cổ đông Công ty Mẹ** — **ĐÂY LÀ CHỈ TIÊU CHUẨN DUY NHẤT** dùng để tính EPS và ROE cho cổ đông phổ thông.

---

## 5. Bẫy 9: Báo Cáo Thiếu Biểu Đồ So Sánh Dòng Tiền
- Báo cáo tài chính chuyên nghiệp bắt buộc phải có biểu đồ đối chiếu **Dòng tiền kinh doanh (CFO) vs Lợi nhuận sau thuế (LNST)**.
- Nếu LNST dương hàng nghìn tỷ nhưng CFO liên tục âm nhiều năm $\rightarrow$ **Cảnh báo đỏ (Red Flag)** về chất lượng lợi nhuận và chiếm dụng vốn!
