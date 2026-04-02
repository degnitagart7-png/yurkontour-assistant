/**
 * Ozon Seller Chat DOM Parser
 * Observes seller.ozon.ru chat interface and extracts customer messages
 */

// Selectors — using multiple strategies for resilience
const SELECTORS = {
  // Chat container where messages appear
  chatContainer: [
    '[data-testid="chat-messages"]',
    '[class*="chat-message"]',
    '[class*="ChatMessage"]',
    '[class*="message-list"]',
    '.chat-messages',
  ],
  // Individual message from customer (incoming)
  incomingMessage: [
    '[data-testid="incoming-message"]',
    '[class*="incoming"]',
    '[class*="message-incoming"]',
    '[class*="MessageIncoming"]',
    '[class*="buyer-message"]',
  ],
  // Message text content
  messageText: [
    '[data-testid="message-text"]',
    '[class*="message-text"]',
    '[class*="MessageText"]',
    '[class*="message__text"]',
    'p',
    'span',
  ],
  // Active dialog indicator
  activeDialog: [
    '[class*="dialog-active"]',
    '[class*="selected"]',
    '[class*="active"]',
    '[aria-selected="true"]',
  ],
};

function findElement(parent: Element | Document, selectorList: string[]): Element | null {
  for (const selector of selectorList) {
    try {
      const el = parent.querySelector(selector);
      if (el) return el;
    } catch {
      // Invalid selector, skip
    }
  }
  return null;
}

function findAllElements(parent: Element | Document, selectorList: string[]): Element[] {
  const results: Element[] = [];
  for (const selector of selectorList) {
    try {
      const els = parent.querySelectorAll(selector);
      els.forEach((el) => results.push(el));
    } catch {
      // Invalid selector, skip
    }
  }
  return results;
}

function getLastCustomerMessage(): string | null {
  // Strategy 1: Look for incoming messages in chat container
  const chatContainer = findElement(document, SELECTORS.chatContainer);
  if (chatContainer) {
    const messages = findAllElements(chatContainer, SELECTORS.incomingMessage);
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      const textEl = findElement(lastMsg, SELECTORS.messageText);
      if (textEl?.textContent?.trim()) {
        return textEl.textContent.trim();
      }
    }
  }

  // Strategy 2: Look for message bubbles with semantic hints
  const allMessages = document.querySelectorAll('[class*="message"]');
  const incomingMessages: Element[] = [];
  allMessages.forEach((msg) => {
    const classes = msg.className.toLowerCase();
    if (
      (classes.includes("incoming") ||
        classes.includes("buyer") ||
        classes.includes("customer") ||
        classes.includes("left")) &&
      !classes.includes("outgoing") &&
      !classes.includes("seller")
    ) {
      incomingMessages.push(msg);
    }
  });

  if (incomingMessages.length > 0) {
    const last = incomingMessages[incomingMessages.length - 1];
    const text = last.textContent?.trim();
    if (text && text.length > 5) return text;
  }

  console.warn("[ЮрКонтур] Ozon parser: не удалось найти сообщение покупателя");
  return null;
}

function observeChat(callback: (message: string) => void): MutationObserver | null {
  const chatContainer = findElement(document, SELECTORS.chatContainer);
  if (!chatContainer) {
    console.warn("[ЮрКонтур] Ozon parser: контейнер чата не найден, наблюдаем за body");
  }

  const target = chatContainer || document.body;

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        const msg = getLastCustomerMessage();
        if (msg) {
          callback(msg);
        }
      }
    }
  });

  observer.observe(target, { childList: true, subtree: true });
  return observer;
}

export const ozonParser = {
  marketplace: "ozon" as const,
  getLastCustomerMessage,
  observeChat,
  isApplicable: () => window.location.hostname === "seller.ozon.ru",
};
