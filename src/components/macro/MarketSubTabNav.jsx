import SubTabNav from '../common/SubTabNav.jsx';

export default function MarketSubTabNav({ activeTab = 'indices', onTabChange }) {
  const tabs = [
    {
      id: 'indices',
      icon: '📈',
      label: 'Chỉ Số & Biểu Đồ',
      fullTitle: 'Chỉ Số & Biểu Đồ Thời Gian Thực (VNINDEX, VN30, HNX, UPCoM)',
    },
    {
      id: 'valuation',
      icon: '🌡️',
      label: 'Định Giá & 25 Năm',
      fullTitle: 'Nhiệt Kế Định Giá 4 Cửa Sổ & Lịch Sử 25 Năm Vietstock',
    },
    {
      id: 'styles',
      icon: '💎',
      label: 'Phân Khúc Vốn Hóa',
      fullTitle: 'So Sánh 4 Phân Khúc: VN30, VN Diamond, VN Midcap & VN-Index',
    },
    {
      id: 'sectors',
      icon: '🗺️',
      label: 'Bản Đồ 10 Ngành',
      fullTitle: 'Bản Đồ Nhiệt & Luân Chuyển Dòng Tiền 10 Nhóm Ngành GICS',
    },
  ];

  return (
    <SubTabNav
      tabs={tabs}
      activeTab={activeTab}
      onChange={onTabChange}
      layout="grid4"
    />
  );
}
