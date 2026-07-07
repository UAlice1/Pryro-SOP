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
    include: { sections: { orderBy: { order: "asc" } } },
  });
  if (!sop) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (sop.status === "APPROVED" || sop.status === "PUBLISHED") {
    return NextResponse.json({ error: "Cannot modify approved or published SOPs" }, { status: 403 });
  }

  const content = sop.sections.map((s) => `${s.title}: ${s.content}`).join("\n");

  const prompt = `You are a compliance and safety expert. Generate comprehensive safety and compliance requirements for this SOP.

SOP Title: ${sop.title}
Process: ${sop.processName ?? ""}
Description: ${sop.description ?? ""}
SOP Content: ${content || "Not defined"}

Generate:
- Health and safety requirements
- Regulatory compliance requirements
- Data privacy and security considerations
- Risk mitigation steps
- Audit and documentation requirements
- Incident reporting procedures (if applicable)
- Required certifications or training

Return ONLY valid JSON:
{
  "safety": {
    "overview": "high-level safety and compliance summary",
    "requirements": [
      { "category": "Health & Safety|Compliance|Data Privacy|Risk|Audit", "description": "specific requirement" }
    ],
    "regulations": ["relevant regulation or standard if applicable"],
    "training": "any required training or certifications"
  }
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
        prompt: `Generate safety guidelines for: ${sop.title}`,
        result,
      },
    });

    return NextResponse.json({ result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
