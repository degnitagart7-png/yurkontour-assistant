import React, { useState, useCallback } from "react";

interface InsertButtonProps {
  getText: () => string;
  className?: string;
}

export function InsertButton({ getText, className = "" }: InsertButtonProps) {
  const [state, setState] = useState<"idle" | "inserted" | "error">("idle");

  const handleInsert = useCallback(async () => {
    const text = getText();
    if (!text.trim()) return;

    try {
      if (typeof chrome !== "undefined" && chrome.tabs?.query) {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tab = tabs[0];
        if (!tab?.id) {
          setState("error");
          setTimeout(() => setState("idle"), 2500);
          return;
        }

        chrome.tabs.sendMessage(
          tab.id,
          { action: "INSERT_TEXT", payload: text },
          (response) => {
            if (chrome.runtime.lastError || !response?.success) {
              setState("error");
              setTimeout(() => setState("idle"), 2500);
            } else {
              setState("inserted");
              setTimeout(() => setState("idle"), 2000);
            }
          }
        );
      } else {
        // Dev fallback: copy to clipboard
        await navigator.clipboard.writeText(text);
        setState("inserted");
        setTimeout(() => setState("idle"), 2000);
      }
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 2500);
    }
  }, [getText]);

  return (
    <button
      onClick={handleInsert}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
        state === "inserted"
          ? "bg-green-100 text-green-700 border border-green-200"
          : state === "error"
          ? "bg-amber-100 text-amber-700 border border-amber-200"
          : "bg-blue-600 text-white hover:bg-blue-700"
      } ${className}`}
    >
      {state === "inserted" ? (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Вставлено
        </>
      ) : state === "error" ? (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Кликните в поле чата
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
          Вставить в чат
        </>
      )}
    </button>
  );
}
