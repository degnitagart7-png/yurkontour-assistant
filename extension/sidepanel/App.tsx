import React, { useState, useEffect, useCallback } from "react";
import { IdleState } from "./components/IdleState";
import { LoadingState } from "./components/LoadingState";
import { ErrorState } from "./components/ErrorState";
import { ManualInput } from "./components/ManualInput";
import { QuestionResult } from "./components/QuestionResult";
import { ClaimResult } from "./components/ClaimResult";
import { SessionHistory } from "./components/SessionHistory";
import { FreeChat } from "./components/FreeChat";
import { useAnalysis } from "./hooks/useAnalysis";
import { useHistory } from "./hooks/useHistory";
import type { DemoScenario } from "./demo-scenarios";

type Screen = "idle" | "loading" | "result" | "manual" | "history" | "error" | "chat";

interface PageContext {
  marketplace: "ozon" | "wb" | "yandex" | null;
  productName: string | null;
  pageType?: "product" | "chat" | "other";
}

const MP_ICONS: Record<string, string> = {
  ozon: "Ozon",
  wb: "WB",
  yandex: "YM",
};

export default function App() {
  const [screen, setScreen] = useState<Screen>("idle");
  const { status, result, error, analyze, reset, rawMessage, marketplace } = useAnalysis();
  const { history, fetchHistory, clearHistory } = useHistory();
  const [pageContext, setPageContext] = useState<PageContext | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  // Load dark mode preference
  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      chrome.storage.local.get(["darkMode"], (result) => {
        if (result.darkMode) {
          setDarkMode(true);
          document.documentElement.classList.add("dark");
        }
      });
    }
  }, []);

  // Toggle dark mode
  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      if (typeof chrome !== "undefined" && chrome.storage?.local) {
        chrome.storage.local.set({ darkMode: next });
      }
      return next;
    });
  }, []);

  // Fetch page context from active tab
  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: "GET_PAGE_CONTEXT" }, (res) => {
        if (res && (res.marketplace || res.productName)) {
          setPageContext(res);
        }
      });
    }
  }, [screen]);

  // Listen for messages from background/content script
  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
      const listener = (message: any) => {
        if (message.type === "NEW_MESSAGE") {
          handleAnalyze(message.payload.message, message.payload.marketplace);
        }
        if (message.type === "ANALYSIS_COMPLETE") {
          fetchHistory();
        }
      };

      chrome.runtime.onMessage.addListener(listener);
      return () => chrome.runtime.onMessage.removeListener(listener);
    }
  }, []);

  // Sync screen with analysis status
  useEffect(() => {
    if (status === "loading") setScreen("loading");
    else if (status === "success" && result) setScreen("result");
    else if (status === "error") setScreen("error");
  }, [status, result]);

  const handleAnalyze = useCallback(
    (message: string, mp: string) => {
      analyze(message, mp);
    },
    [analyze]
  );

  const handleReset = useCallback(() => {
    reset();
    setScreen("idle");
  }, [reset]);

  const handleRetry = useCallback(() => {
    if (rawMessage && marketplace) {
      analyze(rawMessage, marketplace);
    } else {
      handleReset();
    }
  }, [rawMessage, marketplace, analyze, handleReset]);

  const handleRegenerate = useCallback(() => {
    if (rawMessage && marketplace) {
      analyze(rawMessage, marketplace);
    }
  }, [rawMessage, marketplace, analyze]);

  const handleDemoSelect = useCallback(
    (scenario: DemoScenario) => {
      handleAnalyze(scenario.message, scenario.marketplace);
    },
    [handleAnalyze]
  );

  const handleHistorySelect = useCallback((_entry: any) => {
    setScreen("idle");
  }, []);

  const contextLabel = pageContext?.productName
    ? pageContext.productName.length > 40
      ? pageContext.productName.slice(0, 40) + "..."
      : pageContext.productName
    : null;

  return (
    <div className={`min-h-screen ${darkMode ? "bg-slate-900" : "bg-slate-50"}`}>
      {/* Header */}
      <div className={`sticky top-0 z-10 border-b px-4 py-3 ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
        <div className="flex items-center justify-between">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className={`text-sm font-bold leading-tight ${darkMode ? "text-slate-100" : "text-slate-800"}`}>ЮрКонтур</h1>
              <p className={`text-[10px] leading-tight ${darkMode ? "text-slate-400" : "text-slate-400"}`}>Assistant</p>
            </div>
          </button>
          <div className="flex items-center gap-1">
            {/* Page context badge */}
            {pageContext?.marketplace && (
              <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-md mr-1" title={contextLabel || "Общий режим"}>
                <span className="text-[10px] font-medium text-blue-600">
                  {MP_ICONS[pageContext.marketplace] || ""}
                </span>
                {contextLabel && (
                  <span className="text-[10px] text-blue-500 max-w-[80px] truncate">
                    {contextLabel}
                  </span>
                )}
              </div>
            )}
            {/* Dark mode toggle */}
            <button
              onClick={toggleDarkMode}
              className={`p-1.5 rounded-md transition-colors ${darkMode ? "text-yellow-400 hover:bg-slate-700" : "text-slate-400 hover:bg-slate-100"}`}
              title={darkMode ? "Светлая тема" : "Тёмная тема"}
            >
              {darkMode ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            <button
              onClick={() => setScreen("chat")}
              className={`p-1.5 rounded-md transition-colors ${
                screen === "chat"
                  ? "bg-blue-50 text-blue-600"
                  : darkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-100 text-slate-500"
              }`}
              title="Чат"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
            <button
              onClick={() => {
                fetchHistory();
                setScreen("history");
              }}
              className={`p-1.5 rounded-md transition-colors ${
                screen === "history"
                  ? "bg-blue-50 text-blue-600"
                  : darkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-100 text-slate-500"
              }`}
              title="История"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Screens */}
      {screen === "idle" && (
        <IdleState
          onManualInput={() => setScreen("manual")}
          onDemoSelect={handleDemoSelect}
        />
      )}

      {screen === "loading" && <LoadingState />}

      {screen === "error" && (
        <ErrorState
          error={error || "Неизвестная ошибка"}
          onRetry={handleRetry}
          onReset={handleReset}
        />
      )}

      {screen === "manual" && (
        <ManualInput
          onAnalyze={handleAnalyze}
          onBack={() => setScreen("idle")}
        />
      )}

      {screen === "result" && result && result.type === "question" && (
        <QuestionResult
          result={result}
          onReset={handleReset}
          onRegenerate={handleRegenerate}
        />
      )}

      {screen === "result" && result && result.type === "claim" && (
        <ClaimResult result={result} onReset={handleReset} />
      )}

      {screen === "history" && (
        <SessionHistory
          history={history}
          onSelect={handleHistorySelect}
          onBack={() => setScreen("idle")}
          onClear={clearHistory}
        />
      )}

      {screen === "chat" && (
        <FreeChat onBack={() => setScreen("idle")} />
      )}
    </div>
  );
}
