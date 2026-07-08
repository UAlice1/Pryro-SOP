import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { Permission } from "@/lib/permissions";

const createSchema = z.object({
  title:        z.string().min(1),
  description:  z.string().optional(),
  processName:  z.string().optional(),
  departmentId: z.string().optional(),
  categoryId:   z.string().optional(),
  status:       z.enum(["DRAFT", "REVIEW", "APPROVED", "PUBLISHED"]).default("DRAFT"),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search       = searchParams.get("search")       ?? "";
  const status       = searchParams.get("status")       ?? "";
  const departmentId = searchParams.get("departmentId") ?? "";
  const categoryId   = searchParams.get("categoryId")   ?? "";
  const tag          = searchParams.get("tag")          ?? "";
  const archived     = searchParams.get("archived")     === "true";
  const page         = parseInt(searchParams.get("page")  ?? "1");
  const limit        = parseInt(searchParams.get("limit") ?? "20");

  const where: Record<string, unknown> = {
    authorId: session.user.id,
    isArchived: archived, // fixed: was always false
  };

  if (search) {
    where.OR = [
      { title:       { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { processName: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status)       where.status       = status;
  if (departmentId) where.departmentId = departmentId;
  if (categoryId)   where.categoryId   = categoryId;
  if (tag)          where.tags         = { some: { tag: { equals: tag, mode: "insensitive" } } };

  const [sops, total] = await Promise.all([
    db.sOP.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        department: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, color: true } },
        author: { select: { id: true, name: true, image: true } },
        tags: { select: { tag: true } },
        _count: { select: { comments: true, workflowSteps: true, checklistItems: true } },
      },
    }),
    db.sOP.count({ where }),
  ]);

  return NextResponse.json({ sops, total, page, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role ?? "EMPLOYEE";
  if (!Permission.canEditSOPs(role)) {
    return NextResponse.json({ error: "Insufficient permissions to create SOPs" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const sop = await db.sOP.create({
      data: {
        ...parsed.data,
        authorId: session.user.id,
        organizationId: (session.user as { organizationId?: string }).organizationId,
      },
    });

    await db.activity.create({
      data: {
        sopId: sop.id,
        userId: session.user.id,
        action: "created",
        description: `Created SOP: ${sop.title}`,
      },
    });

    return NextResponse.json(sop, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create SOP" }, { status: 500 });
  }
}
