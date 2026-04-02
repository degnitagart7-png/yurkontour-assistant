/**
 * Content Script — entry point
 * Detects which marketplace we're on, activates the appropriate parser,
 * sends detected messages to the background service worker,
 * and handles smart text insertion into marketplace chat fields.
 */

import { ozonParser } from "./ozon_parser";
import { wbParser } from "./wb_parser";
import { yandexParser } from "./yandex_parser";
import { parseProductInfo, ProductInfo, getPageContext } from "./product_parser";

type Marketplace = "ozon" | "wb" | "yandex" | "other";

interface Parser {
  marketplace: Marketplace;
  getLastCustomerMessage: () => string | null;
  observeChat: (callback: (message: string) => void) => MutationObserver | null;
  isApplicable: () => boolean;
}

const parsers: Parser[] = [ozonParser, wbParser, yandexParser];

let lastSentMessage = "";
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let cachedProductInfo: ProductInfo | null = null;
let productInfoUrl = "";

function getActiveParser(): Parser | null {
  for (const parser of parsers) {
    if (parser.isApplicable()) {
      return parser;
    }
  }
  return null;
}

/**
 * Get product info for the current page, with URL-based caching.
 */
function getProductContext(marketplace: Marketplace): ProductInfo | null {
  const currentUrl = window.location.href;
  if (cachedProductInfo && productInfoUrl === currentUrl) {
    return cachedProductInfo;
  }
  cachedProductInfo = parseProductInfo(marketplace);
  productInfoUrl = currentUrl;
  return cachedProductInfo;
}

function sendToBackground(message: string, marketplace: Marketplace) {
  if (message === lastSentMessage) return;

  if (debounceTimer) clearTimeout(debounceTimer);

  debounceTimer = setTimeout(() => {
    lastSentMessage = message;
    chrome.runtime.sendMessage({
      type: "NEW_MESSAGE_DETECTED",
      payload: { message, marketplace },
    });
    console.log(`[ЮрКонтур] Обнаружено сообщение (${marketplace}):`, message.slice(0, 80) + "...");
  }, 500);
}

// ============ SMART TEXT INSERTION ============

/**
 * Find the active chat input field on the marketplace page.
 * Tries: active element first, then common selectors.
 */
function findChatInput(): HTMLElement | null {
  // 1. Check if document.activeElement is a suitable input
  const active = document.activeElement;
  if (active) {
    if (active instanceof HTMLTextAreaElement) return active;
    if (active instanceof HTMLInputElement && active.type === "text") return active;
    if (active instanceof HTMLElement && active.isContentEditable) return active;
  }

  // 2. Try marketplace-specific selectors
  const selectors = [
    // Generic chat input selectors
    'textarea[data-testid*="message"]',
    'textarea[data-testid*="chat"]',
    'textarea[data-testid*="reply"]',
    'div[contenteditable="true"][data-testid*="message"]',
    'div[contenteditable="true"][data-testid*="chat"]',
    // Common patterns across marketplaces
    'textarea.chat-input',
    'textarea.message-input',
    'div[contenteditable="true"].chat-input',
    // Broader selectors as fallback
    'textarea',
    '[contenteditable="true"]',
  ];

  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    for (const el of elements) {
      // Filter out tiny hidden inputs
      if (el instanceof HTMLElement) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 50 && rect.height > 20) {
          return el;
        }
      }
    }
  }

  return null;
}

/**
 * Insert text into a textarea/input using native value setter
 * to properly trigger React/Vue reactivity.
 */
function insertIntoTextarea(element: HTMLTextAreaElement | HTMLInputElement, text: string) {
  // Use native setter to bypass React's synthetic event system
  const nativeSetter =
    element instanceof HTMLTextAreaElement
      ? Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set
      : Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;

  if (nativeSetter) {
    nativeSetter.call(element, text);
  } else {
    element.value = text;
  }

  // Dispatch events to notify React/Vue/Angular frameworks
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));

  // Focus the element so the operator can review and press Enter
  element.focus();

  // Move cursor to end
  element.setSelectionRange(text.length, text.length);
}

/**
 * Insert text into a contenteditable element.
 */
function insertIntoContentEditable(element: HTMLElement, text: string) {
  element.focus();
  element.textContent = text;

  // Dispatch input event for framework reactivity
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));

  // Move cursor to end
  const range = document.createRange();
  const sel = window.getSelection();
  if (sel && element.childNodes.length > 0) {
    range.setStartAfter(element.childNodes[element.childNodes.length - 1]);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

/**
 * Handle INSERT_TEXT message from side panel.
 */
function handleInsertText(text: string): { success: boolean; error?: string } {
  const input = findChatInput();

  if (!input) {
    return {
      success: false,
      error: "Не найдено поле ввода. Кликните в поле чата на сайте.",
    };
  }

  try {
    if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
      insertIntoTextarea(input, text);
    } else if (input.isContentEditable) {
      insertIntoContentEditable(input, text);
    } else {
      return { success: false, error: "Неподдерживаемый тип поля ввода." };
    }

    console.log("[ЮрКонтур] Текст вставлен в поле чата");
    return { success: true };
  } catch (err) {
    console.error("[ЮрКонтур] Ошибка вставки текста:", err);
    return {
      success: false,
      error: "Ошибка при вставке текста.",
    };
  }
}

// ============ INITIALIZATION ============

function init() {
  const parser = getActiveParser();
  if (!parser) {
    console.log("[ЮрКонтур] Маркетплейс не определён, контент-скрипт не активирован");
  } else {
    console.log(`[ЮрКонтур] Активирован парсер для ${parser.marketplace}`);

    // Set up MutationObserver for auto-detection
    parser.observeChat((message) => {
      sendToBackground(message, parser.marketplace);
    });

    // Listen for click events on dialog items
    document.addEventListener("click", () => {
      setTimeout(() => {
        const msg = parser.getLastCustomerMessage();
        if (msg) {
          sendToBackground(msg, parser.marketplace);
        }
      }, 300);
    });
  }

  // Listen for messages from side panel / background
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.type === "GET_CURRENT_MESSAGE" && parser) {
      const msg = parser.getLastCustomerMessage();
      sendResponse({
        message: msg,
        marketplace: parser.marketplace,
      });
      return true;
    }

    if (request.type === "GET_PRODUCT_CONTEXT") {
      const mp = parser?.marketplace || "other";
      const productInfo = getProductContext(mp);
      sendResponse({ productContext: productInfo });
      return true;
    }

    if (request.type === "GET_PAGE_CONTEXT") {
      const ctx = getPageContext();
      sendResponse(ctx);
      return true;
    }

    if (request.action === "INSERT_TEXT") {
      const result = handleInsertText(request.payload);
      sendResponse(result);
      return true;
    }

    return true;
  });
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
