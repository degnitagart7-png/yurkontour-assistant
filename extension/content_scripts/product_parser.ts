/**
 * Product Page Parser
 * Extracts product name, characteristics, and description from marketplace pages.
 * Uses: JSON-LD structured data, meta tags (og:title, og:description), URL patterns,
 * and CSS selectors as fallback. Designed to be resilient to site layout changes.
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

export interface PageContext {
  marketplace: "ozon" | "wb" | "yandex" | null;
  productName: string | null;
  pageType: "product" | "chat" | "other";
}

type Marketplace = "ozon" | "wb" | "yandex" | "other";

const MAX_SPECS = 50;
const MAX_DESCRIPTION_LENGTH = 800;

// ============ MARKETPLACE DETECTION ============

export function detectMarketplace(): Marketplace {
  const host = window.location.hostname;
  if (host.includes("ozon.ru")) return "ozon";
  if (host.includes("wildberries.ru")) return "wb";
  if (host.includes("market.yandex.ru") || host.includes("partner.market.yandex.ru")) return "yandex";
  return "other";
}

// ============ PAGE TYPE DETECTION ============

function detectPageType(marketplace: Marketplace): "product" | "chat" | "other" {
  const path = window.location.pathname.toLowerCase();

  switch (marketplace) {
    case "ozon":
      if (path.includes("/product/") || path.includes("/products/")) return "product";
      if (path.includes("/conversation") || path.includes("/chat") || path.includes("/message")) return "chat";
      return "other";
    case "wb":
      if (path.includes("/card/") || path.includes("/catalog/") || path.includes("/content/cards")) return "product";
      if (path.includes("/chat") || path.includes("/feedback") || path.includes("/question")) return "chat";
      return "other";
    case "yandex":
      if (path.includes("/offer") || path.includes("/assortment") || path.includes("/catalog/")) return "product";
      if (path.includes("/chat") || path.includes("/message") || path.includes("/conversation")) return "chat";
      return "other";
    default:
      return "other";
  }
}

// ============ JSON-LD STRUCTURED DATA ============

interface JsonLdProduct {
  name?: string;
  description?: string;
  brand?: { name?: string } | string;
  sku?: string;
  additionalProperty?: Array<{ name?: string; value?: string }>;
}

function parseJsonLd(): { name: string | null; description: string | null; specs: ProductSpec[] } {
  const result = { name: null as string | null, description: null as string | null, specs: [] as ProductSpec[] };

  try {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent || "");
        const items = Array.isArray(data) ? data : [data];

        for (const item of items) {
          const product = findProductInJsonLd(item);
          if (!product) continue;

          if (product.name) result.name = product.name;
          if (product.description) result.description = truncate(product.description, MAX_DESCRIPTION_LENGTH);

          if (typeof product.brand === "string" && product.brand) {
            result.specs.push({ key: "Бренд", value: product.brand });
          } else if (product.brand && typeof product.brand === "object" && product.brand.name) {
            result.specs.push({ key: "Бренд", value: product.brand.name });
          }

          if (product.sku) {
            result.specs.push({ key: "Артикул", value: product.sku });
          }

          if (Array.isArray(product.additionalProperty)) {
            for (const prop of product.additionalProperty) {
              if (prop.name && prop.value && result.specs.length < MAX_SPECS) {
                result.specs.push({ key: prop.name, value: String(prop.value) });
              }
            }
          }
        }
      } catch {
        // Invalid JSON-LD, skip
      }
    }
  } catch {
    // No JSON-LD support
  }

  return result;
}

function findProductInJsonLd(data: any): JsonLdProduct | null {
  if (!data || typeof data !== "object") return null;

  if (data["@type"] === "Product" || data["@type"] === "IndividualProduct") {
    return data as JsonLdProduct;
  }

  // Check @graph array
  if (Array.isArray(data["@graph"])) {
    for (const item of data["@graph"]) {
      if (item["@type"] === "Product" || item["@type"] === "IndividualProduct") {
        return item as JsonLdProduct;
      }
    }
  }

  return null;
}

// ============ META TAGS ============

function parseMetaTags(): { name: string | null; description: string | null } {
  const result = { name: null as string | null, description: null as string | null };

  const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute("content");
  if (ogTitle && ogTitle.length > 2) result.name = ogTitle.trim();

  const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute("content");
  if (ogDesc && ogDesc.length > 10) result.description = truncate(ogDesc.trim(), MAX_DESCRIPTION_LENGTH);

  // Fallback to meta description
  if (!result.description) {
    const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute("content");
    if (metaDesc && metaDesc.length > 10) result.description = truncate(metaDesc.trim(), MAX_DESCRIPTION_LENGTH);
  }

  return result;
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
      if (key && value) specs.push({ key, value });
    }
  }
  return specs;
}

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
        if (key && value) specs.push({ key, value });
        continue;
      }
      const tds = row.querySelectorAll("td");
      if (tds.length >= 2) {
        const key = cleanText(tds[0].textContent);
        const value = cleanText(tds[1].textContent);
        if (key && value) specs.push({ key, value });
      }
    }
  }
  return specs;
}

function parseDivPairs(root: Element | Document): ProductSpec[] {
  const specs: ProductSpec[] = [];
  const containerSelectors = [
    '[class*="characteristic"]', '[class*="Characteristic"]',
    '[class*="spec"]', '[class*="Spec"]',
    '[class*="attribute"]', '[class*="Attribute"]',
    '[class*="param"]', '[class*="Param"]',
    '[class*="property"]', '[class*="Property"]',
    '[data-testid*="characteristic"]', '[data-testid*="spec"]',
  ];

  for (const selector of containerSelectors) {
    try {
      const containers = root.querySelectorAll(selector);
      for (const container of containers) {
        if (specs.length >= MAX_SPECS) break;
        const keyEl = container.querySelector(
          '[class*="key"], [class*="Key"], [class*="name"], [class*="Name"], [class*="label"], [class*="Label"]'
        );
        const valEl = container.querySelector(
          '[class*="value"], [class*="Value"], [class*="val"], [class*="Val"], [class*="content"], [class*="Content"]'
        );
        if (keyEl && valEl) {
          const key = cleanText(keyEl.textContent);
          const value = cleanText(valEl.textContent);
          if (key && value && key !== value) specs.push({ key, value });
        }
      }
    } catch { /* skip */ }
  }
  return specs;
}

