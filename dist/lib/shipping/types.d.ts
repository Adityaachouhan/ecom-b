export type ShippingProviderName = 'mock';
export interface ShippingOrderInput {
    id: string;
    total: number;
    paymentMethod: string;
    deliveryFee?: number;
    shippingAddress?: {
        line1?: string;
        line2?: string;
        city?: string;
        state?: string;
        pincode?: string;
    };
    items?: {
        quantity?: number;
        sellerId?: string;
        sellerName?: string;
    }[];
}
export interface CreateShipmentResult {
    providerName: string;
    awbNumber: string;
    trackingUrl: string;
    rateCharged: number;
    status: string;
}
export interface TrackingStatusResult {
    awbNumber: string;
    status: string;
    location?: string;
    updatedAt: string;
}
export interface RateQuote {
    providerName: string;
    rate: number;
    estimatedDays: number;
}
export interface ShippingProvider {
    name: ShippingProviderName;
    createShipment(order: ShippingOrderInput): Promise<CreateShipmentResult>;
    getTrackingStatus(awb: string): Promise<TrackingStatusResult>;
    cancelShipment(awb: string): Promise<{
        awbNumber: string;
        cancelled: boolean;
    }>;
    calculateRate(order: ShippingOrderInput): Promise<RateQuote>;
}
