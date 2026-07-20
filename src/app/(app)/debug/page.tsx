import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function DebugPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Only allow SUPER_ADMIN or ORG_ADMIN
  const role = (session.user as { role?: string }).role ?? "";
  if (!["SUPER_ADMIN", "ORG_ADMIN", "MANAGER"].includes(role)) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Access denied. Admins only.
      </div>
    );
  }

  // ── Check database ────────────────────────────────────────────
  let dbStatus = "✅ Connected";
  let dbError = "";
  let userCount = 0;
  let sopCount = 0;

  try {
    userCount = await db.user.count();
    sopCount  = await db.sOP.count();
  } catch (e) {
    dbStatus = "❌ Failed";
    dbError  = e instanceof Error ? e.message : String(e);
  }

  // ── Check env vars ────────────────────────────────────────────
  const envChecks: { key: string; status: string; note: string }[] = [
    {
      key:    "DATABASE_URL",
      status: process.env.DATABASE_URL ? "✅ Set" : "❌ Missing",
      note:   process.env.DATABASE_URL
        ? process.env.DATABASE_URL.replace(/:([^:@]+)@/, ":***@") // mask password
        : "Not configured",
    },
    {
      key:    "AUTH_SECRET",
      status: process.env.AUTH_SECRET ? "✅ Set" : "❌ Missing",
      note:   process.env.AUTH_SECRET ? "(hidden)" : "Not configured — sessions will not work",
    },
    {
      key:    "GOOGLE_CLIENT_ID",
      status: process.env.GOOGLE_CLIENT_ID ? "✅ Set" : "⚠️ Missing",
      note:   process.env.GOOGLE_CLIENT_ID
        ? process.env.GOOGLE_CLIENT_ID.slice(0, 20) + "…"
        : "Google OAuth disabled",
    },
    {
      key:    "GOOGLE_CLIENT_SECRET",
      status: process.env.GOOGLE_CLIENT_SECRET ? "✅ Set" : "⚠️ Missing",
      note:   process.env.GOOGLE_CLIENT_SECRET ? "(hidden)" : "Google OAuth disabled",
    },
    {
      key:    "AUTH_URL / NEXTAUTH_URL",
      status: (process.env.AUTH_URL || process.env.NEXTAUTH_URL) ? "✅ Set" : "⚠️ Missing",
      note:   process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "Not set — may cause redirect issues on production",
    },
    {
      key:    "RESEND_API_KEY",
      status: process.env.RESEND_API_KEY ? "✅ Set" : "⚠️ Missing",
      note:   process.env.RESEND_API_KEY ? "(hidden)" : "Email invites will not work",
    },
    {
      key:    "NEXT_PUBLIC_APP_URL",
      status: process.env.NEXT_PUBLIC_APP_URL ? "✅ Set" : "⚠️ Missing",
      note:   process.env.NEXT_PUBLIC_APP_URL ?? "Magic links may use wrong base URL",
    },
  ];

  const user = session.user as {
    id?: string; name?: string | null; email?: string | null;
    role?: string; organizationId?: string; departmentId?: string;
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Debug Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          System health check — visible to admins only. Do not share screenshots of this page.
        </p>
      </div>

      {/* ── Session ──────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Session</h2>
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {[
                ["User ID",         user.id         ?? "—"],
                ["Name",            user.name       ?? "—"],
                ["Email",           user.email      ?? "—"],
                ["Role",            user.role       ?? "—"],
                ["Organization ID", user.organizationId ?? "None"],
                ["Department ID",   user.departmentId   ?? "None"],
              ].map(([k, v]) => (
                <tr key={k} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-medium text-muted-foreground w-44">{k}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Database ─────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Database</h2>
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-border">
                <td className="px-4 py-2.5 font-medium text-muted-foreground w-44">Connection</td>
                <td className="px-4 py-2.5">{dbStatus}</td>
              </tr>
              {dbError && (
                <tr className="border-b border-border">
                  <td className="px-4 py-2.5 font-medium text-muted-foreground">Error</td>
                  <td className="px-4 py-2.5 text-destructive text-xs font-mono">{dbError}</td>
                </tr>
              )}
              <tr className="border-b border-border">
                <td className="px-4 py-2.5 font-medium text-muted-foreground">Users</td>
                <td className="px-4 py-2.5 font-mono text-xs">{userCount}</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-medium text-muted-foreground">SOPs</td>
                <td className="px-4 py-2.5 font-mono text-xs">{sopCount}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Environment Variables ─────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Environment Variables</h2>
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Variable</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Value / Note</th>
              </tr>
            </thead>
            <tbody>
              {envChecks.map((e) => (
                <tr key={e.key} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-mono text-xs">{e.key}</td>
                  <td className="px-4 py-2.5 text-xs">{e.status}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{e.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Runtime Info ─────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Runtime</h2>
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {[
                ["NODE_ENV",      process.env.NODE_ENV ?? "—"],
                ["Node version",  process.version],
                ["Platform",      process.platform],
              ].map(([k, v]) => (
                <tr key={k} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-medium text-muted-foreground w-44">{k}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Visit <span className="font-mono">/debug</span> any time to check system status.
        This page is only visible to signed-in users with MANAGER role or above.
      </p>
    </div>
  );
}
