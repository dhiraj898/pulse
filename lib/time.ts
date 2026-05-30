import { format, formatISO, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

export function toUserTZ(date: Date | string, tz: string): Date {
  const d = typeof date === 'string' ? parseISO(date) : date
  return toZonedTime(d, tz)
}

export function fromUserTZ(date: Date, tz: string): Date {
  return fromZonedTime(date, tz)
}

export function formatInTZ(date: Date | string, tz: string, fmt: string): string {
  const zonedDate = toUserTZ(date, tz)
  return format(zonedDate, fmt)
}

export function todayRangeUTC(tz: string): { start: Date; end: Date } {
  const now = new Date()
  const zonedNow = toZonedTime(now, tz)
  const zonedStart = startOfDay(zonedNow)
  const zonedEnd = endOfDay(zonedNow)
  return {
    start: fromZonedTime(zonedStart, tz),
    end: fromZonedTime(zonedEnd, tz),
  }
}

export function thisWeekRangeUTC(tz: string): { start: Date; end: Date } {
  const now = new Date()
  const zonedNow = toZonedTime(now, tz)
  const zonedStart = startOfWeek(zonedNow, { weekStartsOn: 1 })
  const zonedEnd = endOfWeek(zonedNow, { weekStartsOn: 1 })
  return {
    start: fromZonedTime(zonedStart, tz),
    end: fromZonedTime(zonedEnd, tz),
  }
}

export function minutesToHours(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function isoNow(): string {
  return formatISO(new Date())
}
