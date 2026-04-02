import React, { useState, useCallback } from "react";
import { CopyButton } from "./CopyButton";
import { InsertButton } from "./InsertButton";
import { RiskBadge } from "./RiskBadge";
import { ChecklistItem } from "./ChecklistItem";

const CLAIM_CATEGORY_LABELS: Record<string, string> = {
  defect: "Дефект товара",
  malfunction: "Неисправность",
  mismatch: "Не соответствует описанию",
  incomplete: "Некомплект",
  delivery_delay: "Просрочка доставки",
  return_demand: "Требование возврата",
  court_threat: "Угроза судом / жалобой",
  other: "Другое",
};

interface ClaimResultProps {
  result: {
    category: string;
    confidence: number;
    risk_level: "low" | "medium" | "high";
    extracted_facts: {
      order_number?: string | null;
      product: string | null;
      purchase_date: string | null;
      problem: string | null;
      customer_demand: string | null;
      risk_markers: string[];
    };
    short_reply: string;
    formal_reply: string | null;
    clarifying_questions: string[];
    missing_documents: string[];
    lawyer_summary: string | null;
    deadline_days?: string | null;
    financial_risk_estimate?: string | null;
    required_legal_actions?: string[];
  };
  onReset: () => void;
}

function buildDossier(result: ClaimResultProps["result"]): string {
  const lines: string[] = [];
  const date = new Date().toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  lines.push("═══════════════════════════════════════");
  lines.push("  ДОСЬЕ ДЛЯ ЮРИСТА — ЮрКонтур Assistant");
  lines.push("═══════════════════════════════════════");
  lines.push("");
  lines.push(`Дата формирования: ${date}`);
  lines.push(`Уровень риска: ${result.risk_level === "high" ? "ВЫСОКИЙ" : result.risk_level === "medium" ? "СРЕДНИЙ" : "НИЗКИЙ"}`);
  lines.push(`Категория: ${CLAIM_CATEGORY_LABELS[result.category] || result.category}`);
  lines.push("");

  // Chronology / Facts
  lines.push("── ХРОНОЛОГИЯ И ФАКТЫ ──");
  if (result.extracted_facts.order_number) lines.push(`  Заказ: №${result.extracted_facts.order_number}`);
  if (result.extracted_facts.product) lines.push(`  Товар: ${result.extracted_facts.product}`);
  if (result.extracted_facts.purchase_date) lines.push(`  Дата покупки: ${result.extracted_facts.purchase_date}`);
  if (result.extracted_facts.problem) lines.push(`  Проблема: ${result.extracted_facts.problem}`);
  if (result.extracted_facts.customer_demand) lines.push(`  Требование покупателя: ${result.extracted_facts.customer_demand}`);
  lines.push("");

  // Risk analysis
  if (result.extracted_facts.risk_markers.length > 0) {
    lines.push("── РИСКОВЫЕ МАРКЕРЫ ──");
    result.extracted_facts.risk_markers.forEach((m) => lines.push(`  • ${m}`));
    lines.push("");
  }

  // Legal analysis
  lines.push("── ЮРИДИЧЕСКИЙ АНАЛИЗ ──");
  if (result.deadline_days) lines.push(`  Дедлайн: ${result.deadline_days}`);
  if (result.financial_risk_estimate) lines.push(`  Финансовый риск: ${result.financial_risk_estimate}`);
  lines.push("");

  // Action plan
  if (result.required_legal_actions && result.required_legal_actions.length > 0) {
    lines.push("── ПЛАН ДЕЙСТВИЙ (ЗАЩИТА ОТ ШТРАФА 50%) ──");
    result.required_legal_actions.forEach((a, i) => lines.push(`  ${i + 1}. ${a}`));
    lines.push("");
  }

  // Missing docs
  if (result.missing_documents.length > 0) {
    lines.push("── ЗАПРОСИТЬ У ПОКУПАТЕЛЯ ──");
    result.missing_documents.forEach((d) => lines.push(`  □ ${d}`));
    lines.push("");
  }

  // Formal reply
  if (result.formal_reply) {
    lines.push("── ПРОЕКТ ОФИЦИАЛЬНОГО ОТВЕТА ──");
    lines.push(result.formal_reply);
    lines.push("");
  }

  lines.push("═══════════════════════════════════════");

  return lines.join("\n");
}

