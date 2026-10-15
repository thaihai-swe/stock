export function matchSellOrder(symbol, quantity, sellPrice, buyOrders, sellFeePct = 0.1, matchMethod = 'lowest') {
  // Sắp xếp các lô mua còn hàng theo phương thức khớp lệnh được chọn
  const available = buyOrders
    .filter(b => b.symbol === symbol.toUpperCase() && b.remainingQty > 0)
    .sort((a, b) => {
      const costA = a.costPerShare || a.price;
      const costB = b.costPerShare || b.price;
      if (matchMethod === 'highest') {
        // Giá vốn cao nhất trước (giảm dần)
        return costB - costA;
      } else if (matchMethod === 'fifo') {
        // Mua trước bán trước (theo ngày mua)
        return new Date(a.date) - new Date(b.date);
      }
      // Mặc định: Giá vốn thấp nhất trước (tăng dần)
      return costA - costB;
    });

  const totalAvailable = available.reduce((sum, b) => sum + b.remainingQty, 0);
  if (totalAvailable < quantity) {
    throw new Error(
      `Không đủ số lượng. Hiện tại có ${totalAvailable} cp ${symbol} có thể bán.`
    );
  }

  let remaining = quantity;
  const matchedLots = [];
  let totalCost = 0;

  for (const lot of available) {
    if (remaining <= 0) break;
    const used = Math.min(lot.remainingQty, remaining);
    const unitCost = lot.costPerShare || lot.price;
    const lotCost = used * unitCost;

    matchedLots.push({
      buyOrderId: lot.id,
      quantityUsed: used,
      buyPrice: lot.price,
      buyFeePct: lot.feePct || 0,
      unitCost: Math.round(unitCost * 100) / 100,
      buyDate: lot.date,
    });
    totalCost += lotCost;
    remaining -= used;
  }

  const grossRevenue = quantity * sellPrice;
  const sellFee = Math.round(grossRevenue * (sellFeePct / 100));
  const totalRevenue = grossRevenue - sellFee; // Tiền thực nhận
  const netPrice = quantity > 0 ? (totalRevenue / quantity) : sellPrice;
  const profitLoss = totalRevenue - totalCost;
  const profitLossPct = totalCost > 0 ? parseFloat(((profitLoss / totalCost) * 100).toFixed(2)) : 0;

  return {
    matchedLots,
    totalCost: Math.round(totalCost),
    grossRevenue: Math.round(grossRevenue),
    netPrice: Math.round(netPrice * 100) / 100,
    fee: sellFee,
    feePct: sellFeePct,
    totalRevenue: Math.round(totalRevenue),
    netRevenue: Math.round(totalRevenue),
    profitLoss: Math.round(profitLoss),
    profitLossPct,
    matchMethod,
  };
}

export function computePortfolio(buyOrders) {
  const map = {};
  for (const o of buyOrders) {
    if (o.remainingQty <= 0) continue;
    if (!map[o.symbol]) map[o.symbol] = { symbol: o.symbol, totalQty: 0, totalCost: 0, lots: [] };
    const unitCost = o.costPerShare || o.price;
    map[o.symbol].totalQty += o.remainingQty;
    map[o.symbol].totalCost += o.remainingQty * unitCost;
    map[o.symbol].lots.push({
      id: o.id,
      qty: o.remainingQty,
      price: o.price,
      costPerShare: unitCost,
      date: o.date,
    });
  }

  return Object.values(map).map(p => {
    const avgCost = p.totalQty > 0 ? p.totalCost / p.totalQty : 0;
    // Giá hòa vốn tính theo phí bán mặc định 0.1% => breakeven = avgCost / (1 - 0.001)
    const breakEvenPrice = avgCost > 0 ? Math.round(avgCost / 0.999) : 0;
    return {
      ...p,
      totalCost: Math.round(p.totalCost),
      avgCost,
      breakEvenPrice,
    };
  });
}

export function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
