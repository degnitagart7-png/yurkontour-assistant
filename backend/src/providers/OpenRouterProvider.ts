import OpenAI from "openai";
import {
  AIProvider,
  AnalysisRequest,
  AnalysisResponse,
  QuestionCategory,
  ClaimCategory,
} from "./AIProvider";
import { SYSTEM_PROMPT, buildUserPrompt } from "./system_prompt";

export class OpenRouterProvider implements AIProvider {
  readonly name = "openrouter";
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.model = model || "openai/gpt-4o-mini";
    this.client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
      defaultHeaders: {
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "YurKontour Assistant",
      },
    });
  }

  async analyze(request: AnalysisRequest): Promise<AnalysisResponse> {
    const userMessage = buildUserPrompt(
      request.message,
      request.marketplace,
      request.product_context,
    );

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 4000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error("Пустой ответ от AI");
      }

      const parsed = JSON.parse(content);
      return this.validateAndNormalize(parsed);
    } catch (err) {
      if (err instanceof OpenAI.APIError) {
        const status = err.status;
        if (status === 429) {
          throw new Error("Превышен лимит запросов к AI. Попробуйте через минуту.");
        }
        if (status && status >= 500) {
          throw new Error("Сервис AI временно недоступен. Попробуйте позже.");
        }
        throw new Error(`Ошибка API: ${err.message}`);
      }
      if (err instanceof SyntaxError) {
        throw new Error("AI вернул невалидный JSON. Попробуйте ещё раз.");
      }
      throw err;
    }
  }

  private validateAndNormalize(raw: Record<string, unknown>): AnalysisResponse {
    return {
      type: (raw.type as "question" | "claim") || "question",
      category: (raw.category as QuestionCategory | ClaimCategory) || "other",
      confidence: typeof raw.confidence === "number"
        ? Math.max(0, Math.min(1, raw.confidence))
        : 0.7,
      risk_level: (raw.risk_level as "low" | "medium" | "high") || "low",
      extracted_facts: {
        order_number: this.str(raw.extracted_facts, "order_number"),
        product: this.str(raw.extracted_facts, "product"),
        purchase_date: this.str(raw.extracted_facts, "purchase_date"),
        problem: this.str(raw.extracted_facts, "problem"),
        customer_demand: this.str(raw.extracted_facts, "customer_demand"),
        risk_markers: this.strArr(raw.extracted_facts, "risk_markers"),
      },
      short_reply: typeof raw.short_reply === "string" ? raw.short_reply : "",
      formal_reply: typeof raw.formal_reply === "string" ? raw.formal_reply : null,
      clarifying_questions: Array.isArray(raw.clarifying_questions)
        ? raw.clarifying_questions.filter((q): q is string => typeof q === "string")
        : [],
      missing_documents: Array.isArray(raw.missing_documents)
        ? raw.missing_documents.filter((d): d is string => typeof d === "string")
        : [],
      lawyer_summary: typeof raw.lawyer_summary === "string" ? raw.lawyer_summary : null,
      deadline_days: typeof raw.deadline_days === "string" ? raw.deadline_days
        : typeof raw.deadline_days === "number" ? `${raw.deadline_days} дней`
        : null,
      financial_risk_estimate: typeof raw.financial_risk_estimate === "string"
        ? raw.financial_risk_estimate : null,
      required_legal_actions: Array.isArray(raw.required_legal_actions)
        ? raw.required_legal_actions.filter((a): a is string => typeof a === "string")
        : [],
    };
  }

  private str(obj: unknown, key: string): string | null {
    if (obj && typeof obj === "object" && key in obj) {
      const val = (obj as Record<string, unknown>)[key];
      return typeof val === "string" && val.length > 0 ? val : null;
    }
    return null;
  }

  private strArr(obj: unknown, key: string): string[] {
    if (obj && typeof obj === "object" && key in obj) {
      const val = (obj as Record<string, unknown>)[key];
      return Array.isArray(val) ? val.filter((v): v is string => typeof v === "string") : [];
    }
    return [];
  }
}
