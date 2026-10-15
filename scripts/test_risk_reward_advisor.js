/**
 * scripts/test_risk_reward_advisor.js
 * Unit test kiểm thử toán học cho Cố Vấn Khóa Lãi Linh Hoạt & Thước Đo R:R (Phiên bản Đơn Giản Hóa)
 */
import assert from 'assert';
import {
  calculateSmartTrailingStop,
  calculateRiskRewardRatio,
  calculateTakeProfitGrid,
  evaluatePortfolioProtections,
  RISK_REWARD_CONFIG,
  TAKE_PROFIT_GRID_CONFIG,
} from '../src/utils/riskRewardAdvisor.js';

console.log('🧪 BẮT ĐẦU KIỂM THỬ SMART TRAILING STOP & RISK-REWARD ADVISOR (SIMPLIFIED)...\n');

// 1. Kiểm thử Cấu hình Mặc định
console.log('Test 1: Kiểm thử Cấu hình Hằng số');
assert.strictEqual(RISK_REWARD_CONFIG.defaultInitialStopLossPct, 7.0);
assert.strictEqual(RISK_REWARD_CONFIG.breakevenTriggerPct, 6.0);
assert.strictEqual(RISK_REWARD_CONFIG.tier1ProfitTriggerPct, 15.0);
assert.strictEqual(RISK_REWARD_CONFIG.superProfitTriggerPct, 30.0);
console.log('✅ Test 1 PASS: Cấu hình hằng số chuẩn xác.\n');

// 2. Kiểm thử 4 Chế Độ Kỷ Luật Thực Tế
console.log('Test 2: Kiểm thử 4 Chế Độ Kỷ Luật Thực Tế (STOP_LOSS, BREAKEVEN, LOCK_PROFIT_1, LOCK_PROFIT_2)');
const cost = 20000;

// Case 2a: STOP_LOSS (Đang lỗ hoặc lãi nhẹ < +6%)
const tLoss = calculateSmartTrailingStop({ avgCost: cost, marketPrice: 19400 }); // Lỗ -3%
assert.strictEqual(tLoss.mode, 'STOP_LOSS');
assert.strictEqual(tLoss.stopPrice, Math.round(cost * 0.93)); // 18600đ
assert.strictEqual(tLoss.lockedProfitPerShare, 0, 'Đang lỗ thì tuyệt đối không có lãi đã khóa!');
assert.strictEqual(tLoss.isTriggered, false);
assert.strictEqual(tLoss.urgency, 'SAFE');
console.log('  - Chế độ 1 (Cắt Lỗ Kỷ Luật -7%): PASS (Lãi khóa = 0đ)');

// Case 2b: BREAKEVEN (Lãi từ +6% đến < +15%)
const tBe = calculateSmartTrailingStop({ avgCost: cost, marketPrice: 22000 }); // Lãi +10%
assert.strictEqual(tBe.mode, 'BREAKEVEN');
assert(tBe.stopPrice >= cost, `Mốc dừng phải >= giá vốn (${cost}), nhận: ${tBe.stopPrice}`);
assert.strictEqual(tBe.lockedProfitPerShare, 0, 'Hòa vốn thì rủi ro mất vốn về 0, chưa chốt lãi ròng');
assert.strictEqual(tBe.isTriggered, false);
console.log('  - Chế độ 2 (Bảo Vệ Hòa Vốn): PASS');

// Case 2c: LOCK_PROFIT_1 (Lãi từ +15% đến < +30%)
const tLock1 = calculateSmartTrailingStop({ avgCost: cost, marketPrice: 24000 }); // Lãi +20%
assert.strictEqual(tLock1.mode, 'LOCK_PROFIT_1');
// Floor lock là cost * 1.08 = 21600. Thị giá 24000 * 0.93 = 22320. Max = 22320.
assert(tLock1.stopPrice >= cost * 1.08, 'Mốc chặn lãi phải bảo đảm tối thiểu +8%');
assert(tLock1.lockedProfitPerShare > 0, 'Đã khóa được phần lãi chắc chắn');
assert.strictEqual(tLock1.isTriggered, false);
console.log(`  - Chế độ 3 (Khóa Lãi Bậc 1): PASS (Lãi khóa: +${tLock1.lockedProfitPerShare.toLocaleString()}đ/CP)`);

