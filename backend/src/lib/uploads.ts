// src/lib/uploads.ts
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Runtime-written state, unlike backend/public (which is only ever produced
// by the frontend's Docker build stage) — gitignored, and needs a
// persistent volume in production.
export const UPLOADS_DIR = join(__dirname, '../../data/uploads')
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024
