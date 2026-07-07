import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json([]);

  const categories = await db.category.findMany({
    where: { organizationId: orgId },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { name, description, color } = await req.json();

  const cat = await db.category.create({
    data: { name, description, color, organizationId: orgId },
  });

  return NextResponse.json(cat, { status: 201 });
}
