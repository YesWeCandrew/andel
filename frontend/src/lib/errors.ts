/** Extracts a readable message from a caught value, falling back for anything that isn't an Error (an ApiError still passes through, since it extends Error). */
export function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback
}
