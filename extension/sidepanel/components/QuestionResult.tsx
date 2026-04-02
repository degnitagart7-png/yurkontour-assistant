import React, { useState, useCallback, useRef } from "react";
import { CopyButton } from "./CopyButton";
import { InsertButton } from "./InsertButton";

const CATEGORY_LABELS: Record<string, string> = {
  specs: "Характеристики",
  compatibility: "Совместимость",
  completeness: "Комплектация",
  warranty: "Гарантия",
  delivery: "Доставка",
  other: "Другое",
};

interface QuestionResultProps {
  result: {
    category: string;
    confidence: number;
    short_reply: string;
    clarifying_questions: string[];
  };
  onReset: () => void;
  onRegenerate: () => void;
}

export function QuestionResult({ result, onReset, onRegenerate }: QuestionResultProps) {
  const [editedReply, setEditedReply] = useState(result.short_reply);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const categoryLabel = CATEGORY_LABELS[result.category];
  const showCategory = result.category !== "other" && categoryLabel;

  const getReplyText = useCallback(() => editedReply, [editedReply]);

  return (
    <div className="p-4 space-y-4">
      {/* Back navigation */}
      <button
        onClick={onReset}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Новый анализ
      </button>

      {/* Low confidence warning */}
      {result.confidence < 0.5 && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <span className="text-base leading-none mt-0.5">&#9888;&#65039;</span>
          <p className="text-xs text-amber-700 font-medium">
            Требует внимания оператора (низкая уверенность)
          </p>
        </div>
      )}

      {/* Type badge */}
      <div className="flex items-center gap-2">
        <span className="px-3 py-1 text-sm font-semibold bg-blue-50 text-blue-700 rounded-full border border-blue-100">
          Вопрос о товаре
        </span>
        {showCategory && (
          <span className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-full">
            {categoryLabel}
          </span>
        )}
      </div>

      {/* Editable reply */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-slate-700">Готовый ответ</h3>
          <div className="flex gap-1.5">
            <button
              onClick={onRegenerate}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-500 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
              title="Сгенерировать заново"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
        <textarea
          ref={textareaRef}
          value={editedReply}
          onChange={(e) => setEditedReply(e.target.value)}
          rows={5}
          className="w-full text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 focus:border-blue-300 focus:ring-1 focus:ring-blue-200 outline-none resize-y"
        />
        <div className="flex items-center justify-between mt-2">
          <CopyButton text={editedReply} />
          <InsertButton getText={getReplyText} />
        </div>
      </div>

      {/* Clarifying questions */}
      {result.clarifying_questions.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            Уточняющие вопросы
          </h3>
          <div className="space-y-2">
            {result.clarifying_questions.map((q, i) => (
              <div key={i} className="flex items-start justify-between gap-2 py-1.5">
                <span className="text-sm text-slate-600">
                  {i + 1}. {q}
                </span>
                <CopyButton text={q} label="" className="shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
