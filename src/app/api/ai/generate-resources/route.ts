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

  const content = sop.sections.map((s) => `${s.title}: ${s.content}`).join("\n");
  const steps = sop.workflowSteps.map((s) => s.title).join(", ");

  const prompt = `You are a business process expert. Identify all required resources, tools, and materials for this Standard Operating Procedure.

SOP Title: ${sop.title}
Process: ${sop.processName ?? ""}
Description: ${sop.description ?? ""}
Workflow Steps: ${steps || "Not defined"}
SOP Content: ${content || "Not defined"}

Identify:
- Software tools and systems
- Physical equipment and materials
- Documents and templates needed
- Access permissions and credentials required
- Human resources (skills/expertise needed)
- External services or vendors

Return ONLY valid JSON:
{
  "resources": [
    {
      "name": "resource name",
      "type": "Software|Equipment|Document|Access|Human|External",
      "description": "what it is and how it's used in this process"
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
        prompt: `Generate resources for: ${sop.title}`,
        result,
      },
    });

    return NextResponse.json({ result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