function findDescription(root: Element | Document): string | null {
  const headingTexts = ["описание", "о товаре", "description"];
  const allHeadings = root.querySelectorAll("h1, h2, h3, h4, h5, h6, [class*='title'], [class*='heading']");

  for (const heading of allHeadings) {
    const headText = heading.textContent?.toLowerCase().trim() || "";
    if (headingTexts.some((t) => headText.includes(t))) {
      const sibling = heading.nextElementSibling;
      if (sibling) {
        const text = cleanText(sibling.textContent);
        if (text && text.length > 20) return truncate(text, MAX_DESCRIPTION_LENGTH);
      }
    }
  }

  const descSelectors = [
    '[class*="description"]', '[class*="Description"]',
    '[data-testid*="description"]', '[class*="product-text"]',
    '[class*="about-product"]', '[class*="AboutProduct"]',
  ];

  for (const selector of descSelectors) {
    try {
      const el = root.querySelector(selector);
      if (el) {
        const text = cleanText(el.textContent);
        if (text && text.length > 20) return truncate(text, MAX_DESCRIPTION_LENGTH);
      }
    } catch { /* skip */ }
  }

  return null;
}

function parseProductName(): string | null {
  // Strategy 1: h1
  const h1 = document.querySelector("h1");
  if (h1) {
    const text = cleanText(h1.textContent);
    if (text && text.length > 2 && text.length < 300) return text;
  }

  // Strategy 2: title-like data attributes
  const titleSelectors = [
    '[data-testid*="product-name"]', '[data-testid*="product-title"]',
    '[class*="product-name"]', '[class*="ProductName"]',
    '[class*="product-title"]', '[class*="ProductTitle"]',
  ];
  for (const selector of titleSelectors) {
    try {
      const el = document.querySelector(selector);
      if (el) {
        const text = cleanText(el.textContent);
        if (text && text.length > 2 && text.length < 300) return text;
      }
    } catch { /* skip */ }
  }

  // Strategy 3: document.title (cleaned)
  const title = document.title;
  if (title) {
    const cleaned = title.replace(/\s*[-|–—]\s*(Ozon|Wildberries|Яндекс|Маркет|Seller|Partner).*$/i, "").trim();
    if (cleaned.length > 2) return cleaned;
  }

  return null;
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
 * Priority: JSON-LD > meta tags > DOM selectors > document.title
 */
export function parseProductInfo(marketplace: Marketplace): ProductInfo | null {
  const pageType = detectPageType(marketplace);
  const url = window.location.href;

  if (pageType !== "product") {
    return { name: null, specs: [], description: null, pageType, url };
  }

  // Layer 1: JSON-LD structured data (most reliable)
  const jsonLd = parseJsonLd();

  // Layer 2: Meta tags
  const meta = parseMetaTags();

  // Layer 3: DOM parsing (CSS selectors)
  const domSpecs = deduplicateSpecs([
    ...parseDlPairs(document),
    ...parseTablePairs(document),
    ...parseDivPairs(document),
  ]).slice(0, MAX_SPECS);

  const domDescription = findDescription(document);
  const domName = parseProductName();

  // Merge: JSON-LD > meta > DOM
  const name = jsonLd.name || meta.name || domName || null;
  const description = jsonLd.description || meta.description || domDescription || null;
  const specs = deduplicateSpecs([...jsonLd.specs, ...domSpecs]).slice(0, MAX_SPECS);

  const result: ProductInfo = { name, specs, description, pageType, url };

  if (!result.name && result.specs.length === 0 && !result.description) {
    console.warn(`[ЮрКонтур] Не удалось извлечь данные товара с ${url}`);
    return { name: null, specs: [], description: null, pageType, url };
  }

  console.log(`[ЮрКонтур] Распознан товар: "${result.name || "?"}", ${result.specs.length} характеристик`);
  return result;
}

/**
 * Get lightweight page context for the header indicator.
 */
export function getPageContext(): PageContext {
  const marketplace = detectMarketplace();
  const mp = marketplace === "other" ? null : marketplace;
  const pageType = detectPageType(marketplace);

  let productName: string | null = null;
  if (pageType === "product") {
    // Quick extraction: JSON-LD > meta > h1 > title
    const jsonLd = parseJsonLd();
    if (jsonLd.name) {
      productName = jsonLd.name;
    } else {
      const meta = parseMetaTags();
      productName = meta.name || parseProductName();
    }
  }

  return { marketplace: mp, productName, pageType };
}
