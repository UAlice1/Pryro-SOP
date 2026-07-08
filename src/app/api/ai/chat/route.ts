import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAISettings, callAI } from "@/lib/ai";

interface Message { role: "user" | "assistant"; content: string }

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sopId, messages } = (await req.json()) as { sopId: string; messages: Message[] };
  if (!sopId || !messages?.length) {
    return NextResponse.json({ error: "sopId and messages required" }, { status: 400 });
  }

  // Load the SOP with all its content to use as context
  const sop = await db.sOP.findFirst({
    where: { id: sopId, authorId: session.user.id },
    include: {
      sections: { orderBy: { order: "asc" } },
      workflowSteps: { orderBy: { stepNumber: "asc" } },
      checklistItems: { orderBy: { order: "asc" } },
      responsibilities: { orderBy: { order: "asc" } },
      resources: { orderBy: { order: "asc" } },
    },
  });

  if (!sop) {
    return NextResponse.json({ error: "SOP not found" }, { status: 404 });
  }

  // Build the SOP context document
  const sections = sop.sections
    .map((s) => `## ${s.title}\n${s.content}`)
    .join("\n\n");

  const workflow =
    sop.workflowSteps.length > 0
      ? "## Workflow Steps\n" +
        sop.workflowSteps
          .map((s) => `${s.stepNumber}. **${s.title}**${s.role ? ` (${s.role})` : ""}${s.description ? ` — ${s.description}` : ""}`)
          .join("\n")
      : "";

  const checklist =
    sop.checklistItems.length > 0
      ? "## Checklist\n" +
        sop.checklistItems.map((c) => `- ${c.text}${c.isRequired ? " [REQUIRED]" : ""}`).join("\n")
      : "";

  const responsibilities =
    sop.responsibilities.length > 0
      ? "## Responsibilities\n" +
        sop.responsibilities.map((r) => `- **${r.role}**: ${r.description}`).join("\n")
      : "";

  const resources =
    sop.resources.length > 0
      ? "## Resources\n" +
        sop.resources.map((r) => `- ${r.name} (${r.type ?? "General"}): ${r.description ?? ""}`).join("\n")
      : "";

  const sopContext = [
    `# ${sop.title}`,
    sop.description ? `**Description:** ${sop.description}` : "",
    sections,
    workflow,
    checklist,
    responsibilities,
    resources,
  ]
    .filter(Boolean)
    .join("\n\n");

  // Last user question
  const lastQuestion = messages[messages.length - 1]?.content ?? "";

  // Build conversation history for context
  const conversationHistory = messages
    .slice(-6) // last 3 turns (user + assistant pairs)
    .map((m) => `${m.role === "user" ? "Employee" : "Assistant"}: ${m.content}`)
    .join("\n");

  const prompt = `You are a helpful assistant that answers employee questions about the following Standard Operating Procedure. Answer clearly, concisely, and only based on the SOP content provided. If the answer is not in the SOP, say so honestly.

=== SOP CONTENT ===
${sopContext}
=== END OF SOP ===

Previous conversation:
${conversationHistory}

Employee's question: ${lastQuestion}

Rules:
- Answer ONLY from the SOP content above
- Be concise and direct (2-4 sentences usually)
- If the answer involves a numbered step, reference it
- If the question cannot be answered from the SOP, say: "That information isn't covered in this SOP."
- Do NOT invent information not present in the SOP

Answer:`;

  try {
    const settings = await getAISettings(session.user.id);
    const answer = await callAI(prompt, settings);

    // Identify which sections were relevant (simple keyword match for citations)
    const sources = sop.sections
      .filter((s) => {
        const lower = lastQuestion.toLowerCase();
        return (
          s.title.toLowerCase().includes(lower) ||
          s.content.toLowerCase().includes(lower.split(" ")[0])
        );
      })
      .slice(0, 3)
      .map((s) => ({ sopId, title: sop.title, section: s.title }));

    return NextResponse.json({ answer, sources });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Chat failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
