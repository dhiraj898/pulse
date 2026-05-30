import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Db = SupabaseClient<Database>;

interface TaskClassification {
  title: string;
  description: string;
  effort?: "S" | "M" | "L";
  dueDate?: string;
  confidence: number;
  reasoning: string;
}

const sarvamApiKey = process.env.SARVAM_API_KEY;
const sarvamBaseUrl = process.env.SARVAM_BASE_URL || "https://api.sarvam.ai/v1";

if (!sarvamApiKey) {
  throw new Error("SARVAM_API_KEY not configured");
}

const client = new Anthropic({
  apiKey: sarvamApiKey,
  baseURL: sarvamBaseUrl,
});

// Task classification: extract title, description, effort estimate, due date, and client/project
export async function classifyTask(
  emailSubject: string,
  emailBody: string,
  _userId?: string
): Promise<TaskClassification> {
  const tools: Anthropic.Tool[] = [
    {
      name: "extract_task",
      description:
        "Extract structured task information from email content. Effort is estimated time: S=under 1hr, M=1-4hrs, L=over 4hrs",
      input_schema: {
        type: "object" as const,
        properties: {
          title: { type: "string", description: "Concise task title (under 100 chars)" },
          description: {
            type: "string",
            description: "Task details and context (can be long)",
          },
          effort: {
            type: "string",
            enum: ["S", "M", "L"],
            description: "Estimated effort size",
          },
          dueDate: {
            type: "string",
            description: "ISO 8601 date string if deadline mentioned, null otherwise",
          },
          confidence: {
            type: "number",
            description: "Confidence 0-1 that this is actually a task",
          },
        },
        required: ["title", "description", "effort", "confidence"],
      },
    },
  ];

  const response = await client.messages.create({
    model: "sarvam-m",
    max_tokens: 500,
    tools,
    messages: [
      {
        role: "user",
        content: `Classify this email as a task. Email subject: "${emailSubject}"\n\nEmail body:\n${emailBody}\n\nExtract task information using the extract_task tool.`,
      },
    ],
  });

  // Find tool use in response
  let taskData: TaskClassification = {
    title: "Unprocessed email",
    description: emailBody.slice(0, 200),
    effort: "M",
    confidence: 0.3,
    reasoning: "Failed to classify",
  };

  for (const block of response.content) {
    if (block.type === "tool_use") {
      const input = block.input as Record<string, unknown>;
      taskData = {
        title: String(input.title || ""),
        description: String(input.description || ""),
        effort: (input.effort as "S" | "M" | "L") || "M",
        dueDate: input.dueDate ? String(input.dueDate) : undefined,
        confidence: Number(input.confidence || 0.5),
        reasoning: `Classified with confidence ${input.confidence}`,
      };
    } else if (block.type === "text") {
      taskData.reasoning = block.text;
    }
  }

  return taskData;
}

// Reasoning: detailed analysis of task context and decisions
export async function reasonAboutTask(
  taskTitle: string,
  taskDescription: string,
  context: { emails?: number; meetings?: number; relatedTasks?: number }
): Promise<{
  analysis: string;
  suggestedApproach: string;
  risks: string[];
  inputTokens: number;
  outputTokens: number;
}> {
  const response = await client.messages.create({
    model: "sarvam-m",
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: `Analyze this task:\nTitle: ${taskTitle}\nDescription: ${taskDescription}\n\nContext: ${context.emails || 0} related emails, ${context.meetings || 0} meetings, ${context.relatedTasks || 0} subtasks.\n\nProvide analysis, approach, and potential risks.`,
      },
    ],
  });

  let analysis = "";
  let suggestedApproach = "";
  let risks: string[] = [];

  for (const block of response.content) {
    if (block.type === "text") {
      // Parse response into sections
      const text = block.text;
      const analysisMatch = text.match(/Analysis:(.+?)(?=Approach:|Risks:|$)/s);
      const approachMatch = text.match(/Approach:(.+?)(?=Risks:|$)/s);
      const risksMatch = text.match(/Risks:(.+?)$/s);

      if (analysisMatch) analysis = analysisMatch[1].trim();
      if (approachMatch) suggestedApproach = approachMatch[1].trim();
      if (risksMatch) {
        risks = risksMatch[1]
          .split("\n")
          .filter((r) => r.trim())
          .map((r) => r.replace(/^[-•*]\s*/, "").trim());
      }
    }
  }

  return {
    analysis,
    suggestedApproach,
    risks,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

// Generate embeddings for RAG via similarity search
export async function generateEmbedding(_text: string): Promise<number[]> {
  // Placeholder: Sarvam embeddings are 768-dimensional. Wire this to a
  // dedicated embedding endpoint when available; returns zeros for now.
  return new Array(768).fill(0);
}

// Token counting for budget tracking
export function estimateTokens(text: string): number {
  // Rough estimate: ~4 chars per token for English text
  return Math.ceil(text.length / 4);
}

// Calculate INR cost for API call
export function calculateCost(
  inputTokens: number,
  outputTokens: number
): number {
  // Sarvam pricing (rough estimate from current market):
  // Input: ₹0.0001 per token, Output: ₹0.0002 per token
  const inrPerInputToken = 0.0001;
  const inrPerOutputToken = 0.0002;
  return inputTokens * inrPerInputToken + outputTokens * inrPerOutputToken;
}

// Check budget before AI operation
export async function checkBudgetAvailable(
  userId: string,
  estimatedCost: number,
  db: Db
): Promise<{ available: boolean; remaining: number; monthlyBudget: number }> {
  const monthlyBudget = Number(process.env.SARVAM_BUDGET_INR_PER_USER_PER_MONTH || 500);

  const { data: user } = await db
    .from("users")
    .select("ai_budget_inr_used_this_month, ai_budget_reset_at")
    .eq("id", userId)
    .single();

  if (!user) {
    return { available: false, remaining: 0, monthlyBudget };
  }

  // Check if budget month reset
  const resetAt = new Date(user.ai_budget_reset_at);
  const now = new Date();
  const needsReset =
    resetAt.getUTCMonth() !== now.getUTCMonth() ||
    resetAt.getUTCFullYear() !== now.getUTCFullYear();

  const usedThisMonth = needsReset ? 0 : user.ai_budget_inr_used_this_month;
  const remaining = monthlyBudget - usedThisMonth;

  return {
    available: remaining >= estimatedCost,
    remaining: Math.max(0, remaining - estimatedCost),
    monthlyBudget,
  };
}

// Record AI call for budget tracking
export async function recordAiCall(
  userId: string,
  purpose: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  db: Db
): Promise<void> {
  const inrCost = calculateCost(inputTokens, outputTokens);

  await db.from("ai_calls").insert({
    user_id: userId,
    purpose,
    model,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    inr_cost: inrCost,
  });

  // Update user budget
  await db.rpc("increment_ai_budget", {
    user_id_param: userId,
    amount: inrCost,
  });
}

export { client as sarvamClient };
