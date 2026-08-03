import { type Delivery, type DeliveryPartner } from '../store/db.js';
declare const BASE_FEE = 40;
declare const DISTANCE_BONUS_PER_KM = 5;
declare const DEFAULT_HUB: {
    lat: number;
    lng: number;
};
export { BASE_FEE, DISTANCE_BONUS_PER_KM, DEFAULT_HUB };
/** Rough own-fleet cost estimate (no partner required) for mixed-mode comparison. */
export declare function estimateOwnFleetRate(order: {
    shippingAddress?: {
        line1?: string;
        line2?: string;
        city?: string;
        state?: string;
        pincode?: string;
    };
}): number;
export declare function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number;
export declare function createDeliveryForOrder(order: {
    id: string;
    total: number;
    paymentMethod: string;
    shippingAddress?: {
        line1?: string;
        line2?: string;
        city?: string;
        state?: string;
        pincode?: string;
    };
    shippingLine1?: string;
    shippingLine2?: string;
    shippingCity?: string;
    shippingState?: string;
    shippingPincode?: string;
    items?: {
        sellerId?: string;
        sellerName?: string;
    }[];
}, opts?: {
    reattemptOf?: string;
    excludePartnerIds?: string[];
}): Delivery | null;
export declare function assignNearestPartner(order: {
    id: string;
    total: number;
    paymentMethod: string;
    shippingAddress?: {
        line1?: string;
        line2?: string;
        city?: string;
        state?: string;
        pincode?: string;
    };
    items?: {
        sellerId?: string;
        sellerName?: string;
    }[];
}): Promise<Delivery | null>;
export declare function reassignDelivery(delivery: Delivery): Promise<Delivery | null>;
export declare function checkAcceptanceTimeouts(): Promise<void>;
export declare function onDelivered(delivery: Delivery): Promise<void>;
export declare function onFailed(delivery: Delivery): Promise<void>;
export declare function optimizeRoute(partner: DeliveryPartner, deliveries: Delivery[]): Delivery[];
export declare function startDeliveryScheduler(): void;
