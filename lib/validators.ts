import { z } from 'zod'

export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export const DateRangeSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
})

export const TaskSourceEnum = z.enum(['calendar', 'fireflies', 'manual', 'email', 'recurring'])
export const TaskStatusEnum = z.enum(['proposed', 'accepted', 'in_progress', 'done', 'rejected', 'snoozed'])
export const EffortSizeEnum = z.enum(['S', 'M', 'L'])
export const EmailPriorityEnum = z.enum(['urgent', 'important', 'fyi', 'noise'])
export const NudgeChannelEnum = z.enum(['push', 'email'])

export const UUIDSchema = z.string().uuid()
