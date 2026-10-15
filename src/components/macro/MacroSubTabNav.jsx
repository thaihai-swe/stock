import SubTabNav from '../common/SubTabNav.jsx';

export default function MacroSubTabNav({ activeTab = 'regime', onTabChange }) {
  const tabs = [
    {
      id: 'regime',
      icon: '🌀',
      label: 'Chu Kỳ 5 Pha & Radar',
      fullTitle: 'Chu Kỳ 5 Pha & Radar Tín Hiệu Dẫn Dắt',
    },
    {
      id: 'yield_curve',
      icon: '📉',
      label: 'Đường Cong Lợi Suất',
      fullTitle: 'Đường Cong Lợi Suất 17 Dòng TPCP (VN vs US)',
    },
    {
      id: 'allocation',
      icon: '⚖️',
      label: 'Phân Bổ & Giá Vàng',
      fullTitle: 'Phân Bổ 4 Tài Sản, Giá Vàng SJC/PNJ & Liên Thị Trường',
    },
    {
      id: 'indicators',
      icon: '📑',
      label: '95 Chỉ Số Vĩ Mô',
      fullTitle: '95 Chỉ Số Kinh Tế TradingEconomics',
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
