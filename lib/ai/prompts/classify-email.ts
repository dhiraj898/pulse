import { z } from 'zod'
import { callAI, CLASSIFY_MODEL } from '@/lib/ai/client'

export const classifyEmailInput = z.object({
  user: z.object({ name: z.string(), email: z.string() }),
  vips: z.array(z.object({
    kind: z.enum(['email', 'domain', 'keyword']),
    value: z.string(),
    weight: z.number(),
    label: z.string().nullable(),
  })),
  email: z.object({
    from_email: z.string(),
    from_name: z.string().nullable(),
    subject: z.string().nullable(),
    snippet: z.string().nullable(),
    received_at: z.string(),
  }),
})

export const classifyEmailOutput = z.object({
  priority: z.enum(['urgent', 'important', 'fyi', 'noise']),
  reason: z.string().max(120),
  matches_vip: z.string().nullable(),
  looks_like_commitment_request: z.boolean(),
})

export type ClassifyEmailInput = z.infer<typeof classifyEmailInput>
export type ClassifyEmailOutput = z.infer<typeof classifyEmailOutput>

// TODO: write prompt body — deferred per PRD §15
export async function classifyEmail(
  userId: string,
  input: ClassifyEmailInput
): Promise<ClassifyEmailOutput> {
  if (process.env.NODE_ENV === 'test') {
    return { priority: 'fyi', reason: 'stub', matches_vip: null, looks_like_commitment_request: false }
  }

  const response = await callAI({
    userId,
    purpose: 'classify-email',
    model: CLASSIFY_MODEL,
    messages: [
      { role: 'system', content: 'TODO: classify email prompt body — deferred per PRD §15' },
      { role: 'user', content: JSON.stringify(input) },
    ],
    responseFormat: { type: 'json_object' },
  })

  const content = response.choices[0]?.message?.content ?? '{}'
  return classifyEmailOutput.parse(JSON.parse(content))
}