// Case 2d: LOCK_PROFIT_2 (Siêu Lãi >= +30%)
const tLock2 = calculateSmartTrailingStop({ avgCost: cost, marketPrice: 30000 }); // Lãi +50%
assert.strictEqual(tLock2.mode, 'LOCK_PROFIT_2');
// Siết -6% từ thị giá = 30000 * 0.94 = 28200
assert.strictEqual(tLock2.stopPrice, 28200);
assert(tLock2.lockedProfitPerShare > 0);
console.log('  - Chế độ 4 (Khóa Lãi Siêu Chu Kỳ): PASS');
console.log('✅ Test 2 PASS: 4 chế độ kỷ luật hoạt động chuẩn xác.\n');

// 3. Kiểm thử Đèn Tín Hiệu (Chạm mức dừng / Cảnh báo / An toàn)
console.log('Test 3: Kiểm thử Đèn Tín Hiệu');
// TH1: Chạm mức cắt lỗ (Giá rơi thủng -7%)
const trigLoss = calculateSmartTrailingStop({ avgCost: cost, marketPrice: 18500 }); // Stop = 18600
assert.strictEqual(trigLoss.isTriggered, true);
assert.strictEqual(trigLoss.urgency, 'TRIGGERED');
assert.strictEqual(trigLoss.statusText, '🚨 Chạm mức Cắt Lỗ');

// TH2: Gần chạm mức cắt lỗ (Cách <= 2.5%)
const warnLoss = calculateSmartTrailingStop({ avgCost: cost, marketPrice: 18900 }); // Cách 18600: +1.58%
assert.strictEqual(warnLoss.isWarning, true);
assert.strictEqual(warnLoss.statusText, '⚠️ Gần chạm Cắt Lỗ');

// TH3: An toàn
const safeLoss = calculateSmartTrailingStop({ avgCost: cost, marketPrice: 19800 });
assert.strictEqual(safeLoss.isTriggered, false);
assert.strictEqual(safeLoss.isWarning, false);
assert.strictEqual(safeLoss.statusText, '🟢 An toàn');
console.log('✅ Test 3 PASS: Đèn Tín Hiệu phản ứng chính xác.\n');

// 4. Kiểm thử Thước Đo Tỷ Lệ Thưởng / Rủi Ro (R:R)
console.log('Test 4: Kiểm thử Thước Đo Tỷ Lệ Thưởng / Rủi Ro (R:R)');
// Kèo Vàng: Target 30000 (+50%), Stop 19000 (-5%), Current 20000 -> R:R capped max 10.0:1
const rrGold = calculateRiskRewardRatio({ marketPrice: 20000, targetPrice: 30000, stopPrice: 19000 });
assert.strictEqual(rrGold.rating, 'EXCELLENT');
assert.strictEqual(rrGold.ratio, 10.0);

// Kèo Thực Tế: Upside 24000 (Target +20%), Stop 18600 (-7%), Current 20000
// Upside = 4000, Downside = 1400 => R:R = 4000 / 1400 = 2.85 -> 2.9 : 1
const rrReal = calculateRiskRewardRatio({ marketPrice: 20000, targetPrice: 24000, stopPrice: 18600 });
assert.strictEqual(rrReal.rating, 'GOOD');
assert.strictEqual(rrReal.ratio, 2.9);

// Kèo Đã Thủng Mức Dừng: Stop 20500 > Current 20000
const rrBroken = calculateRiskRewardRatio({ marketPrice: 20000, targetPrice: 25000, stopPrice: 20500 });
assert.strictEqual(rrBroken.ratio, 0);
assert.strictEqual(rrBroken.rating, 'POOR');
console.log('✅ Test 4 PASS: Thước Đo R:R không còn sinh số ảo 127:1.\n');

// 5. Kiểm thử Tái Hiện Danh Mục Người Dùng (DXG, PNJ, HPG, FUEVFVND, E1VFVN30)
console.log('Test 5: Tái Hiện Chính Xác Danh Mục Người Dùng (Fix Lỗi Lãi Ảo +17.6 Tr & Báo Động Giả 5 Mã)');
const userPortfolio = [
  { symbol: 'DXG', totalQty: 1000, avgCost: 10314 },
  { symbol: 'PNJ', totalQty: 100, avgCost: 97940 },
  { symbol: 'HPG', totalQty: 1000, avgCost: 26732 },
  { symbol: 'FUEVFVND', totalQty: 500, avgCost: 37172 },
  { symbol: 'E1VFVN30', totalQty: 500, avgCost: 26500 },
];

const userPrices = {
  DXG: { price: 10250 },      // -0.62%
  PNJ: { price: 97800 },      // -0.14%
  HPG: { price: 25800 },      // -3.49%
  FUEVFVND: { price: 36000 }, // -3.15%
  E1VFVN30: { price: 25800 }, // -2.64%
};

