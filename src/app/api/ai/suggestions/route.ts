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
      checklistItems: true,
      responsibilities: true,
      resources: true,
    },
  });
  if (!sop) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const content = sop.sections.map((s) => `${s.title}: ${s.content}`).join("\n");
  const missingItems = [];
  if (!sop.workflowSteps.length) missingItems.push("workflow steps");
  if (!sop.checklistItems.length) missingItems.push("checklist");
  if (!sop.responsibilities.length) missingItems.push("responsibilities");
  if (!sop.resources.length) missingItems.push("resources");

  const prompt = `You are an expert SOP quality reviewer. Analyze this Standard Operating Procedure and provide specific, actionable improvement suggestions.

SOP Title: ${sop.title}
Process: ${sop.processName ?? ""}
Status: ${sop.status}
Missing Sections: ${missingItems.join(", ") || "None"}
Content:
${content || "Minimal content provided"}
Workflow Steps: ${sop.workflowSteps.length}
Checklist Items: ${sop.checklistItems.length}
Responsibilities Defined: ${sop.responsibilities.length}

Analyze and suggest improvements across these dimensions:
1. Completeness — what's missing?
2. Clarity — what's confusing or ambiguous?
3. Structure — is the flow logical?
4. Compliance — any regulatory gaps?
5. Actionability — can someone follow this without additional help?

Return ONLY valid JSON:
{
  "score": 75,
  "summary": "Overall quality assessment in 1-2 sentences",
  "suggestions": [
    {
      "priority": "high|medium|low",
      "category": "Completeness|Clarity|Structure|Compliance|Actionability",
      "issue": "specific problem found",
      "suggestion": "concrete action to fix it"
    }
  ],
  "missing": ["list of missing sections or elements"]
}`;

  try {
    const settings = await getAISettings(session.user.id);
    const raw = await callAI(prompt, settings);
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const result = JSON.parse(cleaned);

    return NextResponse.json({ result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
