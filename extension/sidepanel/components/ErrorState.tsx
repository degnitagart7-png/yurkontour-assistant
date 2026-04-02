import React from "react";

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
  onReset: () => void;
}

export function ErrorState({ error, onRetry, onReset }: ErrorStateProps) {
  const isNetworkError =
    error.includes("fetch") ||
    error.includes("Failed") ||
    error.includes("NetworkError") ||
    error.includes("ERR_CONNECTION") ||
    error.includes("HTTP 5") ||
    error.includes("ECONNREFUSED") ||
    error.toLowerCase().includes("network");

  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      {/* Icon */}
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-5">
        {isNetworkError ? (
          /* Plug / disconnect icon */
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 11-12.728 0M12 3v9" />
          </svg>
        ) : (
          /* X circle icon */
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </div>

      {/* Title */}
      <h2 className="text-base font-semibold text-slate-800 mb-1.5">
        {isNetworkError ? "Сервер анализа недоступен" : "Ошибка анализа"}
      </h2>

      {/* Description */}
      <p className="text-sm text-slate-500 mb-6 max-w-[280px] leading-relaxed">
        {isNetworkError
          ? "Не удалось подключиться к серверу. Проверьте интернет-соединение и попробуйте снова."
          : error}
      </p>

      {/* Actions */}
      <div className="flex flex-col gap-2 w-full max-w-[220px]">
        <button
          onClick={onRetry}
          className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm hover:shadow transition-all"
        >
          Повторить попытку
        </button>
        <button
          onClick={onReset}
          className="w-full px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          Вернуться к вводу
        </button>
      </div>
    </div>
  );
}
