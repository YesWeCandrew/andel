# DEVELOPMENT

# Backend

## Drizzle migrations

Schema changes are tracked as committed migration files, not applied ad hoc — this is what lets production upgrades happen without losing data.

To change the schema:

1. Edit `backend/src/schema.ts`.
2. Run `npm run db:generate` (from `backend/`) — diffs your schema against the last committed snapshot and writes a new file under `backend/drizzle/`.
3. **Review the generated SQL** in `backend/drizzle/`, especially for renames, drops, or type changes — drizzle-kit's diff can be ambiguous or destructive for anything beyond adding a nullable column.
4. Commit `schema.ts` together with everything drizzle-kit just generated under `backend/drizzle/` (`.sql` files *and* `meta/`) in the same commit — they must never drift apart. `meta/` holds the schema snapshots drizzle-kit diffs against next time; without it, the next `db:generate` can't compute a correct diff.
5. Run `npm run db:migrate` to apply it locally.

Do **not** use `drizzle-kit push` against a database with real data — it recomputes schema live against the DB and can be lossy on divergence. It's fine for quick prototyping against a throwaway local DB, but the generate → review → migrate flow above is what's used for anything that matters.

## Running locally without Docker

Requires Node 24+ (used for its built-in TypeScript support — the backend runs `.ts` files directly, no build step) and npm.

**Backend** (from `backend/`):
```
npm install
npm run db:migrate   # applies any pending migrations to backend/db/db.db
npm run dev           # starts Fastify on :3000
```

**Frontend** (from `frontend/`, in a separate terminal):
```
npm install
npm run dev            # starts Vite on :5173, proxying /todo etc. to :3000
```

Open `http://localhost:5173` — the Vite dev server proxies API calls to the backend (see `frontend/vite.config.ts`), so both need to be running together. This is the standard day-to-day dev loop; Docker (below) is for testing the production build/packaging, not for iterating on code.

## Docker (local)

```
docker compose up --build
```

Runs the whole app (backend serving the built frontend) in one container, with a named volume (`db-data`) so the SQLite file persists across rebuilds/restarts. Migrations run automatically at container startup, before the server starts.

## Authentication

Every URL (API, uploads and the frontend) is behind a single shared password, read from the `APP_PASSWORD` env var (see `backend/src/lib/auth.ts`). The browser's native Basic auth prompt is shown once; a successful login sets a signed, 180 day long cookie so the prompt doesn't come back (iOS home-screen apps don't reliably keep Basic auth credentials).

- **Production:** set it as a Fly runtime secret — `fly secrets set APP_PASSWORD='...'`. The server refuses to start in production without it.
- **Locking everyone out:** set a new password. The cookie is signed with the password, so every existing session is invalidated immediately.
- **Local dev:** leave `APP_PASSWORD` unset to disable auth, or set it (e.g. `APP_PASSWORD=test npm run dev`) to try the flow. `docker compose` defaults it to `password`.

## Deploying (Fly.io)

```
fly deploy
```

Rebuilds the image and replaces the running machine. On startup, the container runs pending migrations from `backend/drizzle/` against the Fly volume (`/data`), then starts the server — so only the new commit's schema changes apply, and existing rows are untouched.
