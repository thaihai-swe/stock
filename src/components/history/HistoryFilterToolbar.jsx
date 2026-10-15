import TimeHorizonFilter from '../common/TimeHorizonFilter.jsx';
import SubTabNav from '../common/SubTabNav.jsx';

export default function HistoryFilterToolbar({
  subTab = 'orders',
  setSubTab,
  allTxCount = 0,
  performanceCount = 0,
  tab = 'all',
  setTab,
  pnlFilter = 'all',
  setPnlFilter,
  textSearch = '',
  setTextSearch,
  symbolFilter = '',
  setSymbolFilter,
  uniqueSymbols = [],
  tagFilter = '',
  setTagFilter,
  uniqueTags = [],
  timePreset = 'all',
  setTimePreset,
  handleSelectTimePreset,
  startDate = '',
  setStartDate,
  endDate = '',
  setEndDate,
  handleResetFilters,
  hasFilterActive = false,
  activeFilterCount = 0,
  mobileViewMode = 'card',
  setMobileViewMode,
  showAdvancedFilters = false,
  setShowAdvancedFilters,
}) {
  return (
    <div className="card-base rounded-3xl p-4 sm:p-5 space-y-3.5">
      {/* HÀNG 1: SUB-TAB SWITCHER & VIEW SWITCHER (THẺ / BẢNG) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        {/* Sub-Tab Selector */}
        <SubTabNav
          tabs={[
            { id: 'orders', label: 'Nhật Ký Từng Lệnh', icon: '📑', badge: allTxCount },
            { id: 'performance', label: 'Hiệu Suất Theo Mã', icon: '📊', badge: performanceCount },
          ]}
          activeTab={subTab}
          onChange={setSubTab}
          size="md"
          layout="inline"
          className="w-full sm:w-auto"
        />

        {/* Nút chuyển Thẻ / Bảng cho cả Mobile và Desktop */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <SubTabNav
            tabs={[
              { id: 'card', label: 'Thẻ', icon: '📱' },
              { id: 'table', label: 'Bảng', icon: '📊' },
            ]}
            activeTab={mobileViewMode}
            onChange={setMobileViewMode}
            size="sm"
            layout="inline"
            className="w-auto shrink-0"
          />
        </div>
      </div>

      {/* CHỈ HIỂN THỊ CÁC HÀNG LỌC SAU KHI Ở SUBTAB 'orders' */}
      {subTab === 'orders' && (
        <div className="space-y-3">
          {/* HÀNG 2: TÌM KIẾM NHANH + LOẠI LỆNH (MUA/BÁN) + NÚT MỞ BỘ LỌC NÂNG CAO */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Ô tìm kiếm tức thì */}
            <div className="relative flex-1 min-w-[180px] sm:min-w-[240px]">
              <input
                type="text"
                value={textSearch}
                onChange={e => setTextSearch(e.target.value)}
                placeholder="🔍 Tìm mã CP, ghi chú, thẻ tag..."
                className="input-base text-xs font-semibold pr-8"
              />
              {textSearch && (
                <button
                  type="button"
                  onClick={() => setTextSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Segmented Loại Lệnh: [Tất cả] [🛒 Mua] [💸 Bán] */}
            <SubTabNav
              tabs={[
                { id: 'all', label: 'Tất cả', icon: '🌐' },
                { id: 'buy', label: 'Mua vào', icon: '🛒' },
                { id: 'sell', label: 'Bán ra', icon: '💸' },
              ]}
              activeTab={tab}
              onChange={setTab}
              size="sm"
              layout="inline"
              className="w-auto shrink-0"
            />

            {/* Nút bật/tắt Bộ Lọc Nâng Cao (Advanced Filters) */}
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                showAdvancedFilters || activeFilterCount > 0
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                  : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-750'
              }`}
            >
              <span>⚙️ Bộ Lọc</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* HÀNG 3: CHIP LỌC P&L + PRESET CHU KỲ THỜI GIAN 1-CHẠM + NÚT RESET */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Lọc P&L cho Lệnh Bán */}
              {tab !== 'buy' && (
                <div className="flex items-center bg-gray-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs">
                  <button
                    type="button"
                    onClick={() => setPnlFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                      pnlFilter === 'all'
                        ? 'bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-200 shadow-2xs'
                        : 'text-gray-500 dark:text-slate-400'
                    }`}
                  >
                    Tất cả P&L
                  </button>
                  <button
                    type="button"
                    onClick={() => setPnlFilter('profit')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                      pnlFilter === 'profit'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                    }`}
                  >
                    <span>🟢</span> Lãi
                  </button>
                  <button
                    type="button"
                    onClick={() => setPnlFilter('loss')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                      pnlFilter === 'loss'
                        ? 'bg-rose-600 text-white shadow-2xs'
                        : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                    }`}
                  >
                    <span>🔴</span> Lỗ
                  </button>
                </div>
              )}

              {/* Presets Chu Kỳ Thời Gian & Khoảng Ngày Dùng Chung */}
              <TimeHorizonFilter
                preset={timePreset}
                startDate={startDate}
                endDate={endDate}
                onChange={({ preset, startDate: s, endDate: e }) => {
                  if (setTimePreset) setTimePreset(preset);
                  if (setStartDate) setStartDate(s);
                  if (setEndDate) setEndDate(e);
                }}
                customLabel="Khoảng Ngày Khớp Lệnh:"
                showCustomToggle={true}
                allowExpand={true}
              />
            </div>

            {/* Nút đặt lại bộ lọc */}
            {hasFilterActive && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 transition-colors cursor-pointer ml-auto border border-indigo-200/60 dark:border-indigo-900/40"
              >
                ✕ Đặt lại bộ lọc
              </button>
            )}
          </div>

          {/* HÀNG 4: DRAWER BỘ LỌC NÂNG CAO (MÃ CP, THẺ TAG) */}
          {showAdvancedFilters && (
            <div className="card-nested p-3.5 space-y-3 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Lọc theo mã cổ phiếu */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    Mã Cổ Phiếu:
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={symbolFilter}
                      onChange={e => setSymbolFilter(e.target.value.toUpperCase())}
                      placeholder="VD: HPG..."
                      className="input-base font-bold uppercase"
                    />
                    {uniqueSymbols.length > 0 && (
                      <select
                        value={symbolFilter}
                        onChange={e => setSymbolFilter(e.target.value)}
                        className="select-base text-xs font-bold"
                      >
                        <option value="">Tất cả mã</option>
                        {uniqueSymbols.map(sym => (
                          <option key={sym} value={sym}>{sym}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Lọc theo Thẻ / Tag Kỷ Luật */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    Thẻ Kỷ Luật:
                  </label>
                  <select
                    value={tagFilter}
                    onChange={e => setTagFilter(e.target.value)}
                    className="select-base text-xs font-medium"
                  >
                    <option value="">-- Tất cả thẻ tag --</option>
                    {uniqueTags.map(tag => (
                      <option key={tag} value={tag}>#{tag}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
