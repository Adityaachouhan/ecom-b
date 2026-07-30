import { Router } from 'express'
import { authenticate, adminRoles, requireRoles } from '../middleware/auth.js'
import { db, logAudit, type Ad } from '../store/db.js'
import { deleteAd, saveAd } from '../store/persist.js'
import { fail, generateId, success, todayISO } from '../utils/helpers.js'

const allowedStatuses: Ad['status'][] = ['draft', 'active', 'paused', 'ended']

function normalizeStatus(input: unknown, fallback: Ad['status']): Ad['status'] {
  if (typeof input !== 'string') return fallback
  return allowedStatuses.includes(input as Ad['status']) ? (input as Ad['status']) : fallback
}

function toISODate(input: unknown, fallback: string): string {
  if (typeof input !== 'string' || !input.trim()) return fallback
  const parsed = new Date(input)
  if (Number.isNaN(parsed.getTime())) return fallback
  return parsed.toISOString().slice(0, 10)
}

function inActiveSchedule(ad: Ad, now = new Date()): boolean {
  const start = new Date(ad.startDate)
  const end = new Date(ad.endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false
  return now >= start && now <= end
}

export const adsPublicRouter = Router()
export const adsAdminRouter = Router()

/** GET /api/ads */
adsPublicRouter.get('/', (req, res) => {
  const placement = typeof req.query.placement === 'string' ? req.query.placement : undefined
  const filtered = db.ads
    .filter((ad) => ad.status === 'active')
    .filter((ad) => inActiveSchedule(ad))
    .filter((ad) => !placement || ad.placement === placement)
    .sort((a, b) => a.displayOrder - b.displayOrder || a.title.localeCompare(b.title))
  res.json(success(filtered))
})

adsAdminRouter.use(authenticate, requireRoles(...adminRoles))

/** GET /api/admin/ads */
adsAdminRouter.get('/', (_req, res) => {
  const data = [...db.ads].sort((a, b) => a.placement.localeCompare(b.placement) || a.displayOrder - b.displayOrder)
  res.json(success(data))
})

/** POST /api/admin/ads */
adsAdminRouter.post('/', async (req, res, next) => {
  try {
    const { image, title, link, placement, startDate, endDate, status, displayOrder } = req.body ?? {}
    if (!image || typeof image !== 'string') throw fail('image is required')
    if (!title || typeof title !== 'string') throw fail('title is required')
    if (!link || typeof link !== 'string') throw fail('link is required')
    if (!placement || typeof placement !== 'string') throw fail('placement is required')

    const startISO = toISODate(startDate, todayISO())
    const endISO = toISODate(endDate, startISO)
    if (new Date(endISO) < new Date(startISO)) throw fail('endDate must be on or after startDate')

    const ad: Ad = {
      id: generateId('ad'),
      image: image.trim(),
      title: title.trim(),
      link: link.trim(),
      placement: placement.trim(),
      startDate: startISO,
      endDate: endISO,
      status: normalizeStatus(status, 'draft'),
      displayOrder: Number.isFinite(Number(displayOrder)) ? Number(displayOrder) : 0,
    }

    db.ads.push(ad)
    await saveAd(ad)
    logAudit(req.user!.email, 'CREATE_AD', ad.id, ad.title)
    res.status(201).json(success(ad, 'Ad created'))
  } catch (e) {
    next(e)
  }
})

/** PATCH /api/admin/ads/:id */
adsAdminRouter.patch('/:id', async (req, res, next) => {
  try {
    const idx = db.ads.findIndex((ad) => ad.id === req.params.id)
    if (idx === -1) throw fail('Ad not found', 404)

    const current = db.ads[idx]
    const nextAd: Ad = {
      ...current,
      image: typeof req.body?.image === 'string' ? req.body.image.trim() : current.image,
      title: typeof req.body?.title === 'string' ? req.body.title.trim() : current.title,
      link: typeof req.body?.link === 'string' ? req.body.link.trim() : current.link,
      placement: typeof req.body?.placement === 'string' ? req.body.placement.trim() : current.placement,
      startDate: toISODate(req.body?.startDate, current.startDate),
      endDate: toISODate(req.body?.endDate, current.endDate),
      status: normalizeStatus(req.body?.status, current.status),
      displayOrder: Number.isFinite(Number(req.body?.displayOrder)) ? Number(req.body.displayOrder) : current.displayOrder,
      id: current.id,
    }

    if (new Date(nextAd.endDate) < new Date(nextAd.startDate)) {
      throw fail('endDate must be on or after startDate')
    }

    db.ads[idx] = nextAd
    await saveAd(nextAd)
    logAudit(req.user!.email, 'UPDATE_AD', nextAd.id, nextAd.title)
    res.json(success(nextAd, 'Ad updated'))
  } catch (e) {
    next(e)
  }
})

/** DELETE /api/admin/ads/:id */
adsAdminRouter.delete('/:id', async (req, res, next) => {
  try {
    const idx = db.ads.findIndex((ad) => ad.id === req.params.id)
    if (idx === -1) throw fail('Ad not found', 404)
    const [ad] = db.ads.splice(idx, 1)
    await deleteAd(ad.id)
    logAudit(req.user!.email, 'DELETE_AD', ad.id, ad.title)
    res.json(success(null, 'Ad deleted'))
  } catch (e) {
    next(e)
  }
})
