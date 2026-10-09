import { FUNDAMENTALS_TTL_MS } from '../config/constants.js';
import { loadFundamentalsCache, saveFundamentalsCache } from '../storage/jsonStore.js';

let memoryFundamentalsCache = loadFundamentalsCache();

export const TRADINGVIEW_COLUMNS = [
  'name', 'description', 'close', 'change', 'change_abs', 'volume',
  'sector.tr', 'industry.tr',
  // Định giá
  'price_earnings_ttm', 'price_book_ratio', 'price_sales_ratio', 'enterprise_value_to_ebitda_ratio',
  // Sinh lời & Hiệu quả
  'return_on_equity_fq', 'return_on_equity_fy', 'return_on_assets_fq', 'return_on_assets_fy',
  'earnings_per_share_basic_ttm', 'gross_margin_ttm', 'operating_margin_ttm', 'net_margin_ttm',
  // Cổ tức & Dòng tiền
  'dividends_yield', 'dps_common_stock_prim_issue_fy', 'free_cash_flow_ttm', 'free_cash_flow_margin_ttm',
  // Sức khỏe tài chính & Đòn bẩy
  'total_debt_fq', 'total_assets_fq', 'debt_to_equity_fq', 'current_ratio_fq', 'quick_ratio_fq', 'ebitda_ttm',
  // Doanh thu, Lợi nhuận & Quy mô
  'total_revenue_ttm', 'net_income_ttm', 'market_cap_basic', 'total_shares_outstanding_fundamental',
  // Vận động giá & Chu kỳ
  'Perf.W', 'Perf.1M', 'Perf.3M', 'Perf.6M', 'Perf.YTD', 'Perf.Y', 'Perf.5Y',
  'price_52_week_high', 'price_52_week_low',
  'average_volume_10d_calc', 'average_volume_30d_calc', 'Volatility.W', 'Volatility.M',
  // Kỹ thuật & Định lượng
  'Recommend.All', 'RSI', 'MACD.macd', 'MACD.signal', 'beta_1_year'
];

