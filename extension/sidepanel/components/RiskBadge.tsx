import React from "react";

interface RiskBadgeProps {
  level: "low" | "medium" | "high";
  className?: string;
}

const config = {
  low: {
    label: "Низкий",
    emoji: "🟢",
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
  },
  medium: {
    label: "Средний",
    emoji: "🟡",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  high: {
    label: "Высокий",
    emoji: "🔴",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
  },
};

export function RiskBadge({ level, className = "" }: RiskBadgeProps) {
  const c = config[level];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${c.bg} ${c.text} ${c.border} ${className}`}
    >
      {c.emoji} Риск: {c.label}
    </span>
  );
}
