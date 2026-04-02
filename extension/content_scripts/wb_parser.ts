/**
 * Wildberries Seller Chat DOM Parser
 * Observes seller.wildberries.ru chat interface and extracts customer messages
 */

const SELECTORS = {
  chatContainer: [
    '[class*="chat-content"]',
    '[class*="ChatContent"]',
    '[class*="messages-list"]',
    '[class*="MessagesList"]',
    '[data-testid="messages"]',
  ],
  incomingMessage: [
    '[class*="message--incoming"]',
    '[class*="message-incoming"]',
    '[class*="MessageIncoming"]',
    '[class*="buyer"]',
    '[class*="customer-message"]',
  ],
  messageText: [
    '[class*="message-text"]',
    '[class*="message__text"]',
    '[class*="MessageText"]',
    '[class*="text-content"]',
    'p',
    'span',
  ],
};

function findElement(parent: Element | Document, selectorList: string[]): Element | null {
  for (const selector of selectorList) {
    try {
      const el = parent.querySelector(selector);
      if (el) return el;
    } catch {}
  }
  return null;
}

function findAllElements(parent: Element | Document, selectorList: string[]): Element[] {
  const results: Element[] = [];
  for (const selector of selectorList) {
    try {
      parent.querySelectorAll(selector).forEach((el) => results.push(el));
    } catch {}
  }
  return results;
}

function getLastCustomerMessage(): string | null {
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

  // Fallback: scan all message-like elements
  const allMessages = document.querySelectorAll('[class*="message"]');
  const incoming: Element[] = [];
  allMessages.forEach((msg) => {
    const cls = msg.className.toLowerCase();
    if (
      (cls.includes("incoming") || cls.includes("buyer") || cls.includes("customer")) &&
      !cls.includes("outgoing") &&
      !cls.includes("seller")
    ) {
      incoming.push(msg);
    }
  });

  if (incoming.length > 0) {
    const text = incoming[incoming.length - 1].textContent?.trim();
    if (text && text.length > 5) return text;
  }

  console.warn("[ЮрКонтур] WB parser: не удалось найти сообщение покупателя");
  return null;
}

function observeChat(callback: (message: string) => void): MutationObserver | null {
  const chatContainer = findElement(document, SELECTORS.chatContainer);
  const target = chatContainer || document.body;

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        const msg = getLastCustomerMessage();
        if (msg) callback(msg);
      }
    }
  });

  observer.observe(target, { childList: true, subtree: true });
  return observer;
}

export const wbParser = {
  marketplace: "wb" as const,
  getLastCustomerMessage,
  observeChat,
  isApplicable: () => window.location.hostname === "seller.wildberries.ru",
};
