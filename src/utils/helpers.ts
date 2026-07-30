import { randomBytes } from 'crypto'

export function generateId(prefix = ''): string {
  const id = randomBytes(4).toString('hex')
  return prefix ? `${prefix}_${id}` : id
}

export function paginate<T>(items: T[], page = 1, limit = 20) {
  const p = Math.max(1, Number(page) || 1)
  const l = Math.min(100, Math.max(1, Number(limit) || 20))
  const start = (p - 1) * l
  const data = items.slice(start, start + l)
  return {
    data,
    meta: {
      page: p,
      limit: l,
      total: items.length,
      totalPages: Math.ceil(items.length / l) || 1,
    },
  }
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function nowISO(): string {
  return new Date().toISOString()
}

export function success<T>(data: T, message?: string) {
  return { success: true, ...(message ? { message } : {}), data }
}

export function fail(message: string, status = 400) {
  const err = new Error(message) as Error & { status: number }
  err.status = status
  return err
}
