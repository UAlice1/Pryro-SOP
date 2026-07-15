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
  if (format === "pdf") {
    try {
      let browser;
      const isVercel = !!process.env.VERCEL;

      if (isVercel) {
        // On Vercel: use sparticuz chromium (serverless compatible)
        const chromium  = await import("@sparticuz/chromium-min");
        const puppeteer = await import("puppeteer-core");
        const executablePath = await chromium.default.executablePath(
          "https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.tar"
        );
        browser = await puppeteer.default.launch({
          args:            chromium.default.args,
          executablePath,
          headless:        true,
        });
      } else {
        // Locally: use full puppeteer with bundled Chromium
        const puppeteer = await import("puppeteer");
        browser = await puppeteer.default.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
        });
      }

      const page = await browser.newPage();
      await page.setContent(generateSOPHTML(sop, true), { waitUntil: "load" });

      const pdfBuffer = await page.pdf({
        format:               "A4",
        printBackground:      true,
        margin:               { top: "20mm", right: "15mm", bottom: "22mm", left: "15mm" },
        displayHeaderFooter:  true,
        headerTemplate: `<div style="font-size:9px;color:#94a3b8;width:100%;text-align:center;padding-top:8px;">${sop.title.replace(/</g, "&lt;")} &nbsp;·&nbsp; Version ${sop.version}</div>`,
        footerTemplate: `<div style="font-size:9px;color:#94a3b8;width:100%;display:flex;justify-content:space-between;padding:0 15mm 8px;"><span>Pryro SOP &nbsp;·&nbsp; Confidential</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`,
      });

      await browser.close();

      return new NextResponse(Buffer.from(pdfBuffer) as unknown as BodyInit, {
        headers: {
          "Content-Type":        "application/pdf",
          "Content-Disposition": `attachment; filename="${safeTitle}.pdf"`,
        },
      });
    } catch (err) {
      console.error("PDF generation error:", err);
      return NextResponse.json(
        { error: "PDF generation failed. Please try HTML export." },
        { status: 500 },
      );
    }
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
