import { useState } from 'react';
import MonthlyPLChart from '../charts/MonthlyPLChart.jsx';
import PortfolioChart from '../charts/PortfolioChart.jsx';
import StockContributionChart from '../charts/StockContributionChart.jsx';
import WaterfallReturnChart from '../charts/WaterfallReturnChart.jsx';
import BenchmarkComparisonChart from '../charts/BenchmarkComparisonChart.jsx';
import RealPurchasingPowerCard from './RealPurchasingPowerCard.jsx';
import { TIMEFRAME_IDS } from '../../utils/timeframe.js';

export default function DashboardAnalyticsHub({
  portfolio = [],
  buyOrders = [],
  sellOrders = [],
  dividends = [],
  marketPrices = {},
  fundamentalsMap = {},
  timeWindow = TIMEFRAME_IDS.ALL,
  periodLabel = 'Toàn Thời Gian',
  onSelectSymbolModal,
}) {
  const [activeTab, setActiveTab] = useState('benchmark'); // 'benchmark' | 'monthly' | 'allocation' | 'waterfall' | 'contribution' | 'real_return'
  const [viewMode, setViewMode] = useState('tabs'); // 'tabs' | 'grid'

  const tabs = [
    {
      id: 'benchmark',
      label: 'Tương Quan vs VN-Index',
      shortLabel: 'vs VN-Index',
      icon: '⚔️',
      desc: 'So sánh tỷ suất sinh lời danh mục (%) trực tiếp với chỉ số thị trường VN-Index theo thời gian',
    },
    {
      id: 'monthly',
      label: 'Lãi/Lỗ & Quỹ Đạo Vốn',
      shortLabel: 'Quỹ Đạo Vốn',
      icon: '📊',
      desc: `Lợi nhuận thực nhận từng tháng và đường tích lũy ${timeWindow !== TIMEFRAME_IDS.ALL ? `(${periodLabel})` : ''}`,
    },
    {
      id: 'allocation',
      label: 'Cấu Trúc Phân Bổ',
      shortLabel: 'Phân Bổ',
      icon: '🥧',
      desc: 'Tỷ trọng vốn danh mục theo Mã Cổ Phiếu hoặc theo Nhóm Ngành GICS',
    },
    {
      id: 'waterfall',
      label: 'Thác Nước Dòng Tiền',
      shortLabel: 'Thác Nước',
      icon: '🌊',
      desc: `Dòng chảy vốn: Vốn gốc → Lãi chốt → Cổ tức → Tạm tính ${timeWindow !== TIMEFRAME_IDS.ALL ? `(${periodLabel})` : ''}`,
    },
    {
      id: 'contribution',
      label: 'Đóng Góp Hiệu Suất Mã',
      shortLabel: 'Đóng Góp Mã',
      icon: '🎯',
      desc: `Xếp hạng Top cổ phiếu đóng góp lãi/lỗ nhiều nhất ${timeWindow !== TIMEFRAME_IDS.ALL ? `(${periodLabel})` : ''}`,
    },
    {
      id: 'real_return',
      label: 'Sức Mua Thực Tế vs Lạm Phát',
      shortLabel: 'Sức Mua Thực',
      icon: '🛡️',
      desc: 'Khấu trừ lạm phát CPI theo phương trình Fisher, đo lường lượng tiền bị bào mòn và đối chiếu 4 kênh tài sản',
    },
  ];

  const currentTabObj = tabs.find(t => t.id === activeTab) || tabs[0];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 p-5 sm:p-6 space-y-4">
      {/* 1. HEADER: TIÊU ĐỀ & CHẾ ĐỘ XEM */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-gray-800 dark:text-slate-100 text-base sm:text-lg flex items-center gap-2">
              <span>📈</span> Trung Tâm Phân Tích Kỹ Thuật & Hiệu Suất
            </h3>
            {timeWindow !== TIMEFRAME_IDS.ALL && (
              <span className="text-xs bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-full font-bold border border-indigo-100 dark:border-indigo-900/40">
                {periodLabel}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
            {viewMode === 'tabs' ? currentTabObj.desc : 'Toàn cảnh 4 phân hệ phân tích trực quan'}
          </p>
        </div>

        {/* Chuyển đổi Dạng Tab hoặc Dạng Lưới 2x2 Bento */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl text-xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('tabs')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'tabs'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700'
            }`}
          >
            <span>📑</span>
            <span className="sm:hidden">Tab (Gọn)</span>
            <span className="hidden sm:inline">Chế độ Tab (Gọn)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700'
            }`}
          >
            <span>⊞</span>
            <span className="sm:hidden">Lưới 2x2</span>
            <span className="hidden sm:inline">Lưới 2x2 (Bento)</span>
          </button>
        </div>
      </div>

      {/* 2. TAB SELECTOR (KHI Ở CHẾ ĐỘ TABS) */}
      {viewMode === 'tabs' && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 sm:gap-1.5 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-gray-50 dark:bg-slate-800/80 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200/60 dark:border-slate-700/60'
                }`}
              >
                <span>{tab.icon}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 3. NỘI DUNG BIỂU ĐỒ */}
      {viewMode === 'tabs' ? (
        /* CHẾ ĐỘ 1 TAB ĐƠN: Render duy nhất biểu đồ đang chọn (Gọn gàng, không cuộn dài) */
        <div className="pt-2 min-h-[380px]">
          {activeTab === 'benchmark' && (
            <BenchmarkComparisonChart
              buyOrders={buyOrders}
              sellOrders={sellOrders}
              dividends={dividends}
              portfolio={portfolio}
              marketPrices={marketPrices}
              fundamentalsMap={fundamentalsMap}
            />
          )}

          {activeTab === 'monthly' && (
            <MonthlyPLChart sellOrders={sellOrders} dividends={dividends} />
          )}

          {activeTab === 'allocation' && (
            <PortfolioChart
              portfolio={portfolio}
              fundamentalsMap={fundamentalsMap}
              marketPrices={marketPrices}
            />
          )}

          {activeTab === 'waterfall' && (
            <WaterfallReturnChart
              buyOrders={buyOrders}
              sellOrders={sellOrders}
              portfolio={portfolio}
              dividends={dividends}
              marketPrices={marketPrices}
            />
          )}

          {activeTab === 'contribution' && (
            <StockContributionChart
              buyOrders={buyOrders}
              sellOrders={sellOrders}
              dividends={dividends}
              marketPrices={marketPrices}
              onSelectSymbol={onSelectSymbolModal}
            />
          )}

          {activeTab === 'real_return' && (
            <RealPurchasingPowerCard
              portfolio={portfolio}
              buyOrders={buyOrders}
              sellOrders={sellOrders}
              dividends={dividends}
              marketPrices={marketPrices}
            />
          )}
        </div>
      ) : (
        /* CHẾ ĐỘ LƯỚI BENTO GRID: Render biểu đồ tương quan VN-Index nổi bật và 4 biểu đồ bổ trợ */
        <div className="space-y-4 pt-2">
          {/* Card Tiêu Điểm: Tương quan Lợi nhuận vs VN-Index */}
          <div className="bg-gray-50/60 dark:bg-slate-950/60 p-4 rounded-2xl border border-gray-100 dark:border-slate-800">
            <BenchmarkComparisonChart
              buyOrders={buyOrders}
              sellOrders={sellOrders}
              dividends={dividends}
              portfolio={portfolio}
              marketPrices={marketPrices}
              fundamentalsMap={fundamentalsMap}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Card 1: Monthly PL */}
            <div className="bg-gray-50/60 dark:bg-slate-950/60 p-4 rounded-2xl border border-gray-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-gray-700 dark:text-slate-200 flex items-center gap-1.5">
                  <span>📊</span> Lãi / Lỗ & Quỹ Đạo Vốn
                </h4>
              </div>
              <MonthlyPLChart sellOrders={sellOrders} dividends={dividends} />
            </div>

            {/* Card 2: Portfolio Allocation */}
            <div className="bg-gray-50/60 dark:bg-slate-950/60 p-4 rounded-2xl border border-gray-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-gray-700 dark:text-slate-200 flex items-center gap-1.5">
                  <span>🥧</span> Cấu Trúc Phân Bổ Vốn
                </h4>
              </div>
              <PortfolioChart
                portfolio={portfolio}
                fundamentalsMap={fundamentalsMap}
                marketPrices={marketPrices}
              />
            </div>

            {/* Card 3: Waterfall */}
            <div className="bg-gray-50/60 dark:bg-slate-950/60 p-4 rounded-2xl border border-gray-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-gray-700 dark:text-slate-200 flex items-center gap-1.5">
                  <span>🌊</span> Thác Nước Dòng Tiền Lợi Nhuận
                </h4>
              </div>
              <WaterfallReturnChart
                buyOrders={buyOrders}
                sellOrders={sellOrders}
                portfolio={portfolio}
                dividends={dividends}
                marketPrices={marketPrices}
              />
            </div>

            {/* Card 4: Contribution */}
            <div className="bg-gray-50/60 dark:bg-slate-950/60 p-4 rounded-2xl border border-gray-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-gray-700 dark:text-slate-200 flex items-center gap-1.5">
                  <span>🎯</span> Đóng Góp Hiệu Suất Từng Mã
                </h4>
              </div>
              <StockContributionChart
                buyOrders={buyOrders}
                sellOrders={sellOrders}
                dividends={dividends}
                marketPrices={marketPrices}
                onSelectSymbol={onSelectSymbolModal}
              />
            </div>

            {/* Card 5: Real Purchasing Power vs Inflation */}
            <div className="bg-gray-50/60 dark:bg-slate-950/60 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 lg:col-span-2">
              <RealPurchasingPowerCard
                portfolio={portfolio}
                buyOrders={buyOrders}
                sellOrders={sellOrders}
                dividends={dividends}
                marketPrices={marketPrices}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
