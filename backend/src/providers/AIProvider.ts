export type Marketplace = "ozon" | "wb" | "yandex" | "other";
export type CaseType = "question" | "claim";
export type RiskLevel = "low" | "medium" | "high";

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

export interface ExtractedFacts {
  order_number: string | null;
  product: string | null;
  purchase_date: string | null;
  problem: string | null;
  customer_demand: string | null;
  risk_markers: string[];
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

export interface AIProvider {
  readonly name: string;
  analyze(request: AnalysisRequest): Promise<AnalysisResponse>;
}
