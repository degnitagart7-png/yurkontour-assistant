import { useState, useEffect, useCallback } from "react";

interface HistoryEntry {
  id: string;
  timestamp: number;
  marketplace: string;
  messagePreview: string;
  type: "question" | "claim";
  category: string;
  risk_level: "low" | "medium" | "high";
  response: any;
}

export function useHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const fetchHistory = useCallback(() => {
    if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: "GET_HISTORY" }, (res) => {
        if (res?.type === "HISTORY_RESULT") {
          setHistory(res.payload);
        }
      });
    }
  }, []);

  const clearHistory = useCallback(() => {
    if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: "CLEAR_HISTORY" }, () => {
        setHistory([]);
      });
    } else {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { history, fetchHistory, clearHistory };
}
