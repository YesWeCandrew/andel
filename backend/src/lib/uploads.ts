// src/lib/uploads.ts
import { join } from 'node:path'
import { DATA_DIR } from './data_dir.ts'

// Runtime-written state, unlike backend/public (which is only ever produced
// by the frontend's Docker build stage) — gitignored, and needs a
// persistent volume in production (see DATA_DIR).
export const UPLOADS_DIR = join(DATA_DIR, 'uploads')
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024
