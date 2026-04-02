/**
 * Product Page Parser
 * Extracts product name, characteristics, and description from marketplace product pages.
 * Used to provide real product context to AI to prevent hallucination.
 */

export interface ProductSpec {
  key: string;
  value: string;
}

export interface ProductInfo {
  name: string | null;
  specs: ProductSpec[];
  description: string | null;
  pageType: "product" | "chat" | "other";
  url: string;
}

type Marketplace = "ozon" | "wb" | "yandex" | "other";

const MAX_SPECS = 50;
const MAX_DESCRIPTION_LENGTH = 800;

// ============ PAGE TYPE DETECTION ============

function detectPageType(marketplace: Marketplace): "product" | "chat" | "other" {
  const url = window.location.href.toLowerCase();
  const path = window.location.pathname.toLowerCase();

  switch (marketplace) {
    case "ozon":
      // Ozon seller portal: /product/ pages are product cards, /conversations/ or /chats/ are chat
      if (path.includes("/product/") || path.includes("/products/")) return "product";
      if (path.includes("/conversation") || path.includes("/chat") || path.includes("/message")) return "chat";
      return "other";

    case "wb":
      // WB seller portal: /catalog/card/ or /card/ or URL with product ID pattern
      if (path.includes("/card/") || path.includes("/catalog/") || path.includes("/content/cards")) return "product";
      if (path.includes("/chat") || path.includes("/feedback") || path.includes("/question")) return "chat";
      return "other";

    case "yandex":
      // Yandex Market partner: /offer/ or /assortment/ for products
      if (path.includes("/offer") || path.includes("/assortment") || path.includes("/catalog/")) return "product";
      if (path.includes("/chat") || path.includes("/message") || path.includes("/conversation")) return "chat";
      return "other";

    default:
      return "other";
  }
}

// ============ COMMON HELPERS ============

function cleanText(text: string | null | undefined): string | null {
  if (!text) return null;
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned.length > 0 ? cleaned : null;
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).replace(/\s+\S*$/, "") + "...";
}

/**
 * Extract key-value pairs from dl/dt/dd structures.
 */
function parseDlPairs(root: Element | Document): ProductSpec[] {
  const specs: ProductSpec[] = [];
  const dls = root.querySelectorAll("dl");

  for (const dl of dls) {
    const dts = dl.querySelectorAll("dt");
    const dds = dl.querySelectorAll("dd");
    const count = Math.min(dts.length, dds.length);

    for (let i = 0; i < count && specs.length < MAX_SPECS; i++) {
      const key = cleanText(dts[i].textContent);
      const value = cleanText(dds[i].textContent);
      if (key && value) {
        specs.push({ key, value });
      }
    }
  }

  return specs;
}

/**
 * Extract key-value pairs from table rows (th/td or td[0]/td[1]).
 */
function parseTablePairs(root: Element | Document): ProductSpec[] {
  const specs: ProductSpec[] = [];
  const tables = root.querySelectorAll("table");

  for (const table of tables) {
    const rows = table.querySelectorAll("tr");
    for (const row of rows) {
      if (specs.length >= MAX_SPECS) break;

      const th = row.querySelector("th");
      const td = row.querySelector("td");
      if (th && td) {
        const key = cleanText(th.textContent);
        const value = cleanText(td.textContent);
        if (key && value) {
          specs.push({ key, value });
        }
        continue;
      }

      // Two-column table without th
      const tds = row.querySelectorAll("td");
      if (tds.length >= 2) {
        const key = cleanText(tds[0].textContent);
        const value = cleanText(tds[1].textContent);
        if (key && value) {
          specs.push({ key, value });
        }
      }
    }
  }

  return specs;
}

/**
 * Extract key-value pairs from common div-based layouts.
 * Many marketplace seller panels render specs as adjacent div pairs.
 */
function parseDivPairs(root: Element | Document): ProductSpec[] {
  const specs: ProductSpec[] = [];

  // Common patterns for spec containers
  const containerSelectors = [
    '[class*="characteristic"]',
    '[class*="Characteristic"]',
    '[class*="spec"]',
    '[class*="Spec"]',
    '[class*="attribute"]',
    '[class*="Attribute"]',
    '[class*="param"]',
    '[class*="Param"]',
    '[class*="property"]',
    '[class*="Property"]',
    '[data-testid*="characteristic"]',
    '[data-testid*="spec"]',
    '[data-testid*="attribute"]',
  ];

  for (const selector of containerSelectors) {
    try {
      const containers = root.querySelectorAll(selector);
      for (const container of containers) {
        if (specs.length >= MAX_SPECS) break;

        // Check for key-value child divs
        const keyEl = container.querySelector(
          '[class*="key"], [class*="Key"], [class*="name"], [class*="Name"], [class*="label"], [class*="Label"]'
        );
        const valEl = container.querySelector(
          '[class*="value"], [class*="Value"], [class*="val"], [class*="Val"], [class*="content"], [class*="Content"]'
        );

        if (keyEl && valEl) {
          const key = cleanText(keyEl.textContent);
          const value = cleanText(valEl.textContent);
          if (key && value && key !== value) {
            specs.push({ key, value });
          }
        }
      }
    } catch {
      // Invalid selector, skip
    }
  }

  return specs;
}

/**
 * Find description text from common section patterns.
 */
