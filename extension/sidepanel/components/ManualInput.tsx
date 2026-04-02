import React, { useState } from "react";

interface ManualInputProps {
  onAnalyze: (message: string, marketplace: string) => void;
  onBack: () => void;
  initialMessage?: string;
  initialMarketplace?: string;
}

const MIN_LENGTH = 15;

export function ManualInput({
  onAnalyze,
  onBack,
  initialMessage = "",
  initialMarketplace = "ozon",
}: ManualInputProps) {
  const [message, setMessage] = useState(initialMessage);
  const [marketplace, setMarketplace] = useState(initialMarketplace);

  const trimmed = message.trim();
  const isValid = trimmed.length >= MIN_LENGTH;
  const charsLeft = MIN_LENGTH - trimmed.length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      onAnalyze(trimmed, marketplace);
    }
  };

  return (
    <div className="p-4">
      {/* Back nav */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600 transition-colors mb-4"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Назад
      </button>

      <h2 className="text-base font-semibold text-slate-800 mb-1">
        Ручной ввод
      </h2>
      <p className="text-xs text-slate-400 mb-5">
        Вставьте сообщение покупателя для анализа
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Marketplace selector */}
        <div>
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">
            Маркетплейс
          </label>
          <select
            value={marketplace}
            onChange={(e) => setMarketplace(e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all"
          >
            <option value="ozon">Ozon</option>
            <option value="wb">Wildberries</option>
            <option value="yandex">Яндекс Маркет</option>
            <option value="other">Другое</option>
          </select>
        </div>

        {/* Message textarea */}
        <div>
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">
            Сообщение покупателя
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            style={{ minHeight: "140px" }}
            placeholder="Например: Здравствуйте, посудомойка перестала греть воду, хочу оформить возврат..."
            className="w-full px-3 py-3 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none resize-y transition-all leading-relaxed"
          />
          {/* Character hint */}
          {trimmed.length > 0 && !isValid && (
            <p className="mt-1 text-[11px] text-amber-500">
              Ещё {charsLeft} {charsLeft === 1 ? "символ" : charsLeft < 5 ? "символа" : "символов"}
            </p>
          )}
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={!isValid}
          className={`w-full px-4 py-3 text-sm font-semibold rounded-lg transition-all ${
            isValid
              ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          }`}
        >
          Анализировать
        </button>
      </form>
    </div>
  );
}
