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
      checklistItems: { orderBy: { order: "asc" } },
    },
  });
  if (!sop) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const content = sop.sections
    .map((s: { title: string; content: string }) => `${s.title}:\n${s.content}`)
    .join("\n\n");
  const steps = sop.workflowSteps
    .map((s: { stepNumber: number; title: string; description: string | null }) =>
      `${s.stepNumber}. ${s.title}: ${s.description ?? ""}`,
    )
    .join("\n");

  const prompt = `You are a plain-language business writing expert. Explain the following Standard Operating Procedure in simple, everyday language that any employee can understand — no jargon, no complex terms.

SOP Title: ${sop.title}
Process: ${sop.processName ?? ""}

Content:
${content || "Not defined"}

Workflow:
${steps || "Not defined"}

Write a simple explanation that:
- Uses short sentences
- Avoids technical jargon
- Explains WHY this process exists
- Summarizes WHAT each person needs to do
- Highlights the most important steps
- Is readable by someone with no prior knowledge of this process

Keep the explanation under 300 words. Use plain paragraph format.`;

  try {
    const settings = await getAISettings(session.user.id);
    const result = await callAI(prompt, settings);
    return NextResponse.json({ result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Explanation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
