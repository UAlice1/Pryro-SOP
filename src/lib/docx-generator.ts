import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  WidthType,
  BorderStyle,
  Packer,
  ShadingType,
  convertInchesToTwip,
  LevelFormat,
  NumberFormat,
} from "docx";
import type { SOPExportData } from "./pdf-generator";

function cell(
  text: string,
  opts: { bold?: boolean; shade?: boolean; color?: string; width?: number } = {}
) {
  return new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    shading: opts.shade ? { type: ShadingType.SOLID, color: "1e40af", fill: "1e40af" } : undefined,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "e2e8f0" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "e2e8f0" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "e2e8f0" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "e2e8f0" },
    },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: opts.bold ?? opts.shade,
            color: opts.shade ? "FFFFFF" : opts.color ?? "1e293b",
            size: opts.shade ? 20 : 22,
          }),
        ],
      }),
    ],
  });
}

function heading(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 120 },
    border: { left: { style: BorderStyle.THICK, size: 12, color: "3b82f6", space: 10 } },
    indent: { left: 180 },
    children: [new TextRun({ text, bold: true, size: 28, color: "1e293b" })],
  });
}

function bodyPara(text: string, indent = 0) {
  return new Paragraph({
    spacing: { after: 80 },
    indent: indent ? { left: indent } : undefined,
    children: [new TextRun({ text, size: 22, color: "374151" })],
  });
}

function divider() {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "e2e8f0" } },
    children: [],
  });
}

