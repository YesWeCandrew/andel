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
