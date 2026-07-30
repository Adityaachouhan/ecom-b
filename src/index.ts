import './lib/env.js'
import { connectDatabase, disconnectDatabase } from './lib/prisma.js'
import { db } from './store/db.js'
import { hydrateFromDatabase } from './store/hydrate.js'
import app from './app.js'

const PORT = Number(process.env.PORT) || 3001

async function bootstrap() {
  let dbStatus = 'in-memory seed (DB skipped)'

  try {
    await connectDatabase()
    console.log(
      `✓ Connected to PostgreSQL ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
    )

    const counts = await hydrateFromDatabase(db as never)
    console.log(
      `✓ Hydrated from DB — users:${counts.users} products:${counts.products} orders:${counts.orders} sellers:${counts.sellers}`
    )
    dbStatus = `${process.env.DB_NAME}@${process.env.DB_HOST}`

    if (counts.products === 0) {
      console.warn('⚠ Database is empty. Run: npm run db:seed')
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn(`⚠ Database unavailable — starting without Postgres.`)
    console.warn(`  ${message}`)
    console.warn('  Using in-memory seed data. Changes will not persist.')
    await disconnectDatabase().catch(() => undefined)
  }

  app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════╗
║     Uniqora API running on :${PORT}            ║
║     Health: http://localhost:${PORT}/api/health ║
║     Database: ${dbStatus.padEnd(33)}║
║                                              ║
║  Portal logins (password: password123)       ║
║  • /login/customer  priya.sharma@email.com   ║
║  • /login/seller    rahul@electronics.in     ║
║  • /login/manager   anita.verma@marketplace… ║
║  • /login/admin     vikram.singh@marketplace…║
║  • /login/superadmin root@marketplace.com    ║
╚══════════════════════════════════════════════╝
`)
  })
}

async function shutdown() {
  await disconnectDatabase()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

bootstrap()
