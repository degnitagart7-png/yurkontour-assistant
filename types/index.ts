// === Shared Types ===

export type Marketplace = "ozon" | "wb" | "yandex" | "other";
export type CaseType = "question" | "claim";
export type RiskLevel = "low" | "medium" | "high";
export type Confidence = "high" | "medium" | "low";

export type QuestionCategory =
  | "specs"
  | "compatibility"
  | "completeness"
  | "warranty"
  | "delivery"
  | "other";

export type ClaimCategory =
  | "defect"
  | "malfunction"
  | "mismatch"
  | "incomplete"
  | "delivery_delay"
  | "return_demand"
  | "court_threat"
  | "other";

export interface ExtractedFacts {
  order_number: string | null;
  product: string | null;
  purchase_date: string | null;
  problem: string | null;
  customer_demand: string | null;
  risk_markers: string[];
}

export interface ProductSpec {
  key: string;
  value: string;
}

export interface ProductContext {
  name: string | null;
  specs: ProductSpec[];
  description: string | null;
  pageType: "product" | "chat" | "other";
  url: string;
}

export interface AnalysisRequest {
  message: string;
  marketplace: Marketplace;
  context?: Record<string, unknown>;
  product_context?: ProductContext | null;
}

export interface AnalysisResponse {
  type: CaseType;
  category: QuestionCategory | ClaimCategory;
  confidence: number;
  risk_level: RiskLevel;
  extracted_facts: ExtractedFacts;
  short_reply: string;
  formal_reply: string | null;
  clarifying_questions: string[];
  missing_documents: string[];
  lawyer_summary: string | null;
  /** Lawyer contour fields (claims only) */
  deadline_days: string | null;
  financial_risk_estimate: string | null;
  required_legal_actions: string[];
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  marketplace: Marketplace;
  messagePreview: string;
  type: CaseType;
  category: string;
  risk_level: RiskLevel;
  response: AnalysisResponse;
}

// Labels for UI
export const MARKETPLACE_LABELS: Record<Marketplace, string> = {
  ozon: "Ozon",
  wb: "Wildberries",
  yandex: "Яндекс Маркет",
  other: "Другое",
};

export const QUESTION_CATEGORY_LABELS: Record<QuestionCategory, string> = {
  specs: "Характеристики",
  compatibility: "Совместимость",
  completeness: "Комплектация",
  warranty: "Гарантия",
  delivery: "Доставка",
  other: "Другое",
};

export const CLAIM_CATEGORY_LABELS: Record<ClaimCategory, string> = {
  defect: "Дефект товара",
  malfunction: "Неисправность",
  mismatch: "Не соответствует описанию",
  incomplete: "Некомплект",
  delivery_delay: "Просрочка доставки",
  return_demand: "Требование возврата",
  court_threat: "Угроза судом / жалобой",
  other: "Другое",
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
};

// Chrome extension messaging types
export interface ContentMessage {
  type: "NEW_MESSAGE_DETECTED";
  payload: {
    message: string;
    marketplace: Marketplace;
  };
}

export interface BackgroundMessage {
  type: "ANALYZE_MESSAGE";
  payload: AnalysisRequest;
}

export interface BackgroundResponse {
  type: "ANALYSIS_RESULT" | "ANALYSIS_ERROR";
  payload: AnalysisResponse | { error: string };
}