function findDescription(root: Element | Document): string | null {
  // Look for "Описание" / "О товаре" sections
  const headingTexts = ["описание", "о товаре", "description"];
  const allHeadings = root.querySelectorAll("h1, h2, h3, h4, h5, h6, [class*='title'], [class*='Title'], [class*='heading'], [class*='Heading']");

  for (const heading of allHeadings) {
    const headText = heading.textContent?.toLowerCase().trim() || "";
    if (headingTexts.some((t) => headText.includes(t))) {
      // Get the next sibling or parent's content
      const parent = heading.parentElement;
      if (parent) {
        // Try next sibling element
        let sibling = heading.nextElementSibling;
        if (sibling) {
          const text = cleanText(sibling.textContent);
          if (text && text.length > 20) {
            return truncate(text, MAX_DESCRIPTION_LENGTH);
          }
        }
        // Try parent's text excluding the heading itself
        const parentText = cleanText(parent.textContent);
        const headingText = cleanText(heading.textContent);
        if (parentText && headingText) {
          const desc = parentText.replace(headingText, "").trim();
          if (desc.length > 20) {
            return truncate(desc, MAX_DESCRIPTION_LENGTH);
          }
        }
      }
    }
  }

  // Fallback: look for description containers by class/data attribute
  const descSelectors = [
    '[class*="description"]',
    '[class*="Description"]',
    '[data-testid*="description"]',
    '[class*="product-text"]',
    '[class*="ProductText"]',
    '[class*="about-product"]',
    '[class*="AboutProduct"]',
  ];

  for (const selector of descSelectors) {
    try {
      const el = root.querySelector(selector);
      if (el) {
        const text = cleanText(el.textContent);
        if (text && text.length > 20) {
          return truncate(text, MAX_DESCRIPTION_LENGTH);
        }
      }
    } catch {
      // skip
    }
  }

  return null;
}

// ============ MARKETPLACE-SPECIFIC PARSERS ============

function parseProductName(): string | null {
  // Strategy 1: h1 tag
  const h1 = document.querySelector("h1");
  if (h1) {
    const text = cleanText(h1.textContent);
    if (text && text.length > 2 && text.length < 300) return text;
  }

  // Strategy 2: og:title meta tag
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) {
    const content = ogTitle.getAttribute("content");
    const text = cleanText(content);
    if (text && text.length > 2) return text;
  }

  // Strategy 3: title-like elements
  const titleSelectors = [
    '[data-testid*="product-name"]',
    '[data-testid*="product-title"]',
    '[class*="product-name"]',
    '[class*="ProductName"]',
    '[class*="product-title"]',
    '[class*="ProductTitle"]',
    '[class*="card-name"]',
    '[class*="CardName"]',
  ];

  for (const selector of titleSelectors) {
    try {
      const el = document.querySelector(selector);
      if (el) {
        const text = cleanText(el.textContent);
        if (text && text.length > 2 && text.length < 300) return text;
      }
    } catch {
      // skip
    }
  }

  // Strategy 4: document.title (last resort, often contains site name)
  const title = document.title;
  if (title) {
    // Remove common suffixes: "- Ozon", "| Wildberries", etc.
    const cleaned = title.replace(/\s*[-|–—]\s*(Ozon|Wildberries|Яндекс|Маркет|Seller|Partner).*$/i, "").trim();
    if (cleaned.length > 2) return cleaned;
  }

  return null;
}

function parseOzonProduct(): Partial<ProductInfo> {
  const specs = [
    ...parseDlPairs(document),
    ...parseTablePairs(document),
    ...parseDivPairs(document),
  ];

  return {
    name: parseProductName(),
    specs: deduplicateSpecs(specs).slice(0, MAX_SPECS),
    description: findDescription(document),
  };
}

function parseWbProduct(): Partial<ProductInfo> {
  const specs = [
    ...parseDlPairs(document),
    ...parseTablePairs(document),
    ...parseDivPairs(document),
  ];

  return {
    name: parseProductName(),
    specs: deduplicateSpecs(specs).slice(0, MAX_SPECS),
    description: findDescription(document),
  };
}

function parseYandexProduct(): Partial<ProductInfo> {
  const specs = [
    ...parseDlPairs(document),
    ...parseTablePairs(document),
    ...parseDivPairs(document),
  ];

  return {
    name: parseProductName(),
    specs: deduplicateSpecs(specs).slice(0, MAX_SPECS),
    description: findDescription(document),
  };
}

function deduplicateSpecs(specs: ProductSpec[]): ProductSpec[] {
  const seen = new Set<string>();
  return specs.filter((s) => {
    const key = s.key.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ============ PUBLIC API ============

/**
 * Parse product information from the current page.
 * Returns null if we're not on a product page or nothing could be parsed.
 */
export function parseProductInfo(marketplace: Marketplace): ProductInfo | null {
  const pageType = detectPageType(marketplace);
  const url = window.location.href;

  // Only attempt parsing on product pages
  if (pageType !== "product") {
    return { name: null, specs: [], description: null, pageType, url };
  }

  let parsed: Partial<ProductInfo>;

  switch (marketplace) {
    case "ozon":
      parsed = parseOzonProduct();
      break;
    case "wb":
      parsed = parseWbProduct();
      break;
    case "yandex":
      parsed = parseYandexProduct();
      break;
    default:
      parsed = {
        name: parseProductName(),
        specs: deduplicateSpecs([
          ...parseDlPairs(document),
          ...parseTablePairs(document),
          ...parseDivPairs(document),
        ]).slice(0, MAX_SPECS),
        description: findDescription(document),
      };
  }

  const result: ProductInfo = {
    name: parsed.name || null,
    specs: parsed.specs || [],
    description: parsed.description || null,
    pageType,
    url,
  };

  // Only return non-empty results
  if (!result.name && result.specs.length === 0 && !result.description) {
    return { name: null, specs: [], description: null, pageType, url };
  }

  console.log(
    `[ЮрКонтур] Распознан товар: "${result.name || "?"}", ${result.specs.length} характеристик`,
  );

  return result;
}
