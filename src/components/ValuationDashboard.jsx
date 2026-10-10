import { useEffect, useMemo, useState } from 'react';
import {
  fetchRawJson,
  fetchStockFinancials,
  fetchValuationStocks,
  triggerSingleFinancialSync,
  triggerValuationSync
} from '../utils/api.js';

// Tính % chênh lệch giữa giá định giá và thị giá hiện tại (Upside / Downside %)
function calcPriceDiff(fairPrice, currentPrice) {
  if (!fairPrice || !currentPrice || currentPrice <= 0) return null;
  const diff = ((fairPrice - currentPrice) / currentPrice) * 100;
  return Math.round(diff * 10) / 10;
}

export default function ValuationDashboard({ data, refreshKey, onSwitchTab, initialSymbol }) {
  // State quản lý dữ liệu
  const [valuationData, setValuationData] = useState({});
  const [selectedSymbol, setSelectedSymbol] = useState('HPG');
  const [financials, setFinancials] = useState(null);
  const [financialPeriod, setFinancialPeriod] = useState('quarterly'); // 'quarterly' | 'yearly'
  const [mainReportView, setMainReportView] = useState('statements'); // 'statements' | 'ratios' | 'events' | 'formulas'
  const [financialTab, setFinancialTab] = useState('income'); // 'income' | 'balance' | 'cashflow'

  // State Raw JSON Inspector
  const [inspectorType, setInspectorType] = useState('fundamentals'); // 'fundamentals' | 'macro' | 'financials'
  const [rawJsonContent, setRawJsonContent] = useState('');
  const [rawJsonPath, setRawJsonPath] = useState('');
  const [copied, setCopied] = useState(false);
  const [jsonSearchTerm, setJsonSearchTerm] = useState('');

  // State loading & sync
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncingSingle, setSyncingSingle] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);

  // State nhập mã tùy ý & tìm kiếm
  const [inputSymbol, setInputSymbol] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');

  // Tải dữ liệu ban đầu
  const loadAllValuationData = async () => {
    setLoading(true);
    try {
      const stocksRes = await fetchValuationStocks().catch(() => ({}));
      setValuationData(stocksRes || {});

      // Xác định symbol mặc định
      const availableSymbols = Object.keys(stocksRes || {}).filter(k => !k.startsWith('_'));
      const initialSym = availableSymbols.includes(selectedSymbol)
        ? selectedSymbol
        : (availableSymbols[0] || 'HPG');
      setSelectedSymbol(initialSym);

      // Tải BCTC của mã đó
      loadFinancialsForSymbol(initialSym);
      // Tải Raw JSON mặc định
      loadRawJson(inspectorType, initialSym);
    } catch (err) {
      console.error('Lỗi nạp dữ liệu định giá:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadFinancialsForSymbol = async (sym) => {
    try {
      const fin = await fetchStockFinancials(sym);
      setFinancials(fin);
    } catch (e) {
      console.warn(`Chưa tải được BCTC cho ${sym}:`, e);
      setFinancials(null);
    }
  };

  const loadRawJson = async (type, sym) => {
    try {
      const res = await fetchRawJson(type, sym || selectedSymbol);
      setRawJsonContent(res.content || '');
      setRawJsonPath(res.path || res.fileName || '');
    } catch (e) {
      setRawJsonContent(`{\n  "error": "Không thể nạp file JSON: ${e.message}"\n}`);
      setRawJsonPath('');
    }
  };

  useEffect(() => {
    loadAllValuationData();
  }, [refreshKey]);

  // Đổi mã cổ phiếu
  const handleSelectSymbol = (sym) => {
    setSelectedSymbol(sym);
    loadFinancialsForSymbol(sym);
    if (inspectorType === 'financials') {
      loadRawJson('financials', sym);
    }
  };

  // Đổi loại file trên Raw JSON Inspector
  const handleChangeInspectorType = (type) => {
    setInspectorType(type);
    loadRawJson(type, selectedSymbol);
  };

  // Kích hoạt đồng bộ
  const handleTriggerSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await triggerValuationSync();
      setSyncMessage({
        type: 'success',
        text: res.message || 'Đã đồng bộ dữ liệu định giá thành công!'
      });
      await loadAllValuationData();
    } catch (err) {
      setSyncMessage({
        type: 'error',
        text: `Lỗi đồng bộ: ${err.message}`
      });
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 4000);
    }
  };

  // Đồng bộ BCTC cho riêng mã đang chọn
  const handleSyncSingleFinancials = async () => {
    if (!selectedSymbol) return;
    setSyncingSingle(true);
    setSyncMessage(null);
    try {
      const res = await triggerSingleFinancialSync(selectedSymbol);
      setSyncMessage({
        type: 'success',
        text: res.message || `Đã tải BCTC cho ${selectedSymbol} thành công!`
      });
      await loadFinancialsForSymbol(selectedSymbol);
      if (inspectorType === 'financials') {
        loadRawJson('financials', selectedSymbol);
      }
    } catch (err) {
      setSyncMessage({
        type: 'error',
        text: `Lỗi tải BCTC ${selectedSymbol}: ${err.message}`
      });
    } finally {
      setSyncingSingle(false);
      setTimeout(() => setSyncMessage(null), 4000);
    }
  };

  // Tra cứu & Định giá mã cổ phiếu tùy ý
  const handleLookupSymbol = async (targetSym) => {
    const sym = (targetSym || inputSymbol).trim().toUpperCase();
    if (!sym) return;

    // Nếu mã đã có sẵn trong danh sách
    if (symbolsList.includes(sym)) {
      handleSelectSymbol(sym);
      setInputSymbol('');
      return;
    }

    // Nếu là mã mới, gửi yêu cầu định giá & cào BCTC
    setLookingUp(true);
    setSyncMessage({
      type: 'info',
      text: `Đang tra cứu thời gian thực và trích xuất BCTC cho mã ${sym}...`
    });

    try {
      const res = await triggerSingleFinancialSync(sym);
      setSyncMessage({
        type: 'success',
        text: res.message || `Đã tra cứu và định giá thành công cho mã ${sym}!`
      });

      // Tải lại toàn bộ dữ liệu định giá
      const stocksRes = await fetchValuationStocks().catch(() => ({}));
      setValuationData(stocksRes || {});

      setSelectedSymbol(sym);
      await loadFinancialsForSymbol(sym);
      if (inspectorType === 'financials') {
        loadRawJson('financials', sym);
      }
      setInputSymbol('');
    } catch (err) {
      setSyncMessage({
        type: 'error',
        text: `Lỗi tra cứu mã ${sym}: ${err.message}`
      });
    } finally {
      setLookingUp(false);
      setTimeout(() => setSyncMessage(null), 4000);
    }
  };

  // Tự động chuyển mã khi được điều hướng từ tab khác (popup Sổ cái Lãi/Lỗ)
  useEffect(() => {
    if (initialSymbol && initialSymbol !== selectedSymbol) {
      handleLookupSymbol(initialSymbol);
    }
  }, [initialSymbol]);

  // Copy JSON
  const handleCopyJson = () => {
    if (!rawJsonContent) return;
    navigator.clipboard.writeText(rawJsonContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Danh sách mã cổ phiếu hợp lệ
  const symbolsList = useMemo(() => {
    return Object.keys(valuationData).filter(k => !k.startsWith('_'));
  }, [valuationData]);

  // Danh sách mã cổ phiếu sau khi lọc
  const filteredSymbols = useMemo(() => {
    if (!filterSearch.trim()) return symbolsList;
    const q = filterSearch.trim().toUpperCase();
    return symbolsList.filter(sym => {
      const item = valuationData[sym] || {};
      return sym.includes(q) || (item.description || '').toUpperCase().includes(q) || (item.sector || '').toUpperCase().includes(q);
    });
  }, [symbolsList, valuationData, filterSearch]);

  // Thông tin mã đang chọn
  const currentStock = valuationData[selectedSymbol] || null;

  // Format số tiền
  const formatVND = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    return Number(val).toLocaleString('vi-VN') + ' đ';
  };

  const formatBn = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    return Number(val).toLocaleString('vi-VN') + ' tỷ';
  };

  const formatPercent = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    const num = Number(val);
    const sign = num > 0 ? '+' : '';
    return `${sign}${num.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* ── 1. HEADER & CONTROL BAR ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700/60 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-3xl">🏢</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Định Giá Cổ Phiếu Chuyên Sâu
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700">
                  Local JSON First
                </span>
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Hội tụ 6 mô hình định giá Graham, DDM, EV/EBITDA, P/CF, DuPont 3 nhân tố và BCTC 8 quý - 5 năm.
              </p>
            </div>
          </div>
        </div>

        {/* Nút Sync & Trạng thái */}
        <div className="flex items-center gap-3">
          {valuationData._meta?.lastSyncedAt && (
            <div className="hidden sm:block text-right text-[11px] text-gray-400 dark:text-gray-500">
              <div>Cập nhật lần cuối:</div>
              <div className="font-medium text-gray-600 dark:text-gray-300">
                {new Date(valuationData._meta.lastSyncedAt).toLocaleString('vi-VN')}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleTriggerSync}
            disabled={syncing}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs ${syncing
                ? 'bg-indigo-100 text-indigo-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'
              }`}
          >
            <span className={syncing ? 'animate-spin' : ''}>🔄</span>
            {syncing ? 'Đang đồng bộ...' : 'Cập nhật định giá'}
          </button>
        </div>
      </div>

      {/* Thông báo Sync nếu có */}
      {syncMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between ${syncMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
            }`}
        >
          <span>{syncMessage.text}</span>
          <button onClick={() => setSyncMessage(null)} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
      )}

      {/* ── 2. KHỐI TRA CỨU & ĐỊNH GIÁ CỔ PHIẾU ── */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-6">
        {/* Khung Nhập & Tra Cứu Mã Cổ Phiếu Tùy Ý (Đã bỏ Gợi ý nhanh) */}
        <div className="bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/50 dark:from-indigo-950/40 dark:via-gray-800 dark:to-purple-950/30 border border-indigo-100 dark:border-indigo-800/60 rounded-2xl p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-lg shadow-sm">
                🔍
              </span>
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Tra Cứu & Định Giá Bất Kỳ Cổ Phiếu Nào
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Nhập bất kỳ mã cổ phiếu nào (HOSE, HNX, UPCOM) để hệ thống trích xuất định giá và BCTC tự động.
                </p>
              </div>
            </div>

            {/* Ô input và nút tra cứu */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLookupSymbol();
              }}
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <div className="relative flex-1 sm:w-72">
                <input
                  type="text"
                  value={inputSymbol}
                  onChange={(e) => setInputSymbol(e.target.value.toUpperCase())}
                  placeholder="Nhập mã (VNM, FPT, MBB, SSI...)"
                  className="w-full pl-3.5 pr-8 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase shadow-2xs"
                  disabled={lookingUp}
                />
                {inputSymbol && (
                  <button
                    type="button"
                    onClick={() => setInputSymbol('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={!inputSymbol.trim() || lookingUp}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer whitespace-nowrap"
              >
                <span className={lookingUp ? 'animate-spin' : ''}>🔄</span>
                <span>{lookingUp ? 'Đang nạp...' : 'Tra Cứu & Định Giá'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* ── THÔNG TIN TỔNG QUAN & ĐỊNH GIÁ CỦA RIÊNG MÃ ĐANG CHỌN ── */}
        {currentStock && (
          <div className="space-y-6 pt-1">
            {/* Header Thẻ Cổ Phiếu */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-gray-50/70 dark:bg-gray-700/30 rounded-2xl border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-2xl bg-indigo-600/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center font-black text-lg">
                  {selectedSymbol}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      {currentStock.description || selectedSymbol}
                    </h3>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      {currentStock.exchange || 'HOSE'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                      {currentStock.sector || 'Khác'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {currentStock.industry ? `Ngành: ${currentStock.industry} • ` : ''}
                    Khối lượng giao dịch: {currentStock.volume ? currentStock.volume.toLocaleString('vi-VN') : '—'} cp
                  </p>
                </div>
              </div>

              {/* Thị Giá Hiện Tại & Nút Làm Mới */}
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-xs text-gray-400">Thị Giá Hiện Tại</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-gray-900 dark:text-white">
                      {formatVND(currentStock.close)}
                    </span>
                    <span className={`text-xs font-bold ${(currentStock.change || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>
                      {(currentStock.change || 0) >= 0 ? '+' : ''}{currentStock.change}%
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSyncSingleFinancials}
                  disabled={syncingSingle}
                  className="p-2.5 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-300 text-xs transition cursor-pointer shadow-2xs"
                  title={`Cập nhật lại dữ liệu mới nhất cho ${selectedSymbol}`}
                >
                  <span className={syncingSingle ? 'inline-block animate-spin' : ''}>🔄</span>
                </button>
              </div>
            </div>

            {/* Thẻ Hero: Giá Trị Hợp Lý Hội Tụ & Biên An Toàn */}
            <div className="p-5 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-800/60 pb-4">
                <div>
                  <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider block">
                    🎯 Giá Trị Nội Tại Hội Tụ (Consensus Fair Value)
                  </span>
                  <div className="flex items-baseline gap-3 mt-1">
                    <span className="text-3xl sm:text-4xl font-black text-emerald-400">
                      {formatVND(currentStock.valuation?.fairValue || financials?.valuationMultiples?.consensusFairValue)}
                    </span>
                    <span className="text-xs text-indigo-200 font-medium">
                      (Tổng hợp 6 phương pháp định giá)
                    </span>
                  </div>
                </div>

                {(() => {
                  const consensusFair = currentStock.valuation?.fairValue || financials?.valuationMultiples?.consensusFairValue;
                  const closePrice = currentStock.close;

                  // % Chênh lệch so với thị giá hiện tại (Tiềm năng tăng/giảm giá)
                  const upsideValue = currentStock.valuation?.upside != null
                    ? currentStock.valuation.upside
                    : (financials?.valuationMultiples?.upside != null
                      ? financials.valuationMultiples.upside
                      : calcPriceDiff(consensusFair, closePrice));

                  // Biên an toàn Graham (Margin of Safety)
                  const mosValue = currentStock.valuation?.marginOfSafetyFairValue != null
                    ? currentStock.valuation.marginOfSafetyFairValue
                    : (financials?.valuationMultiples?.marginOfSafety != null
                      ? financials.valuationMultiples.marginOfSafety
                      : (consensusFair && closePrice ? Math.round(((consensusFair - closePrice) / consensusFair) * 100) : null));

                  let valRatingText = currentStock.valuation?.valuationRatingText;
                  let valRatingBadge = currentStock.valuation?.valuationRatingBadge;
                  if (!valRatingText && mosValue != null) {
                    if (mosValue >= 20) {
                      valRatingText = 'Rất Rẻ (Biên an toàn > 20%)';
                      valRatingBadge = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300';
                    } else if (mosValue >= 5) {
                      valRatingText = 'Hấp Dẫn (Vùng Mua 5 - 20%)';
                      valRatingBadge = 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
                    } else if (mosValue >= -5) {
                      valRatingText = 'Hợp Lý (Định giá cân bằng)';
                      valRatingBadge = 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
                    } else if (mosValue >= -20) {
                      valRatingText = 'Định Giá Cao (-5% đến -20%)';
                      valRatingBadge = 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
                    } else {
                      valRatingText = 'Rất Đắt / Rủi Ro (MoS < -20%)';
                      valRatingBadge = 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300';
                    }
                  }
                  if (!valRatingText) {
                    valRatingText = 'Định giá hợp lý';
                    valRatingBadge = 'bg-indigo-800 text-white';
                  }

                  return (
                    <div className="flex flex-wrap items-center sm:justify-end gap-4 sm:gap-6">
                      {/* Trụ 1: % Chênh lệch vs Thị giá (Tiềm năng tăng giá) */}
                      <div className="text-left sm:text-right">
                        <span className="text-[11px] text-indigo-300 font-semibold block uppercase tracking-wide">
                          % Chênh Lệch vs Thị Giá
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-2xl font-black ${(upsideValue || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                            {upsideValue != null ? `${upsideValue >= 0 ? '+' : ''}${upsideValue}%` : '—'}
                          </span>
                          <span className="text-[10px] text-indigo-200 font-medium">
                            {(upsideValue || 0) >= 0 ? '(Tiềm năng tăng)' : '(Định giá thấp hơn)'}
                          </span>
                        </div>
                      </div>

                      {/* Trụ 2: Biên An Toàn Graham (MoS) & Badge Khuyến Nghị */}
                      <div className="text-left sm:text-right border-l border-indigo-800/80 pl-4 sm:pl-6">
                        <span className="text-[11px] text-gray-300 font-medium block">
                          Biên An Toàn (MoS)
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xl font-black ${(mosValue || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                            {mosValue != null ? `${mosValue >= 0 ? '+' : ''}${mosValue}%` : '—'}
                          </span>
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${valRatingBadge}`}>
                            {valRatingText}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 6 Thẻ Mô Hình Định Giá Chi Tiết */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
                {(() => {
                  const closePrice = currentStock.close;
                  const models = [
                    {
                      label: '1. Giá Graham',
                      val: currentStock.valuation?.grahamNumber || financials?.valuationMultiples?.grahamNumber,
                      desc: '√(22.5 × EPS × BV)',
                      diff: currentStock.valuation?.grahamDiffPercent ?? calcPriceDiff(currentStock.valuation?.grahamNumber || financials?.valuationMultiples?.grahamNumber, closePrice)
                    },
                    {
                      label: '2. Giá DDM',
                      val: currentStock.valuation?.ddmTarget || financials?.valuationMultiples?.ddmTarget,
                      desc: 'Chiết khấu cổ tức',
                      diff: currentStock.valuation?.ddmDiffPercent ?? calcPriceDiff(currentStock.valuation?.ddmTarget || financials?.valuationMultiples?.ddmTarget, closePrice)
                    },
                    {
                      label: '3. EV/EBITDA',
                      val: financials?.valuationMultiples?.evEbitdaFairPrice || currentStock.valuation?.evEbitdaFairPrice,
                      desc: 'Multiple ngành 7.5x',
                      diff: currentStock.valuation?.evEbitdaDiffPercent ?? calcPriceDiff(financials?.valuationMultiples?.evEbitdaFairPrice || currentStock.valuation?.evEbitdaFairPrice, closePrice)
                    },
                    {
                      label: '4. Dòng Tiền P/CF',
                      val: financials?.valuationMultiples?.pcfFairPrice || currentStock.valuation?.pcfFairPrice,
                      desc: 'CFO tiền thật × 8.0x',
                      diff: currentStock.valuation?.pcfDiffPercent ?? calcPriceDiff(financials?.valuationMultiples?.pcfFairPrice || currentStock.valuation?.pcfFairPrice, closePrice)
                    },
                    {
                      label: '5. P/E Mục Tiêu',
                      val: currentStock.valuation?.peTarget || financials?.valuationMultiples?.peTarget,
                      desc: 'EPS × 11.5x',
                      diff: currentStock.valuation?.peDiffPercent ?? calcPriceDiff(currentStock.valuation?.peTarget || financials?.valuationMultiples?.peTarget, closePrice)
                    },
                    {
                      label: '6. P/B Mục Tiêu',
                      val: financials?.valuationMultiples?.pbTarget || currentStock.valuation?.pbTarget,
                      desc: 'BVPS × 1.35x',
                      diff: currentStock.valuation?.pbDiffPercent ?? calcPriceDiff(financials?.valuationMultiples?.pbTarget || currentStock.valuation?.pbTarget, closePrice)
                    },
                  ];

                  return models.map((m, idx) => (
                    <div key={idx} className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs border border-white/10 text-center flex flex-col justify-between">
                      <div>
                        <div className="text-[10px] text-indigo-200 font-semibold uppercase">{m.label}</div>
                        <div className="text-sm font-bold text-white mt-1">
                          {formatVND(m.val)}
                        </div>
                      </div>
                      <div className="mt-1.5 flex items-center justify-center">
                        {m.diff != null ? (
                          <span
                            className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md inline-flex items-center gap-0.5 ${m.diff >= 0
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}
                            title={`Chênh lệch so với giá hiện tại (${formatVND(closePrice)}): ${m.diff >= 0 ? '+' : ''}${m.diff}%`}
                          >
                            <span>{m.diff >= 0 ? '▲' : '▼'}</span>
                            <span>{m.diff >= 0 ? '+' : ''}{m.diff}%</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-indigo-300/50">—</span>
                        )}
                      </div>
                      <div className="text-[10px] text-indigo-300 mt-1">{m.desc}</div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Khối Kỹ Thuật & Hiệu Suất Chu Kỳ (Technicals & Performance) */}
            <div className="p-5 bg-gray-50/70 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    Xung Lực Kỹ Thuật & Hiệu Suất Chu Kỳ
                  </span>
                  <h4 className="text-base font-bold text-gray-900 dark:text-white mt-0.5">
                    Chỉ Báo Kỹ Thuật & Vận Động Giá — {selectedSymbol}
                  </h4>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-gray-400 block">Đồng thuận kỹ thuật</span>
                  <span className={`text-xs font-extrabold ${currentStock.technicals?.recommendColor || 'text-gray-900'}`}>
                    {currentStock.technicals?.recommendText || 'Trung tính'}
                  </span>
                </div>
              </div>

              {/* Thước Đo Vị Thế Giá 52 Tuần (52-Week Price Range Slider) */}
              {currentStock.performance?.low52w != null && currentStock.performance?.high52w != null && (
                <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <span>🎯</span> Vị Trí Thị Giá Trong Chu Kỳ 52 Tuần
                    </span>
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {currentStock.performance.range52wPercent != null
                        ? `${currentStock.performance.range52wPercent}% từ đáy 52W`
                        : ''}
                    </span>
                  </div>

                  <div className="relative pt-2 pb-1">
                    <div className="h-3 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex relative">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(4, Math.min(96, currentStock.performance.range52wPercent || 0))}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-xs mt-2 text-gray-500 dark:text-gray-400">
                      <div>
                        <span className="text-[10px] text-gray-400 block">Đáy 52 tuần</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {formatVND(currentStock.performance.low52w)}
                        </span>
                      </div>
                      <div className="text-center">
                        <span className="text-[10px] text-gray-400 block">Thị giá hiện tại</span>
                        <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-sm">
                          {formatVND(currentStock.close)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-gray-400 block">Đỉnh 52 tuần</span>
                        <span className="font-bold text-rose-600 dark:text-rose-400">
                          {formatVND(currentStock.performance.high52w)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Chu kỳ hiệu suất giá */}
              <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
                {[
                  { label: '1 Tuần', val: currentStock.performance?.w1 },
                  { label: '1 Tháng', val: currentStock.performance?.m1 },
                  { label: '3 Tháng', val: currentStock.performance?.m3 },
                  { label: '6 Tháng', val: currentStock.performance?.m6 },
                  { label: 'Đầu năm', val: currentStock.performance?.ytd },
                  { label: '1 Năm', val: currentStock.performance?.y1 },
                  { label: '5 Năm', val: currentStock.performance?.y5 },
                ].map((cycle, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-center">
                    <span className="text-[10px] text-gray-400 font-bold block">{cycle.label}</span>
                    <span className={`text-xs font-black block mt-0.5 ${(cycle.val || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>
                      {cycle.val != null ? `${(cycle.val >= 0 ? '+' : '')}${cycle.val}%` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 4. KHỐI 3 & 4: PHÂN RÃ DUPONT 3 NHÂN TỐ & ACTIVE TECH SCORE ── */}
      {currentStock && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card DuPont */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-4">
            {(() => {
              const roeVal = currentStock.dupont?.roe ?? financials?.financialRatios?.profitability?.roe;
              const npmVal = currentStock.dupont?.netProfitMargin ?? financials?.financialRatios?.profitability?.netMargin;
              const atoVal = currentStock.dupont?.assetTurnover ?? financials?.financialRatios?.efficiency?.assetTurnover;
              const emVal = currentStock.dupont?.equityMultiplier ?? financials?.financialRatios?.leverage?.financialLeverage;
              let quality = currentStock.dupont?.qualityAssessment;
              if (!quality && npmVal != null) {
                if (npmVal > 12 && (!emVal || emVal < 2.5)) {
                  quality = 'Chất lượng cao: Tăng trưởng nhờ biên lợi nhuận cốt lõi vững chắc, nợ vay an toàn.';
                } else if (npmVal < 5 && emVal && emVal > 3.0) {
                  quality = 'Cảnh báo rủi ro: ROE được thúc đẩy chủ yếu do đòn bẩy nợ vay cao trong khi biên lợi nhuận mỏng.';
                } else if (npmVal >= 8) {
                  quality = 'Ổn định: Biên lợi nhuận khá, hiệu quả sử dụng tài sản ở mức hợp lý.';
                } else {
                  quality = 'Trung bình: Cần theo dõi thêm sự cải thiện của biên lợi nhuận ròng.';
                }
              }
              if (!quality) quality = 'Đang tổng hợp dữ liệu BCTC';

              return (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                        Mô Hình DuPont 3 Nhân Tố
                      </span>
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                        Chất Lượng Lợi Nhuận ROE — {selectedSymbol}
                      </h4>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-gray-400">ROE Tổng Hợp</div>
                      <div className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                        {roeVal != null ? `${roeVal}%` : '—'}
                      </div>
                    </div>
                  </div>

                  {/* 3 Thành phần DuPont */}
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700 text-center">
                      <div className="text-[10px] text-gray-400 font-semibold uppercase">1. Biên Ròng (NPM)</div>
                      <div className="text-base font-bold text-gray-900 dark:text-white mt-1">
                        {npmVal != null ? `${npmVal}%` : '—'}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">Năng lực cạnh tranh</div>
                    </div>

                    <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700 text-center">
                      <div className="text-[10px] text-gray-400 font-semibold uppercase">2. Vòng Quay TS</div>
                      <div className="text-base font-bold text-gray-900 dark:text-white mt-1">
                        {atoVal != null ? `${atoVal}x` : '—'}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">Hiệu quả tài sản</div>
                    </div>

                    <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700 text-center">
                      <div className="text-[10px] text-gray-400 font-semibold uppercase">3. Đòn Bẩy (EM)</div>
                      <div className="text-base font-bold text-gray-900 dark:text-white mt-1">
                        {emVal != null ? `${emVal}x` : '—'}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">Rủi ro nợ vay</div>
                    </div>
                  </div>

                  <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100/60 dark:border-indigo-800/40 text-xs text-gray-700 dark:text-gray-300">
                    <span className="font-bold text-indigo-700 dark:text-indigo-300">Chẩn đoán: </span>
                    {quality}
                  </div>
                </>
              );
            })()}
          </div>

          {/* Card Tech Score */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Động Cơ Chấm Điểm Kỹ Thuật
                </span>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                  Active Tech Score — {selectedSymbol}
                </h4>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-gray-400">Điểm Số (-3 đến +3)</div>
                <div className={`text-xl font-black ${currentStock.technicals?.techScoreColor || 'text-gray-900'}`}>
                  {currentStock.technicals?.techScore > 0 ? `+${currentStock.technicals.techScore}` : (currentStock.technicals?.techScore || 0)}/3
                </div>
              </div>
            </div>

            {/* Chỉ báo kỹ thuật & xung lực */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700 text-center">
                <div className="text-[10px] text-gray-400 font-semibold uppercase">Đồng Thuận TV</div>
                <div className={`text-base font-bold mt-1 ${currentStock.technicals?.recommendColor || 'text-gray-900 dark:text-white'}`}>
                  {currentStock.technicals?.recommendText || '—'}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">Tổng hợp tín hiệu</div>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700 text-center">
                <div className="text-[10px] text-gray-400 font-semibold uppercase">Hệ Số Beta (1Y)</div>
                <div className="text-base font-bold text-gray-900 dark:text-white mt-1">
                  {currentStock.technicals?.beta != null ? `${currentStock.technicals.beta}x` : '—'}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">Biến động vs VN-Index</div>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700 text-center">
                <div className="text-[10px] text-gray-400 font-semibold uppercase">Vị Thế 52W</div>
                <div className="text-base font-bold text-gray-900 dark:text-white mt-1">
                  {currentStock.performance?.range52wPercent !== null ? `${currentStock.performance.range52wPercent}%` : '—'}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">Khoảng giá đáy/đỉnh</div>
              </div>
            </div>

            {/* Các yếu tố tác động */}
            <div className="space-y-1.5 pt-1">
              {(currentStock.technicals?.factors || []).map((fact, idx) => (
                <div key={idx} className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-2">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span>{fact}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 5. KHỐI 5: BÁO CÁO TÀI CHÍNH LỊCH SỬ & DÒNG TIỀN (INCOME, BALANCE, CASH FLOW) ── */}
      {financials ? (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-700">
            <div>
              <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                Báo Cáo Tài Chính 3 Báo Cáo Cốt Lõi
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-0.5 flex items-center gap-2">
                <span>📊</span> Lịch Sử BCTC — {financials._meta?.companyName || selectedSymbol} ({selectedSymbol})
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {financials._meta?.unit} · Nguồn: {financials._meta?.source}
              </p>
            </div>

            {/* Nút thao tác BCTC & chuyển đổi Quý / Năm */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSyncSingleFinancials}
                disabled={syncingSingle}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors cursor-pointer disabled:opacity-50"
                title={`Tải lại BCTC mới nhất cho ${selectedSymbol}`}
              >
                <span className={syncingSingle ? 'inline-block animate-spin' : ''}>🔄</span>
                <span>{syncingSingle ? `Đang nạp ${selectedSymbol}...` : `Tải lại BCTC ${selectedSymbol}`}</span>
              </button>

              <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700/60 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFinancialPeriod('quarterly')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${financialPeriod === 'quarterly'
                      ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                      : 'text-gray-500 hover:text-gray-800 dark:text-gray-300'
                    }`}
                >
                  Theo Quý (8 Quý Gần Nhất)
                </button>
                <button
                  type="button"
                  onClick={() => setFinancialPeriod('yearly')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${financialPeriod === 'yearly'
                      ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                      : 'text-gray-500 hover:text-gray-800 dark:text-gray-300'
                    }`}
                >
                  Theo Năm (5 Năm Gần Nhất)
                </button>
              </div>
            </div>
          </div>

          {/* Cards Tăng Trưởng CAGR & Dòng Tiền */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700">
              <div className="text-[11px] text-gray-400 font-semibold uppercase">CAGR Doanh Thu 3 Năm</div>
              <div className="text-xl font-black text-gray-900 dark:text-white mt-1">
                {formatPercent(financials.cagr?.cagr3YRevenue)}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">Tăng trưởng quy mô</div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700">
              <div className="text-[11px] text-gray-400 font-semibold uppercase">CAGR LNST 3 Năm</div>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {formatPercent(financials.cagr?.cagr3YNetIncome)}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">Tăng trưởng lợi nhuận</div>
            </div>

            {(() => {
              const lastQ = financials.quarterly?.[financials.quarterly.length - 1] || {};
              const fcfVal = financials.cashflowHealth?.latestFcf ?? (lastQ.freeCashFlow != null ? lastQ.freeCashFlow : currentStock?.dividends?.fcf);
              const cfoRatio = financials.cashflowHealth?.cfoVsNetIncomeRatio ?? lastQ.cfoToNetIncome;
              let cfoQuality = financials.cashflowHealth?.qualityAssessment;
              if (!cfoQuality && cfoRatio != null) {
                cfoQuality = cfoRatio >= 1.0 ? 'Chất lượng tiền mặt xuất sắc (CFO > LNST)' : cfoRatio >= 0.7 ? 'Tốt (Dòng tiền kinh doanh dương)' : 'Cần theo dõi (Dòng tiền yếu)';
              }
              if (!cfoQuality) cfoQuality = 'Đang phân tích dòng tiền';

              return (
                <>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <div className="text-[11px] text-gray-400 font-semibold uppercase">Dòng Tiền Tự Do (FCF)</div>
                    <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                      {formatBn(fcfVal)}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">FCF = CFO - CapEx</div>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <div className="text-[11px] text-gray-400 font-semibold uppercase">Chất Lượng CFO / LNST</div>
                    <div className="text-xl font-black text-gray-900 dark:text-white mt-1">
                      {cfoRatio != null ? `${cfoRatio}x` : '—'}
                    </div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium truncate mt-0.5">
                      {cfoQuality}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Main Tabs Bộ Dữ Liệu Chuyên Sâu */}
          <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-3">
            <button
              type="button"
              onClick={() => setMainReportView('statements')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${mainReportView === 'statements'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
            >
              <span>📑</span>
              <span>1. Ba Báo Cáo Tài Chính (VAS/TT200)</span>
            </button>

            <button
              type="button"
              onClick={() => setMainReportView('ratios')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${mainReportView === 'ratios'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
            >
              <span>📊</span>
              <span>2. Bộ 54 Chỉ Số Tài Chính (Ratios)</span>
            </button>

            <button
              type="button"
              onClick={() => setMainReportView('events')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${mainReportView === 'events'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
            >
              <span>🎁</span>
              <span>3. Cổ Tức & Cơ Cấu Cổ Đông</span>
            </button>

            <button
              type="button"
              onClick={() => setMainReportView('formulas')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${mainReportView === 'formulas'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
            >
              <span>🧮</span>
              <span>4. Giải Phẫu Công Thức Định Giá (Breakdown)</span>
            </button>
          </div>

          {/* ── VIEW 1: BA BÁO CÁO TÀI CHÍNH CHI TIẾT ── */}
          {mainReportView === 'statements' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2">
                <button
                  type="button"
                  onClick={() => setFinancialTab('income')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${financialTab === 'income'
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                      : 'text-gray-500 hover:text-gray-800 dark:text-gray-300'
                    }`}
                >
                  Kết Quả Kinh Doanh (Income Statement)
                </button>
                <button
                  type="button"
                  onClick={() => setFinancialTab('balance')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${financialTab === 'balance'
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                      : 'text-gray-500 hover:text-gray-800 dark:text-gray-300'
                    }`}
                >
                  Cân Đối Kế Toán (Balance Sheet)
                </button>
                <button
                  type="button"
                  onClick={() => setFinancialTab('cashflow')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${financialTab === 'cashflow'
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                      : 'text-gray-500 hover:text-gray-800 dark:text-gray-300'
                    }`}
                >
                  Lưu Chuyển Tiền Tệ (Cash Flow & FCF)
                </button>
              </div>

              <div className="overflow-x-auto">
                {financialPeriod === 'quarterly' ? (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-700 text-gray-400 text-[11px] uppercase">
                        <th className="pb-3 pl-2">Chỉ Tiêu Tài Chính</th>
                        {financials.quarterly?.map((q) => (
                          <th key={q.period} className="pb-3 text-right">{q.period}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                      {financialTab === 'income' && (
                        <>
                          <tr>
                            <td className="py-2.5 pl-2 font-bold text-gray-900 dark:text-white">Doanh thu thuần</td>
                            {financials.quarterly?.map((q) => (
                              <td key={q.period} className="py-2.5 text-right font-semibold text-gray-800 dark:text-gray-200">
                                {formatBn(q.revenue)}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="py-2.5 pl-2 text-gray-500">Giá vốn hàng bán</td>
                            {financials.quarterly?.map((q) => (
                              <td key={q.period} className="py-2.5 text-right text-gray-500">
                                {formatBn(q.costOfGoodsSold)}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="py-2.5 pl-2 font-semibold text-gray-700 dark:text-gray-300">Lợi nhuận gộp</td>
                            {financials.quarterly?.map((q) => (
                              <td key={q.period} className="py-2.5 text-right font-medium text-gray-700 dark:text-gray-300">
                                {formatBn(q.grossProfit)}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="py-2.5 pl-2 text-gray-500">Doanh thu hoạt động tài chính</td>
                            {financials.quarterly?.map((q) => (
                              <td key={q.period} className="py-2.5 text-right text-gray-500">
                                {formatBn(q.financialIncome)}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="py-2.5 pl-2 text-gray-500">Chi phí tài chính</td>
                            {financials.quarterly?.map((q) => (
                              <td key={q.period} className="py-2.5 text-right text-gray-500">
                                {formatBn(q.financialExpense)}
                              </td>
                            ))}
                          </tr>
                          <tr className="bg-amber-50/30 dark:bg-amber-950/15">
                            <td className="py-2 pl-4 text-xs font-semibold text-amber-800 dark:text-amber-300">↳ Trong đó: Chi phí lãi vay</td>
                            {financials.quarterly?.map((q) => (
                              <td key={q.period} className="py-2 text-right font-semibold text-amber-700 dark:text-amber-300">
                                {formatBn(q.interestExpense)}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="py-2.5 pl-2 text-gray-500">Chi phí bán hàng & Quản lý (SG&A)</td>
                            {financials.quarterly?.map((q) => (
                              <td key={q.period} className="py-2.5 text-right text-gray-500">
                                {formatBn(q.operatingExpense)}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="py-2.5 pl-2 font-semibold text-gray-700 dark:text-gray-300">Lợi nhuận trước thuế (EBT)</td>
                            {financials.quarterly?.map((q) => (
                              <td key={q.period} className="py-2.5 text-right font-semibold text-gray-700 dark:text-gray-300">
                                {formatBn(q.profitBeforeTax)}
                              </td>
                            ))}
                          </tr>
                          <tr className="bg-emerald-50/40 dark:bg-emerald-950/20">
                            <td className="py-2.5 pl-2 font-bold text-emerald-800 dark:text-emerald-300">Lợi nhuận sau thuế (LNST)</td>
                            {financials.quarterly?.map((q) => (
                              <td key={q.period} className="py-2.5 text-right font-black text-emerald-700 dark:text-emerald-300">
                                {formatBn(q.netIncome)}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="py-2.5 pl-2 font-semibold text-gray-700 dark:text-gray-300">EPS cơ bản (đ/cp)</td>
                            {financials.quarterly?.map((q) => (
                              <td key={q.period} className="py-2.5 text-right font-semibold text-indigo-600 dark:text-indigo-400">
                                {formatVND(q.eps)}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="py-2.5 pl-2 text-gray-500">Biên lợi nhuận ròng</td>
                            {financials.quarterly?.map((q) => (
                              <td key={q.period} className="py-2.5 text-right text-gray-600 dark:text-gray-400 font-medium">
                                {q.netMargin ? `${q.netMargin}%` : '—'}
                              </td>
                            ))}
                          </tr>
                        </>
                      )}

                      {financialTab === 'balance' && (
                        <>
                          <tr>
                            <td className="py-2.5 pl-2 font-bold text-gray-900 dark:text-white">Tiền & tương đương tiền</td>
                            {financials.quarterly?.map((q) => (
                              <td key={q.period} className="py-2.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                                {formatBn(q.cashAndEquivalents)}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="py-2.5 pl-2 text-gray-600 dark:text-gray-300">Đầu tư tài chính ngắn hạn (tiền gửi)</td>
                            {financials.quarterly?.map((q) => (
                              <td key={q.period} className="py-2.5 text-right text-gray-600 dark:text-gray-300">
                                {formatBn(q.shortTermInvestments)}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="py-2.5 pl-2 text-gray-600 dark:text-gray-300">Các khoản phải thu ngắn hạn</td>
                            {financials.quarterly?.map((q) => (
                              <td key={q.period} className="py-2.5 text-right text-gray-600 dark:text-gray-300">
                                {formatBn(q.accountsReceivable)}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="py-2.5 pl-2 font-medium text-amber-700 dark:text-amber-400">Hàng tồn kho ròng</td>
                            {financials.quarterly?.map((q) => (
                              <td key={q.period} className="py-2.5 text-right font-medium text-amber-700 dark:text-amber-400">
                                {formatBn(q.inventory)}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="py-2.5 pl-2 text-gray-600 dark:text-gray-300">Tài sản ngắn hạn</td>
                            {financials.quarterly?.map((q) => (
                              <td key={q.period} className="py-2.5 text-right text-gray-600 dark:text-gray-300 font-semibold">
                                {formatBn(q.shortTermAssets)}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="py-2.5 pl-2 text-gray-600 dark:text-gray-300">Tài sản cố định (TSCĐ)</td>
                            {financials.quarterly?.map((q) => (
                              <td key={q.period} className="py-2.5 text-right text-gray-600 dark:text-gray-300">
                                {formatBn(q.fixedAssets)}
                              </td>
                            ))}
                          </tr>
                          <tr className="bg-indigo-50/30 dark:bg-indigo-950/20">
                            <td className="py-2.5 pl-2 font-bold text-indigo-700 dark:text-indigo-300">Chi phí XDCB dở dang (Dự án mở rộng)</td>
                            {financials.quarterly?.map((q) => (
                              <td key={q.period} className="py-2.5 text-right font-bold text-indigo-700 dark:text-indigo-300">
                                {formatBn(q.constructionInProgress)}
                              </td>
                            ))}
                          </tr>
                          <tr className="bg-gray-50/60 dark:bg-gray-700/30">
                            <td className="py-2.5 pl-2 font-black text-gray-900 dark:text-white">TỔNG TÀI SẢN</td>
                            {financials.quarterly?.map((q) => (
                              <td key={q.period} className="py-2.5 text-right font-black text-gray-900 dark:text-white">
                                {formatBn(q.totalAssets)}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="py-2.5 pl-2 text-rose-600 dark:text-rose-400">Vay & nợ thuê tài chính ngắn hạn</td>
                            {financials.quarterly?.map((q) => (
                              <td key={q.period} className="py-2.5 text-right text-rose-600 dark:text-rose-400">
                                {formatBn(q.shortTermDebt)}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="py-2.5 pl-2 text-rose-600 dark:text-rose-400">Vay & nợ thuê tài chính dài hạn</td>
                            {financials.quarterly?.map((q) => (
                              <td key={q.period} className="py-2.5 text-right text-rose-600 dark:text-rose-400">
                                {formatBn(q.longTermDebt)}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="py-2.5 pl-2 text-rose-600 dark:text-rose-400 font-bold">Tổng nợ phải trả</td>
                            {financials.quarterly?.map((q) => (
                              <td key={q.period} className="py-2.5 text-right text-rose-600 dark:text-rose-400 font-bold">
                                {formatBn(q.totalDebt)}
                              </td>
                            ))}
                          </tr>
                          <tr className="bg-indigo-50/40 dark:bg-indigo-950/20">
                            <td className="py-2.5 pl-2 font-bold text-indigo-800 dark:text-indigo-300">VỐN CHỦ SỞ HỮU</td>
                            {financials.quarterly?.map((q) => (
                              <td key={q.period} className="py-2.5 text-right font-black text-indigo-700 dark:text-indigo-300">
                                {formatBn(q.equity)}
                              </td>
                            ))}
                          </tr>
                        </>
                      )}

                      {financialTab === 'cashflow' && (
                        <>
                          <tr>
                            <td className="py-2.5 pl-2 text-gray-500">Khấu hao tài sản cố định</td>
                            {financials.quarterly?.map((q) => (
                              <td key={q.period} className="py-2.5 text-right text-gray-500">
                                {formatBn(q.depreciation)}
                              </td>
                            ))}
                          </tr>
                          <tr className="bg-emerald-50/40 dark:bg-emerald-950/20">
                            <td className="py-2.5 pl-2 font-bold text-emerald-800 dark:text-emerald-300">Dòng tiền HĐKD (CFO)</td>
                            {financials.quarterly?.map((q) => (
                              <td key={q.period} className="py-2.5 text-right font-black text-emerald-700 dark:text-emerald-300">
                                {formatBn(q.cfo)}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="py-2.5 pl-2 text-rose-600 dark:text-rose-400">Chi mua sắm TSCĐ (CapEx)</td>
                            {financials.quarterly?.map((q) => (
                              <td key={q.period} className="py-2.5 text-right text-rose-600 dark:text-rose-400 font-medium">
                                {formatBn(q.capex)}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="py-2.5 pl-2 text-gray-500">Lưu chuyển từ HĐ Đầu tư (CFI)</td>
                            {financials.quarterly?.map((q) => (
                              <td key={q.period} className="py-2.5 text-right text-gray-500 font-medium">
                                {formatBn(q.cfi)}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="py-2.5 pl-2 text-amber-700 dark:text-amber-400">Cổ tức tiền mặt đã chi trả</td>
                            {financials.quarterly?.map((q) => (
                              <td key={q.period} className="py-2.5 text-right text-amber-700 dark:text-amber-400 font-medium">
                                {q.dividendsPaid ? formatBn(q.dividendsPaid) : '—'}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="py-2.5 pl-2 text-gray-500">Lưu chuyển từ HĐ Tài chính (CFF)</td>
                            {financials.quarterly?.map((q) => (
                              <td key={q.period} className="py-2.5 text-right text-gray-500 font-medium">
                                {formatBn(q.cff)}
                              </td>
                            ))}
                          </tr>
                          <tr className="bg-indigo-50/50 dark:bg-indigo-950/30">
                            <td className="py-2.5 pl-2 font-black text-indigo-800 dark:text-indigo-300">DÒNG TIỀN TỰ DO (FCF = CFO - CapEx)</td>
                            {financials.quarterly?.map((q) => (
                              <td key={q.period} className="py-2.5 text-right font-black text-indigo-600 dark:text-indigo-400">
                                {formatBn(q.freeCashFlow)}
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="py-2.5 pl-2 text-gray-500">Tỷ lệ CFO / LNST</td>
                            {financials.quarterly?.map((q) => (
                              <td key={q.period} className="py-2.5 text-right text-gray-700 dark:text-gray-300 font-medium">
                                {q.cfoToNetIncome ? `${q.cfoToNetIncome}x` : '—'}
                              </td>
                            ))}
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                ) : (
                  /* Bảng theo Năm */
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-700 text-gray-400 text-[11px] uppercase">
                        <th className="pb-3 pl-2">Chỉ Tiêu Hàng Năm</th>
                        {financials.yearly?.map((y) => (
                          <th key={y.year} className="pb-3 text-right">Năm {y.year}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                      <tr>
                        <td className="py-2.5 pl-2 font-bold text-gray-900 dark:text-white">Doanh thu thuần</td>
                        {financials.yearly?.map((y) => (
                          <td key={y.year} className="py-2.5 text-right font-semibold text-gray-800 dark:text-gray-200">
                            {formatBn(y.revenue)}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2.5 pl-2 text-gray-500">Giá vốn hàng bán</td>
                        {financials.yearly?.map((y) => (
                          <td key={y.year} className="py-2.5 text-right text-gray-500">
                            {formatBn(y.costOfGoodsSold)}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2.5 pl-2 font-semibold text-gray-700 dark:text-gray-300">Lợi nhuận gộp</td>
                        {financials.yearly?.map((y) => (
                          <td key={y.year} className="py-2.5 text-right font-semibold text-gray-700 dark:text-gray-300">
                            {formatBn(y.grossProfit)}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2.5 pl-2 text-amber-700 dark:text-amber-400">Chi phí lãi vay</td>
                        {financials.yearly?.map((y) => (
                          <td key={y.year} className="py-2.5 text-right font-medium text-amber-700 dark:text-amber-400">
                            {formatBn(y.interestExpense)}
                          </td>
                        ))}
                      </tr>
                      <tr className="bg-emerald-50/40 dark:bg-emerald-950/20">
                        <td className="py-2.5 pl-2 font-bold text-emerald-800 dark:text-emerald-300">Lợi nhuận sau thuế (LNST)</td>
                        {financials.yearly?.map((y) => (
                          <td key={y.year} className="py-2.5 text-right font-black text-emerald-700 dark:text-emerald-300">
                            {formatBn(y.netIncome)}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2.5 pl-2 text-gray-600 dark:text-gray-300">Chi phí XDCB dở dang</td>
                        {financials.yearly?.map((y) => (
                          <td key={y.year} className="py-2.5 text-right text-gray-600 dark:text-gray-300">
                            {formatBn(y.constructionInProgress)}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2.5 pl-2 text-gray-600 dark:text-gray-300">Tổng tài sản</td>
                        {financials.yearly?.map((y) => (
                          <td key={y.year} className="py-2.5 text-right text-gray-600 dark:text-gray-300">
                            {formatBn(y.totalAssets)}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2.5 pl-2 text-indigo-700 dark:text-indigo-300 font-bold">Vốn chủ sở hữu</td>
                        {financials.yearly?.map((y) => (
                          <td key={y.year} className="py-2.5 text-right font-bold text-indigo-700 dark:text-indigo-300">
                            {formatBn(y.equity)}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2.5 pl-2 text-emerald-600 dark:text-emerald-400 font-semibold">Dòng tiền HĐKD (CFO)</td>
                        {financials.yearly?.map((y) => (
                          <td key={y.year} className="py-2.5 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                            {formatBn(y.cfo)}
                          </td>
                        ))}
                      </tr>
                      <tr className="bg-indigo-50/40 dark:bg-indigo-950/20">
                        <td className="py-2.5 pl-2 font-black text-indigo-800 dark:text-indigo-300">Dòng tiền tự do (FCF)</td>
                        {financials.yearly?.map((y) => (
                          <td key={y.year} className="py-2.5 text-right font-black text-indigo-600 dark:text-indigo-400">
                            {formatBn(y.freeCashFlow)}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2.5 pl-2 text-gray-500">Tỷ suất ROE (%)</td>
                        {financials.yearly?.map((y) => (
                          <td key={y.year} className="py-2.5 text-right font-medium text-gray-700 dark:text-gray-300">
                            {y.roe ? `${y.roe}%` : '—'}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ── VIEW 2: BỘ 54 CHỈ SỐ TÀI CHÍNH (FINANCIAL RATIOS) ── */}
          {mainReportView === 'ratios' && financials.financialRatios && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. Nhóm Định Giá */}
                <div className="p-5 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <span>🎯</span> Nhóm Chỉ Số Định Giá
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500">P/E (Hệ số Giá / Thu nhập)</span>
                      <span className="font-bold text-gray-900 dark:text-white">{financials.financialRatios.valuation?.pe || '—'}x</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500">P/B (Hệ số Giá / Giá trị sổ sách)</span>
                      <span className="font-bold text-gray-900 dark:text-white">{financials.financialRatios.valuation?.pb || '—'}x</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500">P/S (Hệ số Giá / Doanh thu)</span>
                      <span className="font-bold text-gray-900 dark:text-white">{financials.financialRatios.valuation?.ps || '—'}x</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500">P/CF (Giá / Dòng tiền CFO)</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{financials.financialRatios.valuation?.pCf || '—'}x</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500">EV / EBITDA</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{financials.financialRatios.valuation?.evEbitda || '—'}x</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-500">Tỷ suất cổ tức (Dividend Yield)</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{financials.financialRatios.valuation?.dividendYield}%</span>
                    </div>
                  </div>
                </div>

                {/* 2. Nhóm Sinh Lời */}
                <div className="p-5 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <span>📈</span> Khả Năng Sinh Lời
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500">ROE (Lợi nhuận / Vốn CSH)</span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400">{financials.financialRatios.profitability?.roe}%</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500">ROA (Lợi nhuận / Tổng TS)</span>
                      <span className="font-bold text-gray-900 dark:text-white">{financials.financialRatios.profitability?.roa}%</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500">ROIC (Lợi nhuận / Vốn đầu tư)</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{financials.financialRatios.profitability?.roic}%</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500">Biên lợi nhuận gộp (Gross Margin)</span>
                      <span className="font-bold text-gray-900 dark:text-white">{financials.financialRatios.profitability?.grossMargin}%</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500">Biên lợi nhuận ròng (Net Margin)</span>
                      <span className="font-bold text-gray-900 dark:text-white">{financials.financialRatios.profitability?.netMargin}%</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-500">EBITDA 4 Quý</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-300">{formatBn(financials.financialRatios.profitability?.ebitda)}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Nhóm Thanh Khoản */}
                <div className="p-5 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <span>🛡️</span> Thanh Khoản & An Toàn Vốn
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500">Thanh toán hiện thời (Current Ratio)</span>
                      <span className="font-bold text-gray-900 dark:text-white">{financials.financialRatios.liquidity?.currentRatio}x</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500">Thanh toán nhanh (Quick Ratio)</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{financials.financialRatios.liquidity?.quickRatio}x</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500">Thanh toán tiền mặt (Cash Ratio)</span>
                      <span className="font-bold text-gray-900 dark:text-white">{financials.financialRatios.liquidity?.cashRatio}x</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-500">Khả năng chi trả lãi vay (EBIT/Interest)</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{financials.financialRatios.liquidity?.interestCoverage}x</span>
                    </div>
                  </div>
                </div>

                {/* 4. Nhóm Hiệu Quả Hoạt Động */}
                <div className="p-5 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <span>⚡</span> Hiệu Quả & Chu Kỳ Tiền Mặt
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500">Vòng quay tài sản (Asset Turnover)</span>
                      <span className="font-bold text-gray-900 dark:text-white">{financials.financialRatios.efficiency?.assetTurnover}x</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500">Vòng quay tồn kho (Inventory Turnover)</span>
                      <span className="font-bold text-gray-900 dark:text-white">{financials.financialRatios.efficiency?.inventoryTurnover}x</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500">Số ngày thu tiền (DSO)</span>
                      <span className="font-bold text-gray-900 dark:text-white">{financials.financialRatios.efficiency?.dso} ngày</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500">Số ngày tồn kho (DIO)</span>
                      <span className="font-bold text-gray-900 dark:text-white">{financials.financialRatios.efficiency?.dio} ngày</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500">Số ngày trả tiền (DPO)</span>
                      <span className="font-bold text-gray-900 dark:text-white">{financials.financialRatios.efficiency?.dpo} ngày</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-500">Chu kỳ chuyển đổi tiền mặt (CCC)</span>
                      <span className="font-black text-indigo-600 dark:text-indigo-400">{financials.financialRatios.efficiency?.ccc} ngày</span>
                    </div>
                  </div>
                </div>

                {/* 5. Nhóm Đòn Bẩy & Nợ */}
                <div className="p-5 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <span>⚖️</span> Đòn Bẩy Tài Chính & Cơ Cấu Nợ
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500">Tổng nợ / Vốn CSH (Debt / Equity)</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400">{financials.financialRatios.leverage?.debtToEquity}x</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500">Vay nợ / Vốn CSH (Borrowings/Equity)</span>
                      <span className="font-bold text-gray-900 dark:text-white">{financials.financialRatios.leverage?.borrowingsToEquity}x</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500">Đòn bẩy tài chính (Equity Multiplier)</span>
                      <span className="font-bold text-gray-900 dark:text-white">{financials.financialRatios.leverage?.financialLeverage}x</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-500">Nợ vay ròng (Net Debt)</span>
                      <span className="font-bold text-gray-900 dark:text-white">{formatBn(financials.financialRatios.leverage?.netDebt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── VIEW 3: CỔ TỨC & CƠ CẤU CỔ ĐÔNG ── */}
          {mainReportView === 'events' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Lịch Sử Cổ Tức */}
              <div className="p-5 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <span>🎁</span> Lịch Sử Chi Trả Cổ Tức & Sự Kiện Doanh Nghiệp
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {financials.corporateEvents?.map((ev, idx) => (
                    <div key={idx} className="py-3 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900 dark:text-white">{ev.type}</span>
                        <span className="text-[11px] text-gray-400">{ev.date}</span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-300">{ev.content}</p>
                      <div className="flex items-center gap-3 text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold pt-0.5">
                        <span>Tỷ lệ: {ev.ratio}</span>
                        {ev.value && <span>Giá trị: {formatVND(ev.value)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cơ Cấu Cổ Đông */}
              <div className="p-5 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span>👥</span> Cơ Cấu Cổ Đông Lớn & Ban Lãnh Đạo
                </div>
                <div className="space-y-3">
                  {financials.shareholders?.map((sh, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-gray-800 dark:text-gray-200">{sh.name}</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">{sh.percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-2 rounded-full"
                          style={{ width: `${sh.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── VIEW 4: GIẢI PHẪU CÔNG THỨC ĐỊNH GIÁ (FORMULA BREAKDOWN) ── */}
          {mainReportView === 'formulas' && financials.valuationMultiples && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. Benjamin Graham */}
                <div className="p-5 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">1. Benjamin Graham</span>
                    <div className="text-right flex items-baseline gap-1.5">
                      <span className="text-lg font-black text-indigo-700 dark:text-indigo-300">
                        {formatVND(financials.valuationMultiples.grahamNumber)}
                      </span>
                      {(() => {
                        const diff = calcPriceDiff(financials.valuationMultiples.grahamNumber, currentStock?.close);
                        if (diff == null) return null;
                        return (
                          <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${diff >= 0
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                            }`}>
                            {diff >= 0 ? '+' : ''}{diff}%
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1 font-mono bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-indigo-50 dark:border-indigo-900">
                    <div>V = √(22.5 × EPS × BVPS)</div>
                    <div className="text-[11px] text-gray-400">
                      = √(22.5 × {formatVND(financials.quarterly?.[financials.quarterly.length - 1]?.eps)} × BVPS)
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500">Mô hình giá trị nội tại cổ điển bảo vệ nhà đầu tư khỏi rủi ro trả quá đắt.</p>
                </div>

                {/* 2. Gordon DDM */}
                <div className="p-5 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">2. Chiết Khấu Cổ Tức DDM</span>
                    <div className="text-right flex items-baseline gap-1.5">
                      <span className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                        {formatVND(financials.valuationMultiples.ddmTarget)}
                      </span>
                      {(() => {
                        const diff = calcPriceDiff(financials.valuationMultiples.ddmTarget, currentStock?.close);
                        if (diff == null) return null;
                        return (
                          <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${diff >= 0
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                            }`}>
                            {diff >= 0 ? '+' : ''}{diff}%
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1 font-mono bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-emerald-50 dark:border-emerald-900">
                    <div>V = [DPS × (1 + g)] / (r - g)</div>
                    <div className="text-[11px] text-gray-400">
                      r = 11.5% (WACC), g = 3.5% tăng trưởng dài hạn
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500">Thích hợp cho doanh nghiệp có dòng tiền ổn định và chi trả cổ tức tiền mặt đều đặn.</p>
                </div>

                {/* 3. EV/EBITDA Fair Value */}
                <div className="p-5 bg-blue-50/50 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">3. Mô Hình EV/EBITDA</span>
                    <div className="text-right flex items-baseline gap-1.5">
                      <span className="text-lg font-black text-blue-700 dark:text-blue-300">
                        {formatVND(financials.valuationMultiples.evEbitdaFairPrice)}
                      </span>
                      {(() => {
                        const diff = calcPriceDiff(financials.valuationMultiples.evEbitdaFairPrice, currentStock?.close);
                        if (diff == null) return null;
                        return (
                          <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${diff >= 0
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                            }`}>
                            {diff >= 0 ? '+' : ''}{diff}%
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1 font-mono bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-blue-50 dark:border-blue-900">
                    <div>V = [(EBITDA × 7.5x) - NetDebt] / Shares</div>
                    <div className="text-[11px] text-gray-400">
                      Loại trừ ảnh hưởng của khấu hao & cấu trúc vốn vay
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500">Chuẩn mực định giá cho các ngành sản xuất tư bản lớn (thép, sản xuất, công nghiệp nặng).</p>
                </div>

                {/* 4. P/CF Fair Value */}
                <div className="p-5 bg-amber-50/50 dark:bg-amber-950/30 rounded-2xl border border-amber-100 dark:border-amber-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">4. Dòng Tiền Kinh Doanh P/CF</span>
                    <div className="text-right flex items-baseline gap-1.5">
                      <span className="text-lg font-black text-amber-700 dark:text-amber-300">
                        {formatVND(financials.valuationMultiples.pcfFairPrice)}
                      </span>
                      {(() => {
                        const diff = calcPriceDiff(financials.valuationMultiples.pcfFairPrice, currentStock?.close);
                        if (diff == null) return null;
                        return (
                          <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${diff >= 0
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                            }`}>
                            {diff >= 0 ? '+' : ''}{diff}%
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1 font-mono bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-amber-50 dark:border-amber-900">
                    <div>V = (CFO × 8.0x) / Shares</div>
                    <div className="text-[11px] text-gray-400">
                      Dựa trên tiền thật chảy vào tài khoản, không bị bóp méo
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500">Phản ánh thực chất sức mạnh thanh khoản và khả năng tạo tiền của hoạt động kinh doanh.</p>
                </div>

                {/* 5. Target P/E & P/B */}
                <div className="p-5 bg-purple-50/50 dark:bg-purple-950/30 rounded-2xl border border-purple-100 dark:border-purple-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">5. P/E & P/B Mục Tiêu</span>
                    <div className="text-right flex items-baseline gap-1.5">
                      <span className="text-lg font-black text-purple-700 dark:text-purple-300">
                        {formatVND(financials.valuationMultiples.peTarget)}
                      </span>
                      {(() => {
                        const diff = calcPriceDiff(financials.valuationMultiples.peTarget, currentStock?.close);
                        if (diff == null) return null;
                        return (
                          <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${diff >= 0
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                            }`}>
                            {diff >= 0 ? '+' : ''}{diff}%
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1 font-mono bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-purple-50 dark:border-purple-900">
                    <div>P/E Target = EPS × 11.5x</div>
                    <div>P/B Target = BVPS × 1.35x</div>
                  </div>
                  <p className="text-[11px] text-gray-500">Mức định giá trung vị lịch sử 5 năm của các doanh nghiệp niêm yết đầu ngành.</p>
                </div>

                {/* 6. Giá Hội Tụ & Biên An Toàn */}
                <div className="p-5 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">6. Giá Trị Hội Tụ (Consensus)</span>
                    <div className="text-right flex items-baseline gap-1.5">
                      <span className="text-xl font-black text-emerald-400">
                        {formatVND(financials.valuationMultiples.consensusFairValue)}
                      </span>
                      {(() => {
                        const diff = calcPriceDiff(financials.valuationMultiples.consensusFairValue, currentStock?.close);
                        if (diff == null) return null;
                        return (
                          <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${diff >= 0
                              ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                              : 'bg-rose-500/30 text-rose-300 border border-rose-500/40'
                            }`}>
                            {diff >= 0 ? '+' : ''}{diff}%
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="text-xs space-y-1 font-mono bg-slate-800 p-2.5 rounded-xl border border-slate-700">
                    <div className="flex items-center justify-between">
                      <span>Biên an toàn (MoS):</span>
                      <span className="font-bold text-emerald-400">{financials.valuationMultiples.marginOfSafety}%</span>
                    </div>
                    <div className="flex items-center justify-between text-gray-300">
                      <span>Chênh lệch vs Thị giá:</span>
                      {(() => {
                        const diff = calcPriceDiff(financials.valuationMultiples.consensusFairValue, currentStock?.close);
                        return (
                          <span className={`font-bold ${diff != null && diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {diff != null ? `${diff >= 0 ? '+' : ''}${diff}%` : '—'}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="text-gray-400 text-[11px] pt-0.5 border-t border-slate-700">Tổng hợp 6 mô hình định giá</div>
                  </div>
                  <p className="text-[11px] text-gray-400">Tổng hợp đa phương pháp giúp triệt tiêu sai lệch giả định của từng mô hình đơn lẻ.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border border-dashed border-gray-200 dark:border-gray-700 shadow-xs text-center space-y-3">
          <div className="text-3xl">📊</div>
          <h4 className="text-base font-bold text-gray-900 dark:text-white">
            Chưa có file BCTC cục bộ cho {selectedSymbol}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Dữ liệu BCTC (8 quý & 5 năm) chưa được lưu tại <code className="text-indigo-600 dark:text-indigo-400 font-mono">data/financials/{selectedSymbol}.json</code>.
            Bạn có thể bấm nút bên dưới để tải và trích xuất tự động từ vnstock.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSyncSingleFinancials}
              disabled={syncingSingle}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              <span className={syncingSingle ? 'inline-block animate-spin' : ''}>🔄</span>
              <span>{syncingSingle ? `Đang nạp BCTC cho ${selectedSymbol}...` : `Tải BCTC cho ${selectedSymbol}`}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── 6. KHỐI 6: TRÌNH KIỂM TRA DỮ LIỆU JSON THÔ (RAW JSON INSPECTOR) ── */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <span>🔍</span> Trình Kiểm Tra File JSON Cục Bộ (Raw JSON Inspector)
            </div>
            <h3 className="text-lg font-bold mt-0.5">
              Kiểm Tra Trực Tiếp Dữ Liệu Lưu Cục Bộ (Local Storage)
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Toàn bộ số liệu được lưu thành các file JSON trong thư mục <code className="text-emerald-400">data/</code> để bạn đối chiếu tính chính xác.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyJson}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-white/10"
            >
              <span>{copied ? '✅' : '📋'}</span>
              <span>{copied ? 'Đã sao chép!' : 'Sao chép JSON'}</span>
            </button>
          </div>
        </div>

        {/* Nút chọn file */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/10">
          <button
            type="button"
            onClick={() => handleChangeInspectorType('fundamentals')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${inspectorType === 'fundamentals'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5'
              }`}
          >
            📄 fundamentals_cache.json
          </button>

          <button
            type="button"
            onClick={() => handleChangeInspectorType('macro')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${inspectorType === 'macro'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5'
              }`}
          >
            🌐 macro_valuation.json
          </button>

          <button
            type="button"
            onClick={() => handleChangeInspectorType('financials')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${inspectorType === 'financials'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5'
              }`}
          >
            📊 financials/{selectedSymbol}.json
          </button>

          <button
            type="button"
            onClick={() => handleChangeInspectorType('market-history')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${inspectorType === 'market-history'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5'
              }`}
          >
            📈 market_valuation_history.json
          </button>

          <button
            type="button"
            onClick={() => handleChangeInspectorType('indicators')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${inspectorType === 'indicators'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5'
              }`}
          >
            📑 macro_indicators.json
          </button>

          {/* Ô tìm kiếm trong JSON */}
          <div className="ml-auto w-full sm:w-64">
            <input
              type="text"
              placeholder="Tìm kiếm trong file JSON..."
              value={jsonSearchTerm}
              onChange={(e) => setJsonSearchTerm(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-hidden focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Đường dẫn file hiện tại */}
        {rawJsonPath && (
          <div className="text-[11px] text-gray-400 font-mono flex items-center gap-2">
            <span className="text-emerald-400 font-bold">Path:</span>
            <span>{rawJsonPath}</span>
          </div>
        )}

        {/* Khung nội dung JSON */}
        <div className="bg-black/60 rounded-2xl p-4 font-mono text-xs text-gray-300 max-h-96 overflow-y-auto border border-white/5 leading-relaxed selection:bg-indigo-600 selection:text-white">
          <pre className="whitespace-pre-wrap break-words">
            {rawJsonContent}
          </pre>
        </div>
      </div>
    </div>
  );
}
