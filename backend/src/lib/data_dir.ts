// src/lib/data_dir.ts
import { resolve } from 'node:path'

// Root for all persistent, runtime-written state (db + uploads). Fly mounts
// a volume here in production (DATA_DIR=/data); locally it defaults to
// backend/data, gitignored. Resolved to an absolute path since
// @fastify/static's `root` option requires one.
export const DATA_DIR = resolve(process.env.DATA_DIR ?? './data')
