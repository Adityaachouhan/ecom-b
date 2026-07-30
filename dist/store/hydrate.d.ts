import type { Address, Alert, Approval, Ad, AuditLog, AuthAccount, Campaign, CartItem, Escalation, FlaggedProduct, FlaggedReview, Notification, PaymentMethod, Payout, ReturnRequest, TeamMember } from './db.js';
/** Load all tables from PostgreSQL into the in-memory store shape used by routes. */
export declare function hydrateFromDatabase(target: {
    products: unknown[];
    orders: unknown[];
    customers: unknown[];
    sellers: unknown[];
    categories: unknown[];
    accounts: AuthAccount[];
    carts: Record<string, CartItem[]>;
    wishlists: Record<string, string[]>;
    addresses: Record<string, Address[]>;
    paymentMethods: Record<string, PaymentMethod[]>;
    coupons: {
        code: string;
        type: 'percent' | 'flat';
        value: number;
        minOrder: number;
        active: boolean;
    }[];
    flaggedReviews: FlaggedReview[];
    flaggedProducts: FlaggedProduct[];
    moderationStats: {
        approvedToday: number;
        removedToday: number;
    };
    escalations: Escalation[];
    approvals: Approval[];
    campaigns: Campaign[];
    ads: Ad[];
    returns: ReturnRequest[];
    payouts: Payout[];
    auditLogs: AuditLog[];
    team: TeamMember[];
    platformConfig: Record<string, unknown>;
    alerts: Alert[];
    notifications: Notification[];
    analytics: Record<string, unknown>;
    finance: Record<string, unknown>;
}): Promise<{
    users: number;
    products: number;
    orders: number;
    sellers: number;
}>;
