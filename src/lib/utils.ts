import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "MMM d, yyyy");
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "MMM d, yyyy 'at' h:mm a");
}

export function timeAgo(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "…";
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  REVIEW: "In Review",
  APPROVED: "Approved",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

export const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-yellow-400 text-yellow-900",
  REVIEW: "bg-blue-500 text-white",
  APPROVED: "bg-green-500 text-white",
  PUBLISHED: "bg-emerald-600 text-white",
  ARCHIVED: "bg-gray-500 text-white",
};

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ORG_ADMIN: "Organization Admin",
  MANAGER: "Manager",
  EMPLOYEE: "Employee",
};

export const AI_PROVIDERS = [
  { value: "openai", label: "OpenAI", models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"] },
  { value: "anthropic", label: "Anthropic", models: ["claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"] },
  { value: "groq", label: "Groq", models: ["llama-3.3-70b-versatile", "mixtral-8x7b-32768", "gemma2-9b-it"] },
  { value: "openrouter", label: "OpenRouter", models: ["openai/gpt-4o", "anthropic/claude-3.5-sonnet", "google/gemini-pro"] },
  { value: "deepseek", label: "DeepSeek", models: ["deepseek-chat", "deepseek-reasoner"] },
  { value: "mistral", label: "Mistral", models: ["mistral-large-latest", "mistral-small-latest"] },
  { value: "custom", label: "Custom (OpenAI-compatible)", models: [] },
];
