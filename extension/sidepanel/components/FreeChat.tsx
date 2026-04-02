import React, { useState, useCallback, useRef, useEffect } from "react";
import { CopyButton } from "./CopyButton";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
}

interface FreeChatProps {
  onBack: () => void;
}

const CHAT_API_URL = "https://yurkontour-assistant.vercel.app/api/chat";
const MAX_HISTORY = 10;
const MAX_CHARS = 2000;

const QUICK_TEMPLATES = [
  { label: "Ответ покупателю", text: "Составь ответ покупателю на его обращение" },
  { label: "Проверить правила", text: "Проверить на нарушение правил маркетплейса" },
  { label: "Написать претензию", text: "Как написать претензию поставщику" },
  { label: "Права в споре", text: "Права продавца в споре с покупателем" },
];

function humanizeHttpError(status: number): string {
  switch (status) {
    case 429: return "Превышен лимит запросов. Подождите минуту.";
    case 500: return "Сервер временно недоступен. Попробуйте через минуту.";
    case 502: return "Сервер не отвечает. Попробуйте через минуту.";
    case 503: return "Сервис на обслуживании. Попробуйте позже.";
    case 504: return "Сервер не успел ответить. Попробуйте ещё раз.";
    default: return "Ошибка сервера. Попробуйте ещё раз.";
  }
}

export function FreeChat({ onBack }: FreeChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastFailedText, setLastFailedText] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const doSend = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const updatedMessages = [...messages.filter((m) => !m.isError), userMsg];
    setMessages(updatedMessages);
    setInput("");
    setLastFailedText(null);
    setLoading(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      // Send last N messages as history
      const history = updatedMessages.slice(-MAX_HISTORY).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch(CHAT_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: history.slice(0, -1),
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || humanizeHttpError(response.status));
      }

      const data = await response.json();
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: data.reply || "Не удалось получить ответ.",
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMessage =
        err instanceof Error && err.message !== "Failed to fetch"
          ? err.message
          : "Нет подключения к серверу. Проверьте интернет и попробуйте снова.";

      const errorMsg: ChatMessage = {
        role: "assistant",
        content: errorMessage,
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
      setLastFailedText(text);
    } finally {
      setLoading(false);
    }
  }, [messages, loading]);

  const sendMessage = useCallback(() => {
    doSend(input.trim());
  }, [input, doSend]);

  const handleRetry = useCallback(() => {
    if (lastFailedText) {
      // Remove the error message before retrying
      setMessages((prev) => prev.filter((m) => !m.isError));
      doSend(lastFailedText);
    }
  }, [lastFailedText, doSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  const handleClearHistory = useCallback(() => {
    setMessages([]);
    setLastFailedText(null);
  }, []);

  const handleTemplateClick = useCallback(
    (text: string) => {
      doSend(text);
    },
    [doSend]
  );

  // Auto-resize textarea
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      if (val.length <= MAX_CHARS) {
        setInput(val);
      }
      const el = e.target;
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    },
    []
  );

  const charCount = input.length;
  const isNearLimit = charCount > MAX_CHARS * 0.9;

  return (
    <div className="flex flex-col h-[calc(100vh-49px)]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-white flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              Рабочий помощник
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Задайте любой вопрос по работе на маркетплейсе
            </p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="p-1.5 rounded-md hover:bg-slate-100 transition-colors"
              title="Очистить историю"
            >
              <svg
                className="w-4 h-4 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center text-center pt-8">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
              <svg
                className="w-6 h-6 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <p className="text-xs text-slate-400 max-w-[220px] mb-4">
              Задайте вопрос про правила маркетплейсов, налоги, документы, логистику...
            </p>

            {/* Quick templates */}
            <div className="flex flex-wrap gap-1.5 justify-center max-w-[280px]">
              {QUICK_TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  onClick={() => handleTemplateClick(t.text)}
                  className="px-2.5 py-1.5 text-[11px] bg-white border border-slate-200 rounded-lg text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-3.5 py-2.5 ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-br-md"
                  : msg.isError
                    ? "bg-red-50 border border-red-200 text-red-600 rounded-bl-md"
                    : "bg-white border border-slate-200 text-slate-700 rounded-bl-md"
              }`}
            >
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap">
                {msg.content}
              </p>
              {msg.role === "assistant" && !msg.isError && (
                <div className="mt-2 flex justify-end">
                  <CopyButton
                    text={msg.content}
                    label=""
                    className="!px-1.5 !py-1 !text-[10px] !border-0 !bg-transparent hover:!bg-slate-100"
                  />
                </div>
              )}
              {msg.isError && lastFailedText && (
                <button
                  onClick={handleRetry}
                  className="mt-2 px-2.5 py-1 text-[11px] bg-white border border-red-200 text-red-500 rounded-md hover:bg-red-50 transition-colors"
                >
                  Повторить
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-1">
                <span
                  className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 border-t border-slate-200 bg-white px-3 py-2.5">
        {/* Quick templates row (when there are messages) */}
        {messages.length > 0 && messages.length < 3 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {QUICK_TEMPLATES.map((t) => (
              <button
                key={t.label}
                onClick={() => handleTemplateClick(t.text)}
                disabled={loading}
                className="px-2 py-1 text-[10px] bg-slate-50 border border-slate-200 rounded-md text-slate-500 hover:border-blue-300 hover:text-blue-600 transition-colors disabled:opacity-50"
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Спросите про правила WB, налоги, документы..."
              rows={1}
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              style={{ minHeight: 38, maxHeight: 120 }}
              disabled={loading}
            />
            {charCount > 0 && (
              <span
                className={`absolute right-2 bottom-1.5 text-[10px] ${
                  isNearLimit ? "text-orange-500" : "text-slate-300"
                }`}
              >
                {charCount}/{MAX_CHARS}
              </span>
            )}
          </div>
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading || charCount > MAX_CHARS}
            className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
              input.trim() && !loading && charCount <= MAX_CHARS
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 19V5m0 0l-7 7m7-7l7 7"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
