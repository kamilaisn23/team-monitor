import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

const WIB_OFFSET = 7 // UTC+7

/** Current time as a dayjs object in WIB. */
export function nowWib() {
  return dayjs.utc().add(WIB_OFFSET, 'hour')
}

/**
 * Given two "YYYY-MM-DD" strings, return UTC Date objects spanning that range
 * in WIB (UTC+7): start of startDate through end of endDate.
 */
export function wibDateRange(startDate: string, endDate: string): { start: Date; end: Date } {
  const start = dayjs.utc(startDate).startOf('day').subtract(WIB_OFFSET, 'hour').toDate()
  const end   = dayjs.utc(endDate).endOf('day').subtract(WIB_OFFSET, 'hour').toDate()
  return { start, end }
}

/**
 * Given a "YYYY-MM" string, return the UTC Date objects that correspond to
 * the start and end of that calendar month in WIB (UTC+7).
 *
 * e.g. "2026-03" → { start: 2026-02-28T17:00:00Z, end: 2026-03-31T16:59:59.999Z }
 */
export function wibMonthRange(month: string): { start: Date; end: Date } {
  const start = dayjs.utc(month + '-01')
    .startOf('month')
    .subtract(WIB_OFFSET, 'hour')
    .toDate()
  const end = dayjs.utc(month + '-01')
    .endOf('month')
    .subtract(WIB_OFFSET, 'hour')
    .toDate()
  return { start, end }
}

/**
 * Returns the UTC Date that was `days` whole days ago at WIB midnight.
 * Used for stale-issue cutoffs.
 */
export function wibDaysAgo(days: number): Date {
  return nowWib().subtract(days, 'day').startOf('day').subtract(WIB_OFFSET, 'hour').toDate()
}

/** Current month in "YYYY-MM" format, according to WIB. */
export function wibCurrentMonth(): string {
  return nowWib().format('YYYY-MM')
}

/**
 * Format a UTC timestamp (ISO string or Date) for display in WIB.
 * e.g. formatWib('2026-03-31T18:00:00Z', 'MMM D, YYYY') → 'Apr 1, 2026'
 */
export function formatWib(date: string | Date | null | undefined, fmt: string): string {
  if (!date) return ''
  return dayjs.utc(date).add(WIB_OFFSET, 'hour').format(fmt)
}

/** Returns a human-readable relative time string, e.g. "5m ago". */
export function timeAgo(date: string | Date): string {
  const diffMin = dayjs.utc().diff(dayjs.utc(date), 'minute')
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  return `${Math.floor(diffH / 24)}d ago`
}
