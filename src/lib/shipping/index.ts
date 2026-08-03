import { db, type DeliveryMode, type Shipment, type ShippingPriority } from '../../store/db.js'
import { saveOrder, saveShipment } from '../../store/persist.js'
import { generateId, nowISO } from '../../utils/helpers.js'
import { assignNearestPartner, estimateOwnFleetRate } from '../deliveryAssignment.js'
import { sendNotification } from '../notifications.js'
import { MockShippingProvider } from './mockProvider.js'
import type { ShippingOrderInput, ShippingProvider, ShippingProviderName } from './types.js'

export type { ShippingOrderInput, ShippingProvider, ShippingProviderName } from './types.js'
export { estimateOwnFleetRate }

const providers: Record<ShippingProviderName, ShippingProvider> = {
  mock: new MockShippingProvider(),
}

export function getShippingProvider(name: ShippingProviderName = 'mock'): ShippingProvider {
  return providers[name] || providers.mock
}

export type FulfillmentChoice = 'own_fleet' | 'third_party'

export async function getBestShippingOption(order: ShippingOrderInput): Promise<{
  mode: FulfillmentChoice
  ownFleetRate: number
  thirdPartyRate: number
  estimatedDays?: number
}> {
  const priority = (db.platformConfig.shippingPriority as ShippingPriority) || 'cost'
  const ownFleetRate = estimateOwnFleetRate(order)
  const quote = await getShippingProvider('mock').calculateRate(order)
  const thirdPartyRate = quote.rate

  let mode: FulfillmentChoice
  if (priority === 'speed') {
    // Prefer third-party when rates are within ₹20 (assumed faster); otherwise cheaper
    const within = Math.abs(ownFleetRate - thirdPartyRate) <= 20
    mode = within || thirdPartyRate <= ownFleetRate ? 'third_party' : 'own_fleet'
  } else {
    mode = thirdPartyRate < ownFleetRate ? 'third_party' : 'own_fleet'
  }

  return { mode, ownFleetRate, thirdPartyRate, estimatedDays: quote.estimatedDays }
}

async function createOwnFleetShipment(
  order: ShippingOrderInput,
  rateCharged?: number
): Promise<Shipment> {
  await assignNearestPartner(order)
  const shipment: Shipment = {
    id: generateId('ship'),
    orderId: order.id,
    deliveryMode: 'own_fleet',
    providerName: 'Riviraa Fleet',
    rateCharged: rateCharged ?? estimateOwnFleetRate(order),
    status: 'assigned',
    createdAt: nowISO(),
  }
  db.shipments.unshift(shipment)
  await saveShipment(shipment)

  const memOrder = db.orders.find((o) => o.id === order.id)
  if (memOrder) {
    ;(memOrder as { carrier?: string }).carrier = 'Riviraa Fleet'
    await saveOrder(memOrder)
    await sendNotification('shipment_created', memOrder.customerId, {
      orderId: order.id,
      providerName: 'Riviraa Fleet',
      awbNumber: '',
      trackingUrl: '',
      refId: `${order.id}:shipment`,
    })
  }
  return shipment
}

async function createThirdPartyShipment(
  order: ShippingOrderInput,
  rateCharged?: number
): Promise<Shipment> {
  const provider = getShippingProvider('mock')
  const result = await provider.createShipment(order)
  const shipment: Shipment = {
    id: generateId('ship'),
    orderId: order.id,
    deliveryMode: 'third_party',
    providerName: result.providerName,
    awbNumber: result.awbNumber,
    trackingUrl: result.trackingUrl,
    rateCharged: rateCharged ?? result.rateCharged,
    status: 'created',
    createdAt: nowISO(),
  }
  db.shipments.unshift(shipment)
  await saveShipment(shipment)

  const memOrder = db.orders.find((o) => o.id === order.id)
  if (memOrder) {
    memOrder.trackingId = result.awbNumber
    ;(memOrder as { carrier?: string }).carrier = result.providerName
    await saveOrder(memOrder)
    await sendNotification('shipment_created', memOrder.customerId, {
      orderId: order.id,
      providerName: result.providerName,
      awbNumber: result.awbNumber,
      trackingUrl: result.trackingUrl,
      refId: `${order.id}:shipment`,
    })
  }
  return shipment
}

/**
 * Single fulfillment entry point — branches on platformConfig.deliveryMode.
 * Idempotent: returns existing active shipment if one already exists for the order.
 */
export async function fulfillOrder(order: ShippingOrderInput): Promise<Shipment | null> {
  const existing = db.shipments.find(
    (s) =>
      s.orderId === order.id &&
      s.status !== 'cancelled' &&
      s.status !== 'failed' &&
      s.status !== 'delivered'
  )
  if (existing) return existing

  const mode = (db.platformConfig.deliveryMode as DeliveryMode) || 'own_fleet'

  if (mode === 'third_party') {
    return createThirdPartyShipment(order)
  }

  if (mode === 'mixed') {
    const best = await getBestShippingOption(order)
    if (best.mode === 'third_party') {
      return createThirdPartyShipment(order, best.thirdPartyRate)
    }
    return createOwnFleetShipment(order, best.ownFleetRate)
  }

  return createOwnFleetShipment(order)
}
