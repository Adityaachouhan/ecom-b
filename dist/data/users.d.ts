export interface Customer {
    id: string;
    name: string;
    email: string;
    phone: string;
    avatar: string;
    city: string;
    state: string;
    joinedAt: string;
    lastOrderAt: string;
    totalOrders: number;
    totalSpent: number;
    status: 'active' | 'inactive' | 'blocked';
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    savedAddresses: number;
    isVerified?: boolean;
}
export declare const customers: Customer[];
export declare function getCustomerById(id: string): Customer | undefined;
export declare const TIER_COLORS: {
    bronze: string;
    silver: string;
    gold: string;
    platinum: string;
};
export { customers as users };
