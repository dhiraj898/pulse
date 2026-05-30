import OpenAI from 'openai'
import { createAdminClient } from '@/lib/supabase/admin'
import { estimateCostINR } from './pricing'

// Sarvam AI uses OpenAI-compatible API
export const sarvam = new OpenAI({
  apiKey: process.env.SARVAM_API_KEY!,
  baseURL: process.env.SARVAM_BASE_URL ?? 'https://api.sarvam.ai/v1',
})

export const REASONING_MODEL = process.env.SARVAM_MODEL_REASONING ?? 'sarvam-m'
export const CLASSIFY_MODEL = process.env.SARVAM_MODEL_CLASSIFY ?? 'sarvam-m'

const BUDGET_INR = parseFloat(process.env.SARVAM_BUDGET_INR_PER_USER_PER_MONTH ?? '500')

export async function checkBudget(userId: string): Promise<void> {
  const admin = createAdminClient()
  const { data: user } = await admin
    .from('users')
    .select('ai_budget_inr_used_this_month, ai_budget_reset_at')
    .eq('id', userId)
    .single()

  if (!user) return

  const resetAt = new Date(user.ai_budget_reset_at)
  const now = new Date()
  if (now >= new Date(resetAt.getFullYear(), resetAt.getMonth() + 1, 1)) {
    await admin.from('users').update({
      ai_budget_inr_used_this_month: 0,
      ai_budget_reset_at: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
    }).eq('id', userId)
    return
  }

  const used = user.ai_budget_inr_used_this_month ?? 0
  if (used >= BUDGET_INR) {
    throw new Error(`AI budget reached for this month (₹${BUDGET_INR}). See settings to review usage.`)
  }
}

export async function logAICall(
  userId: string,
  purpose: string,
  model: string,
  inputTokens: number,
  outputTokens: number
): Promise<void> {
  const admin = createAdminClient()
  const cost = estimateCostINR(model, inputTokens, outputTokens)

  await Promise.all([
    admin.from('ai_calls').insert({
      user_id: userId,
      purpose,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      inr_cost: cost,
    }),
    admin.rpc('increment_ai_budget', { user_id_param: userId, amount: cost }),
  ])
}

export interface AICallOptions {
  userId: string
  purpose: string
  model?: string
  messages: OpenAI.Chat.ChatCompletionMessageParam[]
  temperature?: number
  responseFormat?: OpenAI.Chat.ChatCompletionCreateParams['response_format']
  tools?: OpenAI.Chat.ChatCompletionTool[]
}

export async function callAI(opts: AICallOptions): Promise<OpenAI.Chat.ChatCompletion> {
  await checkBudget(opts.userId)

  const model = opts.model ?? REASONING_MODEL
  const response = await sarvam.chat.completions.create({
    model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.2,
    response_format: opts.responseFormat,
    tools: opts.tools,
    tool_choice: opts.tools ? 'auto' : undefined,
  })

  const usage = response.usage
  if (usage) {
    await logAICall(opts.userId, opts.purpose, model, usage.prompt_tokens, usage.completion_tokens)
  }

  return response
}
