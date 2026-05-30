import { describe, it, expect, beforeAll } from 'vitest'

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
  process.env.SARVAM_API_KEY = 'test-key'
  process.env.ENCRYPTION_KEY = 'a'.repeat(64)
})

describe('triage-tasks stub', () => {
  it('returns valid output shape', async () => {
    const { triageTasks, triageTasksOutput } = await import('@/lib/ai/prompts/triage-tasks')
    const result = await triageTasks('user-id', {
      user: { name: 'Dhiraj', email: 'test@example.com', aliases: [] },
      transcript: { title: 'Test meeting', date: '2026-05-29', attendees: [], sentences: [] },
    })
    expect(() => triageTasksOutput.parse(result)).not.toThrow()
    expect(result.tasks).toEqual([])
  })
})

describe('classify-email stub', () => {
  it('returns valid output shape', async () => {
    const { classifyEmail, classifyEmailOutput } = await import('@/lib/ai/prompts/classify-email')
    const result = await classifyEmail('user-id', {
      user: { name: 'Dhiraj', email: 'test@example.com' },
      vips: [],
      email: { from_email: 'sender@example.com', from_name: null, subject: 'Test', snippet: 'Hello', received_at: '2026-05-29T09:00:00Z' },
    })
    expect(() => classifyEmailOutput.parse(result)).not.toThrow()
  })
})

describe('detect-commitment stub', () => {
  it('returns valid output shape', async () => {
    const { detectCommitment, detectCommitmentOutput } = await import('@/lib/ai/prompts/detect-commitment')
    const result = await detectCommitment('user-id', { body: 'I will send it by Friday', today_iso: '2026-05-29' })
    expect(() => detectCommitmentOutput.parse(result)).not.toThrow()
  })
})

describe('parse-quick-add stub', () => {
  it('returns valid output shape with title = input', async () => {
    const { parseQuickAdd, parseQuickAddOutput } = await import('@/lib/ai/prompts/parse-quick-add')
    const result = await parseQuickAdd('user-id', { input: 'Send proposal to Acme', today_iso: '2026-05-29' })
    expect(() => parseQuickAddOutput.parse(result)).not.toThrow()
    expect(result.title).toBe('Send proposal to Acme')
  })
})

describe('draft-email-reply stub', () => {
  it('returns valid output shape', async () => {
    const { draftEmailReply, draftEmailReplyOutput } = await import('@/lib/ai/prompts/draft-email-reply')
    const result = await draftEmailReply('user-id', {
      user: { name: 'Dhiraj', email: 'test@example.com' },
      email: { from_name: 'Alice', from_email: 'alice@example.com', subject: 'Follow up', snippet: 'Can you send the doc?' },
      intent: 'Tell them I will send it tomorrow',
    })
    expect(() => draftEmailReplyOutput.parse(result)).not.toThrow()
  })
})

describe('generate-report stub', () => {
  it('returns a string', async () => {
    const { generateReport } = await import('@/lib/ai/prompts/generate-report')
    const result = await generateReport('user-id', {
      user: { name: 'Dhiraj', email: 'test@example.com', timezone: 'Asia/Kolkata' },
      range_label: 'Today, 29 May',
      time_by_client: [],
      tasks_completed: [],
      tasks_in_progress: [],
      open_commitments: [],
      totals: { logged_hours: 0, meetings_count: 0, tasks_completed_count: 0 },
    })
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})
