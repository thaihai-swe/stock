import ScenarioAllocationMatrix from './ScenarioAllocationMatrix.jsx';
import IntelligenceBadge from '../common/IntelligenceBadge.jsx';

export default function MacroAllocationGoldSection({
  macroData = {},
  assetAlloc = {},
  goldAdv = {},
  macro = {},
  risk = {},
  regime = {},
}) {
  return (
    <div className="space-y-6">
      {/* ── 1. MA TRẬN PHÂN BỔ 4 LỚP TÀI SẢN ĐA KỊCH BẢN (BASE / BULL / BEAR) ── */}
      <ScenarioAllocationMatrix
        scenarioAllocation={macroData?.scenarioAllocation}
        currentBucket={macroData?.scenarioAllocation?.currentBucket || assetAlloc.riskBucket || regime.bucket || 'B2'}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── 2. BOX 1: MÔ HÌNH PHÂN BỔ 4 LỚP TÀI SẢN ĐỘNG ── */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-7 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-5 transition-colors">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                Mô Hình Phân Bổ 4 Lớp Tài Sản (Dynamic Allocation)
              </span>
              <IntelligenceBadge type="heuristic" tooltip="Mô hình phân bổ 4 lớp tài sản tối ưu hóa theo chu kỳ vĩ mô" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100 mt-0.5">
              Tỷ Trọng Khuyến Nghị Chu Kỳ {regime.phase}
            </h3>
          </div>

          <div className="space-y-3.5">
            {[
              { label: 'Cổ Phiếu (Equity)', val: assetAlloc.fourAssets?.equity || 60, color: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Trái Phiếu (Bond)', val: assetAlloc.fourAssets?.bond || 25, color: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' },
              { label: 'Tiền Mặt (Cash)', val: assetAlloc.fourAssets?.cash || 10, color: 'bg-indigo-500', text: 'text-indigo-600 dark:text-indigo-400' },
              { label: 'Vàng Vật Chất (Gold)', val: assetAlloc.fourAssets?.gold || 5, color: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
            ].map((item, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-gray-700 dark:text-slate-300">{item.label}</span>
                  <span className={item.text}>{item.val}%</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full transition-all duration-500`} style={{ width: `${item.val}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100/60 dark:border-indigo-800/40 text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
            Tỷ trọng được tự động điều chỉnh động theo Risk Bucket [{risk.riskBucket}] và áp lực từ 4 tầng rủi ro vĩ mô (Thanh khoản, Tăng trưởng, Lạm phát, Tỷ giá).
          </div>
        </div>

        {/* ── 3. BOX 2: TƯ VẤN CHÊNH LỆCH VÀNG (GOLD ARBITRAGE) ── */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-7 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-5 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  Chênh Lệch Giá Vàng (Gold Arbitrage)
                </span>
                <IntelligenceBadge type="heuristic" tooltip="Mô hình chênh lệch giá vàng SJC/PNJ so với thế giới" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100 mt-0.5">
                Thị Trường Trong Nước vs Thế Giới
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-xs font-black self-start sm:self-auto">
                {goldAdv.action || 'NẮM GIỮ'}
              </span>
            </div>
          </div>

          {/* 3 Thẻ so sánh: Vàng SJC, Nhẫn PNJ 999.9, Thế Giới Quy Đổi */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Vàng SJC */}
            <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 text-center space-y-1">
              <div className="text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase tracking-wider">
                Vàng Miếng SJC
              </div>
              <div className="text-lg font-black text-amber-600 dark:text-amber-400">
                {goldAdv.sjcSell || macro.sjcGoldSell || '---'} Tr
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400">
                Mua: {goldAdv.sjcBuy || macro.sjcGoldBuy || '---'} Tr
              </div>
              <div className="inline-block px-2 py-0.5 rounded-md bg-amber-100/80 dark:bg-amber-900/40 text-[10px] font-bold text-amber-700 dark:text-amber-300 mt-0.5">
                Spread: {goldAdv.sjcSpreadPct ? `${goldAdv.sjcSpreadPct > 0 ? '+' : ''}${goldAdv.sjcSpreadPct}%` : (goldAdv.spreadPct ? `${goldAdv.spreadPct}%` : '---')}
              </div>
            </div>

            {/* Nhẫn Trơn PNJ 999.9 */}
            <div className="p-3.5 rounded-2xl bg-yellow-50/60 dark:bg-yellow-950/20 border border-yellow-200/60 dark:border-yellow-800/40 text-center space-y-1">
              <div className="text-[10px] text-yellow-700 dark:text-yellow-400 font-bold uppercase tracking-wider">
                Nhẫn Trơn PNJ 999.9
              </div>
              <div className="text-lg font-black text-yellow-600 dark:text-yellow-400">
                {goldAdv.pnjSell || macro.pnjGoldSell || '---'} Tr
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400">
                Mua: {goldAdv.pnjBuy || macro.pnjGoldBuy || '---'} Tr
              </div>
              <div className="inline-block px-2 py-0.5 rounded-md bg-yellow-100/80 dark:bg-yellow-900/40 text-[10px] font-bold text-yellow-700 dark:text-yellow-300 mt-0.5">
                Spread: {goldAdv.pnjSpreadPct ? `${goldAdv.pnjSpreadPct > 0 ? '+' : ''}${goldAdv.pnjSpreadPct}%` : '---'}
              </div>
            </div>

            {/* Thế Giới Quy Đổi */}
            <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800 text-center space-y-1">
              <div className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                Thế Giới Quy Đổi
              </div>
              <div className="text-lg font-black text-gray-900 dark:text-white">
                {goldAdv.worldConvertedVnd ? (Number(goldAdv.worldConvertedVnd) / 1_000_000).toFixed(1) : '---'} Tr
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400">
                ${Number(goldAdv.worldPriceUsd || macro.goldWorld || 0).toLocaleString('vi-VN')} / oz
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">
                USD: {Number(macro.usdVndRate || 0).toLocaleString('vi-VN')} đ
              </div>
            </div>
          </div>

          {/* Rationale & Advice */}
          <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 space-y-2">
            <div className="flex flex-wrap items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-300 gap-2">
              <span>Khuyến nghị phân bổ: {goldAdv.sizeHint || '5-10% danh mục'}</span>
              <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                Nguồn: PNJ Official {goldAdv.updatedAt ? `(${goldAdv.updatedAt})` : (macro.pnjUpdateDate ? `(${macro.pnjUpdateDate})` : '')}
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
              {goldAdv.reason}
            </p>
          </div>
        </div>
      </div>

      {/* ── 4. AI CHIẾN LƯỢC ĐA TÀI SẢN & VÀNG (AI MULTI-ASSET & GOLD STRATEGY) ── */}
      {macroData?.aiMultiAssetStrategy && (
        <div className="p-5 sm:p-7 rounded-3xl bg-gradient-to-br from-amber-50/80 via-yellow-50/30 to-white dark:from-amber-950/30 dark:via-yellow-950/15 dark:to-slate-900 border border-amber-200/70 dark:border-amber-800/50 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-100 dark:border-amber-900/50 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🧠</span>
              <span className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-200">
                Chiến Lược Phân Bổ Đa Tài Sản & Nhận Định Giá Vàng (AI Multi-Asset Strategist)
              </span>
              <IntelligenceBadge type="ai" tooltip="Phân tích định tính tương quan Cổ phiếu, Trái phiếu, Tiền mặt và Vàng từ AI" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-amber-100 dark:border-slate-700/60 space-y-2">
              <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <span>📊</span>
                <span>Luận Điểm Phân Bổ 4 Lớp Tài Sản:</span>
              </span>
              <p className="text-xs text-gray-700 dark:text-slate-300 leading-relaxed font-medium">
                {macroData.aiMultiAssetStrategy.multiAssetThesis}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-amber-100 dark:border-slate-700/60 space-y-2">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                <span>🪙</span>
                <span>Độ Lệch Vàng SJC & Rủi Ro Can Thiệp Chính Sách:</span>
              </span>
              <p className="text-xs text-gray-700 dark:text-slate-300 leading-relaxed font-medium">
                {macroData.aiMultiAssetStrategy.goldArbitrageRationale}
              </p>
              {macroData.aiMultiAssetStrategy.policyRiskAlert && (
                <p className="text-[11px] text-amber-800 dark:text-amber-300/90 pt-1 border-t border-amber-100 dark:border-slate-700">
                  ⚠️ <b>Lưu ý chính sách:</b> {macroData.aiMultiAssetStrategy.policyRiskAlert}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