const portResult = evaluatePortfolioProtections({
  portfolio: userPortfolio,
  marketPrices: userPrices,
});

console.log('Kết Quả Đánh Giá Danh Mục Người Dùng:');
console.log(`  - Tổng Tiền Lãi Đã Khóa: ${portResult.summary.totalLockedProfit.toLocaleString()}đ (Kỳ vọng: 0đ)`);
console.log(`  - Số mã chạm dừng (Triggered): ${portResult.summary.triggeredCount} mã (Kỳ vọng: 0 mã)`);
console.log(`  - Số mã an toàn (Safe): ${portResult.summary.safeCount} mã (Kỳ vọng: 5 mã)`);
console.log(`  - Lãi/lỗ tạm tính thực tế: ${portResult.summary.totalCurrentUnrealizedPL.toLocaleString()}đ`);
console.log(`  - R:R Trung bình: ${portResult.summary.avgPortfolioRR}`);

// Kiểm tra tính trung thực của thuật toán mới:
assert.strictEqual(portResult.summary.totalLockedProfit, 0, 'Tuyệt đối không hiển thị lãi khóa ảo khi cả 5 mã chưa có lãi!');
assert.strictEqual(portResult.summary.triggeredCount, 0, 'Không được báo động giả 5 mã chạm Trailing Stop!');
assert.strictEqual(portResult.summary.safeCount, 5, 'Tất cả 5 mã đều đang an toàn trên mốc cắt lỗ -7%!');
assert.strictEqual(portResult.summary.hasActionRequired, false, 'Không đòi hỏi hành động khẩn cấp vô lý!');

// Kiểm tra chi tiết từng mã
portResult.items.forEach((item) => {
  assert.strictEqual(item.mode, 'STOP_LOSS');
  assert.strictEqual(item.statusText, '🟢 An toàn');
  assert(item.stopPrice < item.marketPrice, `Mốc cắt lỗ (${item.stopPrice}) phải thấp hơn thị giá (${item.marketPrice})`);
});

console.log('✅ Test 5 PASS: Đã sửa triệt để lỗi logic. Toàn bộ 5 mã đều an toàn và số liệu trung thực 100%!\n');

// 6. Kiểm thử Lưới Chốt Lời Khoa Học 3 Tầng (Cấu Hình Động từ JSON)
console.log('Test 6: Kiểm thử Lưới Chốt Lời Khoa Học 3 Tầng (Cấu Hình Động, Tuyệt Đối Không Fix Cứng)');
assert.strictEqual(TAKE_PROFIT_GRID_CONFIG.tier1RatioPct, 30.0, 'Tầng 1 tỷ trọng phải là 30% từ JSON');
assert.strictEqual(TAKE_PROFIT_GRID_CONFIG.tier2RatioPct, 40.0, 'Tầng 2 tỷ trọng phải là 40% từ JSON');
assert.strictEqual(TAKE_PROFIT_GRID_CONFIG.tier3RatioPct, 30.0, 'Tầng 3 tỷ trọng phải là 30% từ JSON');
assert.strictEqual(TAKE_PROFIT_GRID_CONFIG.tiers.length, 3, 'Phải có 3 tầng cấu hình siêu dữ liệu');

// Case 6a: Tính toán chuẩn cho 1000 CP, Giá vốn 20.000đ, Fair Value 30.000đ, Thị giá 24.000đ
const gridStandard = calculateTakeProfitGrid({
  avgCost: 20000,
  marketPrice: 24000,
  totalQty: 1000,
  fairValue: 30000,
});

assert.strictEqual(gridStandard.fairValue, 30000);
assert.strictEqual(gridStandard.tiers.length, 3);

// Tầng 1: Target = max(20000*1.15, 30000*0.88) = max(23000, 26400) = 26400đ
assert.strictEqual(gridStandard.tiers[0].targetPrice, 26400);
assert.strictEqual(gridStandard.tiers[0].suggestedQty, 300, 'Tầng 1 gợi ý bán 30% = 300 cp');
assert.strictEqual(gridStandard.tiers[0].suggestedRatioPct, 30);
assert.strictEqual(gridStandard.tiers[0].isReached, false, 'Giá 24000 chưa đạt 26400');

// Tầng 2: Target = 30000đ (Fair Value)
assert.strictEqual(gridStandard.tiers[1].targetPrice, 30000);
assert.strictEqual(gridStandard.tiers[1].suggestedQty, 400, 'Tầng 2 gợi ý bán 40% = 400 cp');
assert.strictEqual(gridStandard.tiers[1].suggestedRatioPct, 40);

