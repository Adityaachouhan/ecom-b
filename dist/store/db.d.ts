import * as analyticsSeed from '../data/analytics.js';
import type { Role } from '../middleware/auth.js';
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'return_requested' | 'returned' | 'refunded';
export interface Address {
    id: string;
    name: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    type: 'home' | 'work' | 'other';
    isDefault?: boolean;
}
export interface CartItem {
    productId: string;
    quantity: number;
    variantId?: string;
    size?: string;
}
export interface AuthAccount {
    id: string;
    email: string;
    password: string;
    name: string;
    role: Role;
    avatar: string;
    phone?: string;
    sellerId?: string;
    otp?: string;
    otpExpiresAt?: string;
    joinedAt: string;
}
export interface FlaggedReview {
    id: string;
    productId?: string;
    product: string;
    reviewer: string;
    rating: number;
    content: string;
    reason: string;
    date: string;
    status: 'pending' | 'reviewing' | 'approved' | 'rejected';
}
export interface FlaggedProduct {
    id: string;
    productId?: string;
    product: string;
    seller: string;
    reason: string;
    category: string;
    price: number;
    date: string;
    status: 'pending' | 'reviewing' | 'approved' | 'removed';
}
export interface Escalation {
    id: string;
    title: string;
    type: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    status: 'open' | 'in_progress' | 'resolved' | 'escalated';
    raisedBy: string;
    assignedTo: string;
    createdAt: string;
    description: string;
}
export interface Approval {
    id: string;
    type: string;
    title: string;
    submittedBy: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
    details: string;
}
export interface Campaign {
    id: string;
    name: string;
    type: string;
    status: 'draft' | 'active' | 'paused' | 'ended';
    discount: number;
    startDate: string;
    endDate: string;
    budget?: number;
    spent?: number;
    sellerId?: string;
}
export interface Ad {
    id: string;
    image: string;
    title: string;
    link: string;
    placement: string;
    startDate: string;
    endDate: string;
    status: 'draft' | 'active' | 'paused' | 'ended';
    displayOrder: number;
}
export interface ReturnRequest {
    id: string;
    orderId: string;
    productName: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected' | 'refunded';
    sellerId: string;
    customerName: string;
    amount: number;
    createdAt: string;
}
export interface Payout {
    id: string;
    sellerId: string;
    amount: number;
    status: 'pending' | 'processing' | 'paid' | 'failed';
    period: string;
    paidAt?: string;
}
export interface SellerSettlement {
    id: string;
    sellerId: string;
    orderId: string;
    orderDate?: string;
    orderAmount: number;
    commissionRate: number;
    commissionAmount: number;
    netAmount: number;
    status: 'pending' | 'processing' | 'paid';
    payoutDate?: string;
    createdAt: string;
}
export interface AuditLog {
    id: string;
    actor: string;
    action: string;
    resource: string;
    details: string;
    timestamp: string;
    ip?: string;
}
export interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: Role;
    status: 'active' | 'inactive';
    permissions: string[];
    joinedAt: string;
}
export interface Alert {
    id: string;
    title: string;
    severity: 'info' | 'warning' | 'critical';
    status: 'open' | 'acknowledged' | 'resolved';
    createdAt: string;
    message: string;
}
export interface Notification {
    id: string;
    userId: string;
    title: string;
    body: string;
    read: boolean;
    createdAt: string;
    type: string;
}
export type NotificationChannel = 'email' | 'sms' | 'push';
export interface NotificationTemplate {
    id: string;
    eventType: string;
    channel: NotificationChannel;
    subject?: string;
    bodyTemplate: string;
}
export interface NotificationLog {
    id: string;
    userId: string;
    eventType: string;
    channel: NotificationChannel;
    status: 'sent' | 'failed';
    sentAt: string;
    refId?: string;
}
export interface PaymentMethod {
    id: string;
    userId: string;
    type: 'card' | 'upi' | 'wallet';
    label: string;
    last4?: string;
    isDefault: boolean;
}
export type DeliveryStatus = 'assigned' | 'accepted' | 'picked_up' | 'out_for_delivery' | 'delivered' | 'failed';
export interface KycDocumentEntry {
    url?: string;
    status?: 'uploaded' | 'verified' | 'rejected' | 'pending';
}
export interface DeliveryPartner {
    id: string;
    userId: string;
    name: string;
    phone: string;
    email: string;
    vehicleType: 'bike' | 'scooter' | 'van';
    kycStatus: 'pending' | 'approved' | 'rejected';
    kycDocuments: {
        aadhaar?: KycDocumentEntry;
        pan?: KycDocumentEntry;
        dl?: KycDocumentEntry;
        rc?: KycDocumentEntry;
    };
    availabilityStatus: 'online' | 'offline';
    currentLat?: number;
    currentLng?: number;
    rating: number;
    totalDeliveries: number;
    consecutiveFailures: number;
    joinedDate: string;
}
export interface Delivery {
    id: string;
    orderId: string;
    deliveryPartnerId?: string;
    pickupAddress: string;
    dropAddress: string;
    pickupLat?: number;
    pickupLng?: number;
    dropLat?: number;
    dropLng?: number;
    packageType: 'small' | 'medium' | 'large' | 'fragile';
    paymentType: 'cod' | 'prepaid';
    codAmount: number;
    status: DeliveryStatus;
    assignedAt: string;
    acceptedAt?: string;
    pickedUpAt?: string;
    outForDeliveryAt?: string;
    deliveredAt?: string;
    failureReason?: string;
    failureNote?: string;
    reattemptOf?: string;
    otpCode?: string;
    proofImageUrl?: string;
    codSubmitted: boolean;
    triedPartnerIds: string[];
}
export interface DeliveryEarning {
    id: string;
    deliveryPartnerId: string;
    deliveryId: string;
    baseFee: number;
    distanceBonus: number;
    peakBonus: number;
    total: number;
    payoutStatus: 'pending' | 'processed' | 'paid';
    payoutDate?: string;
    createdAt: string;
}
export type DeliveryMode = 'own_fleet' | 'third_party' | 'mixed';
export type ShippingPriority = 'cost' | 'speed';
export type ShipmentStatus = 'created' | 'assigned' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'failed';
export interface Shipment {
    id: string;
    orderId: string;
    deliveryMode: 'own_fleet' | 'third_party';
    providerName?: string;
    awbNumber?: string;
    trackingUrl?: string;
    rateCharged?: number;
    status: ShipmentStatus;
    createdAt: string;
}
export declare const db: {
    products: import("../data/products.js").Product[];
    orders: import("../data/orders.js").Order[];
    customers: import("../data/users.js").Customer[];
    sellers: import("../data/sellers.js").Seller[];
    categories: import("../data/categories.js").Category[];
    accounts: AuthAccount[];
    carts: Record<string, CartItem[]>;
    wishlists: Record<string, string[]>;
    addresses: Record<string, Address[]>;
    paymentMethods: Record<string, PaymentMethod[]>;
    coupons: ({
        code: string;
        type: "percent";
        value: number;
        minOrder: number;
        active: boolean;
    } | {
        code: string;
        type: "flat";
        value: number;
        minOrder: number;
        active: boolean;
    })[];
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
    settlements: SellerSettlement[];
    auditLogs: AuditLog[];
    team: TeamMember[];
    platformConfig: {
        siteName: string;
        supportEmail: string;
        defaultCommission: number;
        minPayoutAmount: number;
        freeShippingThreshold: number;
        codEnabled: boolean;
        maxCartItems: number;
        maintenanceMode: boolean;
        otpExpiryMinutes: number;
        returnWindowDays: number;
        deliveryMode: DeliveryMode;
        shippingPriority: ShippingPriority;
        lowStockThreshold: number;
    };
    alerts: Alert[];
    notifications: Notification[];
    notificationTemplates: NotificationTemplate[];
    notificationLogs: NotificationLog[];
    newsletterSubscribers: {
        email: string;
        subscribedAt: string;
    }[];
    deliveryPartners: DeliveryPartner[];
    deliveries: Delivery[];
    deliveryEarnings: DeliveryEarning[];
    shipments: Shipment[];
    analytics: {
        monthlyRevenue: analyticsSeed.DataPoint[];
        weeklyOrders: analyticsSeed.DataPoint[];
        categorySales: analyticsSeed.DataPoint[];
        platformGMV: analyticsSeed.DataPoint[];
        sellerPerformance: {
            metric: string;
            value: number;
        }[];
        returnRates: analyticsSeed.DataPoint[];
        dailyVisitors: analyticsSeed.DataPoint[];
        kpiData: {
            totalRevenue: number;
            revenueGrowth: number;
            totalOrders: number;
            orderGrowth: number;
            totalCustomers: number;
            customerGrowth: number;
            activeSellers: number;
            sellerGrowth: number;
            avgOrderValue: number;
            aovGrowth: number;
            returnRate: number;
            returnRateChange: number;
            totalGMV: number;
            gmvGrowth: number;
            platformCommission: number;
            commissionGrowth: number;
        };
        earningsTimeline: analyticsSeed.DataPoint[];
        orderStatusDist: analyticsSeed.DataPoint[];
        userGrowth: analyticsSeed.DataPoint[];
        regionalSales: analyticsSeed.DataPoint[];
    };
    finance: {
        pl: {
            label: string;
            value: number;
        }[];
        payoutsSummary: {
            pending: number;
            processing: number;
            paidThisMonth: number;
        };
    };
};
export declare function logAudit(actor: string, action: string, resource: string, details: string): void;
export declare function persistModerationStats(): Promise<void>;
/** Normalize seller ids: products use s001 style, sellers use sel_001 */
export declare function normalizeSellerId(id: string): string;
export declare function sellerMatches(productSellerId: string, sellerId: string): boolean;
