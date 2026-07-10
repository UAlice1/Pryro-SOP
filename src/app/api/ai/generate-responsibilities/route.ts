import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAISettings, callAI } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sopId } = await req.json();
  if (!sopId) return NextResponse.json({ error: "sopId required" }, { status: 400 });

  const sop = await db.sOP.findFirst({
    where: { id: sopId, authorId: session.user.id },
    include: {
      sections: { orderBy: { order: "asc" } },
      workflowSteps: { orderBy: { stepNumber: "asc" } },
    },
  });
  if (!sop) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (sop.status === "APPROVED" || sop.status === "PUBLISHED") {
    return NextResponse.json({ error: "Cannot modify approved or published SOPs" }, { status: 403 });
  }

  const workflowRoles = [
    ...new Set(
      sop.workflowSteps
        .map((s: { role: string | null }) => s.role)
        .filter(Boolean),
    ),
  ].join(", ");
  const content = sop.sections
    .map((s: { title: string; content: string }) => `${s.title}: ${s.content}`)
    .join("\n");

  const prompt = `You are an expert business analyst. Define clear roles and responsibilities for this Standard Operating Procedure.

SOP Title: ${sop.title}
Process: ${sop.processName ?? ""}
Description: ${sop.description ?? ""}
Workflow Roles Mentioned: ${workflowRoles || "Not defined"}
SOP Content: ${content || "Not defined"}

Generate a comprehensive RACI-style responsibilities matrix. Include:
- Process Owner (accountable for the overall process)
- All active participants with specific duties
- Reviewers and approvers
- Supporting roles

Return ONLY valid JSON:
{
  "responsibilities": [
    {
      "role": "role title e.g. Process Owner, Department Manager",
      "description": "specific responsibilities and duties for this role in 1-2 sentences"
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
        prompt: `Generate responsibilities for: ${sop.title}`,
        result,
      },
    });

    return NextResponse.json({ result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
