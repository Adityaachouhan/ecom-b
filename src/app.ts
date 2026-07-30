import express from 'express'
import cors from 'cors'
import { errorHandler, notFound } from './middleware/error.js'
import { prisma } from './lib/prisma.js'

import authRoutes from './routes/auth.js'
import productsRoutes from './routes/products.js'
import categoriesRoutes from './routes/categories.js'
import cartRoutes from './routes/cart.js'
import wishlistRoutes from './routes/wishlist.js'
import couponsRoutes from './routes/coupons.js'
import ordersRoutes from './routes/orders.js'
import usersRoutes from './routes/users.js'
import sellersRoutes from './routes/sellers.js'
import moderationRoutes from './routes/moderation.js'
import managerRoutes from './routes/manager.js'
import marketingRoutes from './routes/marketing.js'
import { adsAdminRouter, adsPublicRouter } from './routes/ads.js'
import analyticsRoutes from './routes/analytics.js'
import superadminRoutes from './routes/superadmin.js'
import paymentsRoutes from './routes/payments.js'
import notificationsRoutes from './routes/notifications.js'
import reviewsRoutes from './routes/reviews.js'

const app = express()

const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  })
)
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', async (_req, res) => {
  let database: 'connected' | 'disconnected' = 'disconnected'
  try {
    await prisma.$queryRaw`SELECT 1`
    database = 'connected'
  } catch {
    database = 'disconnected'
  }

  res.status(200).json({
    success: true,
    message: 'Uniqora API is running',
    database,
    dbName: process.env.DB_NAME,
    timestamp: new Date().toISOString(),
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/products', productsRoutes)
app.use('/api/categories', categoriesRoutes)
app.use('/api/ads', adsPublicRouter)
app.use('/api/cart', cartRoutes)
app.use('/api/wishlist', wishlistRoutes)
app.use('/api/coupons', couponsRoutes)
app.use('/api/orders', ordersRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/sellers', sellersRoutes)
app.use('/api/admin/moderation', moderationRoutes)
app.use('/api/manager', managerRoutes)
app.use('/api/admin', marketingRoutes)
app.use('/api/admin/ads', adsAdminRouter)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/superadmin', superadminRoutes)
app.use('/api/payments', paymentsRoutes)
app.use('/api/notifications', notificationsRoutes)
app.use('/api/reviews', reviewsRoutes)

app.use(notFound)
app.use(errorHandler)

export default app
