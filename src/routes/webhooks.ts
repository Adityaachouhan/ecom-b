import { Router } from 'express'
import { db, type OrderStatus, type ShipmentStatus } from '../store/db.js'
import { saveOrder, saveShipment } from '../store/persist.js'
import { fail, nowISO, success } from '../utils/helpers.js'

const router = Router()

const PROVIDER_TO_ORDER: Record<string, OrderStatus> = {
  created: 'processing',
  picked_up: 'shipped',
  in_transit: 'shipped',
  out_for_delivery: 'out_for_delivery',
  delivered: 'delivered',
  cancelled: 'cancelled',
  failed: 'cancelled',
}

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
    location: 'Courier Hub',
    isCompleted: idx >= 0 && i <= idx,
    isCurrent: idx === i,
  }))
}

/** POST /api/webhooks/shipping/:provider — secret-verified, no JWT */
router.post('/shipping/:provider', async (req, res, next) => {
  try {
    const expected = process.env.SHIPPING_WEBHOOK_SECRET || 'dev-shipping-secret'
    const provided = String(req.headers['x-webhook-secret'] || '')
    if (!provided || provided !== expected) {
      throw fail('Invalid webhook secret', 401)
    }

    const provider = String(req.params.provider || '').toLowerCase()
    if (provider !== 'mock') {
      throw fail(`Unknown shipping provider: ${provider}`, 404)
    }

    const { awbNumber, status } = req.body || {}
    if (!awbNumber || !status) throw fail('awbNumber and status are required')

    const shipment = db.shipments.find((s) => s.awbNumber === String(awbNumber))
    if (!shipment) throw fail('Shipment not found', 404)

    const normalized = String(status).toLowerCase().replace(/\s+/g, '_') as ShipmentStatus
    shipment.status = normalized
    await saveShipment(shipment)

    const orderStatus = PROVIDER_TO_ORDER[normalized]
    if (orderStatus) {
      const order = db.orders.find((o) => o.id === shipment.orderId)
      if (order) {
        order.status = orderStatus
        order.trackingEvents = buildTracking(orderStatus)
        if (orderStatus === 'delivered') {
          order.deliveredAt = nowISO()
          await saveOrder(order)
          const { ensureSettlementsForOrder } = await import('../lib/settlements.js')
          await ensureSettlementsForOrder(order)
          const { sendNotification, hasNotificationLog } = await import('../lib/notifications.js')
          if (!hasNotificationLog('order_delivered', `${order.id}:customer`)) {
            await sendNotification('order_delivered', order.customerId, {
              orderId: order.id,
              refId: `${order.id}:customer`,
            })
          }
          const sellerIds = [...new Set((order.items || []).map((i) => i.sellerId))]
          for (const sellerId of sellerIds) {
            const sellerAccount = db.accounts.find((a) => a.sellerId === sellerId || a.id === sellerId)
            if (sellerAccount && !hasNotificationLog('order_delivered', `${order.id}:seller:${sellerAccount.id}`)) {
              await sendNotification('order_delivered', sellerAccount.id, {
                orderId: order.id,
                refId: `${order.id}:seller:${sellerAccount.id}`,
                title: 'Order delivered',
                body: `Order ${order.id} was delivered.`,
              })
            }
          }
        } else {
          await saveOrder(order)
          if (orderStatus === 'out_for_delivery') {
            const { sendNotification } = await import('../lib/notifications.js')
            await sendNotification('out_for_delivery', order.customerId, {
              orderId: order.id,
              otp: '',
              refId: `${order.id}:ofd`,
            })
          }
        }
      }
    }

    res.json(
      success(
        {
          awbNumber: shipment.awbNumber,
          shipmentStatus: shipment.status,
          orderId: shipment.orderId,
          orderStatus: orderStatus || null,
        },
        'Webhook processed'
      )
    )
  } catch (e) {
    next(e)
  }
})

export default router
