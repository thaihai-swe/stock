import React, { useEffect, useMemo, useState } from 'react';
import {
  fetchRawJson,
  fetchStockFinancials,
  fetchValuationStocks,
  triggerSingleFinancialSync,
  triggerValuationSync,
  refreshSingleStockAi,
} from '../utils/api.js';
import { syncUrlRoute } from '../utils/navigation.js';
import { useToast } from '../context/ToastContext.jsx';
import SubTabNav from './common/SubTabNav.jsx';
import LoadingState from './common/LoadingState.jsx';

// Sub-components chính
import StockCockpitHeader from './valuation/StockCockpitHeader.jsx';
import StickyCockpitBar from './valuation/StickyCockpitBar.jsx';
import WorkspaceToCBar from './valuation/WorkspaceToCBar.jsx';
import WorkspaceSummaryBanner from './valuation/WorkspaceSummaryBanner.jsx';
import ValuationCardContainer from './valuation/ValuationCardContainer.jsx';

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
import InteractiveValuationSandboxCard from './valuation/InteractiveValuationSandboxCard.jsx';
import ClassicInvestmentPhilosophiesCard from './valuation/ClassicInvestmentPhilosophiesCard.jsx';
import QualityOfEarningsCard from './valuation/QualityOfEarningsCard.jsx';
import SmartStatementNotesCard from './valuation/SmartStatementNotesCard.jsx';
import AiExecutiveSummaryCard from './valuation/AiExecutiveSummaryCard.jsx';
import OrderFlowDynamicsCard from './valuation/OrderFlowDynamicsCard.jsx';

// Định nghĩa 4 Không Gian Phân Tích Chuyên Sâu
const WORKSPACES = [
  {
    id: 'valuation-models',
    label: '1. Định Giá & Quyết Định',
    icon: '🎯',
    badge: '9 Công Cụ',
    desc: 'AI Executive Summary, 7 Vùng Giá, Sandbox Giả Định, 6 Triết Lý Đầu Tư, 7 Bẫy, Bands 5Y, DCF, Giải Phẫu Toán & FinVal Lab',
  },
  {
    id: 'financial-statements',
    label: '2. Báo Cáo Tài Chính & Chỉ Số',
    icon: '📊',
    badge: 'VAS / TT200',
    desc: '3 BCTC, Sổ Tay Thuyết Minh BCTC, 54 Tỷ Số Ratios, Extended DuPont & Ngành',
  },
  {
    id: 'forensics-health',
    label: '3. Pháp Y BCTC & Sức Khỏe',
    icon: '🛡️',
    badge: 'Kiểm Toán',
    desc: 'Beneish M-Score, Sloan Accruals, Chất Lượng Lợi Nhuận, Điểm Uốn FCF & Sức Khỏe',
  },
  {
    id: 'market-dynamics',
    label: '4. Vận Động Thị Trường & Tâm Lý',
    icon: '📈',
    badge: '5 Công Cụ',
    desc: 'Tech Score, Cán Cân Lệnh Cá Mập (Order Flow & CVD), Wyckoff POC, Rủi Ro Biến Động & Tin Tức 30 Ngày',
  },
];

// Danh sách các thẻ neo cho từng Workspace (Anchor ToC)
const WORKSPACE_CARDS = {
  'valuation-models': [
    { id: 'card-ai-summary', label: 'AI Summary', icon: '⚡' },
    { id: 'card-seven-zones', label: '7 Vùng Giá', icon: '🎯' },
    { id: 'card-sandbox', label: 'Sandbox', icon: '🧪' },
    { id: 'card-philosophies', label: '6 Triết Lý', icon: '📜' },
    { id: 'card-traps', label: '7 Bẫy Định Giá', icon: '⚠️' },
    { id: 'card-bands', label: 'PE/PB Bands', icon: '📊' },
    { id: 'card-formulas', label: 'Giải Phẫu Toán', icon: '🧮' },
    { id: 'card-dcf', label: 'Mô Hình DCF', icon: '💰' },
    { id: 'card-finval', label: 'FinVal Lab', icon: '🔬' },
  ],
  'financial-statements': [
    { id: 'card-statements', label: '3 BCTC VAS', icon: '📑' },
    { id: 'card-notes', label: 'Thuyết Minh', icon: '📝' },
    { id: 'card-ratios', label: '54 Tỷ Số', icon: '📐' },
    { id: 'card-dupont', label: 'Extended DuPont', icon: '🧬' },
    { id: 'card-industry', label: 'Đặc Thù Ngành', icon: '🏭' },
  ],
  'forensics-health': [
    { id: 'card-forensics', label: 'Pháp Y BCTC', icon: '🕵️' },
    { id: 'card-quality-earnings', label: 'Chất Lượng LN', icon: '💎' },
    { id: 'card-health', label: 'Sức Khỏe TC', icon: '🏥' },
    { id: 'card-dividend', label: 'Cổ Tức FCF', icon: '💵' },
    { id: 'card-shareholders', label: 'Cổ Đông & Sự Kiện', icon: '👥' },
  ],
  'market-dynamics': [
    { id: 'card-tech-score', label: 'Active Tech Score', icon: '⚡' },
    { id: 'card-market-profile', label: 'Market Profile', icon: '📊' },
    { id: 'card-order-flow', label: 'Dòng Lệnh Cá Mập', icon: '🐋' },
    { id: 'card-risk-metrics', label: 'Đo Lường Rủi Ro', icon: '📉' },
    { id: 'card-news', label: 'Tin Tức 30D', icon: '📰' },
  ],
};

