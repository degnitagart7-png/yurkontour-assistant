import { useState, useCallback } from "react";

export interface AnalysisResponse {
  type: "question" | "claim";
  category: string;
  confidence: number;
  risk_level: "low" | "medium" | "high";
  extracted_facts: {
    order_number: string | null;
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
  deadline_days: string | null;
  financial_risk_estimate: string | null;
  required_legal_actions: string[];
}

type Status = "idle" | "loading" | "success" | "error";

export function useAnalysis() {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawMessage, setRawMessage] = useState<string>("");
  const [marketplace, setMarketplace] = useState<string>("");

  const analyze = useCallback(
    async (message: string, mp: string) => {
      setStatus("loading");
      setError(null);
      setRawMessage(message);
      setMarketplace(mp);

      try {
        // Send to background service worker
        const response = await new Promise<any>((resolve, reject) => {
          if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
            chrome.runtime.sendMessage(
              {
                type: "ANALYZE_MESSAGE",
                payload: { message, marketplace: mp },
              },
              (res) => {
                if (chrome.runtime.lastError) {
                  reject(new Error(chrome.runtime.lastError.message));
                  return;
                }
                if (res?.type === "ANALYSIS_ERROR") {
                  reject(new Error(res.payload.error));
                } else if (res?.type === "ANALYSIS_RESULT") {
                  resolve(res.payload);
                } else {
                  reject(new Error("Неизвестный ответ"));
                }
              }
            );
          } else {
            // Fallback: direct API call (for dev/testing)
            fetch("http://localhost:3000/api/analyze", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ message, marketplace: mp }),
            })
              .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
              })
              .then(resolve)
              .catch(reject);
          }
        });

        setResult(response);
        setStatus("success");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка анализа");
        setStatus("error");
      }
    },
    []
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setResult(null);
    setError(null);
    setRawMessage("");
    setMarketplace("");
  }, []);

  return {
    status,
    result,
    error,
    rawMessage,
    marketplace,
    analyze,
    reset,
  };
}
