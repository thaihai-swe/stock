import React, { useState, useEffect, useMemo } from 'react';
import {
  fetchValuationStocks,
  fetchValuationMacro,
  fetchStockFinancials,
  fetchRawJson,
  triggerValuationSync
} from '../utils/api.js';

export default function ValuationDashboard({ data, refreshKey, onSwitchTab }) {
  // State quản lý dữ liệu
  const [valuationData, setValuationData] = useState({});
  const [macroData, setMacroData] = useState(null);
  const [selectedSymbol, setSelectedSymbol] = useState('HPG');
  const [financials, setFinancials] = useState(null);
  const [financialPeriod, setFinancialPeriod] = useState('quarterly'); // 'quarterly' | 'yearly'
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
  const [syncMessage, setSyncMessage] = useState(null);

  // Tải dữ liệu ban đầu
  const loadAllValuationData = async () => {
    setLoading(true);
    try {
      const [stocksRes, macroRes] = await Promise.all([
        fetchValuationStocks().catch(() => ({})),
        fetchValuationMacro().catch(() => null)
      ]);
      setValuationData(stocksRes || {});
      setMacroData(macroRes);

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
                Định Giá Doanh Nghiệp & Vĩ Mô
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700">
                  Local JSON First
                </span>
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Các mô hình định giá Graham, DDM, DuPont 3 nhân tố, BCTC lịch sử và Nhiệt kế thị trường VN-Index.
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
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
              syncing
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
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
            syncMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          <span>{syncMessage.text}</span>
          <button onClick={() => setSyncMessage(null)} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
      )}

      {/* ── 2. KHỐI 1: NHIỆT KẾ ĐỊNH GIÁ THỊ TRƯỜNG VN-INDEX & CỐ VẤN TỶ TRỌNG ── */}
      {macroData && (
        <div className="bg-gradient-to-br from-indigo-900/90 via-slate-900 to-gray-900 text-white rounded-3xl p-6 border border-indigo-500/20 shadow-xl relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/10">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                <span>🌡️</span> Nhiệt Kế Định Giá Thị Trường
              </div>
              <h2 className="text-2xl font-black mt-1 flex items-center gap-3">
                {macroData.marketIndex?.name}
                <span className="text-sm font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  {macroData.marketIndex?.bandText}
                </span>
              </h2>
            </div>

            {/* Chỉ số nhanh */}
            <div className="flex items-center gap-6 text-sm">
              <div>
                <div className="text-gray-400 text-xs">P/E Thị trường</div>
                <div className="text-2xl font-black text-emerald-400">
                  {macroData.marketIndex?.currentPE}x
                </div>
              </div>
              <div>
                <div className="text-gray-400 text-xs">P/B Thị trường</div>
                <div className="text-2xl font-black text-white">
                  {macroData.marketIndex?.currentPB}x
                </div>
              </div>
              <div>
                <div className="text-gray-400 text-xs">Z-Score 5 Năm</div>
                <div className="text-2xl font-black text-indigo-300">
                  {macroData.marketIndex?.zScore}
                </div>
              </div>
            </div>
          </div>

          {/* Dải P/E Bands Visual Bar */}
          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
              <span>Dải định giá P/E: Rất rẻ (&lt;11.5x)</span>
              <span>Trung bình 5 năm: 14.2x</span>
              <span>Rất đắt (&gt;18.0x)</span>
            </div>
            {/* Thanh đo định giá */}
            <div className="w-full h-3.5 bg-gray-800 rounded-full overflow-hidden p-0.5 flex gap-1 border border-white/10">
              <div className="flex-1 bg-emerald-500 rounded-l-full" title="Rất rẻ: <= 11.5x" />
              <div className="flex-1 bg-emerald-400 relative" title="Rẻ: 11.5 - 13.5x">
                {/* Kim chỉ thị hiện tại */}
                <div className="absolute top-1/2 -translate-y-1/2 left-3/4 w-3.5 h-3.5 bg-white rounded-full border-2 border-indigo-900 shadow-lg animate-pulse" />
              </div>
              <div className="flex-1 bg-blue-500" title="Hợp lý: 13.5 - 16.0x" />
              <div className="flex-1 bg-amber-500" title="Đắt: 16.0 - 18.0x" />
              <div className="flex-1 bg-rose-500 rounded-r-full" title="Rất đắt: > 18.0x" />
            </div>
          </div>

          {/* Cố vấn phân bổ tài sản */}
          <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <div className="text-xs text-gray-400 font-semibold">Khuyến Nghị Phân Bổ Vốn</div>
              <div className="text-xl font-bold text-white mt-1 flex items-center gap-2">
                <span className="text-emerald-400">{macroData.assetAllocation?.recommendedEquityPct}% Cổ phiếu</span>
                <span className="text-gray-400">/</span>
                <span className="text-indigo-300">{macroData.assetAllocation?.recommendedCashPct}% Tiền</span>
              </div>
              <div className="text-xs text-emerald-300 font-bold mt-1 uppercase tracking-wider">
                Vị thế: {macroData.assetAllocation?.stance}
              </div>
            </div>

            <div className="md:col-span-2 bg-white/5 rounded-2xl p-4 border border-white/5">
              <div className="text-xs text-gray-400 font-semibold flex items-center justify-between">
                <span>Cố Vấn Chiến Lược Đầu Tư</span>
                <span className="text-[11px] text-gray-400">
                  Lãi suất điều hành: {macroData.macro?.sbvRefinancingRate}% · TPCP 10Y: {macroData.macro?.vn10yYield}%
                </span>
              </div>
              <p className="text-xs text-gray-200 mt-1.5 leading-relaxed">
                {macroData.assetAllocation?.rationale}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. KHỐI 2: BẢNG ĐỊNH GIÁ DOANH NGHIỆP & BIÊN AN TOÀN ── */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700/60 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span>🎯</span> Bảng Định Giá Doanh Nghiệp & Biên An Toàn (Margin of Safety)
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              So sánh thị giá với Giá Graham, Mô hình DDM, Giá mục tiêu P/E và Giá trị hợp lý hội tụ.
            </p>
          </div>
          <div className="text-xs text-gray-400 font-medium">
            Bấm vào hàng để xem BCTC chi tiết
          </div>
        </div>

        {/* Bảng định giá */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 text-gray-400 font-semibold text-[11px] uppercase tracking-wider">
                <th className="pb-3 pl-2">Mã CP</th>
                <th className="pb-3 text-right">Thị Giá</th>
                <th className="pb-3 text-right">P/E</th>
                <th className="pb-3 text-right">P/B</th>
                <th className="pb-3 text-right">Giá Graham</th>
                <th className="pb-3 text-right">Giá DDM</th>
                <th className="pb-3 text-right">Giá Hội Tụ</th>
                <th className="pb-3 text-right">Biên An Toàn</th>
                <th className="pb-3 text-center">Tech Score</th>
                <th className="pb-3 text-center pr-2">Đánh Giá</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {symbolsList.map((sym) => {
                const item = valuationData[sym];
                const val = item.valuation || {};
                const isSelected = selectedSymbol === sym;
                const mos = val.marginOfSafetyFairValue !== null ? val.marginOfSafetyFairValue : val.marginOfSafetyGraham;

                return (
                  <tr
                    key={sym}
                    onClick={() => handleSelectSymbol(sym)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40 font-medium'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                    }`}
                  >
                    <td className="py-3.5 pl-2 font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-indigo-600' : 'bg-transparent'}`} />
                      <div>
                        <div>{sym}</div>
                        <div className="text-[10px] text-gray-400 font-normal truncate max-w-[120px]">
                          {item.description || item.sector}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 text-right font-bold text-gray-900 dark:text-white">
                      {formatVND(item.close)}
                    </td>
                    <td className="py-3.5 text-right text-gray-600 dark:text-gray-300 font-medium">
                      {val.pe ? `${val.pe}x` : '—'}
                    </td>
                    <td className="py-3.5 text-right text-gray-600 dark:text-gray-300 font-medium">
                      {val.pb ? `${val.pb}x` : '—'}
                    </td>
                    <td className="py-3.5 text-right font-semibold text-gray-700 dark:text-gray-200">
                      {formatVND(val.grahamNumber)}
                    </td>
                    <td className="py-3.5 text-right text-gray-600 dark:text-gray-400">
                      {formatVND(val.ddmTarget)}
                    </td>
                    <td className="py-3.5 text-right font-bold text-indigo-600 dark:text-indigo-400">
                      {formatVND(val.fairValue)}
                    </td>
                    <td className="py-3.5 text-right font-bold">
                      {mos !== null && mos !== undefined ? (
                        <span className={mos >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                          {formatPercent(mos)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        (item.technicals?.techScore || 0) >= 1
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : (item.technicals?.techScore || 0) <= -1
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {(item.technicals?.techScore || 0) > 0 ? `+${item.technicals?.techScore}` : (item.technicals?.techScore || 0)}
                      </span>
                    </td>
                    <td className="py-3.5 text-center pr-2">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${val.valuationRatingBadge || 'bg-gray-100 text-gray-600'}`}>
                        {val.valuationRatingText || 'Đang cập nhật'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 4. KHỐI 3 & 4: PHÂN RÃ DUPONT 3 NHÂN TỐ & ACTIVE TECH SCORE ── */}
      {currentStock && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card DuPont */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-4">
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
                  {currentStock.dupont?.roe ? `${currentStock.dupont.roe}%` : '—'}
                </div>
              </div>
            </div>

            {/* 3 Thành phần DuPont */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700 text-center">
                <div className="text-[10px] text-gray-400 font-semibold uppercase">1. Biên Ròng (NPM)</div>
                <div className="text-base font-bold text-gray-900 dark:text-white mt-1">
                  {currentStock.dupont?.netProfitMargin ? `${currentStock.dupont.netProfitMargin}%` : '—'}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">Năng lực cạnh tranh</div>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700 text-center">
                <div className="text-[10px] text-gray-400 font-semibold uppercase">2. Vòng Quay TS</div>
                <div className="text-base font-bold text-gray-900 dark:text-white mt-1">
                  {currentStock.dupont?.assetTurnover ? `${currentStock.dupont.assetTurnover}x` : '—'}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">Hiệu quả tài sản</div>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700 text-center">
                <div className="text-[10px] text-gray-400 font-semibold uppercase">3. Đòn Bẩy (EM)</div>
                <div className="text-base font-bold text-gray-900 dark:text-white mt-1">
                  {currentStock.dupont?.equityMultiplier ? `${currentStock.dupont.equityMultiplier}x` : '—'}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">Rủi ro nợ vay</div>
              </div>
            </div>

            <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100/60 dark:border-indigo-800/40 text-xs text-gray-700 dark:text-gray-300">
              <span className="font-bold text-indigo-700 dark:text-indigo-300">Chẩn đoán: </span>
              {currentStock.dupont?.qualityAssessment}
            </div>
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
                <div className="text-[11px] text-gray-400">Điểm Số (-6 đến +6)</div>
                <div className={`text-xl font-black ${currentStock.technicals?.techScoreColor || 'text-gray-900'}`}>
                  {currentStock.technicals?.techScore > 0 ? `+${currentStock.technicals.techScore}` : (currentStock.technicals?.techScore || 0)}/6
                </div>
              </div>
            </div>

            {/* Chỉ báo kỹ thuật cơ bản */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700 text-center">
                <div className="text-[10px] text-gray-400 font-semibold uppercase">RSI (14)</div>
                <div className="text-base font-bold text-gray-900 dark:text-white mt-1">
                  {currentStock.technicals?.rsi || '—'}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">Xung lực động lượng</div>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700 text-center">
                <div className="text-[10px] text-gray-400 font-semibold uppercase">MACD</div>
                <div className="text-base font-bold text-gray-900 dark:text-white mt-1">
                  {currentStock.technicals?.macd || '—'}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">Xu hướng MA</div>
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
      {financials && (
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

            {/* Nút chuyển đổi Quý / Năm */}
            <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700/60 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setFinancialPeriod('quarterly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  financialPeriod === 'quarterly'
                    ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-300'
                }`}
              >
                Theo Quý (8 Quý Gần Nhất)
              </button>
              <button
                type="button"
                onClick={() => setFinancialPeriod('yearly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  financialPeriod === 'yearly'
                    ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-300'
                }`}
              >
                Theo Năm (5 Năm Gần Nhất)
              </button>
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

            <div className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700">
              <div className="text-[11px] text-gray-400 font-semibold uppercase">Dòng Tiền Tự Do (FCF)</div>
              <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                {formatBn(financials.cashflowHealth?.latestFcf)}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">FCF = CFO - CapEx</div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700">
              <div className="text-[11px] text-gray-400 font-semibold uppercase">Chất Lượng CFO / LNST</div>
              <div className="text-xl font-black text-gray-900 dark:text-white mt-1">
                {financials.cashflowHealth?.cfoVsNetIncomeRatio ? `${financials.cashflowHealth.cfoVsNetIncomeRatio}x` : '—'}
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium truncate mt-0.5">
                {financials.cashflowHealth?.qualityAssessment}
              </div>
            </div>
          </div>

          {/* Sub-tabs Báo Cáo */}
          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-2">
            <button
              type="button"
              onClick={() => setFinancialTab('income')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                financialTab === 'income'
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-300'
              }`}
            >
              1. Kết Quả Kinh Doanh (Income Statement)
            </button>
            <button
              type="button"
              onClick={() => setFinancialTab('balance')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                financialTab === 'balance'
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-300'
              }`}
            >
              2. Cân Đối Kế Toán (Balance Sheet)
            </button>
            <button
              type="button"
              onClick={() => setFinancialTab('cashflow')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                financialTab === 'cashflow'
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-300'
              }`}
            >
              3. Lưu Chuyển Tiền Tệ (Cash Flow & FCF)
            </button>
          </div>

          {/* Bảng BCTC chi tiết */}
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
                        <td className="py-2.5 pl-2 text-gray-500">Chi phí hoạt động (BH & QLDN)</td>
                        {financials.quarterly?.map((q) => (
                          <td key={q.period} className="py-2.5 text-right text-gray-500">
                            {formatBn(q.operatingExpense)}
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
                        <td className="py-2.5 pl-2 text-gray-600 dark:text-gray-300">Tài sản ngắn hạn</td>
                        {financials.quarterly?.map((q) => (
                          <td key={q.period} className="py-2.5 text-right text-gray-600 dark:text-gray-300">
                            {formatBn(q.shortTermAssets)}
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
                        <td className="py-2.5 pl-2 text-rose-600 dark:text-rose-400">Tổng nợ phải trả</td>
                        {financials.quarterly?.map((q) => (
                          <td key={q.period} className="py-2.5 text-right text-rose-600 dark:text-rose-400 font-semibold">
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
                      <tr className="bg-indigo-50/50 dark:bg-indigo-950/30">
                        <td className="py-2.5 pl-2 font-black text-indigo-800 dark:text-indigo-300">DÒNG TIỀN TỰ DO (FCF)</td>
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
                  <tr className="bg-emerald-50/40 dark:bg-emerald-950/20">
                    <td className="py-2.5 pl-2 font-bold text-emerald-800 dark:text-emerald-300">Lợi nhuận sau thuế (LNST)</td>
                    {financials.yearly?.map((y) => (
                      <td key={y.year} className="py-2.5 text-right font-black text-emerald-700 dark:text-emerald-300">
                        {formatBn(y.netIncome)}
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
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              inspectorType === 'fundamentals'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5'
            }`}
          >
            📄 fundamentals_cache.json
          </button>

          <button
            type="button"
            onClick={() => handleChangeInspectorType('macro')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              inspectorType === 'macro'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5'
            }`}
          >
            🌐 macro_valuation.json
          </button>

          <button
            type="button"
            onClick={() => handleChangeInspectorType('financials')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              inspectorType === 'financials'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5'
            }`}
          >
            📊 financials/{selectedSymbol}.json
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
