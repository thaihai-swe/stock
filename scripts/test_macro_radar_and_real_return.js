import assert from 'assert';
import {
  calculateSbvOmoRadar
} from '../src/utils/sbvOmoRadar.js';
import {
  calculateFisherRealReturn,
  getRealReturnBracket,
  calculateInflationAdjustedMetrics
} from '../src/utils/inflationAdjuster.js';

console.log('🧪 BẮT ĐẦU KIỂM THỬ: SBV OMO RADAR & INFLATION REAL RETURN ENGINES\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message);
  }
}

// -------------------------------------------------------------
// NHÓM 1: ĐỘNG CƠ RADAR SBV OMO & LIÊN NGÂN HÀNG
// -------------------------------------------------------------
console.log('--- PHÂN HỆ 1: SBV OMO & INTERBANK RADAR ---');

runTest('1.1. Tính toán chuẩn xác chênh lệch lãi suất (Spread = ON - SBV Refinancing)', () => {
  const mockMacro = {
    macro: {
      interbankOvernight: 6.47,
      sbvRefinancingRate: 4.50,
      usdVndRate: 25894,
      creditGrowthYoY: 12.0
    }
  };
  const result = calculateSbvOmoRadar(mockMacro);
  assert.strictEqual(result.interbankSpread, 1.97);
  assert.strictEqual(result.isSpreadElevated, true);
  assert.strictEqual(result.postureKey, 'TIGHTENING');
  assert.ok(result.compositeStressScore >= 66);
  assert.ok(result.aiDiagnosis != null);
  assert.strictEqual(result.aiDiagnosis.liquidityPosture, 'TIGHTENING');
});

runTest('1.2. Nhận diện chính xác kịch bản tiền rẻ dồi dào (FLUSH)', () => {
  const mockMacro = {
    macro: {
      interbankOvernight: 1.5,
      sbvRefinancingRate: 4.5,
      usdVndRate: 24600,
      creditGrowthYoY: 14.5
    }
  };
  const result = calculateSbvOmoRadar(mockMacro);
  assert.ok(result.interbankSpread < 0);
  assert.strictEqual(result.postureKey, 'FLUSH');
  assert.ok(result.compositeStressScore <= 35);
  assert.strictEqual(result.equityStatus, 'Thuận Lợi — Tiền Rẻ Tràn Đầy');
});

runTest('1.3. Nhận diện chính xác kịch bản thanh khoản cân bằng (NEUTRAL)', () => {
  const mockMacro = {
    macro: {
      interbankOvernight: 5.0,
      sbvRefinancingRate: 4.5,
      usdVndRate: 25450,
      creditGrowthYoY: 13.0
    }
  };
  const result = calculateSbvOmoRadar(mockMacro);
  assert.strictEqual(result.postureKey, 'NEUTRAL');
  assert.ok(result.compositeStressScore > 35 && result.compositeStressScore <= 65);
});

// -------------------------------------------------------------
// NHÓM 2: ĐỘNG CƠ TỶ SUẤT THỰC FISHER & SỨC MUA
// -------------------------------------------------------------
console.log('\n--- PHÂN HỆ 2: FISHER REAL RETURN & INFLATION ADJUSTER ---');

runTest('2.1. Kiểm thử phương trình Fisher r_real = (1 + r_nom)/(1 + i_cpi) - 1', () => {
  // 15% nominal vs 5.08% CPI -> (1.15 / 1.0508) - 1 = 9.44%
  const real1 = calculateFisherRealReturn(15.0, 5.08);
  assert.strictEqual(real1, 9.44);

  // 5.5% savings vs 5.08% CPI -> (1.055 / 1.0508) - 1 = 0.40%
  const realSavings = calculateFisherRealReturn(5.5, 5.08);
  assert.strictEqual(realSavings, 0.40);

  // -10% nominal vs 5.08% CPI -> (0.90 / 1.0508) - 1 = -14.35%
  const realLoss = calculateFisherRealReturn(-10.0, 5.08);
  assert.strictEqual(realLoss, -14.35);
});

runTest('2.2. Phân loại chuẩn xác thang đánh giá sức mua (Brackets)', () => {
  assert.strictEqual(getRealReturnBracket(15.0).rating, 'OUTPERFORM');
  assert.strictEqual(getRealReturnBracket(5.0).rating, 'BEAT_INFLATION');
  assert.strictEqual(getRealReturnBracket(1.2).rating, 'PRESERVED');
  assert.strictEqual(getRealReturnBracket(-2.5).rating, 'EROSION');
});

runTest('2.3. Bóc tách hao mòn lạm phát VNĐ và cuộc đua 4 kênh tài sản', () => {
  const portfolioData = {
    totalInvested: 100000000, // 100 Triệu VNĐ
    totalGainLoss: 15000000   // Lãi danh nghĩa 15 Triệu (+15%)
  };
  const mockMacro = {
    macro: {
      inflationCpi: 5.08,
      coreInflation: 4.45
    },
    marketIndex: { ytdReturn: 12.5 },
    goldAdvisor: { ytdReturn: 18.2 }
  };

  const result = calculateInflationAdjustedMetrics(portfolioData, mockMacro);

  // Vốn 100M x 5.08% CPI = 5,080,000 VNĐ bị bào mòn
  assert.strictEqual(result.inflationDragVnd, 5080000);
  // Lãi thực tế = 15,000,000 - 5,080,000 = 9,920,000 VNĐ
  assert.strictEqual(result.realGainVnd, 9920000);
  // Real return % = 9.44%
  assert.strictEqual(result.portfolioRealReturnPct, 9.44);
  assert.strictEqual(result.bracket.rating, 'BEAT_INFLATION');

  // Kiểm tra bảng xếp hạng 4 tài sản
  assert.strictEqual(result.assetsComparison.length, 4);
  // Phải được sắp xếp theo realReturnPct giảm dần
  for (let i = 0; i < result.assetsComparison.length - 1; i++) {
    assert.ok(result.assetsComparison[i].realReturnPct >= result.assetsComparison[i + 1].realReturnPct);
  }
  // Tiết kiệm gửi ngân hàng phải có lãi thực xấp xỉ 0.40%
  const savingsAsset = result.assetsComparison.find(a => a.id === 'savings');
  assert.ok(savingsAsset != null);
  assert.strictEqual(savingsAsset.realReturnPct, 0.40);
});

console.log(`\n========================================`);
console.log(`KẾT QUẢ KIỂM THỬ: ${passedTests}/${totalTests} TESTS ĐẠT 100%`);
console.log(`========================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
