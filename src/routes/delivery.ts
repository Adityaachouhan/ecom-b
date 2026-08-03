import { Router } from 'express'
import { authenticate, requireRoles } from '../middleware/auth.js'
import { db } from '../store/db.js'
import {
  saveDelivery,
  saveDeliveryPartner,
  saveOrder,
} from '../store/persist.js'
import {
  onDelivered,
  onFailed,
  optimizeRoute,
  reassignDelivery,
} from '../lib/deliveryAssignment.js'
import { sendNotification } from '../lib/notifications.js'
import { fail, generateId, nowISO, paginate, success, todayISO } from '../utils/helpers.js'

const router = Router()
router.use(authenticate, requireRoles('delivery'))

function getPartner(userId: string) {
  return db.deliveryPartners.find((p) => p.userId === userId)
}

function requirePartner(userId: string) {
  const partner = getPartner(userId)
  if (!partner) throw fail('Delivery partner profile not found', 404)
  return partner
}

function isToday(iso: string) {
  return iso.slice(0, 10) === todayISO().slice(0, 10)
}

function startOfRange(range: string): Date {
  const now = new Date()
  if (range === 'monthly') {
    const d = new Date(now)
    d.setDate(d.getDate() - 30)
    return d
  }
  if (range === 'weekly') {
    const d = new Date(now)
    d.setDate(d.getDate() - 7)
    return d
  }
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d
}

/** GET /api/delivery/me */
router.get('/me', (req, res, next) => {
  try {
    const partner = requirePartner(req.user!.id)
    res.json(success(partner))
  } catch (e) {
    next(e)
  }
})

/** PATCH /api/delivery/me/availability */
router.patch('/me/availability', async (req, res, next) => {
  try {
    const partner = requirePartner(req.user!.id)
    const { availabilityStatus, currentLat, currentLng } = req.body
    if (availabilityStatus === 'online' && partner.kycStatus !== 'approved') {
      throw fail('KYC must be approved before going online', 400)
    }
    if (availabilityStatus === 'online' || availabilityStatus === 'offline') {
      partner.availabilityStatus = availabilityStatus
    }
    if (typeof currentLat === 'number') partner.currentLat = currentLat
    if (typeof currentLng === 'number') partner.currentLng = currentLng
    await saveDeliveryPartner(partner)
    res.json(success(partner, 'Availability updated'))
  } catch (e) {
    next(e)
  }
})

/** PATCH /api/delivery/me/profile */
router.patch('/me/profile', async (req, res, next) => {
  try {
    const partner = requirePartner(req.user!.id)
    const { vehicleType, phone, name, kycDocuments, currentLat, currentLng } = req.body
    if (vehicleType && ['bike', 'scooter', 'van'].includes(vehicleType)) {
      partner.vehicleType = vehicleType
    }
    if (typeof phone === 'string') partner.phone = phone
    if (typeof name === 'string') partner.name = name
    if (kycDocuments && typeof kycDocuments === 'object') {
      partner.kycDocuments = { ...partner.kycDocuments, ...kycDocuments }
      if (partner.kycStatus === 'rejected') partner.kycStatus = 'pending'
    }
    if (typeof currentLat === 'number') partner.currentLat = currentLat
    if (typeof currentLng === 'number') partner.currentLng = currentLng
    await saveDeliveryPartner(partner)
    res.json(success(partner, 'Profile updated'))
  } catch (e) {
    next(e)
  }
})

