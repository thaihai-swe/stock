import { useState, useMemo } from 'react';

export default function SectorValuationHeatmap({ dualMatrix = {}, sectorValuations = [], vnindexPE = 10.72 }) {
  const [viewMode, setViewMode] = useState('dual_matrix'); // 'dual_matrix' | 'heatmap' | 'table'
  const [selectedQuadrant, setSelectedQuadrant] = useState('all'); // 'all' | 'sweet_spot' | 'value_trap' | 'momentum' | 'defense'

  const items = dualMatrix?.items || sectorValuations || [];
  const stats = dualMatrix?.stats || {};
  const quadrants = dualMatrix?.quadrants || {};

  const filteredItems = useMemo(() => {
    if (selectedQuadrant === 'all') return items;
    return items.filter((it) => it.quadrantKey === selectedQuadrant);
  }, [items, selectedQuadrant]);

  if (!items || items.length === 0) {
    return null;
  }

  const QUADRANT_CONFIGS = {
    sweet_spot: {
      title: 'Vùng Vàng Gom Mua (Sweet Spot)',
      icon: '💎',
      badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      headerBg: 'from-emerald-500/15 via-emerald-500/5 to-transparent',
      borderColor: 'border-emerald-500/40',
      desc: 'Thiên thời hội tụ: Định giá rẻ kết hợp vĩ mô ủng hộ. Ưu tiên giải ngân chủ động tích sản dài hạn.',
      items: quadrants.sweetSpot || [],
    },
    value_trap: {
      title: 'Vùng Bẫy Giá Rẻ (Value Trap)',
      icon: '⚠️',
      badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
      headerBg: 'from-amber-500/15 via-amber-500/5 to-transparent',
      borderColor: 'border-amber-500/40',
      desc: 'Định giá rất rẻ nhưng chịu áp lực vĩ mô / đòn bẩy. Nên chia nhỏ tỷ trọng gom từng nhịp hoặc chờ tín hiệu đảo chiều.',
      items: quadrants.valueTrap || [],
    },
    momentum: {
      title: 'Vùng Quá Nhiệt (Momentum / Overheated)',
      icon: '🔥',
      badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
      headerBg: 'from-purple-500/15 via-purple-500/5 to-transparent',
      borderColor: 'border-purple-500/40',
      desc: 'Động lực vĩ mô mạnh mẽ nhưng định giá đã vượt đỉnh lịch sử. Phù hợp giao dịch ngắn hạn theo dòng tiền, quản trị rủi ro chặt chẽ.',
      items: quadrants.momentum || [],
    },
    defense: {
      title: 'Vùng Phòng Thủ / Tránh Né (Defense)',
      icon: '🛡️',
      badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
      headerBg: 'from-rose-500/15 via-rose-500/5 to-transparent',
      borderColor: 'border-rose-500/40',
      desc: 'Vĩ mô bất lợi và định giá không hấp dẫn. Khuyến nghị đứng ngoài hoặc chủ động hạ tỷ trọng.',
      items: quadrants.defense || [],
    },
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-xs p-5 sm:p-7 space-y-6">
      {/* ── 1. HEADER & THỐNG KÊ TỔNG QUAN ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-gray-100 dark:border-gray-700/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Định Giá Ngành Thực Tế & Thiên Thời Hội Tụ
            </span>
            <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200/50">
              GICS Vietnam · 2.000+ Cổ Phiếu
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-1">
            Bản Đồ Nhiệt 10 Ngành & Ma Trận Thiên Thời (Dual Sweet Spot)
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Đối chiếu 2 chiều định lượng: Định Giá Thực Tế (P/E, P/B toàn ngành) × Động Lực Vĩ Mô (Net Impact Score từ 6 biến số chu kỳ).
          </p>
        </div>

        {/* Chuyển đổi 3 chế độ xem */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-gray-700/50 rounded-2xl border border-gray-200/60 dark:border-gray-600 self-start lg:self-auto">
          {[
            { id: 'dual_matrix', label: '💎 Ma Trận Thiên Thời', desc: '4 Góc phần tư' },
            { id: 'heatmap', label: '🔥 Bản Đồ Nhiệt P/E', desc: 'Xếp hạng rẻ đến đắt' },
            { id: 'table', label: '📋 Bảng Chi Tiết', desc: 'Số liệu BCTC' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setViewMode(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                viewMode === tab.id
                  ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 2. METRIC CARDS TỔNG QUAN THỊ TRƯỜNG NGÀNH ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700/60 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">P/E TB 10 Ngành</div>
          <div className="text-xl font-black text-gray-900 dark:text-white flex items-baseline gap-1.5">
            <span>{stats.avgSectorPE || 11.14}x</span>
            <span className="text-[10px] font-bold text-gray-400">vs VN-Index {vnindexPE}x</span>
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400">Trung vị toàn thị trường</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700/60 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">P/B TB 10 Ngành</div>
          <div className="text-xl font-black text-gray-900 dark:text-white">
            {stats.avgSectorPB || 2.38}x
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400">Hệ số giá trên giá trị sổ sách</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <span>💎</span> Vùng Vàng Gom Mua
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
            {stats.sweetSpotCount || 4} Ngành
          </div>
          <div className="text-[10px] text-emerald-700 dark:text-emerald-300">Vĩ mô ủng hộ & P/E hấp dẫn</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Ngành Định Giá Rẻ Nhất</div>
          <div className="text-base font-black text-blue-600 dark:text-blue-400 truncate">
            {stats.cheapestSector || 'Tiện ích (8.26x)'}
          </div>
          <div className="text-[10px] text-blue-700 dark:text-blue-300">Biên an toàn định giá cao nhất</div>
        </div>
      </div>

      {/* ── 3. CHẾ ĐỘ 1: MA TRẬN THIÊN THỜI HỘI TỤ (DUAL SWEET SPOT MATRIX) ── */}
      {viewMode === 'dual_matrix' && (
        <div className="space-y-5">
          {/* Bộ lọc góc phần tư */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Lọc theo phân vùng:</span>
            {[
              { id: 'all', label: `Tất cả (${items.length})` },
              { id: 'sweet_spot', label: `💎 Vùng Vàng (${stats.sweetSpotCount || 0})` },
              { id: 'value_trap', label: `⚠️ Bẫy Giá Rẻ (${stats.valueTrapCount || 0})` },
              { id: 'momentum', label: `🔥 Quá Nhiệt (${stats.momentumCount || 0})` },
              { id: 'defense', label: `🛡️ Phòng Thủ (${stats.defenseCount || 0})` },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedQuadrant(f.id)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  selectedQuadrant === f.id
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Lưới 4 Góc Phần Tư Chiến Lược */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {Object.entries(QUADRANT_CONFIGS).map(([qKey, cfg]) => {
              if (selectedQuadrant !== 'all' && selectedQuadrant !== qKey) return null;
              const qItems = cfg.items || [];

              return (
                <div
                  key={qKey}
                  className={`rounded-3xl border ${cfg.borderColor} bg-gradient-to-b ${cfg.headerBg} p-5 space-y-4`}
                >
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-gray-200/50 dark:border-gray-700/50">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{cfg.icon}</span>
                        <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">
                          {cfg.title}
                        </h4>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${cfg.badge}`}>
                          {qItems.length} ngành
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                        {cfg.desc}
                      </p>
                    </div>
                  </div>

                  {qItems.length === 0 ? (
                    <div className="text-xs text-gray-400 italic py-4 text-center">
                      Không có nhóm ngành nào trong phân vùng này ở kỳ phân tích hiện tại.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {qItems.map((sec) => (
                        <div
                          key={sec.code}
                          className="p-3.5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80 shadow-2xs space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{sec.icon}</span>
                              <div>
                                <span className="text-xs font-black text-gray-900 dark:text-white block">
                                  {sec.name}
                                </span>
                                <span className="text-[10px] font-bold text-gray-400">
                                  {sec.code} · {sec.totalTickers} cổ phiếu
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${sec.valuationBadge}`}>
                                P/E: {sec.pe}x ({sec.valuationBand})
                              </span>
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                                sec.macroScore >= 1.0 ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                                sec.macroScore >= 0.0 ? 'bg-teal-500/15 text-teal-600 dark:text-teal-400' :
                                'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                              }`}>
                                Vĩ mô: {sec.macroScore > 0 ? `+${sec.macroScore}` : sec.macroScore}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-2 pt-1 border-t border-gray-50 dark:border-gray-700/50 text-[11px]">
                            <div>
                              <span className="text-[9px] text-gray-400 block uppercase">P/B</span>
                              <span className="font-bold text-gray-700 dark:text-gray-300">{sec.pb}x</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-gray-400 block uppercase">Cổ Tức</span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">{sec.divYield}%</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-gray-400 block uppercase">Vốn Hóa</span>
                              <span className="font-bold text-gray-700 dark:text-gray-300">{Number(sec.marketCapBn).toLocaleString()} Tỷ</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-gray-400 block uppercase">YTD</span>
                              <span className={`font-bold ${sec.pricePctChgYtd >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {sec.pricePctChgYtd > 0 ? `+${sec.pricePctChgYtd}` : sec.pricePctChgYtd}%
                              </span>
                            </div>
                          </div>

                          <div className="text-[11px] text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 p-2 rounded-xl">
                            <span className="font-bold text-indigo-600 dark:text-indigo-400 mr-1">Định hướng:</span>
                            {sec.recommendation}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 4. CHẾ ĐỘ 2: BẢN ĐỒ NHIỆT ĐỊNH GIÁ 10 NGÀNH (HEATMAP SORTED BY P/E) ── */}
      {viewMode === 'heatmap' && (
        <div className="space-y-4">
          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
            <span>Sắp xếp từ ngành có định giá rẻ nhất đến đắt nhất so với toàn thị trường:</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">Mốc chuẩn VN-Index: {vnindexPE}x</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {items
              .slice()
              .sort((a, b) => (a.pe || 99) - (b.pe || 99))
              .map((sec, idx) => {
                const diffVNIndex = +((((sec.pe || 12) - vnindexPE) / vnindexPE) * 100).toFixed(1);
                const isCheaper = diffVNIndex <= 0;

                return (
                  <div
                    key={sec.code}
                    className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80 shadow-2xs space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl">{sec.icon}</span>
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500">
                          #{idx + 1}
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-gray-900 dark:text-white mt-2">
                        {sec.name}
                      </h4>
                      <span className="text-[10px] text-gray-400 font-bold block">{sec.code}</span>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-gray-50 dark:border-gray-700/60">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-gray-400 font-bold">P/E Hiện Tại</span>
                        <span className="text-lg font-black text-gray-900 dark:text-white">{sec.pe}x</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-400">vs VN-Index:</span>
                        <span className={`font-black ${isCheaper ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {diffVNIndex > 0 ? `+${diffVNIndex}` : diffVNIndex}% {isCheaper ? 'Rẻ hơn' : 'Đắt hơn'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-400">P/B:</span>
                        <span className="font-bold text-gray-700 dark:text-gray-300">{sec.pb}x</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-400">Cổ tức:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{sec.divYield}%</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-50 dark:border-gray-700/60 flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${sec.valuationBadge}`}>
                        {sec.valuationBand}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400">
                        {sec.totalTickers} mã
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ── 5. CHẾ ĐỘ 3: BẢNG SỐ LIỆU TOÀN DIỆN 10 NGÀNH (DATA TABLE) ── */}
      {viewMode === 'table' && (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-700">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-gray-900/60 text-gray-400 uppercase text-[10px] font-black border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="p-3.5">Nhóm Ngành (GICS)</th>
                <th className="p-3.5 text-center">P/E</th>
                <th className="p-3.5 text-center">P/B</th>
                <th className="p-3.5 text-center">Cổ Tức</th>
                <th className="p-3.5 text-right">Vốn Hóa (Tỷ VNĐ)</th>
                <th className="p-3.5 text-center">Số Cổ Phiếu</th>
                <th className="p-3.5 text-center">Tăng Trưởng LNST</th>
                <th className="p-3.5 text-center">YTD (%)</th>
                <th className="p-3.5 text-center">Phân Vùng Thiên Thời</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 text-gray-700 dark:text-gray-300">
              {items.map((sec) => (
                <tr key={sec.code} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition">
                  <td className="p-3.5 font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="text-lg">{sec.icon}</span>
                    <div>
                      <div>{sec.name}</div>
                      <div className="text-[10px] text-gray-400 font-normal">{sec.code} · {sec.gicsGroup}</div>
                    </div>
                  </td>
                  <td className="p-3.5 text-center font-black">
                    <span className={`px-2 py-0.5 rounded-lg border ${sec.valuationBadge}`}>
                      {sec.pe}x
                    </span>
                  </td>
                  <td className="p-3.5 text-center font-bold">{sec.pb}x</td>
                  <td className="p-3.5 text-center font-bold text-emerald-600 dark:text-emerald-400">{sec.divYield}%</td>
                  <td className="p-3.5 text-right font-bold">{Number(sec.marketCapBn).toLocaleString()}</td>
                  <td className="p-3.5 text-center font-medium">{sec.totalTickers}</td>
                  <td className={`p-3.5 text-center font-bold ${
                    (sec.netIncomeLtmGrowth || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'
                  }`}>
                    {sec.netIncomeLtmGrowth != null ? `${sec.netIncomeLtmGrowth > 0 ? '+' : ''}${sec.netIncomeLtmGrowth}%` : '---'}
                  </td>
                  <td className={`p-3.5 text-center font-bold ${
                    (sec.pricePctChgYtd || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'
                  }`}>
                    {sec.pricePctChgYtd != null ? `${sec.pricePctChgYtd > 0 ? '+' : ''}${sec.pricePctChgYtd}%` : '---'}
                  </td>
                  <td className="p-3.5 text-center">
                    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase ${sec.quadrantBadge}`}>
                      {sec.quadrantIcon} {sec.quadrantKey === 'sweet_spot' ? 'GOM MUA' : sec.quadrantKey === 'value_trap' ? 'BẪY RẺ' : sec.quadrantKey === 'momentum' ? 'QUÁ NHIỆT' : 'PHÒNG THỦ'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
