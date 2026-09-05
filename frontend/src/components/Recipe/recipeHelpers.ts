/** "400 ml" / "2" — a blank unit means "piece", so it's just the number. */
export function formatQuantity(quantity: number, unit: string | null): string {
  return unit ? `${quantity} ${unit}` : String(quantity)
}

/** Picks up to `count` items at random, without mutating `items`. */
export function pickRandom<T>(items: T[], count: number): T[] {
  const pool = [...items]
  const picked: T[] = []

  while (pool.length > 0 && picked.length < count) {
    const index = Math.floor(Math.random() * pool.length)
    picked.push(pool.splice(index, 1)[0]!)
  }

  return picked
}
