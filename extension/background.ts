/**
 * Background Service Worker
 * - Handles messages from content scripts
 * - Sends analysis requests to backend API with retry + timeout
 * - Manages side panel state
 * - Stores session history in chrome.storage.local
 */

HEAD
const API_URL = "https://yurkontour-assistant.vercel.app";
=======
const API_BASE = "https://yurkontour-assistant.vercel.app";
const API_ANALYZE = `${API_BASE}/api/analyze`;
const API_CHAT = `${API_BASE}/api/chat`;

const MAX_RETRIES = 3;
const REQUEST_TIMEOUT = 30_000;
const HISTORY_LIMIT = 50;

// ERROR MESSAGES 

function humanizeError(status: number): string {
  switch (status) {
    case 429:
      return "Превышен лимит запросов. Подождите немного.";
    case 500:
      return "Сервер временно недоступен. Попробуйте через минуту.";
    case 503:
      return "Сервис на обслуживании. Попробуйте позже.";
    case 502:
      return "Сервер не отвечает. Попробуйте через минуту.";
    case 504:
      return "Сервер не успел ответить. Попробуйте ещё раз.";
    default:
      if (status >= 400 && status < 500) return "Ошибка запроса. Проверьте данные.";
      if (status >= 500) return "Сервер временно недоступен. Попробуйте через минуту.";
      return `Ошибка соединения (${status})`;
  }
}

// FETCH WITH RETRY + TIMEOUT 
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // Check online status
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        throw new Error("Нет подключения к интернету");
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Don't retry on client errors (except 429)
      if (response.status === 429 && attempt < retries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      // Don't retry on 4xx (client errors)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || humanizeError(response.status));
        }
      }

      // Retry on 5xx
      if (response.status >= 500 && attempt < retries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      if (!response.ok) {
        throw new Error(humanizeError(response.status));
      }

      return response;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (lastError.name === "AbortError") {
        lastError = new Error("Сервер не ответил за 30 секунд. Попробуйте ещё раз.");
      }

      if (lastError.message === "Нет подключения к интернету") {
        throw lastError; // Don't retry offline
      }

      if (lastError.message.includes("Failed to fetch") || lastError.message.includes("NetworkError")) {
        lastError = new Error("Нет подключения к интернету");
        if (attempt < retries - 1) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
      }

      // Don't retry if we got a human error message from server
      if (!lastError.message.includes("Попробуйте") && attempt < retries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      throw lastError;
    }
  }

  throw lastError || new Error("Неизвестная ошибка");
}

// ============ SIDE PANEL ============
>>>>>>> fe9c06a (Implement all 10 improvements: retry, parsers, MockProvider, history, templates, UI, backend)

chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

//  MESSAGE LISTENER

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "NEW_MESSAGE_DETECTED") {
    broadcastToSidePanel({
      type: "NEW_MESSAGE",
      payload: message.payload,
    });
    return false;
  }

  if (message.type === "ANALYZE_MESSAGE") {
    fetchProductContext(sender.tab?.id)
      .then((productContext) => {
        const payload = {
          ...message.payload,
          product_context: productContext,
        };
        return analyzeMessage(payload);
      })
      .then((result) => {
        sendResponse({ type: "ANALYSIS_RESULT", payload: result });
        saveToHistory(message.payload, result);
        broadcastToSidePanel({
          type: "ANALYSIS_COMPLETE",
          payload: result,
        });
      })
      .catch((error) => {
        sendResponse({
          type: "ANALYSIS_ERROR",
          payload: { error: error.message || "Ошибка анализа" },
        });
      });
    return true;
  }

  if (message.type === "GET_HISTORY") {
    getHistory().then((history) => {
      sendResponse({ type: "HISTORY_RESULT", payload: history });
    });
    return true;
  }

  if (message.type === "CLEAR_HISTORY") {
    chrome.storage.local.set({ history: [] }, () => {
      sendResponse({ type: "HISTORY_CLEARED" });
    });
    return true;
  }

  if (message.type === "GET_PAGE_CONTEXT") {
    fetchPageContext(sender.tab?.id).then((ctx) => {
      sendResponse({ type: "PAGE_CONTEXT_RESULT", payload: ctx });
    });
    return true;
  }

  return false;
});

//  API CALLS

async function analyzeMessage(payload: {
  message: string;
  marketplace: string;
  product_context?: any;
}): Promise<any> {
  const body: Record<string, unknown> = {
    message: payload.message,
    marketplace: payload.marketplace,
  };

  if (payload.product_context) {
    body.product_context = payload.product_context;
  }

  const response = await fetchWithRetry(API_ANALYZE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return response.json();
}

async function fetchProductContext(senderTabId?: number): Promise<any | null> {
  let tabId = senderTabId;

  if (!tabId) {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        tabId = tabs[0].id;
      }
    } catch {
      return null;
    }
  }

  if (!tabId) return null;

  return new Promise((resolve) => {
    try {
      chrome.tabs.sendMessage(
        tabId,
        { type: "GET_PRODUCT_CONTEXT" },
        (response) => {
          if (chrome.runtime.lastError || !response) {
            resolve(null);
            return;
          }
          resolve(response.productContext || null);
        }
      );
    } catch {
      resolve(null);
    }
  });
}

async function fetchPageContext(senderTabId?: number): Promise<any> {
  let tabId = senderTabId;

  if (!tabId) {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) tabId = tabs[0].id;
    } catch {
      return { marketplace: null, productName: null };
    }
  }

  if (!tabId) return { marketplace: null, productName: null };

  return new Promise((resolve) => {
    try {
      chrome.tabs.sendMessage(tabId, { type: "GET_PAGE_CONTEXT" }, (response) => {
        if (chrome.runtime.lastError || !response) {
          resolve({ marketplace: null, productName: null });
          return;
        }
        resolve(response);
      });
    } catch {
      resolve({ marketplace: null, productName: null });
    }
  });
}

function broadcastToSidePanel(message: any) {
  chrome.runtime.sendMessage(message).catch(() => {});
}

//  HISTORY 

async function saveToHistory(
  request: { message: string; marketplace: string },
  response: any
) {
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: Date.now(),
    marketplace: request.marketplace,
    messagePreview:
      request.message.length > 80
        ? request.message.slice(0, 80) + "..."
        : request.message,
    fullMessage: request.message,
    type: response.type,
    category: response.category,
    risk_level: response.risk_level,
    response,
  };

  const history = await getHistory();
  history.unshift(entry);

  const trimmed = history.slice(0, HISTORY_LIMIT);
  await chrome.storage.local.set({ history: trimmed });
}

async function getHistory(): Promise<any[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["history"], (result) => {
      resolve(result.history || []);
    });
  });
}
