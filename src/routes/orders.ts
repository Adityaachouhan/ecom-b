import { Router } from 'express'
import { db, sellerMatches, logAudit, type OrderStatus } from '../store/db.js'
import {
  clearCart,
  saveCustomer,
  saveNotification,
  saveOrder,
  saveReturn,
} from '../store/persist.js'
import { authenticate, requireRoles, adminRoles, staffRoles } from '../middleware/auth.js'
import { fail, generateId, nowISO, paginate, success, todayISO } from '../utils/helpers.js'

const router = Router()
const idempotencyKeys = new Map<string, string>()

router.use(authenticate)

function buildTracking(status: OrderStatus) {
  const steps = [
    { status: 'Order Placed', description: 'Order confirmed', key: 'pending' },
    { status: 'Confirmed', description: 'Seller confirmed', key: 'confirmed' },
    { status: 'Processing', description: 'Packing your order', key: 'processing' },
    { status: 'Shipped', description: 'Package handed to courier', key: 'shipped' },
    { status: 'Out for Delivery', description: 'Courier is nearby', key: 'out_for_delivery' },
    { status: 'Delivered', description: 'Delivered successfully', key: 'delivered' },
  ]
  const order = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered']
  const idx = order.indexOf(status)
  return steps.map((s, i) => ({
    status: s.status,
    description: s.description,
    timestamp: nowISO(),
    location: 'Bangalore Hub',
    isCompleted: idx >= 0 && i <= idx,
    isCurrent: idx === i,
  }))
}

/** POST /api/orders — place order */
router.post('/', async (req, res, next) => {
  try {
    const { items, shippingAddress, paymentMethod = 'upi', couponCode, idempotencyKey } = req.body
    if (!items?.length || !shippingAddress) throw fail('items and shippingAddress are required')

    const idemKey = idempotencyKey ? `${req.user!.id}:${String(idempotencyKey)}` : null
    if (idemKey && idempotencyKeys.has(idemKey)) {
      const existingId = idempotencyKeys.get(idemKey)!
      const existing = db.orders.find((o) => o.id === existingId)
      if (existing) {
        res.status(200).json(success(existing, 'Order already placed'))
        return
      }
    }

    const orderItems = items.map((item: { productId: string; quantity: number; variant?: string; size?: string }) => {
      const product = db.products.find((p) => p.id === item.productId)
      if (!product) throw fail(`Product ${item.productId} not found`, 404)
      const price = Math.round(product.price * (1 - product.discount / 100))
      return {
        productId: product.id,
        productName: product.title,
        image: product.images[0] || '',
        quantity: Number(item.quantity),
        price,
        sellerId: product.sellerId,
        sellerName: product.sellerName,
        variant: item.variant,
        size: item.size,
      }
    })

    const subtotal = orderItems.reduce((s: number, i: { price: number; quantity: number }) => s + i.price * i.quantity, 0)
    let discount = 0
    if (couponCode) {
      const coupon = db.coupons.find((c) => c.code.toUpperCase() === String(couponCode).toUpperCase() && c.active)
      if (coupon && subtotal >= coupon.minOrder) {
        discount = coupon.type === 'percent' ? Math.round((subtotal * coupon.value) / 100) : coupon.value
      }
    }
    const deliveryFee = subtotal - discount >= db.platformConfig.freeShippingThreshold ? 0 : 49
    const total = Math.max(0, subtotal - discount + deliveryFee)
    const id = `ORD-${Date.now()}`
    const isCod = paymentMethod === 'cod'
    const initialStatus: OrderStatus = isCod ? 'confirmed' : 'pending'

    const order = {
      id,
      customerId: req.user!.id,
      customerName: req.user!.name,
      items: orderItems,
      status: initialStatus,
      shippingAddress,
      paymentMethod,
      paymentStatus: 'pending' as const,
      subtotal,
      discount,
      deliveryFee,
      total,
      couponCode,
      idempotencyKey: idemKey || undefined,
      orderedAt: nowISO(),
      estimatedDelivery: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
      trackingId: `TRK${generateId().toUpperCase()}`,
      trackingEvents: buildTracking(initialStatus),
      carrier: 'Delhivery',
    }

    db.orders.unshift(order)
    await saveOrder(order)
    if (idemKey) idempotencyKeys.set(idemKey, id)

    // COD: clear cart immediately. Online payments clear cart after payment confirm.
    if (isCod) {
      db.carts[req.user!.id] = []
      await clearCart(req.user!.id)
      const customer = db.customers.find((c) => c.id === req.user!.id)
      if (customer) {
        customer.totalOrders += 1
        customer.totalSpent += total
        customer.lastOrderAt = todayISO()
        await saveCustomer(customer)
      }
    }

    const notif = {
      id: generateId('notif'),
      userId: req.user!.id,
      title: isCod ? 'Order placed' : 'Order awaiting payment',
      body: isCod
        ? `Your order ${id} has been confirmed`
        : `Complete payment for order ${id} to confirm`,
      read: false,
      createdAt: nowISO(),
      type: 'order',
    }
    db.notifications.unshift(notif)
    await saveNotification(notif)

    res.status(201).json(success(order, isCod ? 'Order placed' : 'Order created — payment pending'))
  } catch (e) {
    next(e)
  }
})