function normalizeFundamentalRow(row, columns) {
  const d = {};
  columns.forEach((col, idx) => {
    d[col] = row.d ? row.d[idx] : null;
  });

  const sym = (d['name'] || '').toUpperCase();
  const close = d['close'] != null ? Number(d['close']) : null;
  const high52w = d['price_52_week_high'] != null ? Number(d['price_52_week_high']) : null;
  const low52w = d['price_52_week_low'] != null ? Number(d['price_52_week_low']) : null;

  // 52-week position calculation (0 to 100%)
  let range52wPercent = null;
  if (close != null && high52w != null && low52w != null && high52w > low52w) {
    range52wPercent = Math.max(0, Math.min(100, Math.round(((close - low52w) / (high52w - low52w)) * 100)));
  }

  // Technical recommendation text
  let recommendText = 'Trung lập';
  let recommendColor = 'text-gray-400';
  const recScore = d['Recommend.All'];
  if (recScore != null) {
    if (recScore >= 0.5) {
      recommendText = 'Mua mạnh';
      recommendColor = 'text-emerald-500 font-bold';
    } else if (recScore > 0.1) {
      recommendText = 'Mua';
      recommendColor = 'text-green-500 font-medium';
    } else if (recScore <= -0.5) {
      recommendText = 'Bán mạnh';
      recommendColor = 'text-rose-500 font-bold';
    } else if (recScore < -0.1) {
      recommendText = 'Bán';
      recommendColor = 'text-rose-400 font-medium';
    }
  }

  return {
    symbol: sym,
    exchange: row.s ? row.s.split(':')[0] : 'HOSE',
    name: sym,
    description: d['description'] || sym,
    close,
    change: d['change'] != null ? Number(d['change'].toFixed(2)) : 0,
    changeAbs: d['change_abs'] != null ? Number(d['change_abs']) : 0,
    volume: d['volume'] != null ? Number(d['volume']) : 0,
    sector: d['sector.tr'] || 'Khác',
    industry: d['industry.tr'] || 'Khác',

    // 1. Valuation Multiples
    valuation: {
      pe: d['price_earnings_ttm'] != null ? Number(d['price_earnings_ttm'].toFixed(2)) : null,
      pb: d['price_book_ratio'] != null ? Number(d['price_book_ratio'].toFixed(2)) : null,
      ps: d['price_sales_ratio'] != null ? Number(d['price_sales_ratio'].toFixed(2)) : null,
      evEbitda: d['enterprise_value_to_ebitda_ratio'] != null ? Number(d['enterprise_value_to_ebitda_ratio'].toFixed(2)) : null,
    },

    // 2. Profitability & Returns
    profitability: {
      roe: d['return_on_equity_fq'] != null ? Number(d['return_on_equity_fq'].toFixed(2)) : null,
      roeFy: d['return_on_equity_fy'] != null ? Number(d['return_on_equity_fy'].toFixed(2)) : null,
      roa: d['return_on_assets_fq'] != null ? Number(d['return_on_assets_fq'].toFixed(2)) : null,
      roaFy: d['return_on_assets_fy'] != null ? Number(d['return_on_assets_fy'].toFixed(2)) : null,
      eps: d['earnings_per_share_basic_ttm'] != null ? Math.round(d['earnings_per_share_basic_ttm']) : null,
      grossMargin: d['gross_margin_ttm'] != null ? Number(d['gross_margin_ttm'].toFixed(2)) : null,
      operatingMargin: d['operating_margin_ttm'] != null ? Number(d['operating_margin_ttm'].toFixed(2)) : null,
      netMargin: d['net_margin_ttm'] != null ? Number(d['net_margin_ttm'].toFixed(2)) : null,
    },

    // 3. Dividends & Cash Flow
    dividends: {
      yield: d['dividends_yield'] != null ? Number(d['dividends_yield'].toFixed(2)) : null,
      dps: d['dps_common_stock_prim_issue_fy'] != null ? Math.round(d['dps_common_stock_prim_issue_fy']) : 0,
      fcf: d['free_cash_flow_ttm'] != null ? Math.round(d['free_cash_flow_ttm']) : null,
      fcfMargin: d['free_cash_flow_margin_ttm'] != null ? Number(d['free_cash_flow_margin_ttm'].toFixed(2)) : null,
    },

    // 4. Financial Health & Balance Sheet
    health: {
      totalDebt: d['total_debt_fq'] != null ? Math.round(d['total_debt_fq']) : null,
      totalAssets: d['total_assets_fq'] != null ? Math.round(d['total_assets_fq']) : null,
      debtToEquity: d['debt_to_equity_fq'] != null ? Number(d['debt_to_equity_fq'].toFixed(2)) : null,
      currentRatio: d['current_ratio_fq'] != null ? Number(d['current_ratio_fq'].toFixed(2)) : null,
      quickRatio: d['quick_ratio_fq'] != null ? Number(d['quick_ratio_fq'].toFixed(2)) : null,
      ebitda: d['ebitda_ttm'] != null ? Math.round(d['ebitda_ttm']) : null,
    },

    // 5. Scale & Revenue
    scale: {
      revenue: d['total_revenue_ttm'] != null ? Math.round(d['total_revenue_ttm']) : null,
      netIncome: d['net_income_ttm'] != null ? Math.round(d['net_income_ttm']) : null,
      marketCap: d['market_cap_basic'] != null ? Math.round(d['market_cap_basic']) : null,
      sharesOutstanding: d['total_shares_outstanding_fundamental'] != null ? Math.round(d['total_shares_outstanding_fundamental']) : null,
    },

    // 6. Price Performance & Ranges
    performance: {
      w1: d['Perf.W'] != null ? Number(d['Perf.W'].toFixed(2)) : null,
      m1: d['Perf.1M'] != null ? Number(d['Perf.1M'].toFixed(2)) : null,
      m3: d['Perf.3M'] != null ? Number(d['Perf.3M'].toFixed(2)) : null,
      m6: d['Perf.6M'] != null ? Number(d['Perf.6M'].toFixed(2)) : null,
      ytd: d['Perf.YTD'] != null ? Number(d['Perf.YTD'].toFixed(2)) : null,
      y1: d['Perf.Y'] != null ? Number(d['Perf.Y'].toFixed(2)) : null,
      y5: d['Perf.5Y'] != null ? Number(d['Perf.5Y'].toFixed(2)) : null,
      high52w,
      low52w,
      range52wPercent,
      avgVol10d: d['average_volume_10d_calc'] != null ? Math.round(d['average_volume_10d_calc']) : null,
      avgVol30d: d['average_volume_30d_calc'] != null ? Math.round(d['average_volume_30d_calc']) : null,
      volatilityW: d['Volatility.W'] != null ? Number(d['Volatility.W'].toFixed(2)) : null,
      volatilityM: d['Volatility.M'] != null ? Number(d['Volatility.M'].toFixed(2)) : null,
    },

    // 7. Technicals & Sentiment
    technicals: {
      recommendScore: recScore != null ? Number(recScore.toFixed(2)) : null,
      recommendText,
      recommendColor,
      rsi: d['RSI'] != null ? Number(d['RSI'].toFixed(1)) : null,
      macd: d['MACD.macd'] != null ? Number(d['MACD.macd'].toFixed(2)) : null,
      macdSignal: d['MACD.signal'] != null ? Number(d['MACD.signal'].toFixed(2)) : null,
      beta: d['beta_1_year'] != null ? Number(d['beta_1_year'].toFixed(2)) : null,
    },

    updatedAt: Date.now(),
  };
}

