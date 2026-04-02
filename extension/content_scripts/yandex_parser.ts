/**
 * Yandex Market Partner Chat DOM Parser
 * Observes partner.market.yandex.ru chat interface and extracts customer messages
 */

const SELECTORS = {
  chatContainer: [
    '[class*="chat-messages"]',
    '[class*="ChatMessages"]',
    '[class*="messages-container"]',
    '[class*="conversation"]',
    '[data-testid="chat"]',
  ],
  incomingMessage: [
    '[class*="message-incoming"]',
    '[class*="incoming"]',
    '[class*="buyer-message"]',
    '[class*="customer"]',
    '[class*="left-message"]',
  ],
  messageText: [
    '[class*="message-text"]',
    '[class*="message__body"]',
    '[class*="MessageBody"]',
    '[class*="text"]',
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

  // Fallback
  const allMessages = document.querySelectorAll('[class*="message"]');
  const incoming: Element[] = [];
  allMessages.forEach((msg) => {
    const cls = msg.className.toLowerCase();
    if (
      (cls.includes("incoming") || cls.includes("buyer") || cls.includes("customer")) &&
      !cls.includes("outgoing") &&
      !cls.includes("seller") &&
      !cls.includes("operator")
    ) {
      incoming.push(msg);
    }
  });

  if (incoming.length > 0) {
    const text = incoming[incoming.length - 1].textContent?.trim();
    if (text && text.length > 5) return text;
  }

  console.warn("[ЮрКонтур] Yandex parser: не удалось найти сообщение покупателя");
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

export const yandexParser = {
  marketplace: "yandex" as const,
  getLastCustomerMessage,
  observeChat,
  isApplicable: () => window.location.hostname === "partner.market.yandex.ru",
};
