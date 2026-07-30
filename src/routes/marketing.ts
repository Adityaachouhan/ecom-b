import { Router } from 'express'
import { db, logAudit } from '../store/db.js'
import { deleteCampaign, saveCampaign } from '../store/persist.js'
import { authenticate, requireRoles, adminRoles } from '../middleware/auth.js'
import { fail, generateId, success, todayISO } from '../utils/helpers.js'

const router = Router()

router.use(authenticate, requireRoles(...adminRoles))

/** GET /api/admin/campaigns */
router.get('/campaigns', (_req, res) => {
  res.json(success(db.campaigns))
})

/** POST /api/admin/campaigns */
router.post('/campaigns', async (req, res, next) => {
  try {
    const { name, type, discount, startDate, endDate, budget } = req.body
    if (!name) throw fail('name is required')
    const camp = {
      id: generateId('camp'),
      name,
      type: type || 'platform',
      status: 'draft' as const,
      discount: Number(discount || 10),
      startDate: startDate || todayISO(),
      endDate: endDate || todayISO(),
      budget,
      spent: 0,
    }
    db.campaigns.push(camp)
    await saveCampaign(camp)
    logAudit(req.user!.email, 'CREATE_CAMPAIGN', camp.id, name)
    res.status(201).json(success(camp, 'Campaign created'))
  } catch (e) {
    next(e)
  }
})

/** PATCH /api/admin/campaigns/:id */
router.patch('/campaigns/:id', async (req, res, next) => {
  try {
    const idx = db.campaigns.findIndex((c) => c.id === req.params.id)
    if (idx === -1) throw fail('Campaign not found', 404)
    db.campaigns[idx] = { ...db.campaigns[idx], ...req.body, id: db.campaigns[idx].id }
    await saveCampaign(db.campaigns[idx])
    res.json(success(db.campaigns[idx], 'Campaign updated'))
  } catch (e) {
    next(e)
  }
})

/** DELETE /api/admin/campaigns/:id */
router.delete('/campaigns/:id', async (req, res, next) => {
  try {
    const idx = db.campaigns.findIndex((c) => c.id === req.params.id)
    if (idx === -1) throw fail('Campaign not found', 404)
    const id = db.campaigns[idx].id
    db.campaigns.splice(idx, 1)
    await deleteCampaign(id)
    res.json(success(null, 'Campaign deleted'))
  } catch (e) {
    next(e)
  }
})

/** GET /api/admin/reports/* */
router.get('/reports/sellers', (_req, res) => {
  res.json(
    success(
      db.sellers.map((s) => ({
        id: s.id,
        name: s.name,
        revenue: s.totalRevenue,
        orders: s.totalOrders,
        rating: s.rating,
        returnRate: s.returnRate,
        status: s.status,
      }))
    )
  )
})

router.get('/reports/cohorts', (_req, res) => {
  res.json(success(db.analytics.userGrowth))
})

export default router
