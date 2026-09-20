/** "400 ml" / "2" — a blank unit means "piece", so it's just the number. */
export function formatQuantity(quantity: number, unit: string | null): string {
  return unit ? `${quantity} ${unit}` : String(quantity)
}
