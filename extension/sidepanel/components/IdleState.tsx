import React from "react";
import { DEMO_SCENARIOS, DemoScenario } from "../demo-scenarios";

interface IdleStateProps {
  onManualInput: () => void;
  onDemoSelect: (scenario: DemoScenario) => void;
}

const COLOR_MAP = {
  blue: {
    dot: "bg-blue-500",
    bg: "hover:border-blue-300",
    iconBg: "bg-blue-50",
    iconText: "text-blue-600",
  },
  yellow: {
    dot: "bg-amber-500",
    bg: "hover:border-amber-300",
    iconBg: "bg-amber-50",
    iconText: "text-amber-600",
  },
  red: {
    dot: "bg-red-500",
    bg: "hover:border-red-300",
    iconBg: "bg-red-50",
    iconText: "text-red-600",
  },
};

function ScenarioIcon({ icon, color }: { icon: string; color: "blue" | "yellow" | "red" }) {
  const c = COLOR_MAP[color];
  const iconEl = (() => {
    switch (icon) {
      case "question":
        return (
          <svg className={`w-5 h-5 ${c.iconText}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "search":
        return (
          <svg className={`w-5 h-5 ${c.iconText}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        );
      case "wrench":
        return (
          <svg className={`w-5 h-5 ${c.iconText}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case "alert":
        return (
          <svg className={`w-5 h-5 ${c.iconText}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      default:
        return null;
    }
  })();

  return (
    <div className={`w-9 h-9 rounded-lg ${c.iconBg} flex items-center justify-center flex-shrink-0`}>
      {iconEl}
    </div>
  );
}

export function IdleState({ onManualInput, onDemoSelect }: IdleStateProps) {
  return (
    <div className="p-4">
      {/* Waiting state */}
      <div className="flex flex-col items-center text-center pt-6 pb-4">
        <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mb-3">
          <svg className="w-7 h-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-slate-800 mb-1">
          Ожидание сообщения
        </h2>
        <p className="text-xs text-slate-400 mb-4 max-w-[280px]">
          Кликните на диалог в интерфейсе маркетплейса или введите текст вручную
        </p>
        <button
          onClick={onManualInput}
          className="px-5 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors border border-blue-100"
        >
          Вставить вручную
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">
          Быстрые сценарии
        </span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      {/* Demo scenario cards */}
      <div className="grid grid-cols-2 gap-2.5">
        {DEMO_SCENARIOS.map((scenario) => {
          const colors = COLOR_MAP[scenario.color];
          return (
            <button
              key={scenario.id}
              onClick={() => onDemoSelect(scenario)}
              className={`text-left p-3 bg-white border border-slate-200 rounded-xl ${colors.bg} hover:shadow-sm transition-all group`}
            >
              <div className="flex items-start gap-2.5 mb-2">
                <ScenarioIcon icon={scenario.icon} color={scenario.color} />
                <div className={`w-2 h-2 rounded-full ${colors.dot} mt-1.5 flex-shrink-0 hidden`} />
              </div>
              <h3 className="text-[13px] font-semibold text-slate-800 leading-tight mb-1 group-hover:text-slate-900">
                {scenario.title}
              </h3>
              <p className="text-[11px] text-slate-400 leading-snug">
                {scenario.subtitle}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
