import React from 'react';

function formatVND(val) {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return Number(val).toLocaleString('vi-VN') + ' đ';
}

function getEventUrl(ev, symbol) {
  if (ev?.link && ev.link !== '#' && ev.link.startsWith('http')) {
    return ev.link;
  }
  const query = `${symbol || ''} ${ev?.type || ''} ${ev?.content || ''}`.trim();
  return `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=vi`;
}

export default function ShareholdersAndEventsView({ financials, selectedSymbol }) {
  if (!financials) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ── LỊCH SỬ CỔ TỨC & SỰ KIỆN DOANH NGHIỆP ── */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 sm:p-6 border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
            <span>🎁</span> Lịch Sử Chi Trả Cổ Tức & Sự Kiện Quyền
          </div>
          <h4 className="text-base font-bold text-gray-900 dark:text-white mt-0.5">
            Các Đợt Cổ Tức Tiền Mặt, Thưởng Cổ Phiếu & Quyền Mua — {selectedSymbol}
          </h4>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-96 overflow-y-auto pr-1">
          {Array.isArray(financials.corporateEvents) && financials.corporateEvents.length > 0 ? (
            financials.corporateEvents.map((ev, idx) => {
              const eventUrl = getEventUrl(ev, selectedSymbol);
              return (
                <a
                  key={idx}
                  href={eventUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block py-3 text-xs space-y-1.5 hover:bg-gray-50/80 dark:hover:bg-gray-700/30 px-2.5 -mx-2.5 rounded-xl transition-all group no-underline cursor-pointer"
                  title={`Xem chi tiết sự kiện / thông báo gốc của ${selectedSymbol}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-1.5">
                      <span>{ev.type}</span>
                      <svg className="w-3 h-3 text-gray-400 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </span>
                    <span className="text-[11px] text-gray-400 font-mono">{ev.date}</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{ev.content}</p>
                  <div className="flex items-center justify-between pt-0.5">
                    <div className="flex items-center gap-3 text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                      {ev.ratio && <span>Tỷ lệ: {ev.ratio}</span>}
                      {ev.value && <span>Giá trị: {formatVND(ev.value)}</span>}
                    </div>
                    <span className="text-[10px] text-indigo-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                      Xem công bố gốc ↗
                    </span>
                  </div>
                </a>
              );
            })
          ) : (
            <div className="py-8 text-center text-xs text-gray-400">
              Chưa có dữ liệu sự kiện doanh nghiệp gần đây cho {selectedSymbol}.
            </div>
          )}
        </div>
      </div>

      {/* ── CƠ CẤU CỔ ĐÔNG LỚN & BAN LÃNH ĐẠO ── */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 sm:p-6 border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <span>👥</span> Cơ Cấu Cổ Đông Lớn & Ban Lãnh Đạo
          </div>
          <h4 className="text-base font-bold text-gray-900 dark:text-white mt-0.5">
            Tỷ Lệ Sở Hữu Khối Ngoại, Nhà Nước & Cổ Đông Chiến Lược — {selectedSymbol}
          </h4>
        </div>

        <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
          {Array.isArray(financials.shareholders) && financials.shareholders.length > 0 ? (
            financials.shareholders.map((sh, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-gray-800 dark:text-gray-200 truncate pr-2">{sh.name}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-black">{sh.percentage}%</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(2, sh.percentage || 0))}%` }}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-xs text-gray-400">
              Chưa có danh sách cổ đông lớn ghi nhận cho {selectedSymbol}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