export async function generateDOCX(sop: SOPExportData): Promise<Buffer> {
  const lastApproval = sop.approvals?.find((a) => a.status === "APPROVED");

  const formatDate = (d: Date | null | undefined) =>
    d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";

  const children: (Paragraph | Table)[] = [];

  // ── Title block ──────────────────────────────────────────────
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({ text: "STANDARD OPERATING PROCEDURE", bold: true, size: 20, color: "3b82f6", allCaps: true }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [new TextRun({ text: sop.title, bold: true, size: 40, color: "1e40af" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({ text: `Version ${sop.version}  ·  ${sop.status}`, size: 20, color: "64748b" }),
      ],
    })
  );

  if (sop.description) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [new TextRun({ text: sop.description, italics: true, size: 22, color: "64748b" })],
      })
    );
  }

  children.push(divider());

  // ── Metadata table ────────────────────────────────────────────
  children.push(
    new Paragraph({ spacing: { before: 200, after: 120 }, children: [new TextRun({ text: "Document Information", bold: true, size: 24, color: "1e293b" })] })
  );

  const metaRows = [
    ["Author", sop.author.name ?? "—", "Department", sop.department?.name ?? "—"],
    ["Category", sop.category?.name ?? "—", "Status", sop.status],
    ["Created", formatDate(sop.createdAt), "Last Updated", formatDate(sop.updatedAt)],
    ...(lastApproval ? [["Approved By", lastApproval.approver.name ?? "—", "Approval Date", formatDate(lastApproval.updatedAt)]] : []),
    ...(sop.publishedAt ? [["Published", formatDate(sop.publishedAt), "Version", String(sop.version)]] : []),
  ];

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: metaRows.map(
        (row) =>
          new TableRow({
            children: [
              cell(row[0], { bold: true, width: 20, color: "64748b" }),
              cell(row[1], { width: 30 }),
              cell(row[2], { bold: true, width: 20, color: "64748b" }),
              cell(row[3], { width: 30 }),
            ],
          })
      ),
    })
  );

  // ── Approval banner ───────────────────────────────────────────
  if (lastApproval) {
    children.push(
      new Paragraph({ spacing: { before: 200 }, children: [] }),
      new Paragraph({
        spacing: { before: 120, after: 120 },
        shading: { type: ShadingType.SOLID, color: "f0fdf4", fill: "f0fdf4" },
        border: {
          top: { style: BorderStyle.SINGLE, size: 4, color: "bbf7d0" },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: "bbf7d0" },
          left: { style: BorderStyle.THICK, size: 16, color: "22c55e" },
          right: { style: BorderStyle.SINGLE, size: 4, color: "bbf7d0" },
        },
        indent: { left: 200, right: 200 },
        children: [
          new TextRun({ text: "✓  Approved", bold: true, color: "166534", size: 22 }),
          new TextRun({ text: `  by ${lastApproval.approver.name ?? "—"} on ${formatDate(lastApproval.updatedAt)}`, color: "166534", size: 22 }),
        ],
      })
    );
  }

  children.push(new Paragraph({ spacing: { before: 160 }, children: [] }));

  // ── Documentation (AI-generated: objective, scope, procedure, safety) ──
  if (sop.documentation) {
    const d = sop.documentation;

    if (d.objective) {
      children.push(heading("Objective"));
      children.push(bodyPara(d.objective));
    }

    if (d.scope) {
      children.push(heading("Scope"));
      children.push(bodyPara(d.scope));
    }

    if (d.safetyOrComplianceNotes) {
      children.push(heading("Safety & Compliance"));
      children.push(
        new Paragraph({
          spacing: { after: 120 },
          shading: { type: ShadingType.SOLID, color: "fffbeb", fill: "fffbeb" },
          border: {
            top:    { style: BorderStyle.SINGLE, size: 4,  color: "fde68a" },
            bottom: { style: BorderStyle.SINGLE, size: 4,  color: "fde68a" },
            left:   { style: BorderStyle.THICK,  size: 16, color: "f59e0b" },
            right:  { style: BorderStyle.SINGLE, size: 4,  color: "fde68a" },
          },
          indent: { left: 200, right: 200 },
          children: [new TextRun({ text: d.safetyOrComplianceNotes, color: "92400e", size: 22 })],
        })
      );
    }

    if (d.detailedProcedureMarkdown) {
      children.push(heading("Detailed Procedure"));
      // Render each line as a paragraph
      for (const line of d.detailedProcedureMarkdown.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        // Strip basic markdown
        const text = trimmed
          .replace(/^#{1,3}\s+/, "")
          .replace(/\*\*(.+?)\*\*/g, "$1")
          .replace(/\*(.+?)\*/g, "$1")
          .replace(/^[-*] /, "• ")
          .replace(/^\d+\. /, "");
        const isBullet  = trimmed.startsWith("- ") || trimmed.startsWith("* ");
        const isHeading = /^#{1,3} /.test(trimmed);
        children.push(
          new Paragraph({
            spacing: { after: isHeading ? 80 : 40 },
            indent: isBullet ? { left: 440 } : undefined,
            children: [
              new TextRun({
                text,
                size:  isHeading ? 24 : 22,
                bold:  isHeading,
                color: isHeading ? "1e293b" : "374151",
              }),
            ],
          })
        );
      }
    }
  }

  // ── SOP Sections ──────────────────────────────────────────────
  for (const section of sop.sections) {
    const isSafety = section.type === "safety";
    children.push(heading(section.title));

    if (isSafety) {
      children.push(
        new Paragraph({
          spacing: { after: 120 },
          shading: { type: ShadingType.SOLID, color: "fffbeb", fill: "fffbeb" },
          border: {
            top: { style: BorderStyle.SINGLE, size: 4, color: "fde68a" },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: "fde68a" },
            left: { style: BorderStyle.THICK, size: 16, color: "f59e0b" },
            right: { style: BorderStyle.SINGLE, size: 4, color: "fde68a" },
          },
          indent: { left: 200, right: 200 },
          children: [new TextRun({ text: section.content, color: "92400e", size: 22 })],
        })
      );
    } else {
      for (const line of section.content.split("\n")) {
        children.push(bodyPara(line || " "));
      }
    }
  }

  // ── Workflow Steps ────────────────────────────────────────────
  if (sop.workflowSteps.length > 0) {
    children.push(heading("Workflow Steps"));

    for (const step of sop.workflowSteps) {
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 40 },
          children: [
            new TextRun({
              text: `${step.stepNumber}.  `,
              bold: true,
              color: "3b82f6",
              size: 24,
            }),
            new TextRun({ text: step.title, bold: true, size: 24, color: "1e293b" }),
          ],
        })
      );

      if (step.description) {
        children.push(bodyPara(step.description, 440));
      }

      if (step.role || step.duration) {
        children.push(
          new Paragraph({
            spacing: { after: 120 },
            indent: { left: 440 },
            children: [
              new TextRun({
                text: [step.role, step.duration].filter(Boolean).join("  ·  "),
                size: 18,
                color: "64748b",
                italics: true,
              }),
            ],
          })
        );
      }
    }
  }

  // ── Checklist ─────────────────────────────────────────────────
  if (sop.checklistItems.length > 0) {
    children.push(heading("Checklist"));

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: sop.checklistItems.map(
          (item) =>
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 6, type: WidthType.PERCENTAGE },
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 1, color: "e2e8f0" },
                    bottom: { style: BorderStyle.SINGLE, size: 1, color: "e2e8f0" },
                    left: { style: BorderStyle.SINGLE, size: 1, color: "e2e8f0" },
                    right: { style: BorderStyle.SINGLE, size: 1, color: "e2e8f0" },
                  },
                  margins: { top: 60, bottom: 60, left: 100, right: 60 },
                  children: [new Paragraph({ children: [new TextRun({ text: "☐", size: 24 })] })],
                }),
                new TableCell({
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 1, color: "e2e8f0" },
                    bottom: { style: BorderStyle.SINGLE, size: 1, color: "e2e8f0" },
                    left: { style: BorderStyle.SINGLE, size: 1, color: "e2e8f0" },
                    right: { style: BorderStyle.SINGLE, size: 1, color: "e2e8f0" },
                  },
                  margins: { top: 60, bottom: 60, left: 120, right: 60 },
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: item.text, size: 22 }),
                        ...(item.isRequired
                          ? [new TextRun({ text: "  REQUIRED", bold: true, color: "ef4444", size: 18 })]
                          : []),
                      ],
                    }),
                  ],
                }),
              ],
            })
        ),
      })
    );
  }

  // ── Responsibilities table ────────────────────────────────────
  if (sop.responsibilities.length > 0) {
    children.push(heading("Roles & Responsibilities"));

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              cell("Role", { shade: true, width: 35 }),
              cell("Responsibilities", { shade: true, width: 65 }),
            ],
          }),
          ...sop.responsibilities.map(
            (r) =>
              new TableRow({
                children: [
                  cell(r.roleName ?? r.role, { bold: true, width: 35 }),
                  cell(r.coreDutySummary ?? r.description, { width: 65 }),
                ],
              })
          ),
        ],
      })
    );
  }

  // ── Resources table ───────────────────────────────────────────
  if (sop.resources.length > 0) {
    children.push(heading("Required Resources"));

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              cell("Resource", { shade: true, width: 35 }),
              cell("Type", { shade: true, width: 20 }),
              cell("Description", { shade: true, width: 45 }),
            ],
          }),
          ...sop.resources.map(
            (r) =>
              new TableRow({
                children: [
                  cell(r.name, { bold: true, width: 35 }),
                  cell(r.type ?? "—", { width: 20, color: "0369a1" }),
                  cell(r.description ?? "—", { width: 45 }),
                ],
              })
          ),
        ],
      })
    );
  }

  // ── Footer ────────────────────────────────────────────────────
  children.push(
    new Paragraph({ spacing: { before: 400 }, children: [] }),
    divider(),
    new Paragraph({
      spacing: { before: 120 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `Generated by Pryro SOP  ·  ${sop.title}  ·  Version ${sop.version}  ·  ${formatDate(new Date())}`,
          size: 18,
          color: "94a3b8",
          italics: true,
        }),
      ],
    })
  );

  const doc = new Document({
    creator: "Pryro SOP",
    title: sop.title,
    description: sop.description ?? "",
    styles: {
      paragraphStyles: [
        {
          id: "Normal",
          name: "Normal",
          run: { font: "Calibri", size: 22 },
          paragraph: { spacing: { line: 276 } },
        },
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          run: { font: "Calibri", bold: true, size: 28, color: "1e293b" },
          paragraph: { spacing: { before: 320, after: 120 } },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: "numbered",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: { run: { bold: true, color: "3b82f6" }, paragraph: { indent: { left: 440, hanging: 260 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.2),
            },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
