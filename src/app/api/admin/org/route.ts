import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function isAdmin(role: string) {
  return role === "SUPER_ADMIN" || role === "ORG_ADMIN";
}

// GET — fetch current org with departments, categories, and users
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role ?? "EMPLOYEE";
  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 404 });
  if (!isAdmin(role)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const org = await db.organization.findUnique({
    where: { id: orgId },
    include: {
      departments: { orderBy: { name: "asc" }, include: { _count: { select: { users: true, sops: true } } } },
      categories:  { orderBy: { name: "asc" }, include: { _count: { select: { sops: true } } } },
      users: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, email: true, role: true, departmentId: true, createdAt: true, image: true },
      },
      _count: { select: { users: true, sops: true } },
    },
  });

  return NextResponse.json(org);
}

// PATCH — update org name/description
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role ?? "EMPLOYEE";
  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 404 });
  if (!isAdmin(role)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { name, description } = await req.json();
  const org = await db.organization.update({ where: { id: orgId }, data: { name, description } });
  return NextResponse.json(org);
}
