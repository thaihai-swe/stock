import React, { useEffect, useMemo, useState } from 'react';
import {
  fetchRawJson,
  fetchStockFinancials,
  fetchValuationStocks,
  triggerSingleFinancialSync,
  triggerValuationSync
} from '../utils/api.js';
import { syncUrlRoute } from '../utils/navigation.js';

// Sub-components mới tách
import StockCockpitHeader from './valuation/StockCockpitHeader.jsx';
import FinancialStatementsView from './valuation/FinancialStatementsView.jsx';
import FinancialRatiosView from './valuation/FinancialRatiosView.jsx';
import ShareholdersAndEventsView from './valuation/ShareholdersAndEventsView.jsx';
import RawJsonInspectorPanel from './valuation/RawJsonInspectorPanel.jsx';

// Thẻ nghiệp vụ định giá & phân tích
import ValuationSevenZonesCard from './valuation/ValuationSevenZonesCard.jsx';
import ValuationTrapsCard from './valuation/ValuationTrapsCard.jsx';
import HistoricalValuationBandCard from './valuation/HistoricalValuationBandCard.jsx';
import ValuationFormulasDeconstructionCard from './valuation/ValuationFormulasDeconstructionCard.jsx';
import DcfValuationCard from './valuation/DcfValuationCard.jsx';
import FinValLabCard from './valuation/FinValLabCard.jsx';
import ExtendedDupontCard from './valuation/ExtendedDupontCard.jsx';
import IndustrySpecificCard from './valuation/IndustrySpecificCard.jsx';
import ForensicAccountingCard from './valuation/ForensicAccountingCard.jsx';
import FinancialHealthCard from './valuation/FinancialHealthCard.jsx';
import DividendSustainabilityCard from './valuation/DividendSustainabilityCard.jsx';
import MarketProfileCard from './valuation/MarketProfileCard.jsx';
import StockRiskMetricsCard from './valuation/StockRiskMetricsCard.jsx';
import NewsSentimentCard from './valuation/NewsSentimentCard.jsx';
import FullResearchReportModal from './valuation/FullResearchReportModal.jsx';

// Định nghĩa 4 Không Gian Phân Tích Chuyên Sâu
const WORKSPACES = [
  {
    id: 'valuation-models',
    label: '1. Định Giá & Quyết Định',
    icon: '🎯',
    badge: '6 Công Cụ',
    desc: '7 Vùng Giá, 7 Bẫy, Bands 5Y, DCF, Giải Phẫu Toán & FinVal Lab'
  },
  {
    id: 'financial-statements',
    label: '2. Báo Cáo Tài Chính & Chỉ Số',
    icon: '📊',
    badge: 'VAS / TT200',
    desc: '3 BCTC (Chuỗi Quý / Năm / TTM), 54 Tỷ Số Ratios, Extended DuPont & Ngành'
  },
  {
    id: 'forensics-health',
    label: '3. Pháp Y BCTC & Sức Khỏe',
    icon: '🛡️',
    badge: 'Kiểm Toán',
    desc: 'Beneish M-Score, Magic Formula, Điểm Uốn FCF, Cổ Tức & Cổ Đông'
  },
  {
    id: 'market-dynamics',
    label: '4. Vận Động Thị Trường & Tâm Lý',
    icon: '📈',
    badge: 'Thị Trường',
    desc: 'Tech Score, Wyckoff POC, Rủi Ro Biến Động & Tin Tức 30 Ngày'
  }
];

