import { useState, useMemo } from 'react';
import { fmtMoney } from '../utils/format.js';
import { computeOpportunityCost } from '../utils/stockAnalytics.js';
import IntelligenceBadge from './common/IntelligenceBadge.jsx';
import {
  DEFAULT_BANK_INTEREST_RATE,
  PRESET_BANK_INTEREST_RATES,
} from '../utils/constants.js';

const STORAGE_KEY = 'stock_portfolio_opportunity_cost_rate';

export default function OpportunityCostCard({ buyOrders = [], totalCumulativePL = 0 }) {
  // Đọc từ localStorage nếu người dùng đã lưu mức lãi suất trước đó, mặc định theo cấu hình hệ thống
  const [bankRate, setBankRate] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed > 0 && parsed <= 30) return parsed;
      }
    } catch {}
    return DEFAULT_BANK_INTEREST_RATE;
  });

  const [inputVal, setInputVal] = useState(bankRate.toString());
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('collapse_opportunity_cost') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('collapse_opportunity_cost', String(next));
      } catch (e) {}
      return next;
    });
  };

  const handleSelectRate = (rate) => {
    const num = parseFloat(rate);
    if (!isNaN(num) && num > 0 && num <= 30) {
      setBankRate(num);
      setInputVal(num.toString());
      try {
        localStorage.setItem(STORAGE_KEY, num.toString());
      } catch {}
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputVal(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0 && num <= 30) {
      setBankRate(num);
      try {
        localStorage.setItem(STORAGE_KEY, num.toString());
      } catch {}
    }
  };

  const stats = useMemo(() => {
    return computeOpportunityCost(buyOrders, totalCumulativePL, bankRate);
  }, [buyOrders, totalCumulativePL, bankRate]);

  const {
    totalSimulatedInterest,
    alphaCash,
    alphaPct,
    bankRoiPct,
    stockRoiPct,
    outperformed,
    totalInvested,
    holdingDaysAvg,
  } = stats;

  if (totalInvested <= 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-all">
      {/* Header Card */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2.5 bg-gradient-to-r from-gray-50/60 to-white dark:from-slate-900 dark:to-slate-900">
        <div className="flex items-center gap-2.5">
          <span className="text-xl p-1.5 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-xl border border-amber-200/60 dark:border-amber-800/40">
            🏦
          </span>
          <div>
            <h3 className="font-bold text-gray-800 dark:text-slate-100 text-sm flex items-center gap-2 flex-wrap">
              <span>So Kèo Chi Phí Cơ Hội (Chứng Khoán vs Gửi Tiết Kiệm)</span>
              <IntelligenceBadge type="heuristic" tooltip="Mô hình tính toán chi phí cơ hội lãi kép gửi tiết kiệm ngân hàng" />
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                outperformed
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/50'
                  : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/50'
              }`}>
                {outperformed ? '🏆 Thắng Ngân Hàng' : '⚠️ Thua Tiết Kiệm'}
              </span>
            </h3>
            <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5">
              Thời gian nắm giữ bình quân: <b>{holdingDaysAvg} ngày</b> (~{(holdingDaysAvg / 30).toFixed(1)} tháng)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Lựa chọn mốc 6%, 7%, 8% hoặc nhập bằng tay */}
          <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl border border-gray-200/80 dark:border-slate-700 text-xs">
            <span className="text-[10px] text-gray-400 dark:text-slate-500 font-semibold px-1 hidden xs:inline">
              Lãi suất:
            </span>
            {(Array.isArray(PRESET_BANK_INTEREST_RATES) ? PRESET_BANK_INTEREST_RATES : [5.0, 6.0, 7.0, 8.0]).map(rate => (
              <button
                key={rate}
                type="button"
                onClick={() => handleSelectRate(rate)}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  bankRate === rate
                    ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
                }`}
              >
                {rate}%
              </button>
            ))}

            {/* Ô Nhập Bằng Tay Tùy Ý */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-gray-200/80 dark:border-slate-700 focus-within:ring-2 focus-within:ring-indigo-500/50">
              <span className="text-[10px] text-gray-400 dark:text-slate-500 font-semibold hidden md:inline">
                Tự nhập:
              </span>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="30"
                value={inputVal}
                onChange={handleInputChange}
                className="w-11 text-xs font-bold text-gray-800 dark:text-slate-100 bg-transparent text-right outline-none"
                placeholder="6.0"
                title="Nhập lãi suất gửi tiết kiệm bằng tay (%/năm)"
              />
              <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400">%</span>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleCollapse}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700 transition-colors cursor-pointer"
            title={isCollapsed ? 'Mở rộng phân tích' : 'Thu gọn'}
          >
            <span>{isCollapsed ? 'Mở Rộng ▼' : 'Thu Gọn ▲'}</span>
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-5 space-y-4">
          {/* 2 Cột Đối Chiếu Song Song */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Cột 1: Tự Đầu Tư Chứng Khoán */}
            <div className={`p-4 rounded-2xl border transition-all ${
              totalCumulativePL >= 0
                ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/40'
                : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-800/40'
            }`}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span>📈</span> Tự Đầu Tư Chứng Khoán
                </span>
                <span className={`font-extrabold px-2 py-0.5 rounded-full text-[11px] ${
                  stockRoiPct >= 0
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                }`}>
                  {stockRoiPct >= 0 ? '+' : ''}{stockRoiPct}% ROI
                </span>
              </div>
              <div className="mt-2">
                <span className="text-[10px] text-gray-400 dark:text-slate-500 uppercase block font-semibold">
                  Tổng Lãi / Lỗ Tích Luỹ Thực Tế
                </span>
                <span className={`text-xl font-black mt-0.5 block tracking-tight ${
                  totalCumulativePL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {totalCumulativePL >= 0 ? '+' : ''}{fmtMoney(totalCumulativePL)}đ
                </span>
              </div>
              <div className="mt-2 text-[11px] text-gray-500 dark:text-slate-400 pt-2 border-t border-gray-200/50 dark:border-slate-800 flex justify-between">
                <span>Vốn giải ngân: <b>{fmtMoney(totalInvested)}đ</b></span>
                <span>(Đã chốt + Tạm tính + Cổ tức)</span>
              </div>
            </div>

            {/* Cột 2: Nếu Đem Gửi Tiết Kiệm */}
            <div className="p-4 rounded-2xl border bg-gray-50/70 dark:bg-slate-800/40 border-gray-200/80 dark:border-slate-700/60">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span>🏦</span> Nếu Gửi Tiết Kiệm ({bankRate}%/năm)
                </span>
                <span className="font-extrabold px-2 py-0.5 rounded-full text-[11px] bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-slate-200">
                  +{bankRoiPct}% ROI
                </span>
              </div>
              <div className="mt-2">
                <span className="text-[10px] text-gray-400 dark:text-slate-500 uppercase block font-semibold">
                  Lãi Tiết Kiệm Tương Đương Giả Định
                </span>
                <span className="text-xl font-black mt-0.5 block tracking-tight text-gray-800 dark:text-slate-100">
                  +{fmtMoney(totalSimulatedInterest)}đ
                </span>
              </div>
              <div className="mt-2 text-[11px] text-gray-500 dark:text-slate-400 pt-2 border-t border-gray-200/50 dark:border-slate-800 flex justify-between">
                <span>Lãi đơn theo ngày giữ vốn</span>
                <span>Kỳ hạn tham chiếu 12 tháng</span>
              </div>
            </div>
          </div>

          {/* Hero Banner Thặng Dư Lợi Nhuận (Alpha Cash) */}
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            outperformed
              ? 'bg-emerald-500/10 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-200'
              : 'bg-amber-500/10 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/60 text-amber-950 dark:text-amber-200'
          }`}>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">{outperformed ? '🎯' : '⚠️'}</span>
                <h4 className="font-extrabold text-sm">
                  {outperformed
                    ? `Thặng Dư Vượt Trội: +${fmtMoney(alphaCash)}đ (+${alphaPct}% vs Tiết Kiệm)`
                    : `Tạm Thấp Hơn Tiết Kiệm: ${fmtMoney(alphaCash)}đ (${alphaPct}%)`}
                </h4>
              </div>
              <p className="text-xs opacity-90 mt-1 leading-relaxed">
                {outperformed ? (
                  <>
                    Chiến lược tự đầu tư cổ phiếu của bạn đang sinh lời gấp{' '}
                    <b>{bankRoiPct > 0 ? (stockRoiPct / bankRoiPct).toFixed(1) : '∞'}x</b> so với gửi tiết kiệm ngân hàng.
                    Quyết định tự quản lý vốn đang mang lại giá trị gia tăng rõ rệt!
                  </>
                ) : (
                  <>
                    Lợi nhuận cổ phiếu hiện đang thấp hơn mức lãi gửi tiết kiệm an toàn. Hãy kiên nhẫn tích sản ở vùng định giá rẻ,
                    hoặc rà soát lại kỷ luật cắt lỗ đối với các mã yếu kém.
                  </>
                )}
              </p>
            </div>

            {/* Gauge progress bar so sánh tỷ lệ */}
            <div className="shrink-0 sm:text-right min-w-[140px]">
              <span className="text-[10px] text-gray-400 dark:text-slate-400 block mb-1 uppercase font-bold">
                Tỷ lệ tương đối
              </span>
              <div className="w-full sm:w-36 h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${Math.min(Math.max((stockRoiPct / (stockRoiPct + bankRoiPct || 1)) * 100, 5), 95)}%` }}
                  className={`h-full ${outperformed ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  title={`Chứng khoán: ${stockRoiPct}%`}
                />
                <div
                  style={{ width: `${Math.min(Math.max((bankRoiPct / (stockRoiPct + bankRoiPct || 1)) * 100, 5), 95)}%` }}
                  className="h-full bg-gray-400 dark:bg-slate-500"
                  title={`Ngân hàng: ${bankRoiPct}%`}
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold mt-1 text-gray-500 dark:text-slate-400">
                <span>CK {stockRoiPct}%</span>
                <span>NH {bankRoiPct}%</span>
              </div>
            </div>
          </div>

          {/* Dòng Chú Thích Tự Động Lưu */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-[11px] text-gray-400 dark:text-slate-500 border-t border-gray-100 dark:border-slate-800">
            <span>💡 Bạn có thể chọn mốc 6%, 7%, 8% hoặc tự gõ mức lãi suất sổ tiết kiệm thực tế.</span>
            <span className="italic text-[10px]">Tự động lưu vào trình duyệt khi thay đổi</span>
          </div>
        </div>
      )}
    </div>
  );
}
