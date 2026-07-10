import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAISettings, callAI } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sopId, mode } = await req.json();
  // mode: "replace" | "append" (default: "append")
  if (!sopId) return NextResponse.json({ error: "sopId required" }, { status: 400 });

  const sop = await db.sOP.findFirst({
    where: { id: sopId, authorId: session.user.id },
    include: {
      sections: { orderBy: { order: "asc" } },
      workflowSteps: { orderBy: { stepNumber: "asc" } },
      checklistItems: { orderBy: { order: "asc" } },
    },
  });

  if (!sop) return NextResponse.json({ error: "SOP not found" }, { status: 404 });

  const existingItems = sop.checklistItems
    .map((c: { text: string }) => `- ${c.text}`)
    .join("\n");
  const workflowContext = sop.workflowSteps
    .map((s: { stepNumber: number; title: string }) => `${s.stepNumber}. ${s.title}`)
    .join("\n");
  const sectionContent = sop.sections
    .map((s: { content: string }) => s.content)
    .join("\n");

  const prompt = `You are an expert process analyst. Generate a comprehensive checklist for the following Standard Operating Procedure.

SOP Title: ${sop.title}
Process: ${sop.processName ?? ""}
Description: ${sop.description ?? ""}
Workflow Steps:
${workflowContext || "Not defined"}
Content:
${sectionContent || "Not defined"}
${mode === "append" && existingItems ? `\nExisting checklist items (do NOT duplicate these):\n${existingItems}` : ""}

Generate a detailed checklist with:
- Pre-execution verification items
- Step-by-step execution checkpoints  
- Quality control sign-off points
- Post-completion verification items
- Required approvals/sign-offs

Return ONLY valid JSON:
{
  "checklist": [
    { "text": "checklist item text", "isRequired": true, "category": "pre|execution|quality|post|approval" }
  ]
}`;

  try {
    const settings = await getAISettings(session.user.id);
    const raw = await callAI(prompt, settings);
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const result = JSON.parse(cleaned);

    await db.aIGeneration.create({
      data: {
        sopId,
        userId: session.user.id,
        provider: settings.provider,
        model: settings.model,
        prompt: `Generate checklist for: ${sop.title}`,
        result,
      },
    });

    return NextResponse.json({ result, mode: mode ?? "append" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Checklist generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
