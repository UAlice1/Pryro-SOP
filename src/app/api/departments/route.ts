import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json([]);

  const departments = await db.department.findMany({
    where: { organizationId: orgId },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(departments);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { name, description } = await req.json();

  const dept = await db.department.create({
    data: { name, description, organizationId: orgId },
  });

  return NextResponse.json(dept, { status: 201 });
}
