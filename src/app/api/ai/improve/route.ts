import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAISettings, callAI } from "@/lib/ai";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["rewrite", "improve", "grammar", "summarize", "translate", "simplify"]),
  content: z.string().min(1),
  language: z.string().optional(),
  context: z.string().optional(),
});

const prompts: Record<string, (content: string, extra?: string) => string> = {
  rewrite: (c) => `Rewrite the following SOP content to be more professional, clear, and concise. Maintain all the original information but improve the writing quality:\n\n${c}\n\nReturn only the rewritten content.`,
  improve: (c) => `Improve the following SOP content by making it more detailed, actionable, and professional. Add any missing important details:\n\n${c}\n\nReturn only the improved content.`,
  grammar: (c) => `Fix all grammar, spelling, and punctuation errors in the following text. Do not change the meaning or structure:\n\n${c}\n\nReturn only the corrected text.`,
  summarize: (c) => `Write a concise professional summary of the following SOP content in 2-3 sentences:\n\n${c}\n\nReturn only the summary.`,
  translate: (c, lang) => `Translate the following SOP content to ${lang ?? "Spanish"}. Maintain the professional business tone:\n\n${c}\n\nReturn only the translated content.`,
  simplify: (c) => `Rewrite the following SOP content in simple, plain language that is easy for any employee to understand. Avoid jargon:\n\n${c}\n\nReturn only the simplified content.`,
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  try {
    const settings = await getAISettings(session.user.id);
    const promptFn = prompts[parsed.data.action];
    const prompt = promptFn(parsed.data.content, parsed.data.language);
    const result = await callAI(prompt, settings);
    return NextResponse.json({ result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "AI request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