// Tầng 3: Target = 30000 * 1.20 = 36000đ
assert.strictEqual(gridStandard.tiers[2].targetPrice, 36000);
assert.strictEqual(gridStandard.tiers[2].suggestedQty, 300, 'Tầng 3 giữ lại 30% = 300 cp');
assert.strictEqual(gridStandard.tiers[2].suggestedRatioPct, 30);

// Bảo đảm tổng khối lượng khớp 100%
const sumQty = gridStandard.tiers[0].suggestedQty + gridStandard.tiers[1].suggestedQty + gridStandard.tiers[2].suggestedQty;
assert.strictEqual(sumQty, 1000, `Tổng khối lượng 3 tầng (${sumQty}) phải bằng đúng 1000 cp`);

// Case 6b: Kiểm thử Cấu hình Động Tùy Chỉnh (Custom Override: 25% - 50% - 25%)
const customConfig = {
  tier1RatioPct: 25.0,
  tier1MinProfitPct: 10.0,
  tier1FairValueDiscountPct: 15.0,
  tier2RatioPct: 50.0,
  tier2FairValueRatio: 1.0,
  tier3RatioPct: 25.0,
  tier3BubblePremiumPct: 30.0,
  defaultFallbackGainPct: 20.0,
};

const gridCustom = calculateTakeProfitGrid({
  avgCost: 20000,
  marketPrice: 28000,
  totalQty: 2000,
  fairValue: 30000,
  config: customConfig,
});

assert.strictEqual(gridCustom.tiers[0].suggestedQty, 500, 'Custom Tầng 1: 25% của 2000 = 500 cp');
assert.strictEqual(gridCustom.tiers[1].suggestedQty, 1000, 'Custom Tầng 2: 50% của 2000 = 1000 cp');
assert.strictEqual(gridCustom.tiers[2].suggestedQty, 500, 'Custom Tầng 3: 25% của 2000 = 500 cp');
assert.strictEqual(gridCustom.tiers[2].targetPrice, 39000, 'Custom Tầng 3: 30000 * 1.3 = 39000đ');

// Case 6c: Kiểm thử Tích hợp Danh mục Người dùng
portResult.items.forEach((item) => {
  assert(item.takeProfitGrid, `Mã ${item.symbol} phải có takeProfitGrid`);
  assert.strictEqual(item.takeProfitGrid.tiers.length, 3);
  const totalItemQty = item.takeProfitGrid.tiers.reduce((sum, t) => sum + t.suggestedQty, 0);
  assert.strictEqual(totalItemQty, item.totalQty, `Mã ${item.symbol}: Tổng khối lượng 3 tầng (${totalItemQty}) phải bằng ${item.totalQty}`);
});

// Case 6d: Kiểm thử Tính Tương Thích Ngược & Aliases Thuộc Tính (Tránh Lỗi TypeError t.sharesToSell)
const gridCompat = calculateTakeProfitGrid({
  avgCost: 10000,
  currentPrice: 12000, // dùng alias currentPrice
  consensusFairValue: 15000, // dùng alias consensusFairValue
  totalQty: 500,
});

assert.strictEqual(gridCompat.fairValue, 15000, 'Phải nhận diện được consensusFairValue alias');
gridCompat.tiers.forEach((t) => {
  assert(t.sharesToSell !== undefined, 't.sharesToSell alias phải tồn tại');
  assert.strictEqual(t.sharesToSell, t.suggestedQty, 'sharesToSell phải bằng suggestedQty');
  assert(t.sellPct !== undefined, 't.sellPct alias phải tồn tại');
  assert.strictEqual(t.sellPct, t.suggestedRatioPct, 'sellPct phải bằng suggestedRatioPct');
  assert(t.gainPct !== undefined, 't.gainPct alias phải tồn tại');
  assert.strictEqual(t.gainPct, t.targetGainPct, 'gainPct phải bằng targetGainPct');
  assert(t.estimatedProfitVnd !== undefined, 't.estimatedProfitVnd alias phải tồn tại');
  assert(typeof t.sharesToSell.toLocaleString === 'function', 'sharesToSell phải gọi được .toLocaleString()');
});

console.log('✅ Test 6 PASS: Lưới Chốt Lời 3 Tầng hoạt động chuẩn xác từ cấu hình động JSON và bảo đảm tương thích alias 100%!\n');

console.log('🎉 TẤT CẢ 6 BÀI KIỂM THỬ ĐÃ PASS 100% THÀNH CÔNG!');

