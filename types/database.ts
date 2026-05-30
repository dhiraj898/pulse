export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type TaskSource = 'calendar' | 'fireflies' | 'manual' | 'email' | 'recurring'
export type TaskStatus = 'proposed' | 'accepted' | 'in_progress' | 'done' | 'rejected' | 'snoozed'
export type EffortSize = 'S' | 'M' | 'L'
export type EmailPriority = 'urgent' | 'important' | 'fyi' | 'noise'
export type NudgeChannel = 'push' | 'email'

type TableDef<R, I, U> = {
  Row: R
  Insert: I
  Update: U
  Relationships: []
}

type UserRow = {
  id: string
  email: string
  name: string | null
  role: string | null
  use_case: string | null
  referral_source: string | null
  timezone: string
  work_hours_start: string
  work_hours_end: string
  google_refresh_token_encrypted: string | null
  fireflies_refresh_token_encrypted: string | null
  fireflies_access_token_encrypted: string | null
  fireflies_access_token_expires_at: string | null
  fireflies_api_key_encrypted: string | null
  recurring_spawn_days: number
  ai_budget_inr_used_this_month: number
  ai_budget_reset_at: string
  created_at: string
}

type UserSettingsRow = {
  user_id: string
  shortcuts: Json
  theme: string
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

type VipRow = {
  id: string
  user_id: string
  kind: 'email' | 'domain' | 'keyword'
  value: string
  weight: number
  label: string | null
  created_at: string
}

type ClientsProjectsRow = {
  id: string
  user_id: string
  name: string
  color: string
  email_domains: string[]
  active: boolean
  created_at: string
}

type CalendarEventRow = {
  id: string
  user_id: string
  gcal_event_id: string
  gcal_recurring_event_id: string | null
  title: string
  description: string | null
  starts_at: string
  ends_at: string
  attendees: Json
  organizer_email: string | null
  response_status: string | null
  client_id: string | null
  attended: boolean | null
  actual_minutes: number | null
  raw: Json | null
  synced_at: string
}

type TranscriptRow = {
  id: string
  user_id: string
  fireflies_id: string
  calendar_event_id: string | null
  title: string | null
  started_at: string | null
  duration_min: number | null
  attendees: Json
  triaged_at: string | null
  raw: Json | null
  raw_purge_at: string | null
  search_tsv: string | null
}

type TaskRow = {
  id: string
  user_id: string
  title: string
  description: string | null
  source: TaskSource
  source_ref_id: string | null
  status: TaskStatus
  effort: EffortSize | null
  due_at: string | null
  evidence_quote: string | null
  confidence: number | null
  client_id: string | null
  parent_recurring_id: string | null
  recurrence_rule: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

type TimeEntryRow = {
  id: string
  user_id: string
  task_id: string | null
  calendar_event_id: string | null
  starts_at: string
  ends_at: string
  minutes: number
  note: string | null
  source: TaskSource
  client_id: string | null
  created_at: string
}

type EmailRow = {
  id: string
  user_id: string
  gmail_message_id: string
  gmail_thread_id: string
  from_email: string
  from_name: string | null
  subject: string | null
  snippet: string | null
  received_at: string
  priority: EmailPriority | null
  priority_reason: string | null
  awaiting_reply: boolean
  commitment_due_at: string | null
  replied_at: string | null
  classified_at: string | null
}

type NoteRow = {
  id: string
  user_id: string
  body: string
  task_id: string | null
  transcript_id: string | null
  search_tsv: string | null
  created_at: string
}

type ReminderRow = {
  id: string
  user_id: string
  task_id: string | null
  email_id: string | null
  fire_at: string
  channels: NudgeChannel[]
  sent_at: string | null
  dismissed_at: string | null
  payload: Json | null
  created_at: string
}

type NudgeSettingsRow = {
  user_id: string
  morning_brief_enabled: boolean
  morning_brief_time: string
  email_check_enabled: boolean
  email_check_times: string[]
  overwork_threshold_hours: number
  underlog_threshold_hours: number
  eod_prompt_enabled: boolean
  eod_prompt_time: string
  channels: NudgeChannel[]
}

type PushSubscriptionRow = {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  created_at: string
}

type ShareLinkRow = {
  token: string
  user_id: string
  report_type: string
  range_start: string
  range_end: string
  expires_at: string
  created_at: string
}

type AiCallRow = {
  id: string
  user_id: string
  purpose: string
  model: string
  input_tokens: number | null
  output_tokens: number | null
  inr_cost: number | null
  created_at: string
}

type ChatMessageRow = {
  id: string
  user_id: string
  role: 'user' | 'assistant' | 'tool'
  content: Json
  embedding: number[] | null
  created_at: string
}

type SavedViewRow = {
  id: string
  user_id: string
  name: string
  entity: 'tasks' | 'emails' | 'calendar'
  filters: Json
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      users: TableDef<
        UserRow,
        Partial<UserRow> & { id: string; email: string },
        Partial<UserRow>
      >
      user_settings: TableDef<
        UserSettingsRow,
        Partial<UserSettingsRow> & { user_id: string },
        Partial<UserSettingsRow>
      >
      vips: TableDef<
        VipRow,
        Omit<VipRow, 'id' | 'created_at'> & { id?: string; created_at?: string },
        Partial<VipRow>
      >
      clients_projects: TableDef<
        ClientsProjectsRow,
        Omit<ClientsProjectsRow, 'id' | 'created_at'> & { id?: string; created_at?: string },
        Partial<ClientsProjectsRow>
      >
      calendar_events: TableDef<
        CalendarEventRow,
        Omit<CalendarEventRow, 'id' | 'synced_at'> & { id?: string; synced_at?: string },
        Partial<CalendarEventRow>
      >
      transcripts: TableDef<
        TranscriptRow,
        Omit<TranscriptRow, 'id'> & { id?: string },
        Partial<TranscriptRow>
      >
      tasks: TableDef<
        TaskRow,
        Omit<TaskRow, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string },
        Partial<TaskRow>
      >
      time_entries: TableDef<
        TimeEntryRow,
        Omit<TimeEntryRow, 'id' | 'minutes' | 'created_at'> & { id?: string; created_at?: string },
        Partial<Omit<TimeEntryRow, 'id' | 'minutes'>>
      >
      emails: TableDef<
        EmailRow,
        Omit<EmailRow, 'id'> & { id?: string },
        Partial<EmailRow>
      >
      notes: TableDef<
        NoteRow,
        Omit<NoteRow, 'id' | 'created_at'> & { id?: string; created_at?: string },
        Partial<NoteRow>
      >
      reminders: TableDef<
        ReminderRow,
        Omit<ReminderRow, 'id' | 'created_at'> & { id?: string; created_at?: string },
        Partial<ReminderRow>
      >
      nudge_settings: TableDef<
        NudgeSettingsRow,
        Partial<NudgeSettingsRow> & { user_id: string },
        Partial<NudgeSettingsRow>
      >
      push_subscriptions: TableDef<
        PushSubscriptionRow,
        Omit<PushSubscriptionRow, 'id' | 'created_at'> & { id?: string; created_at?: string },
        Partial<PushSubscriptionRow>
      >
      share_links: TableDef<
        ShareLinkRow,
        ShareLinkRow,
        Partial<ShareLinkRow>
      >
      ai_calls: TableDef<
        AiCallRow,
        Omit<AiCallRow, 'id' | 'created_at'> & { id?: string; created_at?: string },
        Partial<AiCallRow>
      >
      chat_messages: TableDef<
        ChatMessageRow,
        Omit<ChatMessageRow, 'id' | 'created_at'> & { id?: string; created_at?: string },
        Partial<ChatMessageRow>
      >
      saved_views: TableDef<
        SavedViewRow,
        Omit<SavedViewRow, 'id' | 'created_at'> & { id?: string; created_at?: string },
        Partial<SavedViewRow>
      >
    }
    Views: Record<string, never>
    Functions: {
      increment_ai_budget: {
        Args: { user_id_param: string; amount: number }
        Returns: undefined
      }
    }
    Enums: {
      task_source: TaskSource
      task_status: TaskStatus
      effort_size: EffortSize
      email_priority: EmailPriority
      nudge_channel: NudgeChannel
    }
    CompositeTypes: Record<string, never>
  }
}
