import { z } from 'zod'
import { callAI, REASONING_MODEL } from '@/lib/ai/client'

export const draftEmailReplyInput = z.object({
  user: z.object({ name: z.string(), email: z.string() }),
  email: z.object({
    from_name: z.string().nullable(),
    from_email: z.string(),
    subject: z.string().nullable(),
    snippet: z.string().nullable(),
  }),
  intent: z.string(),
})

export const draftEmailReplyOutput = z.object({
  subject: z.string(),
  body: z.string(),
  is_commitment: z.boolean(),
  commitment_due_hint: z.string().nullable(),
})

export type DraftEmailReplyInput = z.infer<typeof draftEmailReplyInput>
export type DraftEmailReplyOutput = z.infer<typeof draftEmailReplyOutput>

// TODO: write prompt body — deferred per PRD §15
export async function draftEmailReply(
  userId: string,
  input: DraftEmailReplyInput
): Promise<DraftEmailReplyOutput> {
  if (process.env.NODE_ENV === 'test') {
    return {
      subject: `Re: ${input.email.subject ?? ''}`,
      body: 'Draft reply stub.',
      is_commitment: false,
      commitment_due_hint: null,
    }
  }

  const response = await callAI({
    userId,
    purpose: 'draft-email-reply',
    model: REASONING_MODEL,
    messages: [
      { role: 'system', content: 'TODO: draft email reply prompt body — deferred per PRD §15' },
      { role: 'user', content: JSON.stringify(input) },
    ],
    responseFormat: { type: 'json_object' },
  })

  const content = response.choices[0]?.message?.content ?? '{}'
  return draftEmailReplyOutput.parse(JSON.parse(content))
}