/**
 * Lấy dữ liệu cơ bản từ TradingView Scanner API theo batch
 */
async function fetchTradingViewFundamentals(symbols = []) {
  if (symbols.length === 0) return {};

  const payload = {
    filter: [
      {
        left: 'name',
        operation: 'in_range',
        right: symbols.map(s => s.toUpperCase())
      }
    ],
    columns: TRADINGVIEW_COLUMNS
  };

  const response = await fetch('https://scanner.tradingview.com/vietnam/scan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`TradingView Scanner API error: ${response.status}`);
  }

  const json = await response.json();
  const results = {};

  if (Array.isArray(json.data)) {
    for (const row of json.data) {
      const normalized = normalizeFundamentalRow(row, TRADINGVIEW_COLUMNS);
      if (normalized.symbol) {
        results[normalized.symbol] = normalized;
      }
    }
  }

  return results;
}

/**
 * Hàm chính: Lấy dữ liệu cơ bản cho danh sách mã cổ phiếu
 * Tích hợp cache memory & file với TTL 12h
 */
export async function getMultipleFundamentals(symbols = [], force = false) {
  const cleanSymbols = [...new Set(symbols.map(s => (s || '').trim().toUpperCase()).filter(Boolean))];
  if (cleanSymbols.length === 0) return {};

  const now = Date.now();
  const resultMap = {};
  const symbolsToFetch = [];

  for (const sym of cleanSymbols) {
    const cached = memoryFundamentalsCache[sym];
    const isExpired = !cached || !cached.updatedAt || (now - cached.updatedAt > FUNDAMENTALS_TTL_MS);

    if (!force && !isExpired) {
      resultMap[sym] = cached;
    } else {
      symbolsToFetch.push(sym);
    }
  }

  if (symbolsToFetch.length > 0) {
    try {
      const fetchedMap = await fetchTradingViewFundamentals(symbolsToFetch);
      let hasNewData = false;

      for (const sym of symbolsToFetch) {
        if (fetchedMap[sym]) {
          memoryFundamentalsCache[sym] = fetchedMap[sym];
          resultMap[sym] = fetchedMap[sym];
          hasNewData = true;
        } else if (memoryFundamentalsCache[sym]) {
          // Nếu fetch không có (ví dụ mã OTC), dùng lại cache cũ nếu có
          resultMap[sym] = memoryFundamentalsCache[sym];
        } else {
          // Trả về placeholder tối thiểu
          resultMap[sym] = {
            symbol: sym,
            name: sym,
            description: sym,
            updatedAt: now,
            error: 'No fundamental data available'
          };
        }
      }

      if (hasNewData) {
        saveFundamentalsCache(memoryFundamentalsCache);
      }
    } catch (err) {
      console.error('[fundamentalService] Error fetching TradingView data:', err.message);
      // Fallback to existing cache if available
      for (const sym of symbolsToFetch) {
        if (memoryFundamentalsCache[sym]) {
          resultMap[sym] = memoryFundamentalsCache[sym];
        }
      }
    }
  }

  return resultMap;
}
