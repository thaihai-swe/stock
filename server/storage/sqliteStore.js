import { db, initDatabase } from './db.js';
import { computePortfolio } from '../services/matchingService.js';
import { v4 as uuidv4 } from 'uuid';

function safeJsonParse(str, fallback) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function mapBuyOrder(r) {
  return {
    id: r.id,
    symbol: r.symbol,
    quantity: Number(r.quantity),
    price: Number(r.price),
    feePct: Number(r.fee_pct ?? 0),
    fee: Number(r.fee ?? 0),
    totalCost: Number(r.total_cost),
    costPerShare: Number(r.cost_per_share),
    remainingQty: Number(r.remaining_qty),
    date: r.date,
    note: r.note || '',
    tags: safeJsonParse(r.tags, []),
    userId: r.user_id || 'demo',
  };
}

function mapSellOrder(r) {
  return {
    id: r.id,
    symbol: r.symbol,
    quantity: Number(r.quantity),
    price: Number(r.price),
    feePct: Number(r.fee_pct ?? 0),
    fee: Number(r.fee ?? 0),
    taxPct: Number(r.tax_pct ?? 0.1),
    tax: Number(r.tax ?? 0),
    grossRevenue: Number(r.gross_revenue),
    netRevenue: Number(r.net_revenue ?? (r.gross_revenue - (r.fee ?? 0) - (r.tax ?? 0))),
    totalRevenue: Number(r.net_revenue ?? (r.gross_revenue - (r.fee ?? 0) - (r.tax ?? 0))),
    totalCost: Number(r.total_cost),
    profitLoss: Number(r.profit_loss),
    profitLossPct: Number(r.profit_loss_pct),
    matchedLots: safeJsonParse(r.matched_lots, []),
    date: r.date,
    note: r.note || '',
    tags: safeJsonParse(r.tags, []),
    userId: r.user_id || 'demo',
  };
}

function mapDividend(r) {
  return {
    id: r.id,
    type: r.type,
    symbol: r.symbol,
    date: r.date,
    quantity: Number(r.quantity),
    amountPerShare: Number(r.amount_per_share || 0),
    taxPct: Number(r.tax_pct || 0),
    grossAmount: Number(r.gross_amount || 0),
    taxAmount: Number(r.tax_amount || 0),
    netAmount: Number(r.net_amount || 0),
    note: r.note || '',
    createdAt: r.created_at || r.date,
    userId: r.user_id || 'demo',
  };
}

function mapWatchlist(r) {
  return {
    id: r.id,
    symbol: r.symbol,
    targetBuyPrice: r.target_buy_price !== null && r.target_buy_price !== undefined ? Number(r.target_buy_price) : null,
    targetSellPrice: r.target_sell_price !== null && r.target_sell_price !== undefined ? Number(r.target_sell_price) : null,
    targetPrice: r.target_price !== null && r.target_price !== undefined ? Number(r.target_price) : null,
    note: r.note || '',
    createdAt: r.created_at,
    userId: r.user_id || 'demo',
  };
}

// 1. Lấy toàn bộ dữ liệu ứng dụng của người dùng cụ thể
export async function getAllData(userId = 'demo') {
  await initDatabase();

  const [buyRes, sellRes, divRes, watchRes, setRes] = await Promise.all([
    db.execute({
      sql: 'SELECT * FROM buy_orders WHERE user_id = ? ORDER BY date ASC, id ASC;',
      args: [userId],
    }),
    db.execute({
      sql: 'SELECT * FROM sell_orders WHERE user_id = ? ORDER BY date ASC, id ASC;',
      args: [userId],
    }),
    db.execute({
      sql: 'SELECT * FROM dividends WHERE user_id = ? ORDER BY date DESC, id DESC;',
      args: [userId],
    }),
    db.execute({
      sql: 'SELECT * FROM watchlist WHERE user_id = ? ORDER BY created_at DESC;',
      args: [userId],
    }),
    db.execute({
      sql: 'SELECT * FROM app_settings WHERE user_id = ?;',
      args: [userId],
    }),
  ]);

  const buyOrders = buyRes.rows.map(mapBuyOrder);
  const sellOrders = sellRes.rows.map(mapSellOrder);
  const dividends = divRes.rows.map(mapDividend);
  const watchlist = watchRes.rows.map(mapWatchlist);

  let settings = {};
  let goal = null;

  for (const row of setRes.rows) {
    if (row.key === 'settings') {
      const parsed = safeJsonParse(row.value, {});
      if (parsed && typeof parsed === 'object') {
        const { maxAllocationPct, ...rest } = parsed;
        settings = rest;
      }
    } else if (row.key === 'goal') {
      goal = safeJsonParse(row.value, null);
    }
  }

  const portfolio = computePortfolio(buyOrders);

  return {
    buyOrders,
    sellOrders,
    dividends,
    watchlist,
    settings,
    goal,
    portfolio,
  };
}

