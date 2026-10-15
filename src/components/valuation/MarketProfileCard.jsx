import React from 'react';
import { formatVND } from '../../utils/format';
import IntelligenceBadge from '../common/IntelligenceBadge.jsx';

export default function MarketProfileCard({ marketProfile, symbol, currentPrice }) {
  if (!marketProfile) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 text-center text-gray-500">
        Chưa có dữ liệu hồ sơ thị trường định lượng cho {symbol}
      </div>
    );
  }

  const {
    volumeAtPrice = {},
    moneyFlow = {},
    wyckoffEffort = {},
    tailRisk = {},
    archetype = {}
  } = marketProfile;

  const { buckets = [], poc, hvn = [], lvn = [] } = volumeAtPrice;
  const { vpci, vpciStatus, cmf, cmfStatus, obvTrend } = moneyFlow;
  const { effortWithoutResultDetected, recentSignals = [], state: wyckoffState } = wyckoffEffort;
  const { skewness, kurtosis, var95, var99, es95, es99, tailRiskAssessment } = tailRisk;

  return (
    <div className="space-y-6">
      {/* ── HEADER & ARCHETYPE CARD ── */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🧬</span>
              <h3 className="text-lg font-black text-gray-900 dark:text-white">
                Hồ Sơ Hành Vi Thị Trường Định Lượng (15-Block Market Profile)
              </h3>
              <IntelligenceBadge type="heuristic" tooltip="Thuật toán phân tích cấu trúc khối lượng Volume Profile, Wyckoff Effort & Đuôi rủi ro phân phối" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Phân tích cấu trúc khối lượng theo dải giá (VAP), Dòng tiền Wyckoff & Rủi ro
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1.5 rounded-xl font-black bg-indigo-600 text-white shadow-xs">
              {archetype.name || 'Archetype Cổ Phiếu'}
            </span>
          </div>
        </div>

        <div className="mt-4 p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 flex items-start gap-3">
          <span className="text-indigo-600 dark:text-indigo-400 text-lg">💡</span>
          <div className="text-xs text-gray-700 dark:text-gray-300">
            <div className="font-bold text-indigo-900 dark:text-indigo-200">Đặc tính hành vi chủ đạo:</div>
            <p className="mt-0.5 leading-relaxed">{archetype.description}</p>
            <p className="mt-1 text-[11px] text-gray-400 italic">{archetype.guardrail}</p>
          </div>
        </div>
      </div>

      {/* ── 1. VOLUME AT PRICE (VAP / VOLUME PROFILE) ── */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            <div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                Khối Lượng Tích Lũy Theo Dải Giá (Volume at Price - VAP)
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Nhận diện Vùng Kiểm Soát Point of Control (POC) và các ngưỡng Cản/Hỗ trợ thanh khoản
              </p>
            </div>
          </div>
          {poc && (
            <span className="text-xs px-2.5 py-1 rounded-xl font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
              POC: {formatVND(poc.priceLow)} - {formatVND(poc.priceHigh)} ({poc.volumePercent}%)
            </span>
          )}
        </div>

        <div className="mt-4 space-y-2.5">
          {buckets.map((b, idx) => {
            const isPoc = poc && poc.index === b.index;
            const isCurrentInBucket = currentPrice && currentPrice >= b.priceLow && currentPrice <= b.priceHigh;
            return (
              <div key={idx} className="flex items-center gap-3 text-xs">
                {/* Dải giá */}
                <div className="w-36 font-mono text-[11px] text-gray-600 dark:text-gray-300 flex items-center justify-between shrink-0">
                  <span>{formatVND(b.priceLow)}</span>
                  <span className="text-gray-400">-</span>
                  <span>{formatVND(b.priceHigh)}</span>
                </div>

                {/* Thanh ngang thể hiện Volume % */}
                <div className="flex-1 bg-gray-100 dark:bg-gray-700/50 rounded-full h-4 overflow-hidden relative">
                  <div
                    className={`h-full rounded-full transition-all ${isPoc
                      ? 'bg-amber-500 dark:bg-amber-400'
                      : b.volumePercent >= 12
                        ? 'bg-indigo-500 dark:bg-indigo-400'
                        : 'bg-indigo-200 dark:bg-indigo-900/60'
                      }`}
                    style={{ width: `${Math.min(100, b.volumePercent * 4)}%` }}
                  />
                  {isCurrentInBucket && (
                    <div className="absolute top-0 right-2 text-[10px] font-bold text-gray-800 dark:text-white">
                      Thị giá hiện tại 📍
                    </div>
                  )}
                </div>

                {/* Phần trăm và Badge */}
                <div className="w-20 text-right font-mono text-[11px] font-bold shrink-0 flex items-center justify-end gap-1.5">
                  <span className={isPoc ? 'text-amber-600 dark:text-amber-400 font-black' : 'text-gray-700 dark:text-gray-300'}>
                    {b.volumePercent}%
                  </span>
                  {isPoc && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500 text-white font-bold">
                      POC
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center gap-4 text-[11px] text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span><strong>POC (Point of Control):</strong> Dải giá tập trung nhiều thanh khoản gom/xả nhất.</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-indigo-500" />
            <span><strong>HVN (High Volume Node):</strong> Hỗ trợ / Kháng cự cứng.</span>
          </div>
        </div>
      </div>

      {/* ── 2. DÒNG TIỀN VPCI & WYCKOFF EFFORT VS RESULT ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Money Flow & VPCI */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-base">🌊</span>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                Xác Nhận Khối Lượng VPCI & Dòng Tiền CMF
              </h4>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-700/40 space-y-1">
              <span className="text-gray-500 dark:text-gray-400 text-[11px]">Chỉ số VPCI:</span>
              <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">{vpci}x</div>
              <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">
                {vpciStatus === 'STRONG_CONFIRMATION' ? '✅ Khối lượng xác nhận xu hướng' : '⚠️ Phân kỳ khối lượng'}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-700/40 space-y-1">
              <span className="text-gray-500 dark:text-gray-400 text-[11px]">Dòng tiền Chaikin (CMF):</span>
              <div className={`text-lg font-black ${cmf >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {cmf > 0 ? `+${cmf}` : cmf}
              </div>
              <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">
                {cmfStatus === 'ACCUMULATION' ? '🟢 Tích lũy mua gom' : cmfStatus === 'DISTRIBUTION' ? '🔴 Áp lực phân phối xả' : '⚪ Trạng thái cân bằng'}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs text-blue-800 dark:text-blue-300 flex items-center justify-between">
            <span>Xu hướng Dòng tiền OBV:</span>
            <span className="font-bold">{obvTrend === 'BULLISH_FLOW' ? '📈 Tích cực (Bullish Flow)' : '📉 Yếu đi (Bearish Flow)'}</span>
          </div>
        </div>

        {/* Wyckoff Effort vs Result */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-base">⚖️</span>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                Wyckoff: Nỗ Lực vs Kết Quả (Effort vs Result)
              </h4>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${effortWithoutResultDetected
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
              }`}>
              {effortWithoutResultDetected ? 'Phát hiện tín hiệu gom/xả ẩn' : 'Thị trường bình thường'}
            </span>
          </div>

          <div className="text-xs text-gray-600 dark:text-gray-300 space-y-2">
            <p className="leading-relaxed">
              Theo phương pháp luận Wyckoff, khi xuất hiện các phiên có <strong>khối lượng giao dịch đột biến</strong> nhưng <strong>biên độ giá dao động lại rất hẹp</strong> (Effort without Result), đó là dấu hiệu của hiện tượng tay to âm thầm gom hàng hấp thụ cung hoặc xả hàng kín.
            </p>

            {recentSignals.length > 0 ? (
              <div className="space-y-1.5 pt-2">
                {recentSignals.map((sig, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-200">
                    {sig.desc}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 text-[11px] text-gray-500 dark:text-gray-400">
                Không ghi nhận phiên phân kỳ nỗ lực - kết quả nào trong 10 phiên gần nhất. Biến động giá phản ánh đúng mức khối lượng.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 3. RỦI RO ĐUÔI & PHÂN PHỐI LỢI SUẤT (TAIL RISK) ── */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-lg">📉</span>
            <div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                Rủi Ro Đuôi & Phân Phối Lợi Suất (Tail Risk Profile)
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Định lượng mức độ rủi ro sụt giảm cực đoan qua Expected Shortfall (CVaR/ES) và độ lệch Skewness
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs text-center">
          <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-700/40">
            <span className="text-[11px] text-gray-500 dark:text-gray-400">Độ lệch (Skewness):</span>
            <div className="text-base font-black text-gray-900 dark:text-white mt-0.5">{skewness}</div>
            <span className="text-[10px] text-gray-400">
              {skewness > 0 ? 'Lệch dương (nhiều phiên nổ)' : 'Lệch âm (áp lực giảm)'}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-700/40">
            <span className="text-[11px] text-gray-500 dark:text-gray-400">Độ nhọn (Kurtosis):</span>
            <div className="text-base font-black text-gray-900 dark:text-white mt-0.5">{kurtosis}</div>
            <span className="text-[10px] text-gray-400">
              {kurtosis > 2.0 ? 'Đuôi béo dày (Rủi ro biến động)' : 'Phân phối đều'}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40">
            <span className="text-[11px] text-rose-600 dark:text-rose-400 font-bold">VaR 95% (1 Ngày):</span>
            <div className="text-base font-black text-rose-700 dark:text-rose-300 mt-0.5">-{var95}%</div>
            <span className="text-[10px] text-gray-500">Mức lỗ tối đa 95% phiên</span>
          </div>

          <div className="p-3 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40">
            <span className="text-[11px] text-rose-600 dark:text-rose-400 font-bold">Expected Shortfall (ES 95%):</span>
            <div className="text-base font-black text-rose-700 dark:text-rose-300 mt-0.5">-{es95}%</div>
            <span className="text-[10px] text-gray-500">Mức lỗ trung bình khi chạm đuôi</span>
          </div>
        </div>

        <div className="mt-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 text-[11px] text-gray-500 dark:text-gray-400">
          <strong>Đánh giá rủi ro đuôi:</strong> {tailRiskAssessment}. Chỉ số Expected Shortfall (CVaR) phản ánh thực tế hơn Value at Risk vì tính đến toàn bộ mức độ nghiêm trọng của 5% phiên giao dịch xấu nhất.
        </div>
      </div>
    </div>
  );
}
