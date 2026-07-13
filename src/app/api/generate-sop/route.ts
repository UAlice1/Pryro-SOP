import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

/* ── Validation schema ────────────────────────────────────────────────── */

const workflowStepSchema = z.object({
  stepNumber:  z.number(),
  phase:       z.string().optional(),
  action:      z.string().optional(),
  title:       z.string(),
  description: z.string().optional(),
  role:        z.string().optional(),
  duration:    z.string().optional(),
  dependsOn:   z.array(z.number()).optional(),
});

const checklistItemSchema = z.object({
  text:         z.string(),
  task:         z.string().optional(),
  assignedRole: z.string().optional(),
  priority:     z.enum(["High", "Medium", "Low"]).optional(),
  isRequired:   z.boolean().optional(),
});

const responsibilitySchema = z.object({
  role:            z.string(),
  roleName:        z.string().optional(),
  coreDutySummary: z.string().optional(),
  description:     z.string().optional(),
});

const documentationSchema = z.object({
  objective:                 z.string().optional(),
  scope:                     z.string().optional(),
  detailedProcedureMarkdown: z.string().optional(),
  safetyOrComplianceNotes:   z.string().optional(),
});

const generateSOPSchema = z.object({
  title:               z.string().min(1),
  industry:            z.string().optional(),
  complianceFramework: z.string().optional(),
  description:         z.string().optional(),
  workflow:            z.array(workflowStepSchema).optional(),
  checklist:           z.array(checklistItemSchema).optional(),
  responsibilities:    z.array(responsibilitySchema).optional(),
  documentation:       documentationSchema.optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = generateSOPSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;

  try {
    /* 1 ── Create the base SOP record ──────────────────────────────── */
    const sop = await db.sOP.create({
      data: {
        title:               data.title,
        description:         data.description,
        processName:         data.title,
        status:              "DRAFT",
        isAIGenerated:       true,
        authorId:            session.user.id,
        organizationId:      (session.user as { organizationId?: string }).organizationId,
        industry:            data.industry,
        complianceFramework: data.complianceFramework,
      },
    });

    /* 2 ── Workflow steps — sequential, HTTP adapter safe ──────────── */
    if (data.workflow?.length) {
      for (let i = 0; i < data.workflow.length; i++) {
        const s = data.workflow[i];
        await db.workflowStep.create({
          data: {
            sopId:       sop.id,
            stepNumber:  s.stepNumber ?? i + 1,
            title:       s.title,
            description: s.description ?? null,
            role:        s.role ?? null,
            duration:    s.duration ?? null,
            phase:       s.phase ?? null,
            action:      s.action ?? null,
            dependsOn:   s.dependsOn ?? [],
          },
        });
      }
    }

    /* 3 ── Checklist items ──────────────────────────────────────────── */
    if (data.checklist?.length) {
      for (let i = 0; i < data.checklist.length; i++) {
        const c = data.checklist[i];
        await db.checklistItem.create({
          data: {
            sopId:        sop.id,
            text:         c.text,
            task:         c.task ?? null,
            assignedRole: c.assignedRole ?? null,
            priority:     c.priority ?? null,
            isRequired:   c.isRequired ?? false,
            order:        i + 1,
          },
        });
      }
    }

    /* 4 ── Responsibilities ─────────────────────────────────────────── */
    if (data.responsibilities?.length) {
      for (let i = 0; i < data.responsibilities.length; i++) {
        const r = data.responsibilities[i];
        await db.responsibility.create({
          data: {
            sopId:           sop.id,
            role:            r.role,
            roleName:        r.roleName ?? null,
            coreDutySummary: r.coreDutySummary ?? null,
            description:     r.description ?? r.coreDutySummary ?? "",
            order:           i + 1,
          },
        });
      }
    }

    /* 5 ── Documentation ────────────────────────────────────────────── */
    if (data.documentation) {
      await db.sOPDocumentation.create({
        data: {
          sopId:                     sop.id,
          objective:                 data.documentation.objective ?? null,
          scope:                     data.documentation.scope ?? null,
          detailedProcedureMarkdown: data.documentation.detailedProcedureMarkdown ?? null,
          safetyOrComplianceNotes:   data.documentation.safetyOrComplianceNotes ?? null,
        },
      });
    }

    /* 6 ── Activity log ─────────────────────────────────────────────── */
    await db.activity.create({
      data: {
        sopId:       sop.id,
        userId:      session.user.id,
        action:      "created",
        description: `AI generated SOP: ${sop.title}`,
      },
    });

    return NextResponse.json({ sopId: sop.id, title: sop.title }, { status: 201 });
  } catch (err) {
    console.error("[generate-sop] DB error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to save SOP", detail: message }, { status: 500 });
  }
}