/** GET /api/delivery/me/dashboard */
router.get('/me/dashboard', (req, res, next) => {
  try {
    const partner = requirePartner(req.user!.id)
    const mine = db.deliveries.filter((d) => d.deliveryPartnerId === partner.id)
    const todayAssigned = mine.filter((d) => isToday(d.assignedAt))
    const completedToday = todayAssigned.filter((d) => d.status === 'delivered')
    const pending = mine.filter((d) =>
      ['assigned', 'accepted', 'picked_up', 'out_for_delivery'].includes(d.status)
    )
    const earningsToday = db.deliveryEarnings.filter(
      (e) => e.deliveryPartnerId === partner.id && isToday(e.createdAt)
    )
    const todayEarnings = earningsToday.reduce((s, e) => s + e.total, 0)
    const incentiveBreakdown = {
      base: earningsToday.reduce((s, e) => s + e.baseFee, 0),
      distance: earningsToday.reduce((s, e) => s + e.distanceBonus, 0),
      peak: earningsToday.reduce((s, e) => s + e.peakBonus, 0),
    }
    const codToday = todayAssigned
      .filter((d) => d.paymentType === 'cod' && d.status !== 'failed')
      .reduce((s, d) => s + d.codAmount, 0)

    const completionPct =
      todayAssigned.length > 0
        ? Math.round((completedToday.length / todayAssigned.length) * 100)
        : 0

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const now = new Date()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    monday.setHours(0, 0, 0, 0)
    const weeklyVolume = days.map((label, i) => {
      const dayStart = new Date(monday)
      dayStart.setDate(monday.getDate() + i)
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayStart.getDate() + 1)
      const count = mine.filter((d) => {
        const t = new Date(d.assignedAt).getTime()
        return t >= dayStart.getTime() && t < dayEnd.getTime()
      }).length
      return { label, value: count }
    })

    const earningsTrend = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      const key = d.toISOString().slice(0, 10)
      const total = db.deliveryEarnings
        .filter((e) => e.deliveryPartnerId === partner.id && e.createdAt.slice(0, 10) === key)
        .reduce((s, e) => s + e.total, 0)
      return {
        label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        value: total,
      }
    })

    res.json(
      success({
        stats: {
          assignedToday: todayAssigned.length,
          completedToday: completedToday.length,
          completionPct,
          pending: pending.length,
          todayEarnings,
          incentiveBreakdown,
          codToCollect: codToday,
          rating: partner.rating,
        },
        weeklyVolume,
        earningsTrend,
      })
    )
  } catch (e) {
    next(e)
  }
})

/** GET /api/delivery/me/deliveries */
router.get('/me/deliveries', (req, res, next) => {
  try {
    const partner = requirePartner(req.user!.id)
    let list = db.deliveries.filter((d) => d.deliveryPartnerId === partner.id)
    if (req.query.status) list = list.filter((d) => d.status === req.query.status)
    if (req.query.date === 'today') list = list.filter((d) => isToday(d.assignedAt))
    list.sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime())
    res.json(success(paginate(list, Number(req.query.page), Number(req.query.limit))))
  } catch (e) {
    next(e)
  }
})

/** PATCH /api/delivery/me/deliveries/:id/accept */
router.patch('/me/deliveries/:id/accept', async (req, res, next) => {
  try {
    const partner = requirePartner(req.user!.id)
    const delivery = db.deliveries.find(
      (d) => d.id === req.params.id && d.deliveryPartnerId === partner.id
    )
    if (!delivery) throw fail('Delivery not found', 404)
    if (delivery.status !== 'assigned') throw fail('Delivery cannot be accepted in current status')
    delivery.status = 'accepted'
    delivery.acceptedAt = nowISO()
    await saveDelivery(delivery)

    const order = db.orders.find((o) => o.id === delivery.orderId)
    if (order && ['confirmed', 'processing'].includes(order.status)) {
      order.status = 'processing'
      await saveOrder(order)
    }

    res.json(success(delivery, 'Delivery accepted'))
  } catch (e) {
    next(e)
  }
})

/** PATCH /api/delivery/me/deliveries/:id/reject */
router.patch('/me/deliveries/:id/reject', async (req, res, next) => {
  try {
    const partner = requirePartner(req.user!.id)
    const delivery = db.deliveries.find(
      (d) => d.id === req.params.id && d.deliveryPartnerId === partner.id
    )
    if (!delivery) throw fail('Delivery not found', 404)
    if (delivery.status !== 'assigned') throw fail('Only assigned deliveries can be rejected')
    await reassignDelivery(delivery)
    res.json(success(delivery, 'Delivery rejected and reassigned'))
  } catch (e) {
    next(e)
  }
})

