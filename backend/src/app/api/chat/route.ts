import { NextResponse } from "next/server";
import { z } from "zod";
import OpenAI from "openai";

// ============ RATE LIMITING ============

const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 30; // 30 requests per minute

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

// Cleanup stale entries periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    const keys = Array.from(rateLimitMap.keys());
    for (const key of keys) {
      const entry = rateLimitMap.get(key);
      if (entry && now > entry.resetAt) rateLimitMap.delete(key);
    }
  }, 60_000);
}

// ============ CORS ============

function getCorsHeaders(request: Request) {
  const origin = request.headers.get("origin") || "";
  const allowedOrigins = [
    "chrome-extension://",
    "https://yurkontour-assistant.vercel.app",
  ];

  const isAllowed = allowedOrigins.some((allowed) => origin.startsWith(allowed));

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "https://yurkontour-assistant.vercel.app",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

// ============ SYSTEM PROMPT ============

const CHAT_SYSTEM_PROMPT = `Ты — опытный бизнес-ассистент для продавцов на российских маркетплейсах (Ozon, Wildberries, Яндекс Маркет). Ты хорошо знаешь:

- Правила и регламенты маркетплейсов
- Налогообложение для ИП и самозанятых
- Логистику и фулфилмент
- Оформление документов для торговли
- Работу с возвратами и претензиями
- Комиссии и финансовые расчёты
- Законодательство РФ для интернет-торговли

Отвечай по-русски, кратко и практично. Если вопрос касается юридических рисков или претензий от покупателей — рекомендуй обратиться к юристу для детального анализа.
Не придумывай конкретные цифры комиссий или штрафов если не уверен — лучше скажи что нужно проверить в актуальных правилах маркетплейса.`;

// ============ VALIDATION ============

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(5000),
});

const requestSchema = z.object({
  message: z
    .string()
    .min(1, "Сообщение не может быть пустым")
    .max(2000, "Сообщение слишком длинное (макс. 2000 символов)"),
  history: z.array(messageSchema).max(20).default([]),
});

// ============ POST HANDLER ============

export async function POST(request: Request) {
  const headers = getCorsHeaders(request);
  const clientIp = getClientIp(request);

  try {
    // Rate limit check
    if (!checkRateLimit(clientIp)) {
      console.warn(`[chat] Rate limit exceeded for IP: ${clientIp}`);
      return NextResponse.json(
        { error: "Превышен лимит запросов. Подождите минуту." },
        { status: 429, headers }
      );
    }

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      console.warn(`[chat] Validation error:`, parsed.error.flatten());
      return NextResponse.json(
        { error: "Ошибка валидации", details: parsed.error.flatten() },
        { status: 400, headers }
      );
    }

    const { message, history } = parsed.data;

    // Use mock if no API key
    const useMock = process.env.USE_MOCK_AI === "true";
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (useMock || !apiKey) {
      const reply = getMockChatReply(message);
      return NextResponse.json({ reply }, { headers });
    }

    const client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
      defaultHeaders: {
        "HTTP-Referer": "https://yurkontour-assistant.vercel.app",
        "X-Title": "YurKontour Assistant",
      },
    });

    // Build messages array: system + history + current user message
    const chatMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: CHAT_SYSTEM_PROMPT },
    ];

    // Add conversation history (last 10 messages)
    for (const msg of history.slice(-10)) {
      chatMessages.push({ role: msg.role, content: msg.content });
    }

    // Add current message
    chatMessages.push({ role: "user", content: message });

    const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

    const completion = await client.chat.completions.create({
      model,
      messages: chatMessages,
      temperature: 0.5,
      max_tokens: 2000,
    });

    const reply = completion.choices[0]?.message?.content || "Не удалось сгенерировать ответ.";

    return NextResponse.json({ reply }, { headers });
  } catch (error) {
    console.error(`[chat] Error for IP ${clientIp}:`, error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера. Попробуйте позже." },
      { status: 500, headers }
    );
  }
}

// ============ OPTIONS (CORS preflight) ============

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

// ============ MOCK REPLIES ============

function getMockChatReply(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("комисси") || lower.includes("процент")) {
    return "Комиссии маркетплейсов зависят от категории товара и условий сотрудничества. Рекомендую проверить актуальные тарифы в личном кабинете продавца на соответствующем маркетплейсе, так как они регулярно обновляются.";
  }

  if (lower.includes("налог") || lower.includes("ип") || lower.includes("самозанят")) {
    return "Для торговли на маркетплейсах наиболее популярны два режима: ИП на УСН (6% с дохода или 15% с прибыли) и самозанятость (НПД — 6% от юрлиц). Самозанятость подходит при обороте до 2.4 млн руб/год. Для больших оборотов стоит рассмотреть ИП. Рекомендую проконсультироваться с бухгалтером для выбора оптимального режима.";
  }

  if (lower.includes("возврат") || lower.includes("претенз") || lower.includes("жалоб")) {
    return "Для работы с возвратами и претензиями рекомендую использовать вкладку анализа обращений в этом расширении — она даст детальный юридический разбор ситуации. Для сложных случаев обратитесь к юристу.";
  }

  if (lower.includes("документ") || lower.includes("оформ")) {
    return "Для торговли на маркетплейсах вам понадобятся: свидетельство о регистрации ИП/ООО или статус самозанятого, ИНН, реквизиты расчётного счёта, сертификаты/декларации на товар (для определённых категорий). Точный перечень документов зависит от категории товара и маркетплейса.";
  }

  if (lower.includes("логистик") || lower.includes("фулфилмент") || lower.includes("доставк")) {
    return "Маркетплейсы предлагают несколько схем логистики: FBO (товар на складе маркетплейса), FBS (хранение у продавца, доставка через маркетплейс), DBS (полностью своя доставка). FBO обычно даёт лучшую видимость в поиске, но требует поддержания стока. Выбор зависит от объёмов и типа товара.";
  }

  if (lower.includes("блокировк") || lower.includes("заблокир") || lower.includes("забанили")) {
    return "При блокировке аккаунта на маркетплейсе: 1) Проверьте причину в уведомлении. 2) Подготовьте апелляцию с документами (сертификаты, декларации). 3) Подайте через форму поддержки. При необоснованной блокировке можно направить досудебную претензию (ст. 10, 15 ГК РФ) или обратиться в ФАС (ФЗ-135). Срок рассмотрения апелляции — обычно до 30 дней.";
  }

  return "Спасибо за вопрос! Я помогаю с вопросами по работе на маркетплейсах: правила площадок, налоги, логистика, документы, возвраты. Уточните, пожалуйста, что именно вас интересует, и я постараюсь дать практичный ответ.";
}
