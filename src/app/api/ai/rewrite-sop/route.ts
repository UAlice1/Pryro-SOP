import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAISettings, callAI } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sopId } = await req.json();
  if (!sopId) return NextResponse.json({ error: "sopId required" }, { status: 400 });

  // Fetch full SOP with all content
  const sop = await db.sOP.findFirst({
    where: { id: sopId, authorId: session.user.id },
    include: {
      sections: { orderBy: { order: "asc" } },
      workflowSteps: { orderBy: { stepNumber: "asc" } },
      checklistItems: { orderBy: { order: "asc" } },
      responsibilities: { orderBy: { order: "asc" } },
    },
  });

  if (!sop) return NextResponse.json({ error: "SOP not found" }, { status: 404 });

  // Block rewrite on approved/published SOPs
  if (sop.status === "APPROVED" || sop.status === "PUBLISHED") {
    return NextResponse.json(
      { error: "Cannot rewrite an approved or published SOP. Change status to Draft first." },
      { status: 403 }
    );
  }

  // Build context from existing SOP
  const existingSections = sop.sections
    .map((s: { title: string; content: string }) => `${s.title}: ${s.content}`)
    .join("\n\n");
  const existingWorkflow = sop.workflowSteps
    .map((s: { stepNumber: number; title: string; description: string | null }) =>
      `${s.stepNumber}. ${s.title}: ${s.description ?? ""}`,
    )
    .join("\n");

  const prompt = `You are an expert business analyst. Rewrite the following Standard Operating Procedure to be more professional, comprehensive, and clear. 

IMPORTANT RULES:
- Preserve the original PURPOSE and SCOPE — do not change what this SOP is about
- Keep the same process name and department context
- Regenerate ALL section content to be more detailed, professional, and actionable
- Return ONLY valid JSON in the exact structure below

ORIGINAL SOP:
Title: ${sop.title}
Description: ${sop.description ?? ""}
Process: ${sop.processName ?? ""}
Existing Content:
${existingSections}
Existing Workflow:
${existingWorkflow}

Return this JSON structure:
{
  "title": "improved title if needed, or same",
  "purpose": "clear and professional purpose statement",
  "scope": "who this applies to and what it covers",
  "sections": [
    { "type": "purpose", "title": "Purpose", "content": "...", "order": 1 },
    { "type": "scope", "title": "Scope", "content": "...", "order": 2 },
    { "type": "procedures", "title": "Procedures", "content": "...", "order": 3 },
    { "type": "safety", "title": "Safety & Compliance", "content": "...", "order": 4 },
    { "type": "quality", "title": "Quality Standards", "content": "...", "order": 5 },
    { "type": "notes", "title": "Notes", "content": "...", "order": 6 }
  ],
  "workflow": [
    { "stepNumber": 1, "title": "...", "description": "...", "role": "...", "duration": "..." }
  ],
  "checklist": [
    { "text": "...", "isRequired": true }
  ],
  "responsibilities": [
    { "role": "...", "description": "..." }
  ]
}

Return ONLY valid JSON, no markdown.`;

  try {
    const settings = await getAISettings(session.user.id);
    const raw = await callAI(prompt, settings);
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const result = JSON.parse(cleaned);

    // Log AI usage
    await db.aIGeneration.create({
      data: {
        sopId,
        userId: session.user.id,
        provider: settings.provider,
        model: settings.model,
        prompt: `Rewrite SOP: ${sop.title}`,
        result,
      },
    });

    return NextResponse.json({ result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Rewrite failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
