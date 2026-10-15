import SubTabNav from '../common/SubTabNav.jsx';

export default function MacroSubTabNav({ activeTab = 'regime', onTabChange }) {
  const tabs = [
    {
      id: 'regime',
      icon: '🌀',
      label: 'Chu Kỳ 5 Pha & Clock',
      fullTitle: 'Chu Kỳ 5 Pha, Macro Clock & Tín Hiệu Sớm Dẫn Dắt',
    },
    {
      id: 'liquidity',
      icon: '⚡',
      label: 'Thanh Khoản SBV & TPCP',
      fullTitle: 'Radar Bơm/Hút Tiền SBV & Đường Cong Lợi Suất 17 Kỳ Hạn (VnBondLab)',
    },
    {
      id: 'allocation',
      icon: '⚖️',
      label: 'Kịch Bản & Phân Bổ Đa TS',
      fullTitle: 'Ma Trận 3 Kịch Bản, Phân Bổ 4 Lớp Tài Sản & Giá Vàng SJC/PNJ',
    },
    {
      id: 'indicators',
      icon: '📑',
      label: '95 Chỉ Số Vĩ Mô',
      fullTitle: 'Kho 95 Chỉ Số Kinh Tế TradingEconomics 10 Nhóm',
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
