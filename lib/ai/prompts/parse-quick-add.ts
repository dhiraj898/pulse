import { z } from 'zod'
import { callAI, CLASSIFY_MODEL } from '@/lib/ai/client'

export const parseQuickAddInput = z.object({
  input: z.string(),
  today_iso: z.string(),
})

export const parseQuickAddOutput = z.object({
  title: z.string(),
  description: z.string().nullable(),
  effort: z.enum(['S', 'M', 'L']).nullable(),
  due_at: z.string().nullable(),
  recurrence_rule: z.string().nullable(),
  client_hint: z.string().nullable(),
})

export type ParseQuickAddInput = z.infer<typeof parseQuickAddInput>
export type ParseQuickAddOutput = z.infer<typeof parseQuickAddOutput>

// TODO: write prompt body — deferred per PRD §15
export async function parseQuickAdd(
  userId: string,
  input: ParseQuickAddInput
): Promise<ParseQuickAddOutput> {
  if (process.env.NODE_ENV === 'test') {
    return { title: input.input, description: null, effort: null, due_at: null, recurrence_rule: null, client_hint: null }
  }

  const response = await callAI({
    userId,
    purpose: 'parse-quick-add',
    model: CLASSIFY_MODEL,
    messages: [
      { role: 'system', content: 'TODO: parse quick-add prompt body — deferred per PRD §15' },
      { role: 'user', content: JSON.stringify(input) },
    ],
    responseFormat: { type: 'json_object' },
  })

  const content = response.choices[0]?.message?.content ?? '{}'
  return parseQuickAddOutput.parse(JSON.parse(content))
}
