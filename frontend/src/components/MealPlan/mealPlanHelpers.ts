// No date library exists in this repo (see dashboardHelpers.ts for the same
// native-Date convention) — these are the small pieces a day-by-day calendar
// needs on top of that.

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
