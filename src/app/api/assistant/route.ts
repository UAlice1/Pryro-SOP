import { frontendTools } from "@assistant-ui/react-ai-sdk";
import { convertToModelMessages, streamText, createProviderRegistry } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const maxDuration = 30;

const DEFAULT_MODELS: Record<string, string> = {
  openai:      "gpt-4o-mini",
  anthropic:   "claude-3-haiku-20240307",
  groq:        "llama-3.3-70b-versatile",
  openrouter:  "openai/gpt-4o-mini",
  deepseek:    "deepseek-chat",
  mistral:     "mistral-small-latest",
};

const DEFAULT_BASE_URLS: Record<string, string> = {
  openai:     "https://api.openai.com/v1",
  anthropic:  "https://api.anthropic.com/v1",
  groq:       "https://api.groq.com/openai/v1",
  openrouter: "https://openrouter.ai/api/v1",
  deepseek:   "https://api.deepseek.com/v1",
  mistral:    "https://api.mistral.ai/v1",
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Load the user's AI settings from DB; fall back to env vars
  const settings = await db.aISettings.findUnique({
    where: { userId: session.user.id },
  });

  const provider = settings?.provider ?? "openai";
  const model    = (settings?.model && settings.model !== "")
    ? settings.model
    : (DEFAULT_MODELS[provider] ?? "gpt-4o-mini");
  const apiKey   = settings?.apiKey ?? process.env.OPENAI_API_KEY ?? "";
  const baseURL  = settings?.baseUrl ?? DEFAULT_BASE_URLS[provider] ?? "https://api.openai.com/v1";

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "No API key configured. Go to Settings → AI Provider." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Use createOpenAI-compatible client — works for all OpenAI-compatible endpoints
  const providerClient = createOpenAI({ apiKey, baseURL });

  const { messages, system, tools } = await req.json();

  const result = streamText({
    model: providerClient(model),
    system: system ??
      "You are Pryro — an AI assistant that helps managers and business owners create " +
      "professional Standard Operating Procedures (SOPs). " +
      "Your job: listen to how a manager describes a process or task, then use the generate_sop tool " +
      "to produce a complete, structured SOP that an employee can follow. " +
      "Keep responses concise and professional. " +
      "When a user describes any process, task, job role, or procedure — always use the generate_sop tool. " +
      "After generating, offer to refine it or export it as a PDF/DOCX.",
    messages: await convertToModelMessages(messages),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(tools && Object.keys(tools).length > 0 ? { tools: frontendTools(tools) as any } : {}),
  });

  return result.toUIMessageStreamResponse();
}
