import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAISettings, callAI } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sopId, mode } = await req.json();
  // mode: "replace" | "suggest" (default: "suggest" — adds to existing)
  if (!sopId) return NextResponse.json({ error: "sopId required" }, { status: 400 });

  const sop = await db.sOP.findFirst({
    where: { id: sopId, authorId: session.user.id },
    include: {
      sections: { orderBy: { order: "asc" } },
      workflowSteps: { orderBy: { stepNumber: "asc" } },
      responsibilities: true,
    },
  });

  if (!sop) return NextResponse.json({ error: "SOP not found" }, { status: 404 });

  const existingSteps = sop.workflowSteps
    .map((s: { stepNumber: number; title: string; role: string | null; duration: string | null }) =>
      `${s.stepNumber}. ${s.title}${s.role ? ` (${s.role})` : ""}${s.duration ? ` [${s.duration}]` : ""}`,
    )
    .join("\n");

  const sectionContent = sop.sections
    .map((s: { title: string; content: string }) => `${s.title}: ${s.content}`)
    .join("\n");
  const roles = sop.responsibilities
    .map((r: { role: string }) => r.role)
    .join(", ");

  const prompt = `You are an expert business process analyst. Generate a detailed workflow for this Standard Operating Procedure.

SOP Title: ${sop.title}
Process: ${sop.processName ?? ""}
Description: ${sop.description ?? ""}
Known Roles: ${roles || "Not defined"}
SOP Content:
${sectionContent || "Not defined"}
${mode !== "replace" && existingSteps ? `\nExisting workflow steps:\n${existingSteps}\n\nBuild upon or improve these steps.` : "Create a complete workflow from scratch."}

Requirements:
- Each step must have a clear action verb title (e.g., "Verify", "Submit", "Review", "Approve")
- Assign a responsible role to each step
- Estimate realistic duration for each step
- Include decision points and conditional steps where relevant
- Steps should flow logically with dependencies clear
- Include 6-12 steps total for a comprehensive workflow

Return ONLY valid JSON:
{
  "workflow": [
    {
      "stepNumber": 1,
      "title": "step title with action verb",
      "description": "detailed description of what happens in this step",
      "role": "responsible role/person",
      "duration": "estimated time e.g. 15 minutes",
      "type": "action|decision|approval|notification",
      "dependsOn": []
    }
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
        prompt: `Generate workflow for: ${sop.title}`,
        result,
      },
    });

    return NextResponse.json({ result, mode: mode ?? "suggest" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Workflow generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
