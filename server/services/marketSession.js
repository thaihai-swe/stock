export function getMarketSessionInfo() {
  const vnTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  const day = vnTime.getDay(); // 0 = CN, 6 = T7
  const hour = vnTime.getHours();
  const minute = vnTime.getMinutes();
  const totalMinutes = hour * 60 + minute;

  // Cuối tuần
  if (day === 0 || day === 6) {
    return { isOpen: false, status: 'WEEKEND', label: '🏖️ Cuối tuần (Thị trường đóng cửa)' };
  }

  // Phiên sáng: 09:00 (540) - 11:30 (690)
  if (totalMinutes >= 540 && totalMinutes <= 690) {
    return { isOpen: true, status: 'MORNING_SESSION', label: '🟢 Đang trong phiên sáng' };
  }

  // Nghỉ trưa: 11:30 (690) - 13:00 (780)
  if (totalMinutes > 690 && totalMinutes < 780) {
    return { isOpen: false, status: 'LUNCH_BREAK', label: '⏸️ Nghỉ trưa (Giá đóng băng)' };
  }

  // Phiên chiều: 13:00 (780) - 15:00 (900)
  if (totalMinutes >= 780 && totalMinutes <= 900) {
    return { isOpen: true, status: 'AFTERNOON_SESSION', label: '🟢 Đang trong phiên chiều' };
  }

  // Ngoài giờ (trước 09:00 hoặc sau 15:00)
  return { isOpen: false, status: 'CLOSED', label: '🔴 Thị trường đóng cửa (Giá chốt phiên)' };
}
