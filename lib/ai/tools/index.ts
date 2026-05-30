import OpenAI from 'openai'

export const chatTools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'list_tasks',
      description: 'List tasks with optional filters',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['proposed', 'accepted', 'in_progress', 'done', 'rejected', 'snoozed'] },
          due_before: { type: 'string', description: 'ISO datetime' },
          due_after: { type: 'string', description: 'ISO datetime' },
          client_id: { type: 'string' },
          limit: { type: 'number', default: 20 },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_task',
      description: 'Create a new task',
      parameters: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string' },
          due_at: { type: 'string', description: 'ISO datetime' },
          effort: { type: 'string', enum: ['S', 'M', 'L'] },
          client_id: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_task',
      description: 'Update a task by ID',
      parameters: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          status: { type: 'string' },
          due_at: { type: 'string' },
          effort: { type: 'string', enum: ['S', 'M', 'L'] },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'complete_task',
      description: 'Mark a task as done',
      parameters: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'log_time',
      description: 'Log a time entry',
      parameters: {
        type: 'object',
        required: ['starts_at', 'ends_at'],
        properties: {
          starts_at: { type: 'string', description: 'ISO datetime' },
          ends_at: { type: 'string', description: 'ISO datetime' },
          task_id: { type: 'string' },
          calendar_event_id: { type: 'string' },
          note: { type: 'string' },
          client_id: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_time_entries',
      description: 'List time entries for a date range',
      parameters: {
        type: 'object',
        required: ['start', 'end'],
        properties: {
          start: { type: 'string', description: 'ISO datetime' },
          end: { type: 'string', description: 'ISO datetime' },
          group_by: { type: 'string', enum: ['client', 'task', 'day'] },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_events',
      description: 'List calendar events for a date range',
      parameters: {
        type: 'object',
        required: ['start', 'end'],
        properties: {
          start: { type: 'string' },
          end: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_emails',
      description: 'List emails with optional filters',
      parameters: {
        type: 'object',
        properties: {
          priority: { type: 'string', enum: ['urgent', 'important', 'fyi', 'noise'] },
          awaiting_reply: { type: 'boolean' },
          limit: { type: 'number', default: 10 },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'draft_email_reply',
      description: 'Draft a reply to an email given user intent',
      parameters: {
        type: 'object',
        required: ['email_id', 'intent'],
        properties: {
          email_id: { type: 'string' },
          intent: { type: 'string', description: 'What the user wants to say' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_report',
      description: 'Generate a report for a time range',
      parameters: {
        type: 'object',
        required: ['range'],
        properties: {
          range: { type: 'string', enum: ['today', 'this_week', 'custom'] },
          start: { type: 'string', description: 'Required if range=custom' },
          end: { type: 'string', description: 'Required if range=custom' },
          format: { type: 'string', enum: ['markdown', 'csv', 'share_link', 'email_draft'], default: 'markdown' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_reminder',
      description: 'Set a reminder for a task or custom message',
      parameters: {
        type: 'object',
        required: ['fire_at'],
        properties: {
          task_id: { type: 'string' },
          fire_at: { type: 'string', description: 'ISO datetime' },
          message: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_transcripts',
      description: 'Full-text search over meeting transcripts and notes',
      parameters: {
        type: 'object',
        required: ['query'],
        properties: {
          query: { type: 'string', description: 'Search terms' },
          limit: { type: 'number', default: 5 },
        },
      },
    },
  },
]
