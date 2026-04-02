/**
 * Background Service Worker
 * - Handles messages from content scripts
 * - Sends analysis requests to backend API
 * - Manages side panel state
 * - Stores session history in chrome.storage.local
 */

const API_URL = "https://yurkontour-assistant.vercel.app";

// Open side panel on extension icon click
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

// Set side panel behavior
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Listen for messages from content scripts and side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "NEW_MESSAGE_DETECTED") {
    // Forward to side panel
    broadcastToSidePanel({
      type: "NEW_MESSAGE",
      payload: message.payload,
    });
    return false;
  }

  if (message.type === "ANALYZE_MESSAGE") {
    // Try to get product context from the active tab's content script
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
        // Save to history
        saveToHistory(message.payload, result);
        // Also broadcast to side panel
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
    return true; // Keep message channel open for async response
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

  return false;
});

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

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Request product context from the content script on the active tab.
 */
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

function broadcastToSidePanel(message: any) {
  chrome.runtime.sendMessage(message).catch(() => {
    // Side panel might not be open, ignore
  });
}

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
    type: response.type,
    category: response.category,
    risk_level: response.risk_level,
    response,
  };

  const history = await getHistory();
  history.unshift(entry);

  // Keep only last 20 entries
  const trimmed = history.slice(0, 20);

  await chrome.storage.local.set({ history: trimmed });
}

async function getHistory(): Promise<any[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["history"], (result) => {
      resolve(result.history || []);
    });
  });
}
