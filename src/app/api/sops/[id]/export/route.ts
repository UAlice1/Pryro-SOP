import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateSOPHTML, type SOPExportData } from "@/lib/pdf-generator";
import { generateDOCX } from "@/lib/docx-generator";
import { generateSOPMarkdown } from "@/lib/export/markdown-generator";

export const maxDuration = 60;

async function getSOPForExport(id: string): Promise<SOPExportData | null> {
  return db.sOP.findFirst({
    where: { id },
    include: {
      sections:         { orderBy: { order: "asc" } },
      workflowSteps:    { orderBy: { stepNumber: "asc" } },
      checklistItems:   { orderBy: { order: "asc" } },
      responsibilities: { orderBy: { order: "asc" } },
      resources:        { orderBy: { order: "asc" } },
      documentation:    true,
      tags:             true,
      department:       true,
      category:         true,
      author:           { select: { name: true } },
      approvals: {
        where:     { status: "APPROVED" },
        include:   { approver: { select: { name: true } } },
        orderBy:   { updatedAt: "desc" },
        take:      1,
      },
    },
  }) as Promise<SOPExportData | null>;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const format = (searchParams.get("format") ?? "html") as "html" | "pdf" | "docx" | "md";

  const sop = await getSOPForExport(id);
  if (!sop) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.exportHistory.create({
    data: {
      sopId:    id,
      userId:   session.user.id,
      format,
      fileName: `${sop.title}.${format}`,
    },
  });

  const safeTitle = encodeURIComponent(
    sop.title.replace(/[^a-zA-Z0-9\s\-_]/g, "").trim() || "sop",
  );

  // ── HTML ──────────────────────────────────────────────────────
  if (format === "html") {
    const html = generateSOPHTML(sop, false);
    return new NextResponse(html, {
      headers: {
        "Content-Type":        "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeTitle}.html"`,
      },
    });
  }

  // ── PDF ───────────────────────────────────────────────────────
  // PDF generation is handled client-side via browser print dialog.
  // This fallback returns the HTML version for server-side callers.
  if (format === "pdf") {
    const html = generateSOPHTML(sop, true);
    return new NextResponse(html, {
      headers: {
        "Content-Type":        "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeTitle}.html"`,
      },
    });
  }

  // ── DOCX ──────────────────────────────────────────────────────
  if (format === "docx") {
    try {
      const docxBuffer = await generateDOCX(sop);
      return new NextResponse(Buffer.from(docxBuffer) as unknown as BodyInit, {
        headers: {
          "Content-Type":        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${safeTitle}.docx"`,
        },
      });
    } catch (err) {
      console.error("DOCX generation error:", err);
      return NextResponse.json({ error: "DOCX generation failed" }, { status: 500 });
    }
  }

  // ── Markdown ──────────────────────────────────────────────────
  if (format === "md") {
    const markdown = generateSOPMarkdown(sop);
    return new NextResponse(markdown, {
      headers: {
        "Content-Type":        "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeTitle}.md"`,
      },
    });
  }

  return NextResponse.json({ error: "Unsupported format. Use html, pdf, docx, or md." }, { status: 400 });
}