export function ClaimResult({ result, onReset }: ClaimResultProps) {
  const [editedReply, setEditedReply] = useState(result.short_reply);
  const [dossierState, setDossierState] = useState<"idle" | "copied">("idle");

  const categoryLabel = CLAIM_CATEGORY_LABELS[result.category];
  const showCategory = result.category !== "other" && categoryLabel;

  const getReplyText = useCallback(() => editedReply, [editedReply]);

  const handleGenerateDossier = async () => {
    const dossier = buildDossier(result);
    try {
      await navigator.clipboard.writeText(dossier);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = dossier;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setDossierState("copied");
    setTimeout(() => setDossierState("idle"), 2500);
  };

  return (
    <div className="p-4 space-y-4">
      {/* High risk banner */}
      {result.risk_level === "high" && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <span className="text-xl leading-none">&#128680;</span>
          </div>
          <div>
            <p className="text-sm font-bold text-red-800">ТРЕБУЕТСЯ ЮРИСТ</p>
            <p className="text-xs text-red-600 mt-0.5">
              Высокий риск — угроза суда, контролирующих органов или штрафных санкций
            </p>
          </div>
        </div>
      )}

      {/* Back navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onReset}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Новый анализ
        </button>
        <RiskBadge level={result.risk_level} />
      </div>

      {/* Low confidence warning */}
      {result.confidence < 0.5 && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <span className="text-base leading-none mt-0.5">&#9888;&#65039;</span>
          <p className="text-xs text-amber-700 font-medium">
            Требует внимания оператора (низкая уверенность)
          </p>
        </div>
      )}

      {/* Type badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="px-3 py-1 text-sm font-bold bg-red-50 text-red-700 rounded-full border border-red-200">
          ПРЕТЕНЗИЯ
        </span>
        {showCategory && (
          <span className="px-2.5 py-1 text-xs font-medium bg-orange-50 text-orange-700 rounded-full border border-orange-100">
            {categoryLabel}
          </span>
        )}
      </div>

      {/* Extracted facts */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Извлечённые факты</h3>
        <div className="space-y-2 text-sm">
          {result.extracted_facts.order_number && (
            <div className="flex gap-2">
              <span className="text-slate-400 w-24 shrink-0">Заказ:</span>
              <span className="text-slate-700 font-medium font-mono">
                №{result.extracted_facts.order_number}
              </span>
            </div>
          )}
          {result.extracted_facts.product && (
            <div className="flex gap-2">
              <span className="text-slate-400 w-24 shrink-0">Товар:</span>
              <span className="text-slate-700 font-medium">{result.extracted_facts.product}</span>
            </div>
          )}
          {result.extracted_facts.purchase_date && (
            <div className="flex gap-2">
              <span className="text-slate-400 w-24 shrink-0">Дата:</span>
              <span className="text-slate-700">{result.extracted_facts.purchase_date}</span>
            </div>
          )}
          {result.extracted_facts.problem && (
            <div className="flex gap-2">
              <span className="text-slate-400 w-24 shrink-0">Проблема:</span>
              <span className="text-slate-700">{result.extracted_facts.problem}</span>
            </div>
          )}
          {result.extracted_facts.customer_demand && (
            <div className="flex gap-2">
              <span className="text-slate-400 w-24 shrink-0">Требование:</span>
              <span className="text-slate-700 font-medium">{result.extracted_facts.customer_demand}</span>
            </div>
          )}
          {result.extracted_facts.risk_markers.length > 0 && (
            <div className="pt-2 border-t border-slate-100 mt-2">
              <span className="text-slate-400 text-xs uppercase tracking-wider">Рисковые маркеры</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {result.extracted_facts.risk_markers.map((m, i) => (
                  <span key={i} className="px-2 py-0.5 text-xs bg-red-50 text-red-600 rounded-full border border-red-100">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lawyer contour block */}
      {(result.deadline_days || result.financial_risk_estimate || (result.required_legal_actions && result.required_legal_actions.length > 0)) && (
        <div className={`rounded-xl border p-4 shadow-sm ${
          result.risk_level === "high"
            ? "bg-red-50/50 border-red-200"
            : "bg-orange-50/50 border-orange-200"
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <svg className={`w-4 h-4 ${result.risk_level === "high" ? "text-red-600" : "text-orange-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            </svg>
            <h3 className={`text-sm font-bold ${result.risk_level === "high" ? "text-red-800" : "text-orange-800"}`}>
              Юридический анализ
            </h3>
          </div>

          <div className="space-y-2.5">
            {result.deadline_days && (
              <div className={`flex items-start gap-2 p-2.5 rounded-lg ${
                result.risk_level === "high" ? "bg-red-100/60" : "bg-orange-100/60"
              }`}>
                <svg className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Дедлайн</span>
                  <p className={`text-sm font-semibold ${result.risk_level === "high" ? "text-red-800" : "text-orange-800"}`}>
                    {result.deadline_days}
                  </p>
                </div>
              </div>
            )}

            {result.financial_risk_estimate && (
              <div className={`flex items-start gap-2 p-2.5 rounded-lg ${
                result.risk_level === "high" ? "bg-red-100/60" : "bg-orange-100/60"
              }`}>
                <svg className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Финансовый риск</span>
                  <p className={`text-sm  font-semibold ${result.risk_level === "high" ? "text-red-800" : "text-orange-800"}`}>
                    {result.financial_risk_estimate}
                  </p>
                </div>
              </div>
            )}

            {result.required_legal_actions && result.required_legal_actions.length > 0 && (
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider ml-1">
                  Необходимые действия
                </span>
                <div className="mt-1 space-y-1">
                  {result.required_legal_actions.map((action, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0 mt-0.5 ${
                        result.risk_level === "high"
                          ? "bg-red-200 text-red-800"
                          : "bg-orange-200 text-orange-800"
                      }`}>
                        {i + 1}
                      </span>
                      <span>{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Missing documents checklist */}
      {result.missing_documents.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">
            Чек-лист: что запросить у покупателя
          </h3>
          <div className="space-y-0.5">
            {result.missing_documents.map((doc, i) => (
              <ChecklistItem key={i} label={doc} />
            ))}
          </div>
        </div>
      )}

      {/* Editable short reply */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-slate-700">Ответ в чат</h3>
        </div>
        <textarea
          value={editedReply}
          onChange={(e) => setEditedReply(e.target.value)}
          rows={4}
          className="w-full text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 focus:border-blue-300 focus:ring-1 focus:ring-blue-200 outline-none resize-y"
        />
        <div className="flex items-center justify-between mt-2">
          <CopyButton text={editedReply} />
          <InsertButton getText={getReplyText} />
        </div>
      </div>

      {/* Formal reply */}
      {result.formal_reply && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-700">Официальный ответ на претензию</h3>
            <CopyButton text={result.formal_reply} />
          </div>
          <div className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50 p-3 rounded-lg font-mono max-h-64 overflow-y-auto">
            {result.formal_reply}
          </div>
        </div>
      )}

      {/* Generate dossier button */}
      {result.risk_level !== "low" && (
        <button
          onClick={handleGenerateDossier}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
            dossierState === "copied"
              ? "bg-green-600 text-white"
              : result.risk_level === "high"
              ? "bg-red-600 text-white hover:bg-red-700 shadow-sm hover:shadow"
              : "bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100"
          }`}
        >
          {dossierState === "copied" ? (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Досье скопировано в буфер
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Сгенерировать досье
            </>
          )}
        </button>
      )}
    </div>
  );
}