// 2. Thao tác Lệnh Mua (Buy Orders)
export async function addBuyOrder(order, userId = 'demo') {
  await initDatabase();
  await db.execute({
    sql: `INSERT INTO buy_orders 
          (id, symbol, quantity, price, fee_pct, fee, total_cost, cost_per_share, remaining_qty, date, note, tags, user_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    args: [
      order.id,
      order.symbol,
      order.quantity,
      order.price,
      order.feePct || 0,
      order.fee || 0,
      order.totalCost,
      order.costPerShare,
      order.remainingQty,
      order.date,
      order.note || '',
      JSON.stringify(order.tags || []),
      userId,
    ],
  });
  return order;
}

export async function deleteBuyOrder(id, userId = 'demo') {
  await initDatabase();
  // Kiểm tra xem lệnh mua có đang được dùng trong lệnh bán nào của user không
  const sellRes = await db.execute({
    sql: 'SELECT matched_lots FROM sell_orders WHERE user_id = ?;',
    args: [userId],
  });
  for (const row of sellRes.rows) {
    const lots = safeJsonParse(row.matched_lots, []);
    if (lots.some(m => m.buyOrderId === id)) {
      throw new Error('Không thể xóa vì lệnh mua này đã được dùng trong giao dịch bán.');
    }
  }

  await db.execute({
    sql: 'DELETE FROM buy_orders WHERE id = ? AND user_id = ?;',
    args: [id, userId],
  });
  return true;
}

// 3. Thao tác Lệnh Bán (Sell Orders & Khớp FIFO / Highest / Lowest)
export async function executeSellOrder(sellOrder, matchedLots, userId = 'demo') {
  await initDatabase();

  const statements = [
    {
      sql: `INSERT INTO sell_orders
            (id, symbol, quantity, price, fee_pct, fee, tax_pct, tax, gross_revenue, net_revenue, total_cost, profit_loss, profit_loss_pct, matched_lots, date, note, tags, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      args: [
        sellOrder.id,
        sellOrder.symbol,
        sellOrder.quantity,
        sellOrder.price,
        sellOrder.feePct || 0,
        sellOrder.fee || 0,
        sellOrder.taxPct || 0.1,
        sellOrder.tax || 0,
        sellOrder.grossRevenue,
        sellOrder.netRevenue || sellOrder.totalRevenue,
        sellOrder.totalCost,
        sellOrder.profitLoss,
        sellOrder.profitLossPct,
        JSON.stringify(sellOrder.matchedLots || []),
        sellOrder.date,
        sellOrder.note || '',
        JSON.stringify(sellOrder.tags || []),
        userId,
      ],
    },
  ];

  // Khấu trừ số lượng remaining_qty của từng lô mua của user
  for (const m of matchedLots) {
    statements.push({
      sql: `UPDATE buy_orders SET remaining_qty = remaining_qty - ? WHERE id = ? AND user_id = ?;`,
      args: [m.quantityUsed, m.buyOrderId, userId],
    });
  }

  await db.batch(statements, 'write');
  return sellOrder;
}

export async function deleteSellOrder(id, userId = 'demo') {
  await initDatabase();
  const sellRes = await db.execute({
    sql: 'SELECT * FROM sell_orders WHERE id = ? AND user_id = ?;',
    args: [id, userId],
  });
  if (sellRes.rows.length === 0) {
    throw new Error('Không tìm thấy lệnh bán.');
  }

  const sellOrder = mapSellOrder(sellRes.rows[0]);
  const statements = [
    {
      sql: 'DELETE FROM sell_orders WHERE id = ? AND user_id = ?;',
      args: [id, userId],
    },
  ];

  // Hoàn lại số lượng remaining_qty cho các lô mua tương ứng của user
  for (const m of sellOrder.matchedLots) {
    statements.push({
      sql: `UPDATE buy_orders SET remaining_qty = remaining_qty + ? WHERE id = ? AND user_id = ?;`,
      args: [m.quantityUsed, m.buyOrderId, userId],
    });
  }

  await db.batch(statements, 'write');
  return true;
}

// 4. Thao tác Cổ Tức (Dividends)
export async function addCashDividend(record, userId = 'demo') {
  await initDatabase();
  await db.execute({
    sql: `INSERT INTO dividends
          (id, type, symbol, date, quantity, amount_per_share, tax_pct, gross_amount, tax_amount, net_amount, note, created_at, user_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    args: [
      record.id,
      record.type,
      record.symbol,
      record.date,
      record.quantity,
      record.amountPerShare || 0,
      record.taxPct || 5,
      record.grossAmount || 0,
      record.taxAmount || 0,
      record.netAmount || 0,
      record.note || '',
      record.createdAt,
      userId,
    ],
  });
  return record;
}

export async function addStockDividend(record, bonusBuyOrder, userId = 'demo') {
  await initDatabase();
  const statements = [
    {
      sql: `INSERT INTO dividends
            (id, type, symbol, date, quantity, amount_per_share, tax_pct, gross_amount, tax_amount, net_amount, note, created_at, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      args: [
        record.id,
        record.type,
        record.symbol,
        record.date,
        record.quantity,
        0,
        0,
        0,
        0,
        0,
        record.note || '',
        record.createdAt,
        userId,
      ],
    },
    {
      sql: `INSERT INTO buy_orders 
            (id, symbol, quantity, price, fee_pct, fee, total_cost, cost_per_share, remaining_qty, date, note, tags, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      args: [
        bonusBuyOrder.id,
        bonusBuyOrder.symbol,
        bonusBuyOrder.quantity,
        0,
        0,
        0,
        0,
        0,
        bonusBuyOrder.quantity,
        bonusBuyOrder.date,
        bonusBuyOrder.note || '',
        JSON.stringify(bonusBuyOrder.tags || []),
        userId,
      ],
    },
  ];

  await db.batch(statements, 'write');
  return record;
}

export async function deleteDividend(id, userId = 'demo') {
  await initDatabase();
  const divRes = await db.execute({
    sql: 'SELECT * FROM dividends WHERE id = ? AND user_id = ?;',
    args: [id, userId],
  });
  if (divRes.rows.length === 0) {
    throw new Error('Không tìm thấy bản ghi cổ tức.');
  }

  const d = divRes.rows[0];
  const statements = [
    {
      sql: 'DELETE FROM dividends WHERE id = ? AND user_id = ?;',
      args: [id, userId],
    },
  ];

  // Nếu là cổ tức cổ phiếu, xóa lô mua 0đ tương ứng nếu chưa dùng
  if (d.type === 'STOCK') {
    const buyRes = await db.execute({
      sql: "SELECT * FROM buy_orders WHERE symbol = ? AND price = 0 AND note LIKE ? AND user_id = ?;",
      args: [d.symbol, `%${d.date}%`, userId],
    });
    if (buyRes.rows.length > 0) {
      const buyId = buyRes.rows[0].id;
      // Kiểm tra có bị bán chưa
      const sellRes = await db.execute({
        sql: 'SELECT matched_lots FROM sell_orders WHERE user_id = ?;',
        args: [userId],
      });
      const isUsed = sellRes.rows.some(r =>
        safeJsonParse(r.matched_lots, []).some(m => m.buyOrderId === buyId)
      );
      if (!isUsed) {
        statements.push({
          sql: 'DELETE FROM buy_orders WHERE id = ? AND user_id = ?;',
          args: [buyId, userId],
        });
      }
    }
  }

  await db.batch(statements, 'write');
  return true;
}

// 5. Thao tác Watchlist
export async function addWatchlistItem(item, userId = 'demo') {
  await initDatabase();
  await db.execute({
    sql: `INSERT INTO watchlist
          (id, symbol, target_buy_price, target_sell_price, target_price, note, created_at, user_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    args: [
      item.id,
      item.symbol,
      item.targetBuyPrice || null,
      item.targetSellPrice || null,
      item.targetPrice || null,
      item.note || '',
      item.createdAt,
      userId,
    ],
  });
  return item;
}

export async function deleteWatchlistItem(id, userId = 'demo') {
  await initDatabase();
  await db.execute({
    sql: 'DELETE FROM watchlist WHERE id = ? AND user_id = ?;',
    args: [id, userId],
  });
  return true;
}

// 6. Cài đặt & Mục tiêu (Settings & Goal)
export async function updateSettings(settings, userId = 'demo') {
  await initDatabase();
  await db.execute({
    sql: `INSERT OR REPLACE INTO app_settings (key, value, user_id) VALUES ('settings', ?, ?);`,
    args: [JSON.stringify(settings), userId],
  });
  return settings;
}

export async function updateCashBalance(cashBalance, userId = 'demo') {
  await initDatabase();
  const res = await db.execute({
    sql: "SELECT value FROM app_settings WHERE key = 'settings' AND user_id = ?;",
    args: [userId],
  });
  let currentSettings = {};
  if (res.rows && res.rows.length > 0) {
    currentSettings = safeJsonParse(res.rows[0].value, {});
  }
  currentSettings.cashBalance = Math.max(0, Number(cashBalance) || 0);
  await db.execute({
    sql: "INSERT OR REPLACE INTO app_settings (key, value, user_id) VALUES ('settings', ?, ?);",
    args: [JSON.stringify(currentSettings), userId],
  });
  return currentSettings.cashBalance;
}

export async function getCashBalance(userId = 'demo') {
  await initDatabase();
  const res = await db.execute({
    sql: "SELECT value FROM app_settings WHERE key = 'settings' AND user_id = ?;",
    args: [userId],
  });
  if (res.rows && res.rows.length > 0) {
    const currentSettings = safeJsonParse(res.rows[0].value, {});
    return Math.max(0, Number(currentSettings.cashBalance) || 0);
  }
  return 0;
}

export async function updateGoal(goal, userId = 'demo') {
  await initDatabase();
  await db.execute({
    sql: `INSERT OR REPLACE INTO app_settings (key, value, user_id) VALUES ('goal', ?, ?);`,
    args: [JSON.stringify(goal), userId],
  });
  return goal;
}

// 7. Khôi phục toàn bộ dữ liệu từ Backup JSON
export async function restoreAllData(fullJson, userId = 'demo') {
  await initDatabase();
  const statements = [
    { sql: 'DELETE FROM buy_orders WHERE user_id = ?;', args: [userId] },
    { sql: 'DELETE FROM sell_orders WHERE user_id = ?;', args: [userId] },
    { sql: 'DELETE FROM dividends WHERE user_id = ?;', args: [userId] },
    { sql: 'DELETE FROM watchlist WHERE user_id = ?;', args: [userId] },
    { sql: 'DELETE FROM app_settings WHERE user_id = ?;', args: [userId] },
  ];

  if (Array.isArray(fullJson.buyOrders)) {
    for (const o of fullJson.buyOrders) {
      statements.push({
        sql: `INSERT INTO buy_orders 
              (id, symbol, quantity, price, fee_pct, fee, total_cost, cost_per_share, remaining_qty, date, note, tags, user_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        args: [
          o.id,
          o.symbol,
          o.quantity,
          o.price,
          o.feePct || 0,
          o.fee || 0,
          o.totalCost,
          o.costPerShare,
          o.remainingQty,
          o.date,
          o.note || '',
          JSON.stringify(o.tags || []),
          userId,
        ],
      });
    }
  }

  if (Array.isArray(fullJson.sellOrders)) {
    for (const s of fullJson.sellOrders) {
      statements.push({
        sql: `INSERT INTO sell_orders
              (id, symbol, quantity, price, fee_pct, fee, tax_pct, tax, gross_revenue, net_revenue, total_cost, profit_loss, profit_loss_pct, matched_lots, date, note, tags, user_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        args: [
          s.id,
          s.symbol,
          s.quantity,
          s.price,
          s.feePct || 0,
          s.fee || 0,
          s.taxPct || 0.1,
          s.tax || 0,
          s.grossRevenue,
          s.netRevenue || s.totalRevenue,
          s.totalCost,
          s.profitLoss,
          s.profitLossPct,
          JSON.stringify(s.matchedLots || []),
          s.date,
          s.note || '',
          JSON.stringify(s.tags || []),
          userId,
        ],
      });
    }
  }

  if (Array.isArray(fullJson.dividends)) {
    for (const d of fullJson.dividends) {
      statements.push({
        sql: `INSERT INTO dividends
              (id, type, symbol, date, quantity, amount_per_share, tax_pct, gross_amount, tax_amount, net_amount, note, created_at, user_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        args: [
          d.id,
          d.type,
          d.symbol,
          d.date,
          d.quantity,
          d.amountPerShare || 0,
          d.taxPct || 5,
          d.grossAmount || 0,
          d.taxAmount || 0,
          d.netAmount || 0,
          d.note || '',
          d.createdAt || d.date,
          userId,
        ],
      });
    }
  }

  if (Array.isArray(fullJson.watchlist)) {
    for (const w of fullJson.watchlist) {
      statements.push({
        sql: `INSERT INTO watchlist
              (id, symbol, target_buy_price, target_sell_price, target_price, note, created_at, user_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        args: [
          w.id,
          w.symbol,
          w.targetBuyPrice || null,
          w.targetSellPrice || null,
          w.targetPrice || null,
          w.note || '',
          w.createdAt || new Date().toISOString().slice(0, 10),
          userId,
        ],
      });
    }
  }

  if (fullJson.settings && typeof fullJson.settings === 'object') {
    const { maxAllocationPct, ...cleanSettings } = fullJson.settings;
    if (Object.keys(cleanSettings).length > 0) {
      statements.push({
        sql: `INSERT OR REPLACE INTO app_settings (key, value, user_id) VALUES ('settings', ?, ?);`,
        args: [JSON.stringify(cleanSettings), userId],
      });
    }
  }
  if (fullJson.goal) {
    statements.push({
      sql: `INSERT OR REPLACE INTO app_settings (key, value, user_id) VALUES ('goal', ?, ?);`,
      args: [JSON.stringify(fullJson.goal), userId],
    });
  }

  await db.batch(statements, 'write');
  return true;
}

// 8. Sao chép dữ liệu mẫu Demo sang tài khoản cá nhân
export async function cloneDemoDataForUser(targetUserId) {
  if (!targetUserId || targetUserId === 'demo') return false;
  const demoData = await getAllData('demo');

  // Map lại buyOrderId trong matchedLots nếu có
  const buyIdMap = {};
  const clonedBuyOrders = demoData.buyOrders.map(b => {
    const newId = uuidv4();
    buyIdMap[b.id] = newId;
    return { ...b, id: newId };
  });

  const clonedSellOrders = demoData.sellOrders.map(s => {
    const newLots = (s.matchedLots || []).map(m => ({
      ...m,
      buyOrderId: buyIdMap[m.buyOrderId] || m.buyOrderId,
    }));
    return {
      ...s,
      id: uuidv4(),
      matchedLots: newLots,
    };
  });

  const clonedDividends = demoData.dividends.map(d => ({ ...d, id: uuidv4() }));
  const clonedWatchlist = demoData.watchlist.map(w => ({ ...w, id: uuidv4() }));

  await restoreAllData({
    buyOrders: clonedBuyOrders,
    sellOrders: clonedSellOrders,
    dividends: clonedDividends,
    watchlist: clonedWatchlist,
    settings: demoData.settings,
    goal: demoData.goal,
  }, targetUserId);

  return true;
}

// 9. Xoá toàn bộ dữ liệu của người dùng cụ thể (Bảo vệ tài khoản Demo)
export async function clearUserData(userId) {
  if (!userId || userId === 'demo') {
    throw new Error('Không được phép xoá dữ liệu của tài khoản Demo mặc định.');
  }
  await initDatabase();

  const statements = [
    { sql: 'DELETE FROM buy_orders WHERE user_id = ?;', args: [userId] },
    { sql: 'DELETE FROM sell_orders WHERE user_id = ?;', args: [userId] },
    { sql: 'DELETE FROM dividends WHERE user_id = ?;', args: [userId] },
    { sql: 'DELETE FROM watchlist WHERE user_id = ?;', args: [userId] },
    { sql: 'DELETE FROM app_settings WHERE user_id = ?;', args: [userId] },
  ];

  await db.batch(statements, 'write');
  return true;
}

