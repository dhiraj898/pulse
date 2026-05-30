import { z } from 'zod'
import { callAI, REASONING_MODEL } from '@/lib/ai/client'

export const detectCommitmentInput = z.object({
  body: z.string(),
  today_iso: z.string(),
})

export const detectCommitmentOutput = z.object({
  is_commitment: z.boolean(),
  what: z.string().nullable(),
  due_at: z.string().nullable(),
})

export type DetectCommitmentInput = z.infer<typeof detectCommitmentInput>
export type DetectCommitmentOutput = z.infer<typeof detectCommitmentOutput>

// TODO: write prompt body — deferred per PRD §15
export async function detectCommitment(
  userId: string,
  input: DetectCommitmentInput
): Promise<DetectCommitmentOutput> {
  if (process.env.NODE_ENV === 'test') {
    return { is_commitment: false, what: null, due_at: null }
  }

  const response = await callAI({
    userId,
    purpose: 'detect-commitment',
    model: REASONING_MODEL,
    messages: [
      { role: 'system', content: 'TODO: detect commitment prompt body — deferred per PRD §15' },
      { role: 'user', content: JSON.stringify(input) },
    ],
    responseFormat: { type: 'json_object' },
  })

  const content = response.choices[0]?.message?.content ?? '{}'
  return detectCommitmentOutput.parse(JSON.parse(content))
}