/** PATCH /api/delivery/me/deliveries/:id/status */
router.patch('/me/deliveries/:id/status', async (req, res, next) => {
  try {
    const partner = requirePartner(req.user!.id)
    const delivery = db.deliveries.find(
      (d) => d.id === req.params.id && d.deliveryPartnerId === partner.id
    )
    if (!delivery) throw fail('Delivery not found', 404)

    const { status, photo, otp, failureReason, failureNote } = req.body
    const transitions: Record<string, string[]> = {
      accepted: ['picked_up'],
      picked_up: ['out_for_delivery'],
      out_for_delivery: ['delivered', 'failed'],
    }
    const allowed = transitions[delivery.status] || []
    if (!allowed.includes(status)) {
      throw fail(`Cannot transition from ${delivery.status} to ${status}`)
    }

    if (status === 'picked_up') {
      delivery.status = 'picked_up'
      delivery.pickedUpAt = nowISO()
      if (photo) delivery.proofImageUrl = String(photo)
      const order = db.orders.find((o) => o.id === delivery.orderId)
      if (order) {
        order.status = 'shipped'
        await saveOrder(order)
      }
    } else if (status === 'out_for_delivery') {
      delivery.status = 'out_for_delivery'
      delivery.outForDeliveryAt = nowISO()
      delivery.otpCode = String(Math.floor(1000 + Math.random() * 9000))
      const order = db.orders.find((o) => o.id === delivery.orderId)
      if (order) {
        order.status = 'out_for_delivery'
        await saveOrder(order)
        await sendNotification('out_for_delivery', order.customerId, {
          orderId: order.id,
          otp: delivery.otpCode,
          refId: `${order.id}:ofd`,
        })
      }
    } else if (status === 'delivered') {
      const otpOk = otp && String(otp) === delivery.otpCode
      const photoOk = Boolean(photo)
      if (!otpOk && !photoOk) throw fail('Delivered status requires OTP verification or photo proof')
      delivery.status = 'delivered'
      delivery.deliveredAt = nowISO()
      if (photo) delivery.proofImageUrl = String(photo)
      await saveDelivery(delivery)
      await onDelivered(delivery)
      return res.json(success(delivery, 'Delivery completed'))
    } else if (status === 'failed') {
      if (!failureReason) throw fail('failureReason is required for failed deliveries')
      delivery.status = 'failed'
      delivery.failureReason = String(failureReason)
      delivery.failureNote = failureNote ? String(failureNote) : undefined
      delivery.deliveredAt = nowISO()
      await saveDelivery(delivery)
      await onFailed(delivery)
      return res.json(success(delivery, 'Delivery marked failed'))
    }

    await saveDelivery(delivery)
    res.json(success(delivery, 'Status updated'))
  } catch (e) {
    next(e)
  }
})

/** GET /api/delivery/me/route */
router.get('/me/route', (req, res, next) => {
  try {
    const partner = requirePartner(req.user!.id)
    const today = db.deliveries.filter(
      (d) =>
        d.deliveryPartnerId === partner.id &&
        isToday(d.assignedAt) &&
        !['delivered', 'failed'].includes(d.status)
    )
    const optimized = optimizeRoute(partner, today)
    res.json(
      success({
        partnerLocation: {
          lat: partner.currentLat ?? 12.9716,
          lng: partner.currentLng ?? 77.5946,
        },
        stops: optimized.map((d, i) => ({
          sequence: i + 1,
          ...d,
          navigateUrl: `https://www.google.com/maps/dir/?api=1&destination=${d.dropLat},${d.dropLng}`,
        })),
      })
    )
  } catch (e) {
    next(e)
  }
})

