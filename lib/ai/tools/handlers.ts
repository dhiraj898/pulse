import { createAdminClient } from '@/lib/supabase/admin'
import { draftEmailReply } from '@/lib/ai/prompts/draft-email-reply'
import type { TaskStatus, EmailPriority, NudgeChannel } from '@/types/database'

// Stub implementations — fleshed out in M7
export async function handleToolCall(
  toolName: string,
  args: Record<string, unknown>,
  userId: string,
  _userTz: string
): Promise<unknown> {
  const admin = createAdminClient()

  switch (toolName) {
    case 'list_tasks': {
      let query = admin.from('tasks').select('*').eq('user_id', userId).order('due_at', { ascending: true })
      if (args.status) query = query.eq('status', args.status as TaskStatus)
      if (args.due_before) query = query.lte('due_at', args.due_before as string)
      if (args.due_after) query = query.gte('due_at', args.due_after as string)
      if (args.limit) query = query.limit(args.limit as number)
      const { data } = await query
      return data ?? []
    }

    case 'create_task': {
      const { data } = await admin.from('tasks').insert({
        user_id: userId,
        title: args.title as string,
        description: null,
        source_ref_id: null,
        evidence_quote: null,
        confidence: null,
        parent_recurring_id: null,
        recurrence_rule: null,
        completed_at: null,
        due_at: (args.due_at as string) ?? null,
        effort: (args.effort as 'S' | 'M' | 'L') ?? null,
        client_id: (args.client_id as string) ?? null,
        source: 'manual',
        status: 'accepted',
      }).select().single()
      return data
    }

    case 'update_task': {
      const { id, ...fields } = args
      const { data } = await admin.from('tasks')
        .update({ ...(fields as object), updated_at: new Date().toISOString() })
        .eq('id', id as string)
        .eq('user_id', userId)
        .select()
        .single()
      return data
    }

    case 'complete_task': {
      const { data } = await admin.from('tasks')
        .update({ status: 'done' as TaskStatus, completed_at: new Date().toISOString() })
        .eq('id', args.id as string)
        .eq('user_id', userId)
        .select()
        .single()
      return data
    }

    case 'log_time': {
      const { data } = await admin.from('time_entries').insert({
        user_id: userId,
        starts_at: args.starts_at as string,
        ends_at: args.ends_at as string,
        task_id: (args.task_id as string) ?? null,
        calendar_event_id: (args.calendar_event_id as string) ?? null,
        note: (args.note as string) ?? null,
        client_id: (args.client_id as string) ?? null,
        source: 'manual',
      }).select().single()
      return data
    }

    case 'list_time_entries': {
      const { data } = await admin.from('time_entries').select('*')
        .eq('user_id', userId)
        .gte('starts_at', args.start as string)
        .lte('starts_at', args.end as string)
        .order('starts_at')
      return data ?? []
    }

    case 'list_events': {
      const { data } = await admin.from('calendar_events').select('*')
        .eq('user_id', userId)
        .gte('starts_at', args.start as string)
        .lte('starts_at', args.end as string)
        .order('starts_at')
      return data ?? []
    }

    case 'list_emails': {
      let query = admin.from('emails').select('*').eq('user_id', userId).order('received_at', { ascending: false })
      if (args.priority) query = query.eq('priority', args.priority as EmailPriority)
      if (args.awaiting_reply !== undefined) query = query.eq('awaiting_reply', args.awaiting_reply as boolean)
      if (args.limit) query = query.limit(args.limit as number)
      const { data } = await query
      return data ?? []
    }

    case 'draft_email_reply': {
      const { data: email } = await admin.from('emails').select('*')
        .eq('id', args.email_id as string).eq('user_id', userId).single()
      if (!email) return { error: 'Email not found' }
      const { data: user } = await admin.from('users').select('name, email').eq('id', userId).single()
      const draft = await draftEmailReply(userId, {
        user: { name: user?.name ?? '', email: user?.email ?? '' },
        email: {
          from_name: email.from_name,
          from_email: email.from_email,
          subject: email.subject,
          snippet: email.snippet,
        },
        intent: args.intent as string,
      })
      const composeUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(draft.subject)}`
      return { ...draft, gmail_compose_url: composeUrl }
    }

    case 'generate_report': {
      return { message: 'Report generation available in full app — open /reports to generate.' }
    }

    case 'set_reminder': {
      const { data } = await admin.from('reminders').insert({
        user_id: userId,
        task_id: (args.task_id as string) ?? null,
        fire_at: args.fire_at as string,
        channels: ['push', 'email'] as NudgeChannel[],
        payload: { message: (args.message as string) ?? null },
        email_id: null,
        sent_at: null,
        dismissed_at: null,
      }).select().single()
      return data
    }

    case 'query_transcripts': {
      const { data } = await admin.from('transcripts')
        .select('id, title, started_at, duration_min')
        .eq('user_id', userId)
        .textSearch('search_tsv', args.query as string)
        .limit((args.limit as number) ?? 5)
      return data ?? []
    }

    default:
      return { error: `Unknown tool: ${toolName}` }
  }
}
