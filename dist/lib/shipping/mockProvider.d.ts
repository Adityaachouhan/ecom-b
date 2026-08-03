import type { CreateShipmentResult, RateQuote, ShippingOrderInput, ShippingProvider, TrackingStatusResult } from './types.js';
/** Deterministic mock courier — no external API keys required. */
export declare class MockShippingProvider implements ShippingProvider {
    name: "mock";
    calculateRate(order: ShippingOrderInput): Promise<RateQuote>;
    createShipment(order: ShippingOrderInput): Promise<CreateShipmentResult>;
    getTrackingStatus(awb: string): Promise<TrackingStatusResult>;
    cancelShipment(awb: string): Promise<{
        awbNumber: string;
        cancelled: boolean;
    }>;
}
