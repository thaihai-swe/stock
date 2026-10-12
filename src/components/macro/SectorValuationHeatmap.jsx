import React, { useState, useMemo } from 'react';

export default function SectorValuationHeatmap({
  dualMatrix = {},
  sectorValuations = [],
  sectorRotation = [],
  vnindexPE = null,
  regime = {},
}) {
  const [viewMode, setViewMode] = useState('dual_matrix'); // 'dual_matrix' | 'table'
  const [selectedQuadrant, setSelectedQuadrant] = useState('all'); // 'all' | 'sweet_spot' | 'value_trap' | 'momentum' | 'defense'
  const [sortBy, setSortBy] = useState('quadrant'); // 'quadrant' | 'pe_asc' | 'macro_desc' | 'market_cap' | 'ytd'
  const [expandedSectorCode, setExpandedSectorCode] = useState(null);
  const [expandedTableRowCode, setExpandedTableRowCode] = useState(null);

  // Danh sách 10 nhóm ngành đã được tính toán hợp nhất
  const items = useMemo(() => {
    return dualMatrix?.items || sectorValuations || [];
  }, [dualMatrix, sectorValuations]);

  const stats = dualMatrix?.stats || {};
  const quadrants = dualMatrix?.quadrants || {};

  // Tính thứ hạng P/E (#1 rẻ nhất) và thứ hạng Vĩ Mô (#1 điểm cao nhất)
  const peRankMap = useMemo(() => {
    const sorted = [...items].sort((a, b) => (a.pe || 99) - (b.pe || 99));
    const map = {};
    sorted.forEach((it, idx) => {
      map[it.code] = idx + 1;
    });
    return map;
  }, [items]);

  const macroRankMap = useMemo(() => {
    const sorted = [...items].sort((a, b) => (b.macroScore ?? -99) - (a.macroScore ?? -99));
    const map = {};
    sorted.forEach((it, idx) => {
      map[it.code] = idx + 1;
    });
    return map;
  }, [items]);

  // Lọc và sắp xếp danh sách ngành
  const processedItems = useMemo(() => {
    let list = [...items];
    if (selectedQuadrant !== 'all') {
      list = list.filter((it) => it.quadrantKey === selectedQuadrant);
    }

    if (sortBy === 'pe_asc') {
      list.sort((a, b) => (a.pe || 99) - (b.pe || 99));
    } else if (sortBy === 'macro_desc') {
      list.sort((a, b) => (b.macroScore ?? -99) - (a.macroScore ?? -99));
    } else if (sortBy === 'market_cap') {
      list.sort((a, b) => (b.marketCapBn || 0) - (a.marketCapBn || 0));
    } else if (sortBy === 'ytd') {
      list.sort((a, b) => (b.pricePctChgYtd || -999) - (a.pricePctChgYtd || -999));
    }

    return list;
  }, [items, selectedQuadrant, sortBy]);

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

  // Render lưới 6 động lực vĩ mô dùng chung cho thẻ và dòng mở rộng
  const renderDecomposition = (dec = {}) => (
    <div className="pt-3 border-t border-gray-100 dark:border-gray-700/60 space-y-2 text-xs">
      <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center justify-between">
        <span>Đóng góp của 6 Động Lực Vĩ Mô Vào Net Score:</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
        <div className="p-2 rounded-xl bg-gray-50/70 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700/60 flex justify-between items-center">
          <span className="text-gray-500 dark:text-gray-400">⚡ Liên ngân hàng:</span>
          <b className={(dec.interbank || 0) > 0 ? 'text-emerald-500 font-black' : (dec.interbank || 0) < 0 ? 'text-rose-500 font-black' : 'text-gray-400'}>
            {(dec.interbank || 0) > 0 ? `+${dec.interbank}` : (dec.interbank || 0)}
          </b>
        </div>
        <div className="p-2 rounded-xl bg-gray-50/70 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700/60 flex justify-between items-center">
          <span className="text-gray-500 dark:text-gray-400">🏦 Lãi suất SBV:</span>
          <b className={(dec.sbvRate || 0) > 0 ? 'text-emerald-500 font-black' : (dec.sbvRate || 0) < 0 ? 'text-rose-500 font-black' : 'text-gray-400'}>
            {(dec.sbvRate || 0) > 0 ? `+${dec.sbvRate}` : (dec.sbvRate || 0)}
          </b>
        </div>
        <div className="p-2 rounded-xl bg-gray-50/70 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700/60 flex justify-between items-center">
          <span className="text-gray-500 dark:text-gray-400">📈 Lạm phát CPI:</span>
          <b className={(dec.cpi || 0) > 0 ? 'text-emerald-500 font-black' : (dec.cpi || 0) < 0 ? 'text-rose-500 font-black' : 'text-gray-400'}>
            {(dec.cpi || 0) > 0 ? `+${dec.cpi}` : (dec.cpi || 0)}
          </b>
        </div>
        <div className="p-2 rounded-xl bg-gray-50/70 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700/60 flex justify-between items-center">
          <span className="text-gray-500 dark:text-gray-400">💵 Tỷ giá USD/VND:</span>
          <b className={(dec.usdVnd || 0) > 0 ? 'text-emerald-500 font-black' : (dec.usdVnd || 0) < 0 ? 'text-rose-500 font-black' : 'text-gray-400'}>
            {(dec.usdVnd || 0) > 0 ? `+${dec.usdVnd}` : (dec.usdVnd || 0)}
          </b>
        </div>
        <div className="p-2 rounded-xl bg-gray-50/70 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700/60 flex justify-between items-center">
          <span className="text-gray-500 dark:text-gray-400">🛢️ Giá dầu Brent:</span>
          <b className={(dec.oil || 0) > 0 ? 'text-emerald-500 font-black' : (dec.oil || 0) < 0 ? 'text-rose-500 font-black' : 'text-gray-400'}>
            {(dec.oil || 0) > 0 ? `+${dec.oil}` : (dec.oil || 0)}
          </b>
        </div>
        <div className="p-2 rounded-xl bg-gray-50/70 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700/60 flex justify-between items-center">
          <span className="text-gray-500 dark:text-gray-400">🏭 PMI Sản xuất:</span>
          <b className={(dec.pmi || 0) > 0 ? 'text-emerald-500 font-black' : (dec.pmi || 0) < 0 ? 'text-rose-500 font-black' : 'text-gray-400'}>
            {(dec.pmi || 0) > 0 ? `+${dec.pmi}` : (dec.pmi || 0)}
          </b>
        </div>
      </div>
    </div>
  );

  // Render thẻ ngành hợp nhất (Toàn diện P/E Heatmap + BCTC + 6 Động Lực Vĩ Mô)
  const renderSectorCard = (sec) => {
    const isExpanded = expandedSectorCode === sec.code;
    const diffVNIndex = vnindexPE ? +((((sec.pe || 12) - vnindexPE) / vnindexPE) * 100).toFixed(1) : null;
    const isCheaper = diffVNIndex != null ? diffVNIndex <= 0 : false;
    const pRank = peRankMap[sec.code] || '-';
    const mRank = macroRankMap[sec.code] || '-';

    return (
      <div
        key={sec.code}
        className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80 shadow-2xs space-y-3 transition hover:border-indigo-300 dark:hover:border-indigo-700"
      >
        {/* Header: Tên ngành, Icon, Mã & Thứ hạng */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{sec.icon}</span>
            <div>
              <span className="text-sm font-black text-gray-900 dark:text-white block">
                {sec.name}
              </span>
              <span className="text-[10px] font-bold text-gray-400">
                {sec.code} · {sec.totalTickers} cổ phiếu
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-black" title="Xếp hạng định giá P/E (1 = rẻ nhất)">
              P/E #{pRank}
            </span>
            <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-black border border-indigo-200/40" title="Xếp hạng tác động vĩ mô (1 = hưởng lợi nhất)">
              Vĩ Mô #{mRank}
            </span>
          </div>
        </div>

        {/* Khối P/E Heatmap & So sánh với VN-Index */}
        <div className="p-3 rounded-xl bg-gray-50/80 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700/60 space-y-2">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">P/E Ngành:</span>
              <span className="text-lg font-black text-gray-900 dark:text-white">{sec.pe}x</span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${sec.valuationBadge}`}>
                {sec.valuationBand}
              </span>
            </div>

            {diffVNIndex != null && (
              <div className="text-right">
                <span className={`text-xs font-black flex items-center justify-end gap-1 ${isCheaper ? 'text-emerald-500' : 'text-rose-500'}`}>
                  <span>{isCheaper ? '📉' : '📈'}</span>
                  <span>{diffVNIndex > 0 ? `+${diffVNIndex}` : diffVNIndex}%</span>
                  <span className="text-[10px] font-bold">({isCheaper ? 'Rẻ hơn' : 'Đắt hơn'})</span>
                </span>
              </div>
            )}
          </div>

          {/* Thanh so sánh tương quan P/E so với mốc VN-Index */}
          {vnindexPE != null && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>Độ lệch P/E vs VN-Index ({vnindexPE}x):</span>
                <span className="font-bold">{isCheaper ? `Thấp hơn ${(vnindexPE - (sec.pe || 0)).toFixed(1)}x` : `Cao hơn ${((sec.pe || 0) - vnindexPE).toFixed(1)}x`}</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isCheaper ? 'bg-emerald-500' : 'bg-rose-500'}`}
                  style={{ width: `${Math.min(100, Math.max(10, ((sec.pe || 10) / 20) * 100))}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 4 Chỉ số BCTC cơ bản */}
        <div className="grid grid-cols-4 gap-2 text-[11px] pt-1">
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
            <span className="font-bold text-gray-700 dark:text-gray-300 truncate block">
              {Number(sec.marketCapBn).toLocaleString()} Tỷ
            </span>
          </div>
          <div>
            <span className="text-[9px] text-gray-400 block uppercase">YTD</span>
            <span className={`font-bold ${(sec.pricePctChgYtd || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {(sec.pricePctChgYtd || 0) > 0 ? `+${sec.pricePctChgYtd}` : sec.pricePctChgYtd}%
            </span>
          </div>
        </div>

        {/* Khối Điểm Vĩ Mô & Khuyến Nghị Hành Động */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700/60">
          <div className="flex items-center gap-1.5">
            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${sec.colorClass || 'text-gray-700 bg-gray-100'}`}>
              {sec.actionTag || sec.macroAction || 'Trung Lập'}
            </span>
            <span
              className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                (sec.macroScore ?? 0) >= 1.0
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : (sec.macroScore ?? 0) >= 0.0
                  ? 'bg-teal-500/15 text-teal-600 dark:text-teal-400'
                  : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
              }`}
            >
              Net Score: {(sec.macroScore ?? 0) > 0 ? `+${sec.macroScore}` : sec.macroScore}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setExpandedSectorCode(isExpanded ? null : sec.code)}
            className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
          >
            <span>{isExpanded ? '▲ Thu gọn' : '▼ 6 Động lực'}</span>
          </button>
        </div>

        {/* Khuyến nghị hành động */}
        <div className="text-[11px] text-gray-600 dark:text-gray-400 bg-gray-50/60 dark:bg-gray-900/40 p-2.5 rounded-xl leading-relaxed">
          <span className="font-bold text-indigo-600 dark:text-indigo-400 mr-1">Chiến lược:</span>
          {sec.recommendation}
        </div>

        {/* Phân rã 6 Động lực khi mở xem */}
        {isExpanded && renderDecomposition(sec.decomposition)}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-xs p-5 sm:p-7 space-y-6">
      {/* ── 1. HEADER & CHUYỂN ĐỔI CHẾ ĐỘ XEM (CHỈ CÒN 2 CHẾ ĐỘ TINH GỌN) ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-gray-100 dark:border-gray-700/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Định Giá Thực Tế & Tác Động Vĩ Mô Chu Kỳ
            </span>
            <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200/50">
              GICS Vietnam · 10 Ngành · 2.000+ CP
            </span>
            {regime?.titleVi && (
              <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-[10px] font-bold">
                Pha: {regime.titleVi}
              </span>
            )}
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-1">
            Bản Đồ Nhiệt 10 Ngành & Ma Trận Thiên Thời Hội Tụ
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Hợp nhất 2 chiều: Định Giá Thực Tế (P/E Heatmap vs VN-Index) × Động Lực Vĩ Mô (Net Score & Phân rã 6 biến số chu kỳ).
          </p>
        </div>

        {/* Thanh chuyển đổi 2 chế độ xem hợp nhất */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-gray-100 dark:bg-gray-700/50 rounded-2xl border border-gray-200/60 dark:border-gray-600 self-start lg:self-auto">
          {[
            { id: 'dual_matrix', label: '💎 Ma Trận Thiên Thời & Bản Đồ Nhiệt', desc: '4 Phân vùng chiến lược & Thẻ P/E Heatmap' },
            { id: 'table', label: '📋 Bảng Toàn Diện & Phân Rã Vĩ Mô', desc: 'Số liệu BCTC, P/E vs VN-Index & Phân rã 6 Drivers' },
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
            <span>{stats.avgSectorPE ? `${stats.avgSectorPE}x` : '—'}</span>
            {vnindexPE != null && <span className="text-[10px] font-bold text-gray-400">vs VN-Index {vnindexPE}x</span>}
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400">Trung vị toàn thị trường</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700/60 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">P/B TB 10 Ngành</div>
          <div className="text-xl font-black text-gray-900 dark:text-white">
            {stats.avgSectorPB ? `${stats.avgSectorPB}x` : '—'}
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400">Hệ số giá trên giá trị sổ sách</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <span>💎</span> Vùng Vàng Gom Mua
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
            {stats.sweetSpotCount != null ? `${stats.sweetSpotCount} Ngành` : '—'}
          </div>
          <div className="text-[10px] text-emerald-700 dark:text-emerald-300">Vĩ mô ủng hộ & P/E hấp dẫn</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Ngành Định Giá Rẻ Nhất</div>
          <div className="text-base font-black text-blue-600 dark:text-blue-400 truncate">
            {stats.cheapestSector || '—'}
          </div>
          <div className="text-[10px] text-blue-700 dark:text-blue-300">Biên an toàn định giá cao nhất</div>
        </div>
      </div>

      {/* ── 3. CHẾ ĐỘ 1: MA TRẬN THIÊN THỜI & BẢN ĐỒ NHIỆT (DUAL SWEET SPOT & HEATMAP MATRIX) ── */}
      {viewMode === 'dual_matrix' && (
        <div className="space-y-5">
          {/* Thanh công cụ: Bộ lọc góc phần tư + Bộ sắp xếp linh hoạt */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700/60">
            {/* Bộ lọc góc phần tư */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 mr-1">Phân vùng:</span>
              {[
                { id: 'all', label: `Tất cả (${items.length})` },
                { id: 'sweet_spot', label: `💎 Vùng Vàng (${stats.sweetSpotCount || 0})` },
                { id: 'value_trap', label: `⚠️ Bẫy Rẻ (${stats.valueTrapCount || 0})` },
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
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200/50 dark:border-gray-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Bộ chọn sắp xếp (Sort Selector) */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">Sắp xếp:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-2.5 py-1 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              >
                <option value="quadrant">💎 4 Phân Vùng Chiến Lược</option>
                <option value="pe_asc">🔥 P/E Rẻ Nhất Đến Đắt Nhất</option>
                <option value="macro_desc">🌪️ Điểm Vĩ Mô Cao Nhất</option>
                <option value="market_cap">💰 Vốn Hóa Lớn Nhất</option>
                <option value="ytd">📈 Tăng Trưởng YTD Cao Nhất</option>
              </select>
            </div>
          </div>

          {/* HIỂN THỊ DẠNG 1: THEO 4 PHÂN VÙNG CHIẾN LƯỢC (KHI sortBy === 'quadrant') */}
          {sortBy === 'quadrant' ? (
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
                      <div className="text-xs text-gray-400 italic py-6 text-center">
                        Không có nhóm ngành nào trong phân vùng này ở kỳ phân tích hiện tại.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {qItems.map((sec) => renderSectorCard(sec))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* HIỂN THỊ DẠNG 2: SẮP XẾP TOÀN DIỆN (THEO P/E, VĨ MÔ, VỐN HÓA, YTD) */
            <div className="space-y-3">
              <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between px-1">
                <span>Hiển thị 10 nhóm ngành đã sắp xếp theo tiêu chí đã chọn:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {vnindexPE != null ? `Mốc VN-Index P/E: ${vnindexPE}x` : 'Chưa có mốc P/E VN-Index'}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {processedItems.map((sec) => renderSectorCard(sec))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 4. CHẾ ĐỘ 2: BẢNG SỐ LIỆU TOÀN DIỆN & PHÂN RÃ VĨ MÔ (DATA TABLE WITH EXPANDABLE 6 DRIVERS) ── */}
      {viewMode === 'table' && (
        <div className="space-y-3">
          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between px-1">
            <span>Bảng tổng hợp chi tiết 10 nhóm ngành GICS. Nhấp vào <b>▼ Chi tiết</b> để mở xem phân rã 6 động lực vĩ mô:</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              {vnindexPE != null ? `VN-Index P/E: ${vnindexPE}x` : 'VN-Index P/E: —'}
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-700 shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-900/60 text-gray-400 uppercase text-[10px] font-black border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="p-3.5">Nhóm Ngành (GICS)</th>
                  <th className="p-3.5 text-center">P/E Ngành</th>
                  <th className="p-3.5 text-center">So vs VN-Index</th>
                  <th className="p-3.5 text-center">P/B</th>
                  <th className="p-3.5 text-center">Cổ Tức</th>
                  <th className="p-3.5 text-right">Vốn Hóa (Tỷ VNĐ)</th>
                  <th className="p-3.5 text-center">Số CP</th>
                  <th className="p-3.5 text-center">YTD (%)</th>
                  <th className="p-3.5 text-center">Vĩ Mô (Net)</th>
                  <th className="p-3.5 text-center">Khuyến Nghị</th>
                  <th className="p-3.5 text-center">Phân Vùng</th>
                  <th className="p-3.5 text-center">6 Động Lực</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 text-gray-700 dark:text-gray-300">
                {items.map((sec) => {
                  const isRowExpanded = expandedTableRowCode === sec.code;
                  const diffVNIndex = vnindexPE ? +((((sec.pe || 12) - vnindexPE) / vnindexPE) * 100).toFixed(1) : null;
                  const isCheaper = diffVNIndex != null ? diffVNIndex <= 0 : false;

                  return (
                    <React.Fragment key={sec.code}>
                      <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition">
                        <td className="p-3.5 font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <span className="text-xl">{sec.icon}</span>
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

                        <td className="p-3.5 text-center font-bold">
                          {diffVNIndex != null ? (
                            <span className={`text-[11px] ${isCheaper ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {diffVNIndex > 0 ? `+${diffVNIndex}` : diffVNIndex}% {isCheaper ? 'Rẻ hơn' : 'Đắt hơn'}
                            </span>
                          ) : (
                            <span className="text-[11px] text-gray-400">—</span>
                          )}
                        </td>

                        <td className="p-3.5 text-center font-bold">{sec.pb}x</td>
                        <td className="p-3.5 text-center font-bold text-emerald-600 dark:text-emerald-400">{sec.divYield}%</td>
                        <td className="p-3.5 text-right font-bold">{Number(sec.marketCapBn).toLocaleString()}</td>
                        <td className="p-3.5 text-center font-medium">{sec.totalTickers}</td>
                        <td className={`p-3.5 text-center font-bold ${(sec.pricePctChgYtd || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {sec.pricePctChgYtd != null ? `${sec.pricePctChgYtd > 0 ? '+' : ''}${sec.pricePctChgYtd}%` : '---'}
                        </td>

                        <td className="p-3.5 text-center font-black">
                          <span className={(sec.macroScore ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                            {(sec.macroScore ?? 0) > 0 ? `+${sec.macroScore}` : sec.macroScore}
                          </span>
                        </td>

                        <td className="p-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${sec.colorClass || 'text-gray-600 bg-gray-100'}`}>
                            {sec.actionTag || sec.macroAction || 'Neutral'}
                          </span>
                        </td>

                        <td className="p-3.5 text-center">
                          <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase ${sec.quadrantBadge}`}>
                            {sec.quadrantIcon} {sec.quadrantKey === 'sweet_spot' ? 'GOM MUA' : sec.quadrantKey === 'value_trap' ? 'BẪY RẺ' : sec.quadrantKey === 'momentum' ? 'QUÁ NHIỆT' : 'PHÒNG THỦ'}
                          </span>
                        </td>

                        <td className="p-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => setExpandedTableRowCode(isRowExpanded ? null : sec.code)}
                            className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-black transition cursor-pointer"
                          >
                            {isRowExpanded ? '▲ Đóng' : '▼ Chi tiết'}
                          </button>
                        </td>
                      </tr>

                      {/* DÒNG MỞ RỘNG (EXPANDABLE SUB-ROW) PHÂN RÃ 6 ĐỘNG LỰC VĨ MÔ */}
                      {isRowExpanded && (
                        <tr>
                          <td colSpan={12} className="p-4 bg-gray-50/80 dark:bg-gray-900/60 border-t border-b border-gray-200/50 dark:border-gray-700/50">
                            <div className="space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                <div className="text-gray-700 dark:text-gray-300">
                                  <span className="font-bold text-indigo-600 dark:text-indigo-400 mr-1.5">Chiến lược định hướng:</span>
                                  {sec.recommendation}
                                </div>
                                <div className="text-gray-400 font-bold shrink-0">
                                  P/E #{peRankMap[sec.code]} · Vĩ Mô #{macroRankMap[sec.code]}
                                </div>
                              </div>

                              {renderDecomposition(sec.decomposition)}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
