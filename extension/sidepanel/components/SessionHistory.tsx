import React, { useState, useMemo, useCallback } from "react";
import { RiskBadge } from "./RiskBadge";

const TYPE_LABELS: Record<string, string> = {
  question: "Вопрос",
  claim: "Претензия",
};

const CATEGORY_LABELS: Record<string, string> = {
  specs: "Характеристики",
  compatibility: "Совместимость",
  completeness: "Комплектация",
  warranty: "Гарантия",
  delivery: "Доставка",
  defect: "Дефект",
  malfunction: "Неисправность",
  mismatch: "Несоответствие",
  incomplete: "Некомплект",
  delivery_delay: "Просрочка",
  return_demand: "Возврат",
  court_threat: "Угроза суда",
  store_block: "Блокировка",
  other: "Другое",
};

const MP_LABELS: Record<string, string> = {
  ozon: "Ozon",
  wb: "WB",
  yandex: "Яндекс",
  other: "Другое",
};

interface HistoryEntry {
  id: string;
  timestamp: number;
  marketplace: string;
  messagePreview: string;
  fullMessage?: string;
  type: "question" | "claim";
  category: string;
  risk_level: "low" | "medium" | "high";
  response: any;
}

interface SessionHistoryProps {
  history: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
  onBack: () => void;
  onClear: () => void;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function SessionHistory({ history, onSelect, onBack, onClear }: SessionHistoryProps) {
  const [search, setSearch] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return history;
    const q = search.toLowerCase();
    return history.filter((e) => {
      const text = (e.fullMessage || e.messagePreview).toLowerCase();
      const cat = (CATEGORY_LABELS[e.category] || e.category).toLowerCase();
      const mp = (MP_LABELS[e.marketplace] || e.marketplace).toLowerCase();
      return text.includes(q) || cat.includes(q) || mp.includes(q);
    });
  }, [history, search]);

  const handleClear = useCallback(() => {
    onClear();
    setShowConfirm(false);
  }, [onClear]);

  const handleExport = useCallback(() => {
    if (history.length === 0) return;

    const lines: string[] = [
      "ЮрКонтур Assistant — История обращений",
      `Экспорт: ${new Date().toLocaleString("ru-RU")}`,
      `Всего записей: ${history.length}`,
      "==================================================",
      "",
    ];

    for (const entry of history) {
      lines.push(`Дата: ${formatDate(entry.timestamp)} ${formatTime(entry.timestamp)}`);
      lines.push(`Тип: ${TYPE_LABELS[entry.type] || entry.type}`);
      lines.push(`Категория: ${CATEGORY_LABELS[entry.category] || entry.category}`);
      lines.push(`Маркетплейс: ${MP_LABELS[entry.marketplace] || entry.marketplace}`);
      if (entry.type === "claim") {
        lines.push(`Риск: ${entry.risk_level}`);
      }
      lines.push(`Сообщение: ${entry.fullMessage || entry.messagePreview}`);
      if (entry.response?.short_reply) {
        lines.push(`Ответ: ${entry.response.short_reply}`);
      }
      lines.push("--------------------------------------------------");
      lines.push("");
    }

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `yurkontour-history-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [history]);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1 rounded hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-base font-semibold text-slate-800">
            История
            {history.length > 0 && (
              <span className="text-xs text-slate-400 font-normal ml-1.5">
                ({history.length})
              </span>
            )}
          </h2>
        </div>
        <div className="flex items-center gap-1">
          {history.length > 0 && (
            <>
              <button
                onClick={handleExport}
                className="p-1.5 rounded-md hover:bg-slate-100 transition-colors"
                title="Экспорт в .txt"
              >
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              <button
                onClick={() => setShowConfirm(true)}
                className="text-xs text-slate-400 hover:text-red-500 transition-colors px-1.5"
              >
                Очистить
              </button>
            </>
          )}
        </div>
      </div>

      {/* Clear confirmation */}
      {showConfirm && (
        <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-xs text-red-600 mb-2">Удалить всю историю? Это действие необратимо.</p>
          <div className="flex gap-2">
            <button
              onClick={handleClear}
              className="px-3 py-1 bg-red-500 text-white text-xs rounded-md hover:bg-red-600 transition-colors"
            >
              Удалить
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="px-3 py-1 bg-white border border-slate-200 text-slate-600 text-xs rounded-md hover:bg-slate-50 transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      {history.length > 0 && (
        <div className="mb-3">
          <div className="relative">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по тексту, категории..."
              className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder-slate-400"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {search && (
            <p className="text-[10px] text-slate-400 mt-1">
              Найдено: {filtered.length} из {history.length}
            </p>
          )}
        </div>
      )}

      {/* History entries */}
      {history.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">
          Нет записей в текущей сессии
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">
          Ничего не найдено
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => (
            <button
              key={entry.id}
              onClick={() => onSelect(entry)}
              className="w-full text-left bg-white rounded-lg border border-slate-200 p-3 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                      entry.type === "claim"
                        ? "bg-red-50 text-red-600"
                        : "bg-blue-50 text-blue-600"
                    }`}
                  >
                    {TYPE_LABELS[entry.type]}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {MP_LABELS[entry.marketplace] || entry.marketplace}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">
                  {formatTime(entry.timestamp)}
                </span>
              </div>
              <p className="text-xs text-slate-600 line-clamp-2 mb-1.5">
                {entry.messagePreview}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500">
                  {CATEGORY_LABELS[entry.category] || entry.category}
                </span>
                {entry.type === "claim" && (
                  <RiskBadge level={entry.risk_level} className="text-[10px]" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