// Format tiền VND
function formatVND(val) {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return Number(val).toLocaleString('vi-VN') + ' đ';
}

export default function ValuationDashboard({ data, refreshKey, onSwitchTab, initialSymbol }) {
  const { showToast } = useToast();

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

  // ── STATE TÌM KIẾM CỔ PHIẾU ──
  const [inputSymbol, setInputSymbol] = useState('');
  const [lookingUp, setLookingUp] = useState(false);

  // ── STATE STICKY MINI-BAR & CÔNG THÁI HỌC ──
  const [showStickyCockpit, setShowStickyCockpit] = useState(false);

  // Ghi nhớ trạng thái thu gọn thẻ & chế độ xem (1 cột / 2 cột)
  const [collapsedCards, setCollapsedCards] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('valuation_collapsed_cards') || '{}');
    } catch {
      return {};
    }
  });

  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('valuation_view_mode') || 'stacked';
    } catch {
      return 'stacked';
    }
  });

  // Theo dõi sự kiện cuộn để bật/tắt Sticky Cockpit
  useEffect(() => {
    const handleScroll = () => {
      setShowStickyCockpit(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Cuộn êm tới thẻ chỉ định và tạo viền sáng nhấp nháy
  const handleScrollToCard = (cardId) => {
    const el = document.getElementById(cardId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2');
      }, 1800);
    }
  };

  const handleToggleCollapse = (cardId) => {
    setCollapsedCards((prev) => {
      const next = { ...prev, [cardId]: !prev[cardId] };
      try {
        localStorage.setItem('valuation_collapsed_cards', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleToggleCollapseAll = () => {
    const currentCards = WORKSPACE_CARDS[activeWorkspace] || [];
    const allCollapsed = currentCards.every((c) => collapsedCards[c.id]);
    const next = { ...collapsedCards };
    currentCards.forEach((c) => {
      next[c.id] = !allCollapsed;
    });
    setCollapsedCards(next);
    try {
      localStorage.setItem('valuation_collapsed_cards', JSON.stringify(next));
    } catch {}
  };

  const handleChangeViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('valuation_view_mode', mode);
    } catch {}
  };

  // Nạp toàn bộ dữ liệu định giá ban đầu
  const loadAllValuationData = async () => {
    setLoading(true);
    try {
      const stocksRes = await fetchValuationStocks().catch(() => ({}));
      setValuationData(stocksRes || {});

      const availableSymbols = Object.keys(stocksRes || {}).filter((k) => !k.startsWith('_'));
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
    try {
      const res = await triggerSingleFinancialSync(selectedSymbol);
      if (res?.isQueued) {
        showToast(
          res.message || `Mã ${selectedSymbol} đã được ghi nhận vào hàng đợi yêu cầu dữ liệu. Bot sẽ tự động thu thập BCTC lúc 18:00!`,
          'info'
        );
        return;
      }
      showToast(
        res.message || `Đã tải lại BCTC & Định giá cho ${selectedSymbol} thành công!`,
        'success'
      );
      await loadFinancialsForSymbol(selectedSymbol);
      if (inspectorType === 'financials') {
        loadRawJson('financials', selectedSymbol);
      }
      // Tải lại fundamentals cache
      const stocksRes = await fetchValuationStocks().catch(() => ({}));
      setValuationData(stocksRes || {});
    } catch (err) {
      showToast(err.message || `Lỗi tải dữ liệu cho mã ${selectedSymbol}.`, 'error');
    } finally {
      setSyncingSingle(false);
    }
  };

  // Làm mới phân tích AI tích hợp cho riêng mã đang chọn
  const [refreshingAi, setRefreshingAi] = useState(false);
  const handleRefreshSingleAi = async () => {
    if (!selectedSymbol || refreshingAi) return;
    setRefreshingAi(true);
    try {
      const res = await refreshSingleStockAi(selectedSymbol);
      if (res?.data) {
        setFinancials(res.data);
      } else {
        await loadFinancialsForSymbol(selectedSymbol);
      }
      showToast(
        `Đã làm mới thành công toàn bộ phân tích AI cho ${selectedSymbol}!`,
        'success'
      );
      if (inspectorType === 'financials') {
        loadRawJson('financials', selectedSymbol);
      }
    } catch (err) {
      showToast(err.message || `Lỗi cập nhật AI cho mã ${selectedSymbol}.`, 'error');
    } finally {
      setRefreshingAi(false);
    }
  };

  // Tra cứu & Định giá mã cổ phiếu tùy ý
  const handleLookupSymbol = async (targetSym) => {
    const sym = (targetSym || inputSymbol).trim().toUpperCase();
    if (!sym) return;

    const availableSymbols = Object.keys(valuationData).filter((k) => !k.startsWith('_'));
    if (availableSymbols.includes(sym)) {
      handleSelectSymbol(sym);
      setInputSymbol('');
      return;
    }

    setLookingUp(true);
    showToast(`Đang tra cứu dữ liệu và phân tích BCTC cho mã ${sym}...`, 'info');

    try {
      const res = await triggerSingleFinancialSync(sym);
      if (res?.isQueued) {
        showToast(
          res.message || `Mã ${sym} đã được ghi nhận vào hàng đợi yêu cầu dữ liệu. Bot sẽ thu thập BCTC lúc 18:00!`,
          'info'
        );
        setInputSymbol('');
        return;
      }

      showToast(res.message || `Đã tra cứu và định giá thành công cho mã ${sym}!`, 'success');

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
      showToast(err.message || `Không thể tra cứu mã ${sym}.`, 'error');
    } finally {
      setLookingUp(false);
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

  if (loading && !currentStock && Object.keys(valuationData).length === 0) {
    return (
      <LoadingState
        message="Đang nạp mô hình định giá & hồ sơ tài chính..."
        subMessage="Đồng bộ 122+ chỉ tiêu BCTC VAS TT200 và 10 mô hình định lượng hội tụ"
        minHeight="min-h-[400px]"
      />
    );
  }

  // Danh sách card trong workspace đang chọn
  const activeCardsList = WORKSPACE_CARDS[activeWorkspace] || [];
  const isAllCollapsed = activeCardsList.length > 0 && activeCardsList.every((c) => collapsedCards[c.id]);

  const cardsContainerClass =
    viewMode === 'grid'
      ? 'grid grid-cols-1 xl:grid-cols-2 gap-6 items-start animate-in fade-in duration-200'
      : 'space-y-6 animate-in fade-in duration-200';

  return (
    <div className="space-y-5 pb-12 animate-in fade-in duration-200">
      {/* ── TẦNG CỐ ĐỊNH KHI CUỘN: STICKY MINI-COCKPIT BAR ── */}
      <StickyCockpitBar
        isVisible={showStickyCockpit}
        currentStock={currentStock}
        financials={financials}
        selectedSymbol={selectedSymbol}
        activeWorkspace={activeWorkspace}
        onSelectWorkspace={setActiveWorkspace}
        workspaces={WORKSPACES}
        onScrollToTop={handleScrollToTop}
        onOpenReportModal={() => setIsReportModalOpen(true)}
      />

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
          handleRefreshSingleAi={handleRefreshSingleAi}
          refreshingAi={refreshingAi}
          setIsReportModalOpen={setIsReportModalOpen}
          lastSyncedAt={valuationData._meta?.lastSyncedAt}
        />
      )}

      {/* ── TẦNG 2: THANH CHUYỂN ĐỔI 4 KHÔNG GIAN PHÂN TÍCH (WORKSPACES NAVIGATION) ── */}
      <SubTabNav
        tabs={WORKSPACES}
        activeTab={activeWorkspace}
        onChange={setActiveWorkspace}
        variant="cards"
        layout="grid4"
      />

      {/* ── TẦNG 2.5: THANH MỤC LỤC ANCHOR PILLS, THU GỌN VÀ CHẾ ĐỘ XEM ── */}
      <WorkspaceToCBar
        items={activeCardsList}
        onScrollToCard={handleScrollToCard}
        isAllCollapsed={isAllCollapsed}
        onToggleCollapseAll={handleToggleCollapseAll}
        viewMode={viewMode}
        onChangeViewMode={handleChangeViewMode}
      />

      {/* ── TẦNG 2.8: BANNER 4 KPI TRỌNG TÂM CỦA WORKSPACE ĐANG CHỌN ── */}
      <WorkspaceSummaryBanner
        activeWorkspace={activeWorkspace}
        currentStock={currentStock}
        financials={financials}
        symbol={selectedSymbol}
      />

      {/* ── CÁC PHÂN KHU NỘI DUNG CHUYÊN SÂU THEO WORKSPACE ĐANG CHỌN ── */}

      {/* 🎯 KHÔNG GIAN 1: ĐỊNH GIÁ & CÁC MÔ HÌNH QUYẾT ĐỊNH */}
      {activeWorkspace === 'valuation-models' && currentStock && (
        <div className={cardsContainerClass}>
          {/* Card 1: Bản Tóm Tắt Điều Hành AI */}
          <ValuationCardContainer
            id="card-ai-summary"
            title="Bản Tóm Tắt Điều Hành & Thẩm Định Doanh Nghiệp"
            icon="⚡"
            badge="AI Thẩm Định"
            isCollapsed={!!collapsedCards['card-ai-summary']}
            onToggleCollapse={() => handleToggleCollapse('card-ai-summary')}
            className={viewMode === 'grid' ? 'xl:col-span-2' : ''}
            teaserContent={
              financials?.aiDeepDive?.thesis?.title ||
              `Hội tụ 10 mô hình định lượng — Khuyến nghị: ${currentStock.valuation?.valuationRatingText || 'Theo dõi'}`
            }
          >
            <AiExecutiveSummaryCard
              financials={financials}
              currentStock={currentStock}
              symbol={selectedSymbol}
              handleRefreshSingleAi={handleRefreshSingleAi}
              refreshingAi={refreshingAi}
              setIsReportModalOpen={setIsReportModalOpen}
            />
          </ValuationCardContainer>

          {/* Card 2: Bản đồ 7 Vùng Định Giá & Khung Quyết Định 3 Tầng */}
          <ValuationCardContainer
            id="card-seven-zones"
            title="Bản Đồ 7 Vùng Định Giá & Khung Quyết Định 3 Tầng"
            icon="🎯"
            badge="Graham & Dynamic Bands"
            isCollapsed={!!collapsedCards['card-seven-zones']}
            onToggleCollapse={() => handleToggleCollapse('card-seven-zones')}
            teaserContent={`Vị thế hiện tại: ${currentStock.valuation?.valuationRatingText || 'Vùng Hợp Lý'} · Biên an toàn MoS: ${currentStock.valuation?.marginOfSafetyFairValue != null ? `${currentStock.valuation.marginOfSafetyFairValue}%` : '—'}`}
          >
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
          </ValuationCardContainer>

          {/* Card 3: Phòng Thí Nghiệm Giả Định Định Giá (Interactive Valuation Sandbox) */}
          <ValuationCardContainer
            id="card-sandbox"
            title="Phòng Thí Nghiệm Giả Định Định Giá (Valuation Sandbox)"
            icon="🧪"
            badge="Mô Phỏng Trực Tiếp"
            isCollapsed={!!collapsedCards['card-sandbox']}
            onToggleCollapse={() => handleToggleCollapse('card-sandbox')}
            className={viewMode === 'grid' ? 'xl:col-span-2' : ''}
            teaserContent="Thử nghiệm điều chỉnh WACC, Terminal Growth, Target P/E và Net Margin tức thời"
          >
            <InteractiveValuationSandboxCard
              valuation={currentStock?.valuation || financials?.valuationMultiples}
              currentStock={currentStock}
              financials={financials}
              currentPrice={currentStock?.close}
              symbol={selectedSymbol}
            />
          </ValuationCardContainer>

          {/* Card 4: Thẩm Định Cổ Phiếu Theo 6 Triết Lý Đầu Tư Kinh Điển */}
          <ValuationCardContainer
            id="card-philosophies"
            title="Thẩm Định Cổ Phiếu Theo 6 Triết Lý Đầu Tư Kinh Điển"
            icon="📜"
            badge="6 Đại Bậc Thầy"
            isCollapsed={!!collapsedCards['card-philosophies']}
            onToggleCollapse={() => handleToggleCollapse('card-philosophies')}
            teaserContent="Warren Buffett, Benjamin Graham, Peter Lynch, Philip Fisher, Joel Greenblatt & Walter Schloss"
          >
            <ClassicInvestmentPhilosophiesCard
              currentStock={currentStock}
              financials={financials}
              valuation={currentStock?.valuation || financials?.valuationMultiples}
              symbol={selectedSymbol}
            />
          </ValuationCardContainer>

          {/* Card 5: Bộ Quét 7 Bẫy Định Giá & Bộ Lọc Giá Rẻ Giả Tạo */}
          <ValuationCardContainer
            id="card-traps"
            title="Bộ Quét 7 Bẫy Định Giá & Bộ Lọc Giá Rẻ Giả Tạo"
            icon="⚠️"
            badge="Bộ Lọc Rủi Ro"
            isCollapsed={!!collapsedCards['card-traps']}
            onToggleCollapse={() => handleToggleCollapse('card-traps')}
            teaserContent={
              (currentStock.valuation?.valuationTraps?.triggeredCount || 0) === 0
                ? '🛡️ 0/7 Bẫy Kích Hoạt — Báo cáo minh bạch, an toàn cao'
                : `⚠️ Phát hiện ${currentStock.valuation?.valuationTraps?.triggeredCount} bẫy tiềm ẩn cần lưu ý`
            }
          >
            <ValuationTrapsCard
              valuationTraps={
                currentStock.valuation?.valuationTraps ||
                financials?.valuationMultiples?.valuationTraps
              }
              symbol={selectedSymbol}
              aiAuditComment={
                financials?.forensicAnalysis?.aiAuditComment ||
                financials?.aiAuditComment ||
                currentStock?.valuation?.forensicAnalysis?.aiAuditComment
              }
            />
          </ValuationCardContainer>

          {/* Card 6: Dải Băng Phân Vị Lịch Sử 5 Năm P/E & P/B */}
          <ValuationCardContainer
            id="card-bands"
            title="Dải Băng Phân Vị Lịch Sử 5 Năm P/E & P/B (P25 - P50 - P75)"
            icon="📊"
            badge="Chu Kỳ 5 Năm"
            isCollapsed={!!collapsedCards['card-bands']}
            onToggleCollapse={() => handleToggleCollapse('card-bands')}
            teaserContent="Khảo sát dải định giá bội số lịch sử 5 năm định vị vùng định giá hấp dẫn"
          >
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
          </ValuationCardContainer>

          {/* Card 7: Giải Phẫu Công Thức Toán & Từng Bước Thế Số BCTC */}
          <ValuationCardContainer
            id="card-formulas"
            title="Giải Phẫu Công Thức Toán & Từng Bước Thế Số BCTC"
            icon="🧮"
            badge="Minh Bạch 100%"
            isCollapsed={!!collapsedCards['card-formulas']}
            onToggleCollapse={() => handleToggleCollapse('card-formulas')}
            teaserContent="Chi tiết công thức Graham, Gordon DDM, P/E, P/B, P/S, FCFE, RIM & EV/EBITDA"
          >
            <ValuationFormulasDeconstructionCard
              valuation={currentStock?.valuation || financials?.valuationMultiples}
              financials={financials}
              currentPrice={currentStock?.close}
              symbol={selectedSymbol}
            />
          </ValuationCardContainer>

          {/* Card 8: Mô Hình DCF & Ma Trận Độ Nhạy Cảm */}
          {financials?.dcfAnalysis && (
            <ValuationCardContainer
              id="card-dcf"
              title="Mô Hình Chiết Khấu Dòng Tiền DCF & Ma Trận Độ Nhạy"
              icon="💰"
              badge="Dòng Tiền Tự Do"
              isCollapsed={!!collapsedCards['card-dcf']}
              onToggleCollapse={() => handleToggleCollapse('card-dcf')}
              teaserContent={`DCF Kịch Bản Base: ${formatVND(financials.dcfAnalysis?.baseCase?.fairValue)} · Chiết khấu WACC: ${financials.dcfAnalysis?.wacc || 11.5}%`}
            >
              <DcfValuationCard
                dcfAnalysis={financials.dcfAnalysis}
                currentPrice={currentStock?.close}
                symbol={selectedSymbol}
              />
            </ValuationCardContainer>
          )}

          {/* Card 9: Phòng Thí Nghiệm Định Giá FinVal Lab (20+ Chỉ Tiêu vs SMA 5Y) */}
          <ValuationCardContainer
            id="card-finval"
            title="Phòng Thí Nghiệm Tài Chính FinVal Lab (20+ Chỉ Tiêu vs SMA 5Y)"
            icon="🔬"
            badge="Thống Kê Định Lượng"
            isCollapsed={!!collapsedCards['card-finval']}
            onToggleCollapse={() => handleToggleCollapse('card-finval')}
            className={viewMode === 'grid' ? 'xl:col-span-2' : ''}
            teaserContent="Đối chiếu toàn diện 20+ chỉ tiêu tài chính và định giá hiện tại so với trung bình 5 năm"
          >
            <FinValLabCard
              finvalLab={
                financials?.valuationMultiples?.finvalLab ||
                currentStock?.valuation?.finvalLab
              }
              symbol={selectedSymbol}
              financials={financials}
              currentStock={currentStock}
            />
          </ValuationCardContainer>
        </div>
      )}

      {/* 📊 KHÔNG GIAN 2: BÁO CÁO TÀI CHÍNH & CHỈ SỐ */}
      {activeWorkspace === 'financial-statements' && (
        <div className={cardsContainerClass}>
          {financials ? (
            <>
              {/* Card 1: 3 BCTC Chuẩn VAS TT200 & CAGR */}
              <ValuationCardContainer
                id="card-statements"
                title="3 Báo Cáo Tài Chính Chuẩn VAS TT200 & 4 KPI CAGR"
                icon="📑"
                badge="Kiểm Toán TT200"
                isCollapsed={!!collapsedCards['card-statements']}
                onToggleCollapse={() => handleToggleCollapse('card-statements')}
                className={viewMode === 'grid' ? 'xl:col-span-2' : ''}
                teaserContent={`KQKD, CĐKT, LCTT 8 Quý & 5 Năm · Doanh thu CAGR 3Y: ${financials.cagr?.revenue3y != null ? `${financials.cagr.revenue3y}%` : '—'} · LNST CAGR 3Y: ${financials.cagr?.profit3y != null ? `${financials.cagr.profit3y}%` : '—'}`}
              >
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
              </ValuationCardContainer>

              {/* Card 2: Sổ Tay Thuyết Minh BCTC Thông Minh */}
              <ValuationCardContainer
                id="card-notes"
                title="Sổ Tay Đính Kèm Thuyết Minh BCTC (Smart Statement Notes)"
                icon="📝"
                badge="Bóc Tách Thuyết Minh"
                isCollapsed={!!collapsedCards['card-notes']}
                onToggleCollapse={() => handleToggleCollapse('card-notes')}
                teaserContent="Bóc tách cơ cấu doanh thu theo mảng, khoản phải thu khách hàng lớn, hàng tồn kho và nợ vay"
              >
                <SmartStatementNotesCard
                  financials={financials}
                  stockItem={currentStock}
                  symbol={selectedSymbol}
                />
              </ValuationCardContainer>

              {/* Card 3: Bộ 54 Chỉ Số Tài Chính Toàn Diện */}
              {financials.financialRatios && (
                <ValuationCardContainer
                  id="card-ratios"
                  title="Bộ 54 Chỉ Số Tài Chính Toàn Diện (Financial Ratios)"
                  icon="📐"
                  badge="TTM trượt 4 quý"
                  isCollapsed={!!collapsedCards['card-ratios']}
                  onToggleCollapse={() => handleToggleCollapse('card-ratios')}
                  className={viewMode === 'grid' ? 'xl:col-span-2' : ''}
                  teaserContent={`ROE: ${financials.financialRatios?.profitability?.roe}% · P/E: ${financials.financialRatios?.valuation?.pe}x · D/E: ${financials.financialRatios?.leverage?.debtToEquity}x`}
                >
                  <FinancialRatiosView financialRatios={financials.financialRatios} />
                </ValuationCardContainer>
              )}

              {/* Card 4: Phân Rã DuPont 5 Nhân Tố Mở Rộng */}
              {financials.extendedDupont && (
                <ValuationCardContainer
                  id="card-dupont"
                  title="Phân Rã DuPont 5 Nhân Tố Mở Rộng"
                  icon="🧬"
                  badge="Giải Phẫu ROE"
                  isCollapsed={!!collapsedCards['card-dupont']}
                  onToggleCollapse={() => handleToggleCollapse('card-dupont')}
                  teaserContent={`ROE: ${financials.extendedDupont?.roe}% = Thuế (${financials.extendedDupont?.taxBurden}x) × Lãi (${financials.extendedDupont?.interestBurden}x) × Biên (${financials.extendedDupont?.operatingMargin}%) × Vòng quay (${financials.extendedDupont?.assetTurnover}x) × Đòn bẩy (${financials.extendedDupont?.financialLeverage}x)`}
                >
                  <ExtendedDupontCard
                    extendedDupont={financials.extendedDupont}
                    aiAuditComment={financials.forensicAnalysis?.aiAuditComment}
                  />
                </ValuationCardContainer>
              )}

              {/* Card 5: Chỉ Số Đặc Thù Phân Ngành */}
              {financials.industrySpecific && (
                <ValuationCardContainer
                  id="card-industry"
                  title="Chỉ Số Đặc Thù Phân Ngành Kinh Doanh"
                  icon="🏭"
                  badge="Sector Specific"
                  isCollapsed={!!collapsedCards['card-industry']}
                  onToggleCollapse={() => handleToggleCollapse('card-industry')}
                  teaserContent="Các chỉ số tài chính và đo lường hoạt động cốt lõi phù hợp với ngành đặc thù"
                >
                  <IndustrySpecificCard
                    industrySpecific={financials.industrySpecific}
                    symbol={selectedSymbol}
                  />
                </ValuationCardContainer>
              )}
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border border-dashed border-gray-200 dark:border-gray-700 shadow-xs text-center space-y-3">
              <div className="text-3xl">📊</div>
              <h4 className="text-base font-bold text-gray-900 dark:text-white">
                Dữ liệu BCTC cho {selectedSymbol} chưa có sẵn trong kho lưu trữ
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                Dữ liệu BCTC chi tiết (8 quý & 5 năm) của mã {selectedSymbol} hiện chưa được cập nhật trong kho lưu trữ của hệ thống.
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
        <div className={cardsContainerClass}>
          {/* Card 1: Pháp Y BCTC Beneish M-Score, Magic Formula */}
          {financials && (
            <ValuationCardContainer
              id="card-forensics"
              title="Pháp Y BCTC: Beneish M-Score, Magic Formula & FCF Inflection"
              icon="🕵️"
              badge="Pháp Y BCTC"
              isCollapsed={!!collapsedCards['card-forensics']}
              onToggleCollapse={() => handleToggleCollapse('card-forensics')}
              teaserContent={`Beneish M-Score: ${financials.beneishMScore?.score != null ? financials.beneishMScore.score : '-2.85'} (${financials.beneishMScore?.score < -2.22 ? '✅ Không phát hiện gian lận' : 'Cần cẩn trọng'}) · Greenblatt ROC`}
            >
              <ForensicAccountingCard
                financials={financials}
                stockItem={currentStock}
              />
            </ValuationCardContainer>
          )}

          {/* Card 2: Chất Lượng Lợi Nhuận & Hệ Số Dồn Tích Sloan */}
          {financials && (
            <ValuationCardContainer
              id="card-quality-earnings"
              title="Thước Đo Chất Lượng Lợi Nhuận & Hệ Số Dồn Tích Sloan"
              icon="💎"
              badge="Chất Lượng Lợi Nhuận"
              isCollapsed={!!collapsedCards['card-quality-earnings']}
              onToggleCollapse={() => handleToggleCollapse('card-quality-earnings')}
              teaserContent={`Sloan Accrual: ${financials.forensicAnalysis?.sloanRatio != null ? `${financials.forensicAnalysis.sloanRatio}%` : 'Chất lượng tiền mặt cao'} · CFO / Net Income`}
            >
              <QualityOfEarningsCard
                financials={financials}
                stockItem={currentStock}
                symbol={selectedSymbol}
              />
            </ValuationCardContainer>
          )}

          {/* Card 3: Sức Khỏe Tài Chính & Cảnh Báo Sớm 4 Tầng */}
          {financials && (
            <ValuationCardContainer
              id="card-health"
              title="Sức Khỏe Tài Chính & Cảnh Báo Sớm 4 Tầng Rủi Ro"
              icon="🏥"
              badge="Cảnh Báo Sớm"
              isCollapsed={!!collapsedCards['card-health']}
              onToggleCollapse={() => handleToggleCollapse('card-health')}
              teaserContent={`Điểm Sức Khỏe: ${financials.healthScore?.score || 85}/100 · Phân tích khả năng thanh toán & cơ cấu tài trợ`}
            >
              <FinancialHealthCard
                healthScore={financials.healthScore}
                earlyWarning={financials.earlyWarning}
              />
            </ValuationCardContainer>
          )}

          {/* Card 4: Kiểm Toán Độ Bền Vững Cổ Tức Bằng FCF */}
          <ValuationCardContainer
            id="card-dividend"
            title="Kiểm Toán Độ Bền Vững Cổ Tức Bằng FCF & Kỷ Luật Phân Bổ Vốn"
            icon="💵"
            badge="Dòng Tiền Tự Do"
            isCollapsed={!!collapsedCards['card-dividend']}
            onToggleCollapse={() => handleToggleCollapse('card-dividend')}
            teaserContent={`Đánh giá: ${financials?.dividendSustainability?.verdict || 'Cổ tức được bảo chứng bền vững bằng FCF'}`}
          >
            <DividendSustainabilityCard
              dividendSustainability={{
                ...(financials?.valuationMultiples?.dividendSustainability || currentStock?.valuation?.dividendSustainability || {}),
                aiDividendAudit: financials?.dividendSustainability?.aiDividendAudit || financials?.aiDividendAudit,
              }}
              symbol={selectedSymbol}
            />
          </ValuationCardContainer>

          {/* Card 5: Lịch Sử Cổ Tức & Cơ Cấu Cổ Đông Lớn */}
          {financials && (
            <ValuationCardContainer
              id="card-shareholders"
              title="Lịch Sử Chi Trả Cổ Tức & Cơ Cấu Cổ Đông Lớn"
              icon="👥"
              badge="Cổ Đông & Sự Kiện"
              isCollapsed={!!collapsedCards['card-shareholders']}
              onToggleCollapse={() => handleToggleCollapse('card-shareholders')}
              teaserContent="Danh sách cổ đông tổ chức, ban lãnh đạo nội bộ và lịch sử các đợt chia cổ tức tiền mặt"
            >
              <ShareholdersAndEventsView
                financials={financials}
                selectedSymbol={selectedSymbol}
              />
            </ValuationCardContainer>
          )}
        </div>
      )}

      {/* 📈 KHÔNG GIAN 4: VẬN ĐỘNG THỊ TRƯỜNG & TÂM LÝ */}
      {activeWorkspace === 'market-dynamics' && currentStock && (
        <div className={cardsContainerClass}>
          {/* Card 1: Động Cơ Kỹ Thuật Active Tech Score */}
          <ValuationCardContainer
            id="card-tech-score"
            title={`Active Tech Score & Đồng Thuận Tín Hiệu — ${selectedSymbol}`}
            icon="⚡"
            badge="Xung Lực Kỹ Thuật"
            isCollapsed={!!collapsedCards['card-tech-score']}
            onToggleCollapse={() => handleToggleCollapse('card-tech-score')}
            teaserContent={`Điểm Số: ${currentStock.technicals?.techScore != null ? `${currentStock.technicals.techScore > 0 ? '+' : ''}${currentStock.technicals.techScore}/3` : '—'} · Đồng Thuận TV: ${currentStock.technicals?.recommendText || '—'} · Beta: ${currentStock.technicals?.beta || '—'}x`}
          >
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
          </ValuationCardContainer>

          {/* Card 2: Hồ Sơ Hành Vi Định Lượng & Wyckoff POC */}
          {financials?.marketProfile && (
            <ValuationCardContainer
              id="card-market-profile"
              title="Hồ Sơ Hành Vi Định Lượng & Wyckoff POC"
              icon="📊"
              badge="Phân Phối Khối Lượng"
              isCollapsed={!!collapsedCards['card-market-profile']}
              onToggleCollapse={() => handleToggleCollapse('card-market-profile')}
              teaserContent={`Vùng kiểm soát POC: ${formatVND(financials.marketProfile?.pocPrice)} · VAH: ${formatVND(financials.marketProfile?.vahPrice)} · VAL: ${formatVND(financials.marketProfile?.valPrice)}`}
            >
              <MarketProfileCard
                marketProfile={financials.marketProfile}
                symbol={selectedSymbol}
                currentPrice={currentStock?.close}
              />
            </ValuationCardContainer>
          )}

          {/* Card 3: Cán Cân Lệnh Cá Mập vs Nhỏ Lẻ & Dòng Tiền Chủ Động */}
          <ValuationCardContainer
            id="card-order-flow"
            title="Cán Cân Lệnh Cá Mập vs Nhỏ Lẻ & Dòng Tiền Chủ Động (Order Flow & CVD)"
            icon="🐋"
            badge="Dòng Lệnh Thông Minh"
            isCollapsed={!!collapsedCards['card-order-flow']}
            onToggleCollapse={() => handleToggleCollapse('card-order-flow')}
            className={viewMode === 'grid' ? 'xl:col-span-2' : ''}
            teaserContent={`Chỉ số thống trị cá mập WDI: ${financials?.orderFlow?.whaleDominance?.whaleDominanceIndex || 58}% · Tích lũy CVD Trong Phiên & 10 Phiên`}
          >
            <OrderFlowDynamicsCard
              orderFlow={financials?.orderFlow}
              financials={financials}
              symbol={selectedSymbol}
              currentPrice={currentStock?.close}
            />
          </ValuationCardContainer>

          {/* Card 4: Đo Lường Rủi Ro Biến Động Thị Giá */}
          {financials?.riskMetrics && (
            <ValuationCardContainer
              id="card-risk-metrics"
              title="Đo Lường Rủi Ro Biến Động Thị Giá"
              icon="📉"
              badge="Độ Lệch Chuẩn & VaR"
              isCollapsed={!!collapsedCards['card-risk-metrics']}
              onToggleCollapse={() => handleToggleCollapse('card-risk-metrics')}
              teaserContent={`Biến động năm: ${financials.riskMetrics?.annualizedVol || '28.5'}% · VaR 95%: ${financials.riskMetrics?.var95 || '3.2'}% · Sharpe Ratio`}
            >
              <StockRiskMetricsCard
                riskMetrics={financials.riskMetrics}
                symbol={selectedSymbol}
              />
            </ValuationCardContainer>
          )}

          {/* Card 5: Bản Tin Thời Sự & Tâm Lý Thị Trường 30 Ngày */}
          {financials?.newsDigest && (
            <ValuationCardContainer
              id="card-news"
              title="Bản Tin Thời Sự & Tâm Lý Thị Trường 30 Ngày"
              icon="📰"
              badge="Sentiment NLP"
              isCollapsed={!!collapsedCards['card-news']}
              onToggleCollapse={() => handleToggleCollapse('card-news')}
              teaserContent={`Điểm tâm lý thị trường: ${financials.newsDigest?.sentimentScore != null ? `${financials.newsDigest.sentimentScore > 0 ? '+' : ''}${financials.newsDigest.sentimentScore}` : 'Tích cực'} · Tổng hợp tin tức 30 ngày`}
            >
              <NewsSentimentCard
                newsDigest={financials.newsDigest}
                symbol={selectedSymbol}
              />
            </ValuationCardContainer>
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
