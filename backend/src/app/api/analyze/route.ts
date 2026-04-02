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

export async function POST(request: Request) {
  try {
    // CORS headers for extension
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ошибка валидации", details: parsed.error.flatten() },
        { status: 400, headers }
      );
    }

    const result = await analyzeMessage(parsed.data);

    return NextResponse.json(result, { headers });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
