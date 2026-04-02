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

export default function App() {
  const [screen, setScreen] = useState<Screen>("idle");
  const { status, result, error, analyze, reset, rawMessage, marketplace } = useAnalysis();
  const { history, fetchHistory, clearHistory } = useHistory();

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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
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
            <h1 className="text-sm font-bold text-slate-800 leading-tight">ЮрКонтур</h1>
            <p className="text-[10px] text-slate-400 leading-tight">Assistant</p>
          </div>
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setScreen("chat")}
            className={`p-1.5 rounded-md transition-colors ${
              screen === "chat"
                ? "bg-blue-50 text-blue-600"
                : "hover:bg-slate-100 text-slate-500"
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
                : "hover:bg-slate-100 text-slate-500"
            }`}
            title="История"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
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
