import { Router } from 'express'
import { db } from '../store/db.js'
import { authenticate, requireRoles, staffRoles, adminRoles } from '../middleware/auth.js'
import { success } from '../utils/helpers.js'

const router = Router()

router.use(authenticate)

/** GET /api/analytics/dashboard — role-scoped KPIs */
router.get('/dashboard', (req, res) => {
  const role = req.user!.role
  if (role === 'seller') {
    const sid = req.user!.sellerId || req.user!.id
    const seller = db.sellers.find((s) => s.id === sid)
    res.json(
      success({
        revenue: seller?.totalRevenue || 0,
        orders: seller?.totalOrders || 0,
        products: seller?.totalProducts || 0,
        rating: seller?.rating || 0,
        pendingPayouts: seller?.pendingPayouts || 0,
        timeline: db.analytics.earningsTimeline,
        weeklyOrders: db.analytics.weeklyOrders,
        performance: db.analytics.sellerPerformance,
      })
    )
    return
  }

  res.json(
    success({
      kpi: db.analytics.kpiData,
      monthlyRevenue: db.analytics.monthlyRevenue,
      weeklyOrders: db.analytics.weeklyOrders,
      categorySales: db.analytics.categorySales,
      orderStatusDist: db.analytics.orderStatusDist,
      userGrowth: db.analytics.userGrowth,
      platformGMV: role === 'superadmin' || role === 'admin' ? db.analytics.platformGMV : undefined,
      regionalSales: role === 'superadmin' ? db.analytics.regionalSales : undefined,
    })
  )
})

router.get('/revenue', requireRoles(...staffRoles, ...adminRoles, 'seller'), (req, res) => {
  const period = String(req.query.period || 'monthly')
  res.json(
    success({
      period,
      data: period === 'weekly' ? db.analytics.weeklyOrders : db.analytics.monthlyRevenue,
    })
  )
})

router.get('/orders', (_req, res) => {
  res.json(success({ weekly: db.analytics.weeklyOrders, statusDist: db.analytics.orderStatusDist }))
})

router.get('/users/growth', requireRoles(...adminRoles), (_req, res) => {
  res.json(success(db.analytics.userGrowth))
})

router.get('/categories', (_req, res) => {
  res.json(success(db.analytics.categorySales))
})

router.get('/regions', requireRoles('superadmin', 'admin'), (_req, res) => {
  res.json(success(db.analytics.regionalSales))
})

router.get('/returns', (_req, res) => {
  res.json(success(db.analytics.returnRates))
})

export default router
