export interface Seller {
    id: string;
    name: string;
    ownerName: string;
    email: string;
    phone: string;
    avatar: string;
    gstNumber: string;
    panNumber: string;
    category: string[];
    city: string;
    state: string;
    rating: number;
    reviewCount: number;
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    pendingPayouts: number;
    status: 'active' | 'pending' | 'suspended' | 'onboarding';
    commissionRate: number;
    joinedAt: string;
    lastActive: string;
    bankAccount: {
        bankName: string;
        accountNumber: string;
        ifsc: string;
    };
    performanceScore: number;
    returnRate: number;
    cancellationRate: number;
}
export declare const sellers: Seller[];
export declare function getSellerById(id: string): Seller | undefined;
export declare function getActiveSellers(): Seller[];
