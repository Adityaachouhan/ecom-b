type OrderLike = {
    id: string;
    orderedAt?: string;
    deliveredAt?: string;
    items?: Array<{
        sellerId: string;
        price: number;
        quantity: number;
    }>;
};
/** Create pending settlements for each seller on a delivered order (idempotent). */
export declare function ensureSettlementsForOrder(order: OrderLike): Promise<void>;
export declare function runSettlementJobs(): Promise<void>;
export declare function startSettlementScheduler(): void;
export declare function settlementSummaryForSeller(sellerId: string): {
    pending: number;
    processing: number;
    paid: number;
    commissionTotal: number;
    pendingPayouts: number;
};
export {};
