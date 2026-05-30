import { z } from 'zod'
import { callAI, REASONING_MODEL } from '@/lib/ai/client'

export const triageTasksInput = z.object({
  user: z.object({
    name: z.string(),
    email: z.string(),
    aliases: z.array(z.string()),
    role: z.string().optional(),
  }),
  transcript: z.object({
    title: z.string(),
    date: z.string(),
    attendees: z.array(z.object({ email: z.string(), name: z.string().optional() })),
    sentences: z.array(z.object({ speaker_name: z.string(), text: z.string() })),
  }),
})

export const triageTasksOutput = z.object({
  tasks: z.array(z.object({
    title: z.string().max(120),
    description: z.string().nullable(),
    evidence_quote: z.string().max(250),
    effort: z.enum(['S', 'M', 'L']),
    due_hint: z.string().nullable(),
    confidence: z.number().min(0).max(1),
  })),
})

export type TriageTasksInput = z.infer<typeof triageTasksInput>
export type TriageTasksOutput = z.infer<typeof triageTasksOutput>

// TODO: write prompt body — deferred per PRD §15
const STUB_PROMPT = `TODO: write prompt; must enforce "only items owned by {{user.name}}" and require concrete deliverable.`

export async function triageTasks(
  userId: string,
  input: TriageTasksInput
): Promise<TriageTasksOutput> {
  if (process.env.NODE_ENV === 'test' || STUB_PROMPT.startsWith('TODO')) {
    return { tasks: [] }
  }

  const response = await callAI({
    userId,
    purpose: 'triage-tasks',
    model: REASONING_MODEL,
    messages: [
      {
        role: 'system',
        content: STUB_PROMPT
          .replace('{{user.name}}', input.user.name),
      },
      {
        role: 'user',
        content: JSON.stringify(input),
      },
    ],
    responseFormat: { type: 'json_object' },
  })

  const content = response.choices[0]?.message?.content ?? '{}'
  return triageTasksOutput.parse(JSON.parse(content))
}
