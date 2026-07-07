import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await db.aISettings.findUnique({ where: { userId: session.user.id } });
  if (!settings) {
    return NextResponse.json({
      provider: "openai",
      model: "gpt-4o-mini",
      apiKey: "",
      baseUrl: "",
      temperature: 0.7,
      maxTokens: 4000,
      hasApiKey: false,
    });
  }

  return NextResponse.json({
    provider: settings.provider,
    model: settings.model,
    // Never return the real key — just indicate whether one is saved
    apiKey: "",
    baseUrl: settings.baseUrl ?? "",
    temperature: settings.temperature,
    maxTokens: settings.maxTokens,
    hasApiKey: !!settings.apiKey,
    apiKeyHint: settings.apiKey ? `••••••••${settings.apiKey.slice(-4)}` : "",
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { provider, model, apiKey, baseUrl, temperature, maxTokens } = body;

  // Validate required fields
  if (!provider || !model) {
    return NextResponse.json({ error: "Provider and model are required" }, { status: 400 });
  }

  const data: Record<string, unknown> = {
    provider,
    model,
    temperature: temperature ?? 0.7,
    maxTokens: maxTokens ?? 4000,
    baseUrl: baseUrl || null,
  };

  // Only update API key if a new one was provided (not empty)
  if (apiKey && apiKey.trim() !== "") {
    data.apiKey = apiKey.trim();
  }

  const settings = await db.aISettings.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...data },
    update: data,
  });

  return NextResponse.json({
    success: true,
    provider: settings.provider,
    model: settings.model,
    hasApiKey: !!settings.apiKey,
  });
}
