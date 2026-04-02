import { NextResponse } from "next/server";
import { analyzeMessage } from "@/services/analyzer";
import { z } from "zod";

const productSpecSchema = z.object({
  key: z.string(),
  value: z.string(),
});

const productContextSchema = z.object({
  name: z.string().nullable(),
  specs: z.array(productSpecSchema).default([]),
  description: z.string().nullable(),
  pageType: z.enum(["product", "chat", "other"]),
  url: z.string(),
}).optional().nullable();

const requestSchema = z.object({
  message: z.string().min(3, "Сообщение слишком короткое"),
  marketplace: z.enum(["ozon", "wb", "yandex", "other"]),
  context: z.record(z.string(), z.unknown()).optional(),
  product_context: productContextSchema,
});

function getCorsHeaders(request: Request) {
  const origin = request.headers.get("origin") || "";
  const isAllowed =
    origin.startsWith("chrome-extension://") ||
    origin.startsWith("https://yurkontour-assistant.vercel.app");

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "https://yurkontour-assistant.vercel.app",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function POST(request: Request) {
  const headers = getCorsHeaders(request);

  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      console.warn("[analyze] Validation error:", parsed.error.flatten());
      return NextResponse.json(
        { error: "Ошибка валидации", details: parsed.error.flatten() },
        { status: 400, headers }
      );
    }

    const result = await analyzeMessage(parsed.data);

    return NextResponse.json(result, { headers });
  } catch (error) {
    console.error("[analyze] Error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера. Попробуйте позже." },
      { status: 500, headers }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}
