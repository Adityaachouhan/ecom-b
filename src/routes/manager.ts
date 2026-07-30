import { Router } from 'express'
import { db, logAudit } from '../store/db.js'
import { saveApproval, saveEscalation } from '../store/persist.js'
import { authenticate, requireRoles, staffRoles, adminRoles } from '../middleware/auth.js'
import { fail, paginate, success, todayISO } from '../utils/helpers.js'

const router = Router()

router.use(authenticate, requireRoles(...staffRoles, ...adminRoles))

/** GET /api/manager/escalations */
router.get('/escalations', (req, res) => {
  let list = [...db.escalations]
  if (req.query.status) list = list.filter((e) => e.status === req.query.status)
  if (req.query.priority) list = list.filter((e) => e.priority === req.query.priority)
  res.json(success(paginate(list, Number(req.query.page), Number(req.query.limit))))
})

/** PATCH /api/manager/escalations/:id */
router.patch('/escalations/:id', async (req, res, next) => {
  try {
    const item = db.escalations.find((e) => e.id === req.params.id)
    if (!item) throw fail('Escalation not found', 404)
    const action = req.body.action as string | undefined
    if (action === 'resolve') item.status = 'resolved'
    else if (action === 'escalate') item.status = 'escalated'
    else if (action === 'start') item.status = 'in_progress'
    else Object.assign(item, req.body)
    await saveEscalation(item)
    logAudit(req.user!.email, 'UPDATE_ESCALATION', item.id, action || 'patch')
    res.json(success(item, 'Escalation updated'))
  } catch (e) {
    next(e)
  }
})

/** GET /api/manager/approvals */
router.get('/approvals', (req, res) => {
  let list = [...db.approvals]
  if (req.query.status) list = list.filter((a) => a.status === req.query.status)
  res.json(success(paginate(list, Number(req.query.page), Number(req.query.limit))))
})

/** PATCH /api/manager/approvals/:id */
router.patch('/approvals/:id', async (req, res, next) => {
  try {
    const item = db.approvals.find((a) => a.id === req.params.id)
    if (!item) throw fail('Approval not found', 404)
    const action = req.body.action as string | undefined
    if (action === 'approve') item.status = 'approved'
    else if (action === 'reject') item.status = 'rejected'
    else Object.assign(item, req.body)
    await saveApproval(item)
    logAudit(req.user!.email, 'UPDATE_APPROVAL', item.id, action || 'patch')
    res.json(success(item, 'Approval updated'))
  } catch (e) {
    next(e)
  }
})

/** GET /api/manager/inventory */
router.get('/inventory', (req, res) => {
  const threshold = Number(req.query.threshold || 50)
  let list = db.products.map((p) => ({
    id: p.id,
    title: p.title,
    stock: p.stock,
    category: p.category,
    sellerId: p.sellerId,
    sellerName: p.sellerName,
    lowStock: p.stock <= threshold,
  }))
  if (req.query.lowStock === 'true') list = list.filter((p) => p.lowStock)
  res.json(success(paginate(list, Number(req.query.page), Number(req.query.limit))))
})

/** GET /api/manager/sellers */
router.get('/sellers', (req, res) => {
  res.json(success(paginate(db.sellers, Number(req.query.page), Number(req.query.limit))))
})

/** GET /api/manager/reports */
router.get('/reports', (_req, res) => {
  res.json(
    success({
      kpi: db.analytics.kpiData,
      weeklyOrders: db.analytics.weeklyOrders,
      categorySales: db.analytics.categorySales,
      returnRates: db.analytics.returnRates,
      generatedAt: todayISO(),
    })
  )
})

export default router
