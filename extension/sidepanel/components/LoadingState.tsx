import React from "react";

export function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="relative w-14 h-14 mb-5">
        <div className="absolute inset-0 rounded-full border-[3px] border-slate-100"></div>
        <div className="absolute inset-0 rounded-full border-[3px] border-blue-500 border-t-transparent animate-spin"></div>
      </div>
      <h2 className="text-base font-semibold text-slate-700">
        Анализируем сообщение
      </h2>
      <p className="text-xs text-slate-400 mt-1.5">
        Определяем тип, категорию и риски
      </p>
    </div>
  );
}
