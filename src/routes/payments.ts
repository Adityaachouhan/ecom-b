import { Router } from 'express'
import { db, logAudit } from '../store/db.js'
import { clearCart, saveCustomer, saveOrder } from '../store/persist.js'
import { authenticate, requireRoles, adminRoles } from '../middleware/auth.js'
import { fail, generateId, nowISO, paginate, success, todayISO } from '../utils/helpers.js'

const router = Router()

router.use(authenticate)

/** POST /api/payments/intent */
router.post('/intent', (req, res, next) => {
  try {
    const { amount, method = 'upi', orderId } = req.body
    if (!amount) throw fail('amount is required')
    const intent = {
      id: generateId('pi'),
      amount: Number(amount),
      method,
      orderId,
      status: 'requires_confirmation',
      clientSecret: `secret_${generateId()}`,
      createdAt: nowISO(),
    }
    res.status(201).json(success(intent))
  } catch (e) {
    next(e)
  }
})

/** POST /api/payments/confirm */
router.post('/confirm', async (req, res, next) => {
  try {
    const { intentId, orderId, status: resultStatus } = req.body
    if (!orderId) throw fail('orderId is required')

    const order = db.orders.find((o) => o.id === orderId)
    if (!order) throw fail('Order not found', 404)
    if (order.customerId !== req.user!.id && !adminRoles.includes(req.user!.role)) {
      throw fail('Forbidden', 403)
    }

    if (resultStatus === 'failed') {
      order.paymentStatus = 'failed'
      await saveOrder(order)
      res.json(success({ intentId, orderId, status: 'failed' }, 'Payment failed'))
      return
    }

    if (order.paymentStatus === 'paid') {
      res.json(
        success({ intentId, orderId, status: 'succeeded', paidAt: nowISO() }, 'Payment already confirmed')
      )
      return
    }

    order.paymentStatus = 'paid'
    let justConfirmed = false
    if (order.status === 'pending') {
      order.status = 'confirmed'
      justConfirmed = true
      order.trackingEvents = [
        { status: 'Order Placed', description: 'Order confirmed', timestamp: nowISO(), location: 'Bangalore Hub', isCompleted: true, isCurrent: false },
        { status: 'Confirmed', description: 'Seller confirmed', timestamp: nowISO(), location: 'Bangalore Hub', isCompleted: true, isCurrent: true },
        { status: 'Processing', description: 'Packing your order', timestamp: nowISO(), location: 'Bangalore Hub', isCompleted: false, isCurrent: false },
        { status: 'Shipped', description: 'Package handed to courier', timestamp: nowISO(), location: 'Bangalore Hub', isCompleted: false, isCurrent: false },
        { status: 'Out for Delivery', description: 'Courier is nearby', timestamp: nowISO(), location: 'Bangalore Hub', isCompleted: false, isCurrent: false },
        { status: 'Delivered', description: 'Delivered successfully', timestamp: nowISO(), location: 'Bangalore Hub', isCompleted: false, isCurrent: false },
      ]
    }
    await saveOrder(order)

    if (justConfirmed || order.status === 'confirmed') {
      const { fulfillOrder } = await import('../lib/shipping/index.js')
      await fulfillOrder(order)
      if (justConfirmed) {
        const { sendNotification } = await import('../lib/notifications.js')
        await sendNotification('order_confirmed', order.customerId, {
          orderId: order.id,
          refId: `${order.id}:confirmed`,
        })
      }
    }

    db.carts[req.user!.id] = []
    await clearCart(req.user!.id)

    const customer = db.customers.find((c) => c.id === req.user!.id)
    if (customer) {
      customer.totalOrders += 1
      customer.totalSpent += order.total
      customer.lastOrderAt = todayISO()
      await saveCustomer(customer)
    }

    res.json(
      success(
        {
          intentId,
          orderId,
          status: 'succeeded',
          paidAt: nowISO(),
        },
        'Payment confirmed'
      )
    )
  } catch (e) {
    next(e)
  }
})

/** GET /api/payments — admin payments from orders */
router.get('/', requireRoles(...adminRoles), (req, res) => {
  const payments = db.orders.map((o) => ({
    id: `pay_${o.id}`,
    orderId: o.id,
    customerName: o.customerName,
    amount: o.total,
    method: o.paymentMethod,
    status: o.paymentStatus,
    date: o.orderedAt,
  }))
  let list = payments
  if (req.query.status) list = list.filter((p) => p.status === req.query.status)
  res.json(success(paginate(list, Number(req.query.page), Number(req.query.limit))))
})

/** POST /api/payments/:id/refund */
router.post('/:id/refund', requireRoles(...adminRoles), async (req, res, next) => {
  try {
    const paramId = String(req.params.id)
    const orderId = paramId.replace(/^pay_/, '')
    const order = db.orders.find((o) => o.id === orderId || `pay_${o.id}` === paramId)
    if (!order) throw fail('Payment/order not found', 404)
    order.paymentStatus = 'refunded'
    order.status = 'refunded'
    await saveOrder(order)
    logAudit(req.user!.email, 'REFUND', order.id, `Refunded ₹${order.total}`)
    res.json(success({ orderId: order.id, status: 'refunded' }, 'Refund processed'))
  } catch (e) {
    next(e)
  }
})

export default router
