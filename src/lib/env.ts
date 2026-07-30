import { config } from 'dotenv'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Loads env vars by NODE_ENV:
 *   development → .env.development
 *   production  → .env.production
 * Falls back to .env (Prisma CLI / local).
 * Skips if vars were already injected (e.g. --env-file or host platform).
 */
const root = process.cwd()
const nodeEnv = process.env.NODE_ENV || 'development'
const envFile = resolve(root, `.env.${nodeEnv}`)

if (existsSync(envFile)) {
  config({ path: envFile })
} else {
  config({ path: resolve(root, '.env') })
}
