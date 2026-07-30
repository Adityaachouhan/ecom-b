import { Router } from 'express'
import { db, logAudit, persistModerationStats } from '../store/db.js'
import {
  deleteProduct,
  saveFlaggedProduct,
  saveFlaggedReview,
  saveModerationStats,
} from '../store/persist.js'
import { authenticate, requireRoles, adminRoles } from '../middleware/auth.js'
import { fail, paginate, success } from '../utils/helpers.js'

const router = Router()

router.use(authenticate, requireRoles(...adminRoles))

/** GET /api/admin/moderation/stats */
router.get('/stats', (_req, res) => {
  const pendingReviews = db.flaggedReviews.filter((r) => r.status === 'pending' || r.status === 'reviewing').length
  const pendingProducts = db.flaggedProducts.filter((p) => p.status === 'pending' || p.status === 'reviewing').length
  res.json(
    success({
      pendingReviews,
      pendingProducts,
      pendingTotal: pendingReviews + pendingProducts,
      approvedToday: db.moderationStats.approvedToday,
      removedToday: db.moderationStats.removedToday,
    })
  )
})

/** GET /api/admin/moderation/reviews */
router.get('/reviews', (req, res) => {
  let list = [...db.flaggedReviews]
  if (req.query.status) list = list.filter((r) => r.status === req.query.status)
  res.json(success(paginate(list, Number(req.query.page), Number(req.query.limit || 20))))
})

/** GET /api/admin/moderation/reviews/:id */
router.get('/reviews/:id', (req, res, next) => {
  try {
    const item = db.flaggedReviews.find((r) => r.id === req.params.id)
    if (!item) throw fail('Flagged review not found', 404)
    res.json(success(item))
  } catch (e) {
    next(e)
  }
})

/** PATCH /api/admin/moderation/reviews/:id */
router.patch('/reviews/:id', async (req, res, next) => {
  try {
    const item = db.flaggedReviews.find((r) => r.id === req.params.id)
    if (!item) throw fail('Flagged review not found', 404)
    const action = req.body.action as string
    if (action === 'approve') {
      item.status = 'approved'
      db.moderationStats.approvedToday += 1
    } else if (action === 'reject') {
      item.status = 'rejected'
      db.moderationStats.removedToday += 1
    } else if (req.body.status) {
      item.status = req.body.status
    } else {
      throw fail('action required: approve | reject')
    }
    await saveFlaggedReview(item)
    await persistModerationStats()
    logAudit(req.user!.email, 'MODERATE_REVIEW', item.id, action || item.status)
    res.json(success(item, `Review ${action || 'updated'}`))
  } catch (e) {
    next(e)
  }
})

/** POST /api/admin/moderation/reviews/bulk */
router.post('/reviews/bulk', async (req, res, next) => {
  try {
    const { action, ids } = req.body as { action: string; ids: string[] }
    if (!action || !ids?.length) throw fail('action and ids required')
    const updated = db.flaggedReviews.filter((r) => ids.includes(r.id))
    for (const item of updated) {
      if (action === 'approve') {
        item.status = 'approved'
        db.moderationStats.approvedToday += 1
      } else if (action === 'reject') {
        item.status = 'rejected'
        db.moderationStats.removedToday += 1
      }
      await saveFlaggedReview(item)
    }
    await saveModerationStats(db.moderationStats)
    logAudit(req.user!.email, 'BULK_MODERATE_REVIEWS', ids.join(','), action)
    res.json(success(updated, `Bulk ${action} complete`))
  } catch (e) {
    next(e)
  }
})

/** GET /api/admin/moderation/products */
router.get('/products', (req, res) => {
  let list = [...db.flaggedProducts]
  if (req.query.status) list = list.filter((p) => p.status === req.query.status)
  res.json(success(paginate(list, Number(req.query.page), Number(req.query.limit || 20))))
})

/** PATCH /api/admin/moderation/products/:id */
router.patch('/products/:id', async (req, res, next) => {
  try {
    const item = db.flaggedProducts.find((p) => p.id === req.params.id)
    if (!item) throw fail('Flagged product not found', 404)
    const action = req.body.action as string
    if (action === 'approve') {
      item.status = 'approved'
      db.moderationStats.approvedToday += 1
    } else if (action === 'remove') {
      item.status = 'removed'
      db.moderationStats.removedToday += 1
      if (item.productId) {
        const idx = db.products.findIndex((p) => p.id === item.productId)
        if (idx !== -1) {
          db.products.splice(idx, 1)
          await deleteProduct(item.productId)
        }
      }
    } else if (req.body.status) {
      item.status = req.body.status
    } else {
      throw fail('action required: approve | remove')
    }
    await saveFlaggedProduct(item)
    await saveModerationStats(db.moderationStats)
    logAudit(req.user!.email, 'MODERATE_PRODUCT', item.id, action || item.status)
    res.json(success(item, `Product ${action || 'updated'}`))
  } catch (e) {
    next(e)
  }
})

/** POST /api/admin/moderation/products/bulk */
router.post('/products/bulk', async (req, res, next) => {
  try {
    const { action, ids } = req.body as { action: string; ids: string[] }
    if (!action || !ids?.length) throw fail('action and ids required')
    const updated = db.flaggedProducts.filter((p) => ids.includes(p.id))
    for (const item of updated) {
      if (action === 'approve') {
        item.status = 'approved'
        db.moderationStats.approvedToday += 1
      } else if (action === 'remove') {
        item.status = 'removed'
        db.moderationStats.removedToday += 1
        if (item.productId) {
          const idx = db.products.findIndex((p) => p.id === item.productId)
          if (idx !== -1) {
            db.products.splice(idx, 1)
            await deleteProduct(item.productId)
          }
        }
      }
      await saveFlaggedProduct(item)
    }
    await saveModerationStats(db.moderationStats)
    logAudit(req.user!.email, 'BULK_MODERATE_PRODUCTS', ids.join(','), action)
    res.json(success(updated, `Bulk ${action} complete`))
  } catch (e) {
    next(e)
  }
})

export default router
