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
  });
  if (!sop) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Get all other SOPs for comparison
  const otherSOPs = await db.sOP.findMany({
    where: { authorId: session.user.id, id: { not: sopId }, isArchived: false },
    select: { id: true, title: true, description: true, processName: true },
    take: 50,
  });

  if (otherSOPs.length === 0) {
    return NextResponse.json({ result: { duplicates: [], message: "No other SOPs to compare against." } });
  }

  const sopList = otherSOPs
    .map((s: { id: string; title: string; processName: string | null; description: string | null }) =>
      `ID: ${s.id} | Title: ${s.title} | Process: ${s.processName ?? ""} | Description: ${(s.description ?? "").slice(0, 100)}`,
    )
    .join("\n");

  const prompt = `You are an expert at identifying duplicate or overlapping business processes.

TARGET SOP:
Title: ${sop.title}
Process: ${sop.processName ?? ""}
Description: ${sop.description ?? ""}

EXISTING SOPs TO COMPARE AGAINST:
${sopList}

Identify any SOPs that appear to be duplicates or have significant overlap with the target SOP.
Consider:
- Same or very similar process names
- Overlapping scope and purpose
- Redundant procedures that could be consolidated

Return ONLY valid JSON:
{
  "duplicates": [
    {
      "id": "sop-id",
      "title": "matching sop title",
      "similarity": "high|medium|low",
      "reason": "specific reason why these overlap"
    }
  ],
  "recommendation": "consolidation recommendation if duplicates found"
}`;

  try {
    const settings = await getAISettings(session.user.id);
    const raw = await callAI(prompt, settings);
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const result = JSON.parse(cleaned);

    return NextResponse.json({ result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Detection failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
