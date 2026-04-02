import React, { useState } from "react";

interface ChecklistItemProps {
  label: string;
}

export function ChecklistItem({ label }: ChecklistItemProps) {
  const [checked, setChecked] = useState(false);

  return (
    <label className="flex items-start gap-2 cursor-pointer py-1 group">
      <input
        type="checkbox"
        checked={checked}
        onChange={() => setChecked(!checked)}
        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
      />
      <span
        className={`text-sm transition-all ${
          checked ? "line-through text-slate-400" : "text-slate-700"
        }`}
      >
        {label}
      </span>
    </label>
  );
}