/** GET /api/delivery/me/cod */
router.get('/me/cod', (req, res, next) => {
  try {
    const partner = requirePartner(req.user!.id)
    const codDeliveries = db.deliveries.filter(
      (d) =>
        d.deliveryPartnerId === partner.id &&
        d.paymentType === 'cod' &&
        isToday(d.assignedAt)
    )
    const collected = codDeliveries
      .filter((d) => d.status === 'delivered')
      .reduce((s, d) => s + d.codAmount, 0)
    const pending = codDeliveries
      .filter((d) => d.status !== 'delivered' && d.status !== 'failed')
      .reduce((s, d) => s + d.codAmount, 0)
    const submitted = codDeliveries
      .filter((d) => d.codSubmitted)
      .reduce((s, d) => s + d.codAmount, 0)
    const collectedNotSubmitted = codDeliveries
      .filter((d) => d.status === 'delivered' && !d.codSubmitted)
      .reduce((s, d) => s + d.codAmount, 0)

    res.json(
      success({
        items: codDeliveries,
        summary: {
          pending,
          collected,
          submitted,
          runningBalance: pending + collectedNotSubmitted,
        },
      })
    )
  } catch (e) {
    next(e)
  }
})

/** POST /api/delivery/me/cod/submit */
router.post('/me/cod/submit', async (req, res, next) => {
  try {
    const partner = requirePartner(req.user!.id)
    const ids: string[] = Array.isArray(req.body.deliveryIds) ? req.body.deliveryIds : []
    const toSubmit = db.deliveries.filter(
      (d) =>
        d.deliveryPartnerId === partner.id &&
        d.paymentType === 'cod' &&
        d.status === 'delivered' &&
        !d.codSubmitted &&
        (ids.length === 0 || ids.includes(d.id))
    )
    for (const d of toSubmit) {
      d.codSubmitted = true
      await saveDelivery(d)
    }
    const amount = toSubmit.reduce((s, d) => s + d.codAmount, 0)
    res.json(success({ submitted: toSubmit.length, amount }, 'COD collection submitted'))
  } catch (e) {
    next(e)
  }
})

/** GET /api/delivery/me/earnings */
router.get('/me/earnings', (req, res, next) => {
  try {
    const partner = requirePartner(req.user!.id)
    const range = String(req.query.range || 'weekly')
    const from = startOfRange(range)
    const list = db.deliveryEarnings
      .filter(
        (e) =>
          e.deliveryPartnerId === partner.id && new Date(e.createdAt).getTime() >= from.getTime()
      )
      .map((e) => {
        const delivery = db.deliveries.find((d) => d.id === e.deliveryId)
        return { ...e, orderId: delivery?.orderId }
      })
    const totals = {
      base: list.reduce((s, e) => s + e.baseFee, 0),
      distance: list.reduce((s, e) => s + e.distanceBonus, 0),
      peak: list.reduce((s, e) => s + e.peakBonus, 0),
      total: list.reduce((s, e) => s + e.total, 0),
    }
    res.json(success({ items: list, totals, range }))
  } catch (e) {
    next(e)
  }
})

/** GET /api/delivery/me/earnings/statement.csv */
router.get('/me/earnings/statement.csv', (req, res, next) => {
  try {
    const partner = requirePartner(req.user!.id)
    const range = String(req.query.range || 'monthly')
    const from = startOfRange(range)
    const list = db.deliveryEarnings.filter(
      (e) =>
        e.deliveryPartnerId === partner.id && new Date(e.createdAt).getTime() >= from.getTime()
    )
    const header = 'Date,Delivery ID,Base Fee,Distance Bonus,Peak Bonus,Total,Payout Status,Payout Date'
    const rows = list.map((e) =>
      [
        e.createdAt.slice(0, 10),
        e.deliveryId,
        e.baseFee,
        e.distanceBonus,
        e.peakBonus,
        e.total,
        e.payoutStatus,
        e.payoutDate?.slice(0, 10) || '',
      ].join(',')
    )
    const csv = [header, ...rows].join('\n')
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="earnings-${range}.csv"`)
    res.send(csv)
  } catch (e) {
    next(e)
  }
})

/** GET /api/delivery/me/deliveries/:id — detail helper used by UI */
router.get('/me/deliveries/:id', (req, res, next) => {
  try {
    const partner = requirePartner(req.user!.id)
    const delivery = db.deliveries.find(
      (d) => d.id === req.params.id && d.deliveryPartnerId === partner.id
    )
    if (!delivery) throw fail('Delivery not found', 404)
    const order = db.orders.find((o) => o.id === delivery.orderId)
    res.json(success({ ...delivery, order }))
  } catch (e) {
    next(e)
  }
})

export default router
