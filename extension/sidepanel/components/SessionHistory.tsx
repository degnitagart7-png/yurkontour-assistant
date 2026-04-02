import React from "react";
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

export function SessionHistory({ history, onSelect, onBack, onClear }: SessionHistoryProps) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1 rounded hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-base font-semibold text-slate-800">История</h2>
        </div>
        {history.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-slate-400 hover:text-red-500 transition-colors"
          >
            Очистить
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">
          Нет записей в текущей сессии
        </p>
      ) : (
        <div className="space-y-2">
          {history.map((entry) => (
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