/** GET /api/orders — role-scoped list */
router.get('/', (req, res) => {
  let list = [...db.orders]
  const role = req.user!.role
  const { status, page, limit, search } = req.query

  if (role === 'customer') {
    list = list.filter((o) => o.customerId === req.user!.id)
  } else if (role === 'seller') {
    const sid = req.user!.sellerId || req.user!.id
    list = list.filter((o) => o.items.some((i) => sellerMatches(i.sellerId, sid)))
  }

  if (status) list = list.filter((o) => o.status === status)
  if (search) {
    const q = String(search).toLowerCase()
    list = list.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.items.some((i) => i.productName.toLowerCase().includes(q))
    )
  }

  res.json(success(paginate(list, Number(page), Number(limit))))
})

/** GET /api/orders/:id */
router.get('/:id', (req, res, next) => {
  try {
    const order = db.orders.find((o) => o.id === req.params.id)
    if (!order) throw fail('Order not found', 404)
    const role = req.user!.role
    if (role === 'customer' && order.customerId !== req.user!.id) throw fail('Forbidden', 403)
    if (role === 'seller') {
      const sid = req.user!.sellerId || req.user!.id
      if (!order.items.some((i) => sellerMatches(i.sellerId, sid))) throw fail('Forbidden', 403)
    }
    res.json(success(order))
  } catch (e) {
    next(e)
  }
})

/** GET /api/orders/:id/tracking */
router.get('/:id/tracking', (req, res, next) => {
  try {
    const order = db.orders.find((o) => o.id === req.params.id)
    if (!order) throw fail('Order not found', 404)
    res.json(
      success({
        orderId: order.id,
        trackingId: order.trackingId,
        status: order.status,
        estimatedDelivery: order.estimatedDelivery,
        carrier: (order as { carrier?: string }).carrier || 'Delhivery',
        events: order.trackingEvents,
      })
    )
  } catch (e) {
    next(e)
  }
})

/** POST /api/orders/:id/cancel */
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const order = db.orders.find((o) => o.id === req.params.id)
    if (!order) throw fail('Order not found', 404)
    if (order.customerId !== req.user!.id && !adminRoles.includes(req.user!.role) && !staffRoles.includes(req.user!.role)) {
      throw fail('Forbidden', 403)
    }
    if (['delivered', 'cancelled', 'returned', 'refunded'].includes(order.status)) {
      throw fail('Cannot cancel this order')
    }
    order.status = 'cancelled'
    order.trackingEvents = buildTracking('pending').map((e) => ({
      ...e,
      isCompleted: false,
      isCurrent: false,
    }))
    order.trackingEvents.push({
      status: 'Cancelled',
      description: req.body.reason || 'Cancelled by user',
      timestamp: nowISO(),
      isCompleted: true,
      isCurrent: true,
    })
    await saveOrder(order)
    res.json(success(order, 'Order cancelled'))
  } catch (e) {
    next(e)
  }
})

/** POST /api/orders/:id/return */
router.post('/:id/return', async (req, res, next) => {
  try {
    const order = db.orders.find((o) => o.id === req.params.id)
    if (!order) throw fail('Order not found', 404)
    if (order.customerId !== req.user!.id) throw fail('Forbidden', 403)
    if (order.status !== 'delivered') throw fail('Only delivered orders can be returned')
    order.status = 'return_requested'
    const item = order.items[0]
    const ret = {
      id: generateId('ret'),
      orderId: order.id,
      productName: item?.productName || 'Item',
      reason: req.body.reason || 'Not specified',
      status: 'pending' as const,
      sellerId: item?.sellerId || '',
      customerName: order.customerName,
      amount: order.total,
      createdAt: todayISO(),
    }
    db.returns.unshift(ret)
    await saveOrder(order)
    await saveReturn(ret)
    res.json(success({ order, returnRequest: ret }, 'Return requested'))
  } catch (e) {
    next(e)
  }
})

/** PATCH /api/orders/:id/status — seller/admin */
router.patch('/:id/status', requireRoles('seller', ...staffRoles, ...adminRoles), async (req, res, next) => {
  try {
    const order = db.orders.find((o) => o.id === req.params.id)
    if (!order) throw fail('Order not found', 404)
    const { status } = req.body
    if (!status) throw fail('status is required')
    order.status = status
    order.trackingEvents = buildTracking(status)
    if (status === 'delivered') order.deliveredAt = nowISO()
    await saveOrder(order)
    logAudit(req.user!.email, 'UPDATE_ORDER_STATUS', order.id, `Status → ${status}`)
    res.json(success(order, 'Order status updated'))
  } catch (e) {
    next(e)
  }
})

/** PATCH /api/orders/:id — admin */
router.patch('/:id', requireRoles(...adminRoles), async (req, res, next) => {
  try {
    const idx = db.orders.findIndex((o) => o.id === req.params.id)
    if (idx === -1) throw fail('Order not found', 404)
    db.orders[idx] = { ...db.orders[idx], ...req.body, id: db.orders[idx].id }
    await saveOrder(db.orders[idx])
    res.json(success(db.orders[idx], 'Order updated'))
  } catch (e) {
    next(e)
  }
})

export default router
