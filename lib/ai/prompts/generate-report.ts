import { z } from 'zod'
import { callAI, REASONING_MODEL } from '@/lib/ai/client'

export const generateReportInput = z.object({
  user: z.object({ name: z.string(), email: z.string(), timezone: z.string() }),
  range_label: z.string(),
  time_by_client: z.array(z.object({ client: z.string(), hours: z.number(), percent: z.number() })),
  tasks_completed: z.array(z.object({ title: z.string(), client: z.string().nullable(), completed_at: z.string() })),
  tasks_in_progress: z.array(z.object({ title: z.string(), due_at: z.string().nullable(), client: z.string().nullable() })),
  open_commitments: z.array(z.object({ from: z.string(), subject: z.string().nullable(), due_at: z.string() })),
  totals: z.object({ logged_hours: z.number(), meetings_count: z.number(), tasks_completed_count: z.number() }),
})

export type GenerateReportInput = z.infer<typeof generateReportInput>

const REPORT_PROMPT = `Generate a personal recap. Use ONLY the data provided. Do not add information not present in the data.

Format:
# {{range_label}}

## Highlights
- 3-5 bullets, derived from largest time blocks and completed tasks.

## Time by client
- {{client}}: {{hours}}h ({{percent}}%)

## Tasks completed
- {{title}} ({{client}})

## In progress / next up
- {{title}} — due {{due_at}}

## Open commitments
- Reply to {{from}}: "{{subject}}" — due {{due_at}}

Tone: factual, first-person ("I"), no adjectives, no emoji.`

export async function generateReport(
  userId: string,
  input: GenerateReportInput
): Promise<string> {
  if (process.env.NODE_ENV === 'test') {
    return `# ${input.range_label}\n\n## Highlights\n- Stub report\n`
  }

  const response = await callAI({
    userId,
    purpose: 'generate-report',
    model: REASONING_MODEL,
    messages: [
      {
        role: 'system',
        content: REPORT_PROMPT.replace('{{range_label}}', input.range_label),
      },
      {
        role: 'user',
        content: `Data: ${JSON.stringify(input)}`,
      },
    ],
  })

  return response.choices[0]?.message?.content ?? ''
}
