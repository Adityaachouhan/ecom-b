import { type Shipment } from '../../store/db.js';
import { estimateOwnFleetRate } from '../deliveryAssignment.js';
import type { ShippingOrderInput, ShippingProvider, ShippingProviderName } from './types.js';
export type { ShippingOrderInput, ShippingProvider, ShippingProviderName } from './types.js';
export { estimateOwnFleetRate };
export declare function getShippingProvider(name?: ShippingProviderName): ShippingProvider;
export type FulfillmentChoice = 'own_fleet' | 'third_party';
export declare function getBestShippingOption(order: ShippingOrderInput): Promise<{
    mode: FulfillmentChoice;
    ownFleetRate: number;
    thirdPartyRate: number;
    estimatedDays?: number;
}>;
/**
 * Single fulfillment entry point — branches on platformConfig.deliveryMode.
 * Idempotent: returns existing active shipment if one already exists for the order.
 */
export declare function fulfillOrder(order: ShippingOrderInput): Promise<Shipment | null>;
