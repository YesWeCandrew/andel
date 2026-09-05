// Thin fetch wrapper around the backend API.
//
// In dev, requests go through the Vite proxy configured in vite.config.ts so
// they stay same-origin (the backend registers no CORS headers). In
// production this expects to be served from the same origin as the API, or
// VITE_API_URL to point at it directly.
const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  // A FormData body needs the browser to set its own multipart boundary
  // header — setting Content-Type ourselves would break the upload.
  const isFormData = options?.body instanceof FormData

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options?.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new ApiError(body?.error ?? res.statusText, res.status)
  }

  if (res.status === 204) {
    return undefined as T
  }

  return (await res.json()) as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  // For multipart/form-data bodies (e.g. file uploads) — skips the JSON
  // Content-Type/stringify step `post` always applies, since the browser
  // needs to set its own multipart boundary header for a FormData body.
  upload: <T>(path: string, body: FormData) => request<T>(path, { method: 'POST', body }),
}
