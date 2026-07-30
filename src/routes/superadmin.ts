import { Router } from 'express'
import { db, logAudit } from '../store/db.js'
import { saveAlert, savePlatformConfig, saveTeamMember } from '../store/persist.js'
import { authenticate, requireRoles } from '../middleware/auth.js'
import { fail, generateId, paginate, success, todayISO } from '../utils/helpers.js'

const router = Router()

router.use(authenticate, requireRoles('superadmin'))

/** Team */
router.get('/team', (_req, res) => {
  res.json(success(db.team))
})

router.post('/team', async (req, res, next) => {
  try {
    const { name, email, role, permissions } = req.body
    if (!name || !email || !role) throw fail('name, email, role required')
    const member = {
      id: generateId('team'),
      name,
      email,
      role,
      status: 'active' as const,
      permissions: permissions || [],
      joinedAt: todayISO(),
    }
    db.team.push(member)
    await saveTeamMember(member)
    logAudit(req.user!.email, 'ADD_TEAM_MEMBER', member.id, email)
    res.status(201).json(success(member, 'Team member added'))
  } catch (e) {
    next(e)
  }
})

router.patch('/team/:id/permissions', async (req, res, next) => {
  try {
    const member = db.team.find((t) => t.id === req.params.id)
    if (!member) throw fail('Team member not found', 404)
    member.permissions = req.body.permissions || member.permissions
    if (req.body.role) member.role = req.body.role
    if (req.body.status) member.status = req.body.status
    await saveTeamMember(member)
    res.json(success(member, 'Permissions updated'))
  } catch (e) {
    next(e)
  }
})

/** Config */
router.get('/config', (_req, res) => {
  res.json(success(db.platformConfig))
})

router.patch('/config', async (req, res, next) => {
  try {
    db.platformConfig = { ...db.platformConfig, ...req.body }
    await savePlatformConfig(db.platformConfig)
    logAudit(req.user!.email, 'UPDATE_CONFIG', 'platform', JSON.stringify(req.body))
    res.json(success(db.platformConfig, 'Config updated'))
  } catch (e) {
    next(e)
  }
})

/** Audit */
router.get('/audit-logs', (req, res) => {
  res.json(success(paginate(db.auditLogs, Number(req.query.page), Number(req.query.limit || 50))))
})

/** Finance */
router.get('/finance/pl', (_req, res) => {
  res.json(success(db.finance.pl))
})

router.get('/finance/payouts', (_req, res) => {
  res.json(success({ summary: db.finance.payoutsSummary, payouts: db.payouts }))
})

/** Alerts */
router.get('/alerts', (req, res) => {
  let list = [...db.alerts]
  if (req.query.status) list = list.filter((a) => a.status === req.query.status)
  res.json(success(list))
})

router.patch('/alerts/:id', async (req, res, next) => {
  try {
    const alert = db.alerts.find((a) => a.id === req.params.id)
    if (!alert) throw fail('Alert not found', 404)
    if (req.body.action === 'acknowledge') alert.status = 'acknowledged'
    else if (req.body.action === 'resolve') alert.status = 'resolved'
    else Object.assign(alert, req.body)
    await saveAlert(alert)
    res.json(success(alert, 'Alert updated'))
  } catch (e) {
    next(e)
  }
})

/** Regions */
router.get('/regions', (_req, res) => {
  res.json(success(db.analytics.regionalSales))
})

export default router
