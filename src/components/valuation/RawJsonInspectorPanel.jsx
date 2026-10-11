import React, { useState } from 'react';

export default function RawJsonInspectorPanel({
  selectedSymbol,
  inspectorType,
  handleChangeInspectorType,
  rawJsonContent,
  rawJsonPath,
  copied,
  handleCopyJson,
  jsonSearchTerm,
  setJsonSearchTerm,
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-xl overflow-hidden transition-all">
      {/* ── HEADER ACCORDION ── */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-800/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-lg">
            🔍
          </span>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <span>Trình Kiểm Tra Dữ Liệu Cục Bộ</span>
              <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">
                0ms Local JSON
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold mt-0.5">
              Raw JSON Inspector — Đối Chiếu Nguồn Dữ Liệu Gốc
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <span className="text-xs text-gray-400">
            {isOpen ? 'Thu gọn' : 'Bấm để mở rộng'}
          </span>
          <span className={`text-base transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
      </div>

      {/* ── NỘI DUNG CHI TIẾT (KHI MỞ RỘNG) ── */}
      {isOpen && (
        <div className="p-5 sm:p-6 pt-0 space-y-4 border-t border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3">
            <p className="text-xs text-gray-400">
              Toàn bộ số liệu được lưu thành các file JSON trong thư mục <code className="text-emerald-400 font-mono">data/</code> để bạn đối chiếu tính chính xác và kiểm toán số liệu.
            </p>

            <button
              type="button"
              onClick={handleCopyJson}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-white/10 self-start sm:self-auto"
            >
              <span>{copied ? '✅' : '📋'}</span>
              <span>{copied ? 'Đã sao chép!' : 'Sao chép JSON'}</span>
            </button>
          </div>

          {/* Nút chọn file */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/10">
            <button
              type="button"
              onClick={() => handleChangeInspectorType('fundamentals')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                inspectorType === 'fundamentals'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5'
              }`}
            >
              📄 fundamentals_cache.json
            </button>

            <button
              type="button"
              onClick={() => handleChangeInspectorType('macro')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                inspectorType === 'macro'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5'
              }`}
            >
              🌐 macro_valuation.json
            </button>

            <button
              type="button"
              onClick={() => handleChangeInspectorType('financials')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                inspectorType === 'financials'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5'
              }`}
            >
              📊 financials/{selectedSymbol}.json
            </button>

            <button
              type="button"
              onClick={() => handleChangeInspectorType('market-history')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                inspectorType === 'market-history'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5'
              }`}
            >
              📈 market_valuation_history.json
            </button>

            <button
              type="button"
              onClick={() => handleChangeInspectorType('indicators')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                inspectorType === 'indicators'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5'
              }`}
            >
              📑 macro_indicators.json
            </button>

            {/* Ô tìm kiếm trong JSON */}
            <div className="ml-auto w-full sm:w-64 pt-2 sm:pt-0">
              <input
                type="text"
                placeholder="Tìm kiếm trong file JSON..."
                value={jsonSearchTerm}
                onChange={(e) => setJsonSearchTerm(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Đường dẫn file hiện tại */}
          {rawJsonPath && (
            <div className="text-[11px] text-gray-400 font-mono flex items-center gap-2">
              <span className="text-emerald-400 font-bold">Path:</span>
              <span>{rawJsonPath}</span>
            </div>
          )}

          {/* Khung nội dung JSON */}
          <div className="bg-black/60 rounded-2xl p-4 font-mono text-xs text-gray-300 max-h-96 overflow-y-auto border border-white/5 leading-relaxed selection:bg-indigo-600 selection:text-white">
            <pre className="whitespace-pre-wrap break-words">
              {rawJsonContent}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
