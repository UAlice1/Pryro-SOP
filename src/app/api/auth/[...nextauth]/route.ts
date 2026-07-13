import { handlers } from "@/lib/auth";

// Force Node.js runtime — PrismaAdapter requires Node.js APIs (not Edge)
export const runtime = "nodejs";

export const { GET, POST } = handlers;
