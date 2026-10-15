import React from 'react';

/**
 * Trích xuất nguồn gốc trí tuệ (AI vs Heuristic) và thông tin hiển thị chuẩn hóa
 * @param {Object} item Đối tượng dữ liệu (aiInsight, weeklyPulse, aiDeepDive, v.v.)
 * @returns {Object} { type: 'ai' | 'heuristic', label: 'AI' | 'H', provider, model, updatedAt, tooltip }
 */
export function getIntelligenceSource(item) {
  if (!item) {
    return {
      type: 'heuristic',
      label: 'H',
      provider: 'heuristic',
      model: null,
      updatedAt: null,
      tooltip: 'Mô hình định lượng Heuristic / Thuật toán tài chính quy tắc'
    };
  }

  const provider = (item.provider || '').toLowerCase();
  const isKnownAiProvider = (
    provider === 'openai' ||
    provider === 'gemini' ||
    provider === 'anthropic' ||
    provider === 'deepseek' ||
    provider === 'openrouter' ||
    provider.includes('ai') ||
    provider.includes('gpt') ||
    provider.includes('claude') ||
    provider.includes('super-vip')
  );

  // Nhận diện nếu đối tượng mang payload phân tích AI đặc thù
  const hasAiPayload = Boolean(
    item.headline ||
    item.executiveSummary ||
    item.transmissionHeadline ||
    item.aiScenarios ||
    item.thesisHeadline ||
    item.aiAuditComment ||
    item.convergenceHeadline ||
    item.pulseHeadline ||
    item.auditVerdict
  );

  const isExplicitHeuristic = provider === 'heuristic' || provider === 'offline-heuristic-engine';
  const isAi = (isKnownAiProvider || hasAiPayload) && !isExplicitHeuristic;

  if (isAi) {
    const updatedStr = item.updatedAt ? ` • Cập nhật: ${new Date(item.updatedAt).toLocaleDateString('vi-VN')}` : '';
    const provStr = provider && provider !== 'heuristic' ? ` • ${provider.toUpperCase()}` : '';
    return {
      type: 'ai',
      label: 'AI',
      provider: provider || 'ai',
      updatedAt: item.updatedAt,
      tooltip: `Trí tuệ nhân tạo (AI Copilot${provStr}${updatedStr})`
    };
  }

  // Trường hợp chạy offline heuristic fallback hoặc các mô hình định lượng
  return {
    type: 'heuristic',
    label: 'H',
    provider: provider || 'heuristic',
    updatedAt: item.updatedAt,
    tooltip: 'Mô hình định lượng Heuristic & Thuật toán tài chính quy tắc'
  };
}

/**
 * Component hiển thị nhãn nhận diện Trí Tuệ Nhân Tạo (AI) hoặc Mô Hình Định Lượng Quy Tắc (H)
 * @param {Object} props
 * @param {Object} [props.source] Đối tượng nguồn dữ liệu (report, aiInsight, aiDeepDive...) tự động trích xuất thông tin
 * @param {Object} [props.item] Bí danh cho source
 * @param {'ai' | 'heuristic' | 'h'} [props.type] Loại nhãn cưỡng bức
 * @param {string} [props.provider] Tự động nhận diện qua provider (openai, gemini, offline-heuristic-engine, v.v.)
 * @param {string} [props.tooltip] Nội dung tooltip tùy chỉnh khi rê chuột
 * @param {'xs' | 'sm'} [props.size='sm'] Kích thước nhãn
 * @param {string} [props.className] Class tùy biến bổ sung
 */
export default function IntelligenceBadge({
  source,
  item,
  type,
  provider,
  tooltip,
  size = 'sm',
  className = ''
}) {
  const target = source || item;
  const intel = target ? getIntelligenceSource(target) : null;

  // Xác định loại nhãn
  let resolvedType = 'heuristic';
  let finalTooltip = tooltip;

  if (type) {
    resolvedType = (type === 'ai' || type === 'AI') ? 'ai' : 'heuristic';
  } else if (intel) {
    resolvedType = intel.type;
    if (!finalTooltip) finalTooltip = intel.tooltip;
  } else if (provider) {
    const p = provider.toLowerCase();
    const isExplicitHeuristic = p === 'heuristic' || p === 'offline-heuristic-engine';
    const isKnownAi = (
      p === 'openai' ||
      p === 'gemini' ||
      p === 'anthropic' ||
      p === 'deepseek' ||
      p === 'openrouter' ||
      p.includes('ai') ||
      p.includes('gpt') ||
      p.includes('claude') ||
      p.includes('super-vip')
    );
    resolvedType = (isKnownAi && !isExplicitHeuristic) ? 'ai' : 'heuristic';
  }

  const isAi = resolvedType === 'ai';

  // Xây dựng tooltip mặc định nếu không truyền vào
  if (!finalTooltip) {
    if (isAi) {
      finalTooltip = 'Trí tuệ nhân tạo (AI Copilot)';
    } else {
      finalTooltip = 'Mô hình định lượng Heuristic / Thuật toán tài chính quy tắc';
    }
  }

  const sizeClasses = size === 'xs'
    ? 'text-[8.5px] px-1 py-0.2 tracking-wider'
    : 'text-[9.5px] px-1.5 py-0.5 tracking-wider';

  return (
    <span
      title={finalTooltip}
      className={`inline-flex items-center justify-center font-black uppercase rounded-md transition-all select-none cursor-help shadow-2xs ${sizeClasses} ${
        isAi
          ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/90 dark:text-purple-300 border border-purple-300/80 dark:border-purple-800'
          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/90 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800'
      } ${className}`}
    >
      {isAi ? 'AI' : 'H'}
    </span>
  );
}