export default function ValuationDashboard({ data, refreshKey, onSwitchTab, initialSymbol }) {
  // ── STATE DỮ LIỆU CỐT LÕI ──
  const [valuationData, setValuationData] = useState({});
  const [selectedSymbol, setSelectedSymbol] = useState('HPG');
  const [financials, setFinancials] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // ── STATE KHÔNG GIAN PHÂN TÍCH (WORKSPACE TAB) ──
  const [activeWorkspace, setActiveWorkspace] = useState('valuation-models');

  // ── STATE BÁO CÁO TÀI CHÍNH ──
  const [financialPeriod, setFinancialPeriod] = useState('quarterly'); // 'quarterly' | 'yearly' | 'ttm'
  const [financialTab, setFinancialTab] = useState('income'); // 'income' | 'balance' | 'cashflow'

  // ── STATE RAW JSON INSPECTOR ──
  const [inspectorType, setInspectorType] = useState('fundamentals');
  const [rawJsonContent, setRawJsonContent] = useState('');
  const [rawJsonPath, setRawJsonPath] = useState('');
  const [copied, setCopied] = useState(false);
  const [jsonSearchTerm, setJsonSearchTerm] = useState('');

  // ── STATE LOADING & SYNC ──
  const [loading, setLoading] = useState(true);
  const [syncingSingle, setSyncingSingle] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);

  // ── STATE TÌM KIẾM CỔ PHIẾU ──
  const [inputSymbol, setInputSymbol] = useState('');
  const [lookingUp, setLookingUp] = useState(false);

  // Nạp toàn bộ dữ liệu định giá ban đầu
  const loadAllValuationData = async () => {
    setLoading(true);
    try {
      const stocksRes = await fetchValuationStocks().catch(() => ({}));
      setValuationData(stocksRes || {});

      const availableSymbols = Object.keys(stocksRes || {}).filter(k => !k.startsWith('_'));
      const initialSym = availableSymbols.includes(selectedSymbol)
        ? selectedSymbol
        : availableSymbols[0] || 'HPG';
      setSelectedSymbol(initialSym);

      loadFinancialsForSymbol(initialSym);
      loadRawJson(inspectorType, initialSym);
    } catch (err) {
      console.error('Lỗi nạp dữ liệu định giá:', err);
    } finally {
      setLoading(false);
    }
  };

  // Nạp BCTC cho mã chỉ định
  const loadFinancialsForSymbol = async (sym) => {
    try {
      const fin = await fetchStockFinancials(sym);
      setFinancials(fin);
    } catch (e) {
      console.warn(`Chưa nạp được BCTC cho ${sym}:`, e);
      setFinancials(null);
    }
  };

  // Nạp Raw JSON
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

  // Chọn mã cổ phiếu
  const handleSelectSymbol = (sym) => {
    setSelectedSymbol(sym);
    loadFinancialsForSymbol(sym);
    if (inspectorType === 'financials') {
      loadRawJson('financials', sym);
    }
    syncUrlRoute('valuation', { symbol: sym }, true);
  };

  // Thay đổi loại file kiểm tra JSON
  const handleChangeInspectorType = (type) => {
    setInspectorType(type);
    loadRawJson(type, selectedSymbol);
  };

  // Đồng bộ BCTC riêng cho mã đang chọn
  const handleSyncSingleFinancials = async () => {
    if (!selectedSymbol) return;
    setSyncingSingle(true);
    setSyncMessage(null);
    try {
      const res = await triggerSingleFinancialSync(selectedSymbol);
      if (res?.isQueued) {
        setSyncMessage({
          type: 'info',
          text: res.message || `Mã ${selectedSymbol} đã được ghi nhận vào hàng đợi yêu cầu dữ liệu. Bot sẽ tự động thu thập BCTC trong phiên đồng bộ EOD lúc 18:00 hôm nay!`
        });
        return;
      }
      setSyncMessage({
        type: 'success',
        text: res.message || `Đã tải lại BCTC & Định giá cho ${selectedSymbol} thành công!`
      });
      await loadFinancialsForSymbol(selectedSymbol);
      if (inspectorType === 'financials') {
        loadRawJson('financials', selectedSymbol);
      }
      // Tải lại fundamentals cache
      const stocksRes = await fetchValuationStocks().catch(() => ({}));
      setValuationData(stocksRes || {});
    } catch (err) {
      setSyncMessage({
        type: 'error',
        text: err.message || `Lỗi tải dữ liệu cho mã ${selectedSymbol}.`
      });
    } finally {
      setSyncingSingle(false);
      setTimeout(() => setSyncMessage(null), 8000);
    }
  };

  // Tra cứu & Định giá mã cổ phiếu tùy ý
  const handleLookupSymbol = async (targetSym) => {
    const sym = (targetSym || inputSymbol).trim().toUpperCase();
    if (!sym) return;

    const availableSymbols = Object.keys(valuationData).filter(k => !k.startsWith('_'));
    if (availableSymbols.includes(sym)) {
      handleSelectSymbol(sym);
      setInputSymbol('');
      return;
    }

    setLookingUp(true);
    setSyncMessage({
      type: 'info',
      text: `Đang tra cứu dữ liệu và phân tích BCTC cho mã ${sym}...`
    });

    try {
      const res = await triggerSingleFinancialSync(sym);
      if (res?.isQueued) {
        setSyncMessage({
          type: 'info',
          text: res.message || `Mã ${sym} đã được ghi nhận vào hàng đợi yêu cầu dữ liệu. Bot sẽ tự động thu thập BCTC trong phiên đồng bộ EOD lúc 18:00 hôm nay!`
        });
        setInputSymbol('');
        return;
      }

      setSyncMessage({
        type: 'success',
        text: res.message || `Đã tra cứu và định giá thành công cho mã ${sym}!`
      });

      const stocksRes = await fetchValuationStocks().catch(() => ({}));
      setValuationData(stocksRes || {});
      setSelectedSymbol(sym);
      syncUrlRoute('valuation', { symbol: sym }, true);
      await loadFinancialsForSymbol(sym);
      if (inspectorType === 'financials') {
        loadRawJson('financials', sym);
      }
      setInputSymbol('');
    } catch (err) {
      setSyncMessage({
        type: 'error',
        text: err.message || `Không thể tra cứu mã ${sym}.`
      });
    } finally {
      setLookingUp(false);
      setTimeout(() => setSyncMessage(null), 8000);
    }
  };

  // Tự động chuyển mã khi được điều hướng từ tab khác (như popup Sổ cái Lãi/Lỗ hoặc URL)
  useEffect(() => {
    if (initialSymbol && initialSymbol !== selectedSymbol) {
      handleLookupSymbol(initialSymbol);
    } else if (selectedSymbol) {
      syncUrlRoute('valuation', { symbol: selectedSymbol }, true);
    }
  }, [initialSymbol]);

  // Copy JSON
  const handleCopyJson = () => {
    if (!rawJsonContent) return;
    navigator.clipboard.writeText(rawJsonContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentStock = valuationData[selectedSymbol] || null;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* ── THÔNG BÁO SYNC NẾU CÓ ── */}
      {syncMessage && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-2xs ${
            syncMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : syncMessage.type === 'info'
              ? 'bg-indigo-50 text-indigo-800 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
              : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          <span>{syncMessage.text}</span>
          <button
            onClick={() => setSyncMessage(null)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── TẦNG 1: EXECUTIVE COCKPIT (HEADER, HERO CONSENSUS & 52W RANGE SLIDER) ── */}
      {currentStock && (
        <StockCockpitHeader
          currentStock={currentStock}
          financials={financials}
          selectedSymbol={selectedSymbol}
          inputSymbol={inputSymbol}
          setInputSymbol={setInputSymbol}
          lookingUp={lookingUp}
          syncingSingle={syncingSingle}
          handleLookupSymbol={handleLookupSymbol}
          handleSyncSingleFinancials={handleSyncSingleFinancials}
          setIsReportModalOpen={setIsReportModalOpen}
          lastSyncedAt={valuationData._meta?.lastSyncedAt}
        />
      )}

      {/* ── TẦNG 2: THANH CHUYỂN ĐỔI 4 KHÔNG GIAN PHÂN TÍCH (WORKSPACES NAVIGATION) ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-2 border border-gray-100 dark:border-gray-700/60 shadow-xs">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {WORKSPACES.map((ws) => {
            const isActive = activeWorkspace === ws.id;
            return (
              <button
                key={ws.id}
                type="button"
                onClick={() => setActiveWorkspace(ws.id)}
                className={`p-3 rounded-xl text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20'
                    : 'bg-gray-50/70 hover:bg-gray-100 dark:bg-gray-700/40 dark:hover:bg-gray-700/80 text-gray-700 dark:text-gray-200 border border-gray-100 dark:border-gray-700/50'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs truncate">
                    <span>{ws.icon}</span>
                    <span className="truncate">{ws.label}</span>
                  </div>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md uppercase font-bold shrink-0 ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {ws.badge}
                  </span>
                </div>
                <p
                  className={`text-[10px] mt-1.5 line-clamp-1 ${
                    isActive ? 'text-indigo-100' : 'text-gray-400 dark:text-gray-400'
                  }`}
                  title={ws.desc}
                >
                  {ws.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── CÁC PHÂN KHU NỘI DUNG CHUYÊN SÂU THEO WORKSPACE ĐANG CHỌN ── */}

      {/* 🎯 KHÔNG GIAN 1: ĐỊNH GIÁ & CÁC MÔ HÌNH QUYẾT ĐỊNH */}
      {activeWorkspace === 'valuation-models' && currentStock && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Bản đồ 7 Vùng Định Giá & Khung Quyết Định 3 Tầng */}
          <ValuationSevenZonesCard
            sevenPriceZones={
              currentStock.valuation?.sevenPriceZones ||
              financials?.valuationMultiples?.sevenPriceZones
            }
            threeLayerDecision={
              currentStock.valuation?.threeLayerDecision ||
              financials?.valuationMultiples?.threeLayerDecision
            }
            currentPrice={currentStock.close}
            symbol={selectedSymbol}
          />

          {/* Bộ Quét 7 Bẫy Định Giá & Bộ Lọc Giá Rẻ Giả Tạo */}
          <ValuationTrapsCard
            valuationTraps={
              currentStock.valuation?.valuationTraps ||
              financials?.valuationMultiples?.valuationTraps
            }
            symbol={selectedSymbol}
          />

          {/* Dải Băng Phân Vị Lịch Sử 5 Năm P/E & P/B (P25 - P50 - P75) */}
          <HistoricalValuationBandCard
            historicalBands={
              currentStock.valuation?.historicalBands ||
              financials?.valuationMultiples?.historicalBands
            }
            currentPrice={currentStock.close}
            symbol={selectedSymbol}
            eps={
              currentStock.valuation?.eps ||
              currentStock.eps ||
              financials?.valuationMultiples?.eps
            }
            bvps={
              currentStock.valuation?.bvps ||
              currentStock.bvps ||
              financials?.valuationMultiples?.bvps
            }
          />

          {/* Giải Phẫu Công Thức Toán & Từng Bước Thế Số BCTC */}
          <ValuationFormulasDeconstructionCard
            valuation={currentStock?.valuation || financials?.valuationMultiples}
            financials={financials}
            currentPrice={currentStock?.close}
            symbol={selectedSymbol}
          />

          {/* Mô Hình DCF & Ma Trận Độ Nhạy Cảm */}
          {financials?.dcfAnalysis && (
            <DcfValuationCard
              dcfAnalysis={financials.dcfAnalysis}
              currentPrice={currentStock?.close}
              symbol={selectedSymbol}
            />
          )}

          {/* Phòng Thí Nghiệm Định Giá FinVal Lab (20+ Chỉ Tiêu vs SMA 5Y) */}
          <FinValLabCard
            finvalLab={
              financials?.valuationMultiples?.finvalLab ||
              currentStock?.valuation?.finvalLab
            }
            symbol={selectedSymbol}
            financials={financials}
            currentStock={currentStock}
          />
        </div>
      )}

      {/* 📊 KHÔNG GIAN 2: BÁO CÁO TÀI CHÍNH & CHỈ SỐ */}
      {activeWorkspace === 'financial-statements' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {financials ? (
            <>
              {/* Ba Báo Cáo Tài Chính Chuẩn VAS TT200 (KQKD, CĐKT, LCTT) & 4 KPI CAGR */}
              <FinancialStatementsView
                financials={financials}
                financialPeriod={financialPeriod}
                setFinancialPeriod={setFinancialPeriod}
                financialTab={financialTab}
                setFinancialTab={setFinancialTab}
                handleSyncSingleFinancials={handleSyncSingleFinancials}
                syncingSingle={syncingSingle}
                selectedSymbol={selectedSymbol}
              />

              {/* Bộ 54 Chỉ Số Tài Chính Toàn Diện (Ratios) */}
              {financials.financialRatios && (
                <FinancialRatiosView financialRatios={financials.financialRatios} />
              )}

              {/* Phân Rã DuPont 5 Nhân Tố Mở Rộng */}
              {financials.extendedDupont && (
                <ExtendedDupontCard
                  extendedDupont={financials.extendedDupont}
                  aiAuditComment={financials.forensicAnalysis?.aiAuditComment}
                />
              )}

              {/* Chỉ Số Đặc Thù Phân Ngành */}
              {financials.industrySpecific && (
                <IndustrySpecificCard
                  industrySpecific={financials.industrySpecific}
                  symbol={selectedSymbol}
                />
              )}
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border border-dashed border-gray-200 dark:border-gray-700 shadow-xs text-center space-y-3">
              <div className="text-3xl">📊</div>
              <h4 className="text-base font-bold text-gray-900 dark:text-white">
                Dữ liệu BCTC cho {selectedSymbol} chưa có sẵn trong kho lưu trữ
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                Dữ liệu BCTC chi tiết (8 quý & 5 năm) của mã {selectedSymbol} hiện chưa được cập nhật trong kho lưu trữ của hệ thống. Vui lòng thông báo cho người quản lý để bổ sung mã này vào danh sách theo dõi.
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
        </div>
      )}

      {/* 🛡️ KHÔNG GIAN 3: PHÁP Y BCTC, SỨC KHỎE & DÒNG TIỀN */}
      {activeWorkspace === 'forensics-health' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Kiểm Toán Gian Lận Beneish M-Score, Magic Formula & FCF Inflection */}
          {financials && (
            <ForensicAccountingCard
              financials={financials}
              stockItem={currentStock}
            />
          )}

          {/* Sức Khỏe Tài Chính & Cảnh Báo Sớm 4 Tầng Rủi Ro */}
          {financials && (
            <FinancialHealthCard
              healthScore={financials.healthScore}
              earlyWarning={financials.earlyWarning}
            />
          )}

          {/* Kiểm Toán Độ Bền Vững Cổ Tức Bằng FCF */}
          <DividendSustainabilityCard
            dividendSustainability={
              financials?.valuationMultiples?.dividendSustainability ||
              currentStock?.valuation?.dividendSustainability
            }
            symbol={selectedSymbol}
          />

          {/* Lịch Sử Cổ Tức & Cơ Cấu Cổ Đông Lớn */}
          {financials && (
            <ShareholdersAndEventsView
              financials={financials}
              selectedSymbol={selectedSymbol}
            />
          )}
        </div>
      )}

      {/* 📈 KHÔNG GIAN 4: VẬN ĐỘNG THỊ TRƯỜNG & TÂM LÝ */}
      {activeWorkspace === 'market-dynamics' && currentStock && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Card Động Cơ Kỹ Thuật Active Tech Score */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 sm:p-6 border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Động Cơ Chấm Điểm Kỹ Thuật
                </span>
                <h4 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                  Active Tech Score & Đồng Thuận Tín Hiệu — {selectedSymbol}
                </h4>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-gray-400">Điểm Số (-3 đến +3)</div>
                <div className={`text-xl font-black ${currentStock.technicals?.techScoreColor || 'text-gray-900 dark:text-white'}`}>
                  {currentStock.technicals?.techScore > 0 ? `+${currentStock.technicals.techScore}` : (currentStock.technicals?.techScore || 0)}/3
                </div>
              </div>
            </div>

            {/* Chỉ báo kỹ thuật & xung lực */}
            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="p-3 bg-gray-50/80 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700 text-center">
                <div className="text-[10px] text-gray-400 font-semibold uppercase">Đồng Thuận TV</div>
                <div className={`text-base font-bold mt-1 ${currentStock.technicals?.recommendColor || 'text-gray-900 dark:text-white'}`}>
                  {currentStock.technicals?.recommendText || '—'}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">Tổng hợp tín hiệu</div>
              </div>

              <div className="p-3 bg-gray-50/80 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700 text-center">
                <div className="text-[10px] text-gray-400 font-semibold uppercase">Hệ Số Beta (1Y)</div>
                <div className="text-base font-bold text-gray-900 dark:text-white mt-1">
                  {currentStock.technicals?.beta != null ? `${currentStock.technicals.beta}x` : '—'}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">Biến động vs VN-Index</div>
              </div>

              <div className="p-3 bg-gray-50/80 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700 text-center">
                <div className="text-[10px] text-gray-400 font-semibold uppercase">Vị Thế 52W</div>
                <div className="text-base font-bold text-gray-900 dark:text-white mt-1">
                  {currentStock.performance?.range52wPercent !== null ? `${currentStock.performance.range52wPercent}%` : '—'}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">Khoảng giá đáy/đỉnh</div>
              </div>
            </div>

            {/* Các yếu tố tác động */}
            {Array.isArray(currentStock.technicals?.factors) && currentStock.technicals.factors.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {currentStock.technicals.factors.map((fact, idx) => (
                  <div key={idx} className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-2">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span>{fact}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Hồ Sơ Hành Vi Định Lượng & Wyckoff POC */}
          {financials?.marketProfile && (
            <MarketProfileCard
              marketProfile={financials.marketProfile}
              symbol={selectedSymbol}
              currentPrice={currentStock?.close}
            />
          )}

          {/* Đo Lường Rủi Ro Biến Động Thị Giá */}
          {financials?.riskMetrics && (
            <StockRiskMetricsCard
              riskMetrics={financials.riskMetrics}
              symbol={selectedSymbol}
            />
          )}

          {/* Bản Tin Thời Sự & Tâm Lý Thị Trường 30 Ngày */}
          {financials?.newsDigest && (
            <NewsSentimentCard
              newsDigest={financials.newsDigest}
              symbol={selectedSymbol}
            />
          )}
        </div>
      )}

      {/* ── TẦNG PHỤ: TRÌNH KIỂM TRA FILE JSON CỤC BỘ (RAW JSON INSPECTOR ACCORDION) ── */}
      <RawJsonInspectorPanel
        selectedSymbol={selectedSymbol}
        inspectorType={inspectorType}
        handleChangeInspectorType={handleChangeInspectorType}
        rawJsonContent={rawJsonContent}
        rawJsonPath={rawJsonPath}
        copied={copied}
        handleCopyJson={handleCopyJson}
        jsonSearchTerm={jsonSearchTerm}
        setJsonSearchTerm={setJsonSearchTerm}
      />

      {/* ── MODAL BÁO CÁO PHÂN TÍCH TOÀN DIỆN MASTER DOSSIER (10 CHƯƠNG) ── */}
      <FullResearchReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        symbol={selectedSymbol}
        stock={currentStock}
        financials={financials}
      />
    </div>
  );
}
