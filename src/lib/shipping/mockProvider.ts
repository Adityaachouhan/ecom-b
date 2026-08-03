import { createHash } from 'node:crypto'
import type {
  CreateShipmentResult,
  RateQuote,
  ShippingOrderInput,
  ShippingProvider,
  TrackingStatusResult,
} from './types.js'

function shortHash(input: string): string {
  return createHash('sha1').update(input).digest('hex').slice(0, 4).toUpperCase()
}

function estimateWeightKg(order: ShippingOrderInput): number {
  const qty = (order.items || []).reduce((s, i) => s + (i.quantity || 1), 0)
  return Math.max(0.5, qty * 0.4)
}

/** Deterministic mock courier — no external API keys required. */
export class MockShippingProvider implements ShippingProvider {
  name = 'mock' as const

  async calculateRate(order: ShippingOrderInput): Promise<RateQuote> {
    const weight = estimateWeightKg(order)
    const pincode = order.shippingAddress?.pincode || '560001'
    const zoneFactor = (Number(pincode.slice(0, 2)) || 56) % 5
    const rate = Math.round(40 + weight * 25 + zoneFactor * 8)
    const estimatedDays = 2 + (zoneFactor % 3)
    return {
      providerName: 'MockCourier',
      rate: Math.min(120, Math.max(40, rate)),
      estimatedDays,
    }
  }

  async createShipment(order: ShippingOrderInput): Promise<CreateShipmentResult> {
    const quote = await this.calculateRate(order)
    const shortId = order.id.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase() || 'ORDER'
    const awbNumber = `MOCK-${shortId}-${shortHash(order.id)}`
    return {
      providerName: quote.providerName,
      awbNumber,
      trackingUrl: `https://track.riviraa.local/mock/${awbNumber}`,
      rateCharged: quote.rate,
      status: 'created',
    }
  }

  async getTrackingStatus(awb: string): Promise<TrackingStatusResult> {
    return {
      awbNumber: awb,
      status: 'in_transit',
      location: 'Mock Hub — Bangalore',
      updatedAt: new Date().toISOString(),
    }
  }

  async cancelShipment(awb: string): Promise<{ awbNumber: string; cancelled: boolean }> {
    return { awbNumber: awb, cancelled: true }
  }
}
