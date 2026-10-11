import React from 'react';

export default function DividendSustainabilityCard({ dividendSustainability, symbol }) {
  if (!dividendSustainability) return null;

  const {
    score = 5.0,
    status = 'Bình thường',
    payoutRatio = null,
    fcfPayoutRatio = null,
    consistency = null
  } = dividendSustainability;

  const isSafe = status.includes('an toàn') || status.includes('Bền vững');
  const isTrap = status.includes('Bẫy') || status.includes('Cắt giảm') || (fcfPayoutRatio != null && fcfPayoutRatio > 100);

  return (
    <div className="p-5 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xs space-y-5">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Kiểm Toán Dòng Tiền Cổ Tức
            </span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Bảo Chứng Bằng Dòng Tiền FCF
            </span>
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white mt-1">
            Độ Bền Vững Cổ Tức & Khả Năng Chi Trả Bằng Tiền Mặt Thật — {symbol}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs font-black px-3 py-1 rounded-xl uppercase inline-flex items-center gap-1.5 ${
            isSafe
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              : isTrap
              ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
          }`}>
            <span>{isSafe ? '🛡️' : isTrap ? '🚨' : '⚠️'}</span>
            <span>{status} ({score}/10)</span>
          </span>
        </div>
      </div>

      {/* ── 3 TRỤ CỘT BẢO CHỨNG CỔ TỨC ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Trụ 1: FCF Payout Ratio */}
        <div className="p-4 bg-gray-50/70 dark:bg-gray-900/40 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-1">
          <span className="text-[10px] text-gray-400 font-bold uppercase block">
            1. FCF Payout Ratio (Dòng tiền tự do)
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className={`text-xl font-black ${
              fcfPayoutRatio != null && fcfPayoutRatio <= 60
                ? 'text-emerald-600 dark:text-emerald-400'
                : fcfPayoutRatio != null && fcfPayoutRatio <= 100
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}>
              {fcfPayoutRatio != null ? `${fcfPayoutRatio}%` : '—'}
            </span>
            <span className="text-[10px] text-gray-400">
              {fcfPayoutRatio != null && fcfPayoutRatio <= 60 ? '(Rất dư dả)' : fcfPayoutRatio != null && fcfPayoutRatio <= 100 ? '(Đủ tài trợ)' : '(Thâm hụt tiền)'}
            </span>
          </div>
          <span className="text-[10px] text-gray-400 block pt-1">
            Cổ tức trả bằng tiền mặt thặng dư sau chi phí đầu tư Capex.
          </span>
        </div>

        {/* Trụ 2: Accounting Payout Ratio */}
        <div className="p-4 bg-gray-50/70 dark:bg-gray-900/40 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-1">
          <span className="text-[10px] text-gray-400 font-bold uppercase block">
            2. Payout Ratio (LNST Kế toán)
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-black text-gray-900 dark:text-white">
              {payoutRatio != null ? `${payoutRatio}%` : '—'}
            </span>
            <span className="text-[10px] text-gray-400">
              {payoutRatio != null && payoutRatio <= 70 ? '(Cân bằng)' : '(Chiếm tỷ trọng lớn)'}
            </span>
          </div>
          <span className="text-[10px] text-gray-400 block pt-1">
            Tỷ lệ lợi nhuận sau thuế dùng để chia cổ tức cho cổ đông.
          </span>
        </div>

        {/* Trụ 3: Consistency */}
        <div className="p-4 bg-gray-50/70 dark:bg-gray-900/40 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-1">
          <span className="text-[10px] text-gray-400 font-bold uppercase block">
            3. Độ Đều Đặn (Consistency Rate)
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
              {consistency != null ? `${consistency}%` : '—'}
            </span>
            <span className="text-[10px] text-gray-400">
              (Lịch sử 5 năm)
            </span>
          </div>
          <span className="text-[10px] text-gray-400 block pt-1">
            Tần suất duy trì chia cổ tức tiền mặt đều đặn qua các chu kỳ.
          </span>
        </div>
      </div>

      {/* ── CẢNH BÁO HOẶC LỜI KHUYÊN ── */}
      <div className={`p-3.5 rounded-2xl border text-xs leading-relaxed flex items-start gap-2.5 ${
        isSafe
          ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300'
          : isTrap
          ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/50 text-rose-800 dark:text-rose-300'
          : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300'
      }`}>
        <span className="text-base">{isSafe ? '💡' : isTrap ? '⚠️' : 'ℹ️'}</span>
        <div>
          <span className="font-bold">Nhận Định Chiến Lược: </span>
          {isSafe ? (
            <span>Doanh nghiệp có dòng tiền tự do FCF mạnh mẽ bảo chứng 100% cho việc chi trả cổ tức. Đây là ứng viên chất lượng cao cho danh mục đầu tư tích sản dài hạn hưởng cổ tức bền vững.</span>
          ) : isTrap ? (
            <span>Cảnh báo bẫy cổ tức (Dividend Trap): Doanh nghiệp đang chia cổ tức cao hơn dòng tiền tự do tạo ra, có thể phải vay nợ để trả cổ tức hoặc sẽ buộc phải cắt giảm cổ tức trong các kỳ tới.</span>
          ) : (
            <span>Tỷ lệ chi trả ở mức trung tính. Cần theo dõi tiến độ Capex và khả năng tạo tiền từ hoạt động kinh doanh để đảm bảo cổ tức không bị gián đoạn.</span>
          )}
        </div>
      </div>
    </div>
  );
}
