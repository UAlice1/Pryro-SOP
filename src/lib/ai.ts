import { db } from "@/lib/db";

export interface AIProvider {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl?: string;
}

const DEFAULT_MODELS: Record<string, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-haiku-20240307",
  groq: "llama-3.3-70b-versatile",
  openrouter: "openai/gpt-4o-mini",
  deepseek: "deepseek-chat",
  mistral: "mistral-small-latest",
  custom: "",
};

const DEFAULT_BASE_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  groq: "https://api.groq.com/openai/v1",
  openrouter: "https://openrouter.ai/api/v1",
  deepseek: "https://api.deepseek.com/v1",
  mistral: "https://api.mistral.ai/v1",
};

export async function getAISettings(userId: string): Promise<AIProvider> {
  const settings = await db.aISettings.findUnique({ where: { userId } });

  const provider = settings?.provider ?? "openai";
  const model = settings?.model && settings.model !== ""
    ? settings.model
    : DEFAULT_MODELS[provider] ?? "gpt-4o-mini";
  const apiKey = settings?.apiKey ?? process.env.OPENAI_API_KEY ?? "";
  const baseUrl = settings?.baseUrl ?? undefined;

  return { provider, model, apiKey, baseUrl };
}

export function buildSOPGenerationPrompt(input: {
  title: string;
  processName: string;
  description: string;
  department?: string;
  company?: string;
}): string {
  return `You are an expert business analyst and technical writer. Generate a complete, professional Standard Operating Procedure (SOP) document based on the following information.

**Process Title:** ${input.title}
**Process Name:** ${input.processName}
**Department:** ${input.department ?? "General"}
**Company:** ${input.company ?? ""}
**Process Description:** ${input.description}

Generate a comprehensive SOP in valid JSON format with the following structure. Be thorough, professional, and use clear business language:

{
  "title": "Professional SOP title",
  "purpose": "Clear purpose statement (2-3 sentences)",
  "scope": "Who this applies to and what it covers",
  "roles": [
    { "role": "Role Title", "description": "Responsibilities for this role" }
  ],
  "tools": ["Tool 1", "Tool 2"],
  "resources": [
    { "name": "Resource name", "type": "type", "description": "description" }
  ],
  "workflow": [
    { "stepNumber": 1, "title": "Step title", "description": "Detailed step description", "role": "Responsible role", "duration": "estimated time" }
  ],
  "procedures": [
    { "stepNumber": 1, "title": "Procedure title", "content": "Detailed procedure content" }
  ],
  "checklist": [
    { "text": "Checklist item", "isRequired": true }
  ],
  "safety": "Safety and compliance requirements if applicable",
  "qualityStandards": "Quality standards and KPIs",
  "notes": "Important notes and considerations",
  "references": ["Reference 1", "Reference 2"],
  "reviewSchedule": "How often this SOP should be reviewed"
}

Return ONLY valid JSON, no markdown, no explanation.`;
}

export async function callAI(prompt: string, settings: AIProvider): Promise<string> {
  const { provider, model, apiKey, baseUrl } = settings;

  if (!apiKey) {
    throw new Error(
      "No API key configured. Go to Settings → AI Provider and add your API key."
    );
  }

  if (!model) {
    throw new Error(
      "No model selected. Go to Settings → AI Provider and select a model."
    );
  }

  const baseURL = baseUrl || DEFAULT_BASE_URLS[provider] || "https://api.openai.com/v1";

  const response = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI returned an empty response. Please try again.");
  return content;
}
