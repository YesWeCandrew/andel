// Local-calendar-date helpers — no date library in this repo, so everything
// here works in local time by construction. That matters because
// `Date#toISOString()` reports the UTC date, which silently drifts by a day
// for anyone west of UTC in the evening (or east of it before dawn); every
// helper below reads/writes the *local* wall-clock date instead.

const DAY_MS = 24 * 60 * 60 * 1000

/** Local calendar date as 'YYYY-MM-DD', not UTC — so "today" matches the user's clock. */
export function toISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Parses a 'YYYY-MM-DD' string as a local midnight Date (not UTC). */
export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year!, month! - 1, day!)
}

export function addDaysISO(iso: string, days: number): string {
  const date = parseISODate(iso)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

export function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

/** "Today" / "Tomorrow" / e.g. "Sat 12 Sep" for anything further out. */
export function formatDayLabel(iso: string, todayIso: string): string {
  if (iso === todayIso) return 'Today'
  if (iso === addDaysISO(todayIso, 1)) return 'Tomorrow'

  return parseISODate(iso).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/** "today" / "tomorrow" / "in 3 days" / "2 days ago", relative to now. */
export function formatRelativeToNow(dateInput: string | Date, now: Date = new Date()): string {
  const date = startOfDay(new Date(dateInput))
  const today = startOfDay(now)
  const diffDays = Math.round((date.getTime() - today.getTime()) / DAY_MS)

  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'tomorrow'
  if (diffDays === -1) return 'yesterday'
  if (diffDays > 1) return `in ${diffDays} days`
  return `${Math.abs(diffDays)} days ago`
}

/** "Good morning" / "Good afternoon" / "Good evening", based on the hour. */
export function getGreeting(now: Date): string {
  const hour = now.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function ordinalSuffix(day: number): string {
  if (day % 10 === 1 && day !== 11) return 'st'
  if (day % 10 === 2 && day !== 12) return 'nd'
  if (day % 10 === 3 && day !== 13) return 'rd'
  return 'th'
}

export function formatDisplayDate(now: Date): string {
  const day = now.getDate()
  const month = now.toLocaleDateString('en-GB', { month: 'long' })
  return `${day}${ordinalSuffix(day)} ${month} ${now.getFullYear()}`
}

export function formatDisplayTime(now: Date): string {
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}
