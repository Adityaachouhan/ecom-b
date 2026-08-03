import { products as seedProducts } from '../data/products.js';
import { orders as seedOrders } from '../data/orders.js';
import { customers as seedCustomers } from '../data/users.js';
import { sellers as seedSellers } from '../data/sellers.js';
import { categories as seedCategories } from '../data/categories.js';
import * as analyticsSeed from '../data/analytics.js';
import { generateId, nowISO, todayISO } from '../utils/helpers.js';
import { prisma } from '../lib/prisma.js';
function deepClone(v) {
    return JSON.parse(JSON.stringify(v));
}
const DEFAULT_PASSWORD = 'password123'; // demo only
function buildAccounts() {
    return [
        {
            id: 'usr_001',
            email: 'priya.sharma@email.com',
            password: DEFAULT_PASSWORD,
            name: 'Priya Sharma',
            role: 'customer',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya',
            phone: '+91 98765 43210',
            joinedAt: '2023-06-15',
        },
        {
            id: 'sel_001',
            email: 'rahul@electronics.in',
            password: DEFAULT_PASSWORD,
            name: 'Rahul Electronics',
            role: 'seller',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul',
            phone: '+91 91234 56789',
            sellerId: 'sel_001',
            joinedAt: '2022-11-20',
        },
        {
            id: 'mgr_001',
            email: 'anita.verma@marketplace.com',
            password: DEFAULT_PASSWORD,
            name: 'Anita Verma',
            role: 'manager',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anita',
            phone: '+91 90000 11111',
            joinedAt: '2021-08-01',
        },
        {
            id: 'adm_001',
            email: 'vikram.singh@marketplace.com',
            password: DEFAULT_PASSWORD,
            name: 'Vikram Singh',
            role: 'admin',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Vikram',
            phone: '+91 88000 99999',
            joinedAt: '2020-03-15',
        },
        {
            id: 'sad_001',
            email: 'root@marketplace.com',
            password: DEFAULT_PASSWORD,
            name: 'CEO Root',
            role: 'superadmin',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Root',
            phone: '+91 80000 00001',
            joinedAt: '2019-01-01',
        },
        {
            id: 'dlv_001',
            email: 'arjun.rider@riviraa.com',
            password: DEFAULT_PASSWORD,
            name: 'Arjun Rider',
            role: 'delivery',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Arjun',
            phone: '+91 98765 11111',
            joinedAt: '2024-01-15',
        },
    ];
}
export const db = {
    products: deepClone(seedProducts),
    orders: deepClone(seedOrders),
    customers: deepClone(seedCustomers),
    sellers: deepClone(seedSellers),
    categories: deepClone(seedCategories),
    accounts: buildAccounts(),
    carts: {},
    wishlists: {},
    addresses: {
        usr_001: [
            {
                id: 'addr_001',
                name: 'Priya Sharma',
                phone: '+91 98765 43210',
                line1: '42 Indiranagar 100 Feet Road',
                line2: 'Near Metro Station',
                city: 'Bangalore',
                state: 'Karnataka',
                pincode: '560038',
                type: 'home',
                isDefault: true,
            },
            {
                id: 'addr_002',
                name: 'Priya Sharma',
                phone: '+91 98765 43210',
                line1: 'WeWork Galaxy, Residency Road',
                city: 'Bangalore',
                state: 'Karnataka',
                pincode: '560025',
                type: 'work',
                isDefault: false,
            },
        ],
    },
    paymentMethods: {
        usr_001: [
            { id: 'pm_001', userId: 'usr_001', type: 'upi', label: 'priya@upi', isDefault: true },
            { id: 'pm_002', userId: 'usr_001', type: 'card', label: 'HDFC ****4242', last4: '4242', isDefault: false },
        ],
    },
    coupons: [
        { code: 'SAVE10', type: 'percent', value: 10, minOrder: 500, active: true },
        { code: 'FLAT200', type: 'flat', value: 200, minOrder: 999, active: true },
        { code: 'WELCOME15', type: 'percent', value: 15, minOrder: 1000, active: true },
    ],
    flaggedReviews: [
        { id: 'rev_001', productId: 'p001', product: 'iPhone 15 Pro Max', reviewer: 'user_xyz', rating: 1, content: 'This product is fake! Complete fraud. Do not buy from this seller.', reason: 'Inappropriate language', date: '2024-06-28', status: 'pending' },
        { id: 'rev_002', productId: 'p002', product: 'Sony WH-1000XM5', reviewer: 'angry_buyer', rating: 1, content: 'My competitor told me to write this review to harm their sales', reason: 'Suspected fake review', date: '2024-06-27', status: 'pending' },
        { id: 'rev_003', productId: 'p010', product: 'Nike Air Max 270', reviewer: 'shopper_99', rating: 5, content: 'Best product ever! Visit my website for more deals: spam.com', reason: 'Spam/promotional content', date: '2024-06-26', status: 'pending' },
        { id: 'rev_004', productId: 'p018', product: 'Himalaya Face Wash', reviewer: 'review_bot_12', rating: 5, content: 'Amazing product amazing product amazing amazing five stars', reason: 'Bot-generated content', date: '2024-06-25', status: 'reviewing' },
        { id: 'rev_005', productId: 'p012', product: "Levi's 511 Jeans", reviewer: 'troll_user', rating: 2, content: 'The seller called me a bad name and I\'m very upset. Personal attack.', reason: 'Off-topic content', date: '2024-06-24', status: 'approved' },
        { id: 'rev_006', productId: 'p003', product: 'Samsung Galaxy S24', reviewer: 'fake_acc_44', rating: 1, content: 'Worst ever! This product broke in 1 day, never buying again, seller fraud!', reason: 'Unverified claim', date: '2024-06-23', status: 'rejected' },
    ],
    flaggedProducts: [
        { id: 'prd_f01', product: 'Cheap iPhone Clone 15', seller: 'FastDeals99', reason: 'Counterfeit / brand impersonation', category: 'Electronics', price: 2999, date: '2024-06-29', status: 'pending' },
        { id: 'prd_f02', product: 'Generic Headphones XM5 Pro', seller: 'AliDeals', reason: 'Misleading title (copy of Sony model)', category: 'Electronics', price: 499, date: '2024-06-28', status: 'pending' },
        { id: 'prd_f03', product: 'Weight Loss Pills 100% Guaranteed', seller: 'HealthKing', reason: 'Unverified health claims', category: 'Health', price: 1299, date: '2024-06-27', status: 'reviewing' },
        { id: 'prd_f04', product: 'Fake Designer Bag LV Style', seller: 'LuxuryReplica', reason: 'Trademark infringement', category: 'Fashion', price: 799, date: '2024-06-26', status: 'removed' },
        { id: 'prd_f05', product: 'Expired Skin Cream Bundle', seller: 'BeautyHub', reason: 'Expired product listing', category: 'Beauty', price: 349, date: '2024-06-25', status: 'removed' },
    ],
    moderationStats: { approvedToday: 12, removedToday: 4 },
    escalations: [
        { id: 'esc_001', title: 'Seller payout dispute', type: 'finance', priority: 'high', status: 'open', raisedBy: 'sel_002', assignedTo: 'mgr_001', createdAt: '2024-06-28', description: 'Seller claims missing payout for May cycle' },
        { id: 'esc_002', title: 'Counterfeit listing report', type: 'compliance', priority: 'critical', status: 'in_progress', raisedBy: 'usr_003', assignedTo: 'mgr_001', createdAt: '2024-06-27', description: 'Customer reported fake branded goods' },
        { id: 'esc_003', title: 'Delivery SLA breach', type: 'logistics', priority: 'medium', status: 'open', raisedBy: 'sel_001', assignedTo: 'mgr_001', createdAt: '2024-06-26', description: '3 orders delayed beyond promised ETA' },
        { id: 'esc_004', title: 'Refund loop', type: 'support', priority: 'low', status: 'resolved', raisedBy: 'usr_007', assignedTo: 'mgr_001', createdAt: '2024-06-20', description: 'Customer received duplicate refund' },
    ],
    approvals: [
        { id: 'appr_001', type: 'seller_onboarding', title: 'Approve new seller: TechNest', submittedBy: 'TechNest', status: 'pending', createdAt: '2024-06-29', details: 'GST and bank docs uploaded' },
        { id: 'appr_002', type: 'product', title: 'New category: Smart Home', submittedBy: 'adm_001', status: 'pending', createdAt: '2024-06-28', details: 'Request to add Smart Home subcategory' },
        { id: 'appr_003', type: 'campaign', title: 'Monsoon Sale 20%', submittedBy: 'sel_001', status: 'pending', createdAt: '2024-06-27', details: 'Platform-wide promotion request' },
        { id: 'appr_004', type: 'payout', title: 'Manual payout override', submittedBy: 'sel_003', status: 'approved', createdAt: '2024-06-25', details: 'Emergency payout approved' },
    ],
    campaigns: [
        { id: 'camp_001', name: 'Monsoon Mega Sale', type: 'platform', status: 'active', discount: 20, startDate: '2024-06-01', endDate: '2024-07-15', budget: 500000, spent: 182000 },
        { id: 'camp_002', name: 'Electronics Flash', type: 'category', status: 'active', discount: 15, startDate: '2024-06-20', endDate: '2024-07-05', budget: 200000, spent: 89000 },
        { id: 'camp_003', name: 'Seller Spotlight', type: 'seller', status: 'paused', discount: 10, startDate: '2024-05-01', endDate: '2024-08-01', budget: 50000, spent: 12000, sellerId: 'sel_001' },
        { id: 'camp_004', name: 'New User Welcome', type: 'coupon', status: 'ended', discount: 15, startDate: '2024-01-01', endDate: '2024-05-31', budget: 100000, spent: 98000 },
    ],
    ads: [
        {
            id: 'ad_home_top_1',
            image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&q=90',
            title: 'Weekend fashion edit',
            link: '/products?deals=true',
            placement: 'HOME_TOP_BANNER',
            startDate: '2024-06-01',
            endDate: '2027-12-31',
            status: 'active',
            displayOrder: 0,
        },
        {
            id: 'ad_home_primary_1',
            image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=1100&q=90',
            title: 'All-day power phones',
            link: '/products?category=electronics',
            placement: 'HOME_PRIMARY_RAIL',
            startDate: '2024-06-01',
            endDate: '2027-12-31',
            status: 'active',
            displayOrder: 0,
        },
        {
            id: 'ad_home_compact_1',
            image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=700&q=85',
            title: 'Everyday beauty picks',
            link: '/products?category=beauty',
            placement: 'HOME_COMPACT_RAIL',
            startDate: '2024-06-01',
            endDate: '2027-12-31',
            status: 'active',
            displayOrder: 0,
        },
        {
            id: 'ad_home_brand_1',
            image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=700&q=85',
            title: 'Discover premium brands',
            link: '/products',
            placement: 'HOME_BRAND_SHOWCASE',
            startDate: '2024-06-01',
            endDate: '2027-12-31',
            status: 'active',
            displayOrder: 0,
        },
        {
            id: 'ad_home_category_1',
            image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=900&q=85',
            title: 'Offers across electronics',
            link: '/products?category=electronics',
            placement: 'HOME_CATEGORY_GRID',
            startDate: '2024-06-01',
            endDate: '2027-12-31',
            status: 'active',
            displayOrder: 0,
        },
        {
            id: 'ad_products_top_1',
            image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1400&q=90',
            title: 'Member deals, refreshed weekly',
            link: '/products?deals=true',
            placement: 'PRODUCTS_TOP_BANNER',
            startDate: '2024-06-01',
            endDate: '2027-12-31',
            status: 'active',
            displayOrder: 0,
        },
        {
            id: 'ad_products_inline_1',
            image: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1200&q=90',
            title: 'New season essentials',
            link: '/products?new=true',
            placement: 'PRODUCTS_INLINE_BANNER',
            startDate: '2024-06-01',
            endDate: '2027-12-31',
            status: 'active',
            displayOrder: 0,
        },
    ],
    returns: [
        { id: 'ret_001', orderId: 'ORD-2024-001', productName: 'Apple iPhone 15 Pro Max', reason: 'Defective screen', status: 'pending', sellerId: 'sel_001', customerName: 'Priya Sharma', amount: 134900, createdAt: '2024-06-10' },
        { id: 'ret_002', orderId: 'ORD-2024-002', productName: 'Sony WH-1000XM5', reason: 'Wrong color', status: 'approved', sellerId: 'sel_001', customerName: 'Amit Patel', amount: 24990, createdAt: '2024-06-08' },
        { id: 'ret_003', orderId: 'ORD-2024-003', productName: 'Nike Air Max', reason: 'Size mismatch', status: 'rejected', sellerId: 'sel_004', customerName: 'Sneha Gupta', amount: 8999, createdAt: '2024-06-05' },
    ],
    payouts: [
        { id: 'pay_001', sellerId: 'sel_001', amount: 145000, status: 'pending', period: '2024-06' },
        { id: 'pay_002', sellerId: 'sel_001', amount: 128000, status: 'paid', period: '2024-05', paidAt: '2024-06-05' },
        { id: 'pay_003', sellerId: 'sel_001', amount: 112000, status: 'paid', period: '2024-04', paidAt: '2024-05-05' },
    ],
    settlements: [
        {
            id: 'stl_001',
            sellerId: 'sel_001',
            orderId: 'ORD-2024-001',
            orderDate: '2024-05-10T10:30:00Z',
            orderAmount: 134900,
            commissionRate: 8,
            commissionAmount: 10792,
            netAmount: 124108,
            status: 'pending',
            createdAt: '2024-05-12T15:45:00Z',
        },
        {
            id: 'stl_002',
            sellerId: 'sel_003',
            orderId: 'ORD-DEMO-PAID-1',
            orderDate: '2024-04-01T10:00:00Z',
            orderAmount: 45000,
            commissionRate: 6,
            commissionAmount: 2700,
            netAmount: 42300,
            status: 'paid',
            payoutDate: '2024-04-20',
            createdAt: '2024-04-05T12:00:00Z',
        },
        {
            id: 'stl_003',
            sellerId: 'sel_001',
            orderId: 'ORD-DEMO-PROC-1',
            orderDate: '2024-05-01T09:00:00Z',
            orderAmount: 24990,
            commissionRate: 8,
            commissionAmount: 1999.2,
            netAmount: 22990.8,
            status: 'processing',
            createdAt: '2024-05-08T10:00:00Z',
        },
    ],
    auditLogs: [
        { id: 'aud_001', actor: 'root@marketplace.com', action: 'UPDATE_CONFIG', resource: 'platform', details: 'Updated commission default to 12%', timestamp: '2024-06-29T10:00:00Z', ip: '10.0.0.1' },
        { id: 'aud_002', actor: 'vikram.singh@marketplace.com', action: 'SUSPEND_SELLER', resource: 'sel_008', details: 'Suspended for policy violation', timestamp: '2024-06-28T14:22:00Z' },
        { id: 'aud_003', actor: 'anita.verma@marketplace.com', action: 'RESOLVE_ESCALATION', resource: 'esc_004', details: 'Closed refund loop ticket', timestamp: '2024-06-27T09:15:00Z' },
        { id: 'aud_004', actor: 'vikram.singh@marketplace.com', action: 'APPROVE_PRODUCT', resource: 'p015', details: 'Catalog approval', timestamp: '2024-06-26T16:40:00Z' },
    ],
    team: [
        { id: 'team_001', name: 'CEO Root', email: 'root@marketplace.com', role: 'superadmin', status: 'active', permissions: ['*'], joinedAt: '2019-01-01' },
        { id: 'team_002', name: 'Vikram Singh', email: 'vikram.singh@marketplace.com', role: 'admin', status: 'active', permissions: ['users', 'sellers', 'catalog', 'orders', 'moderation', 'marketing'], joinedAt: '2020-03-15' },
        { id: 'team_003', name: 'Anita Verma', email: 'anita.verma@marketplace.com', role: 'manager', status: 'active', permissions: ['sellers', 'escalations', 'approvals', 'inventory'], joinedAt: '2021-08-01' },
    ],
    platformConfig: {
        siteName: 'Riviraa',
        supportEmail: 'support@riviraa.com',
        defaultCommission: 12,
        minPayoutAmount: 1000,
        freeShippingThreshold: 499,
        codEnabled: true,
        maxCartItems: 50,
        maintenanceMode: false,
        otpExpiryMinutes: 10,
        returnWindowDays: 7,
        deliveryMode: 'own_fleet',
        shippingPriority: 'cost',
        lowStockThreshold: 10,
    },
    alerts: [
        { id: 'alert_001', title: 'High return rate spike', severity: 'warning', status: 'open', createdAt: '2024-06-29', message: 'Fashion category returns up 18% WoW' },
        { id: 'alert_002', title: 'Payment gateway latency', severity: 'critical', status: 'acknowledged', createdAt: '2024-06-28', message: 'UPI success rate dropped below 95%' },
        { id: 'alert_003', title: 'Seller onboarding backlog', severity: 'info', status: 'open', createdAt: '2024-06-27', message: '42 sellers awaiting KYC review' },
    ],
    notifications: [
        { id: 'notif_001', userId: 'usr_001', title: 'Order shipped', body: 'Your order ORD-2024-001 is on the way', read: false, createdAt: nowISO(), type: 'order' },
        { id: 'notif_002', userId: 'sel_001', title: 'New order', body: 'You received a new order', read: false, createdAt: nowISO(), type: 'order' },
        { id: 'notif_003', userId: 'adm_001', title: 'Moderation queue', body: '6 items pending review', read: true, createdAt: todayISO(), type: 'moderation' },
    ],
    notificationTemplates: [],
    notificationLogs: [],
    newsletterSubscribers: [],
    deliveryPartners: [
        {
            id: 'dp_001',
            userId: 'dlv_001',
            name: 'Arjun Rider',
            phone: '+91 98765 11111',
            email: 'arjun.rider@riviraa.com',
            vehicleType: 'bike',
            kycStatus: 'approved',
            kycDocuments: {
                aadhaar: { url: 'https://example.com/aadhaar.pdf', status: 'verified' },
                pan: { url: 'https://example.com/pan.pdf', status: 'verified' },
                dl: { url: 'https://example.com/dl.pdf', status: 'verified' },
                rc: { url: 'https://example.com/rc.pdf', status: 'verified' },
            },
            availabilityStatus: 'online',
            currentLat: 12.9716,
            currentLng: 77.5946,
            rating: 4.8,
            totalDeliveries: 142,
            consecutiveFailures: 0,
            joinedDate: '2024-01-15',
        },
    ],
    deliveries: [],
    deliveryEarnings: [],
    shipments: [],
    analytics: {
        monthlyRevenue: analyticsSeed.monthlyRevenue,
        weeklyOrders: analyticsSeed.weeklyOrders,
        categorySales: analyticsSeed.categorySales,
        platformGMV: analyticsSeed.platformGMV,
        sellerPerformance: analyticsSeed.sellerPerformance,
        returnRates: analyticsSeed.returnRates,
        dailyVisitors: analyticsSeed.dailyVisitors,
        kpiData: analyticsSeed.kpiData,
        earningsTimeline: analyticsSeed.earningsTimeline,
        orderStatusDist: analyticsSeed.orderStatusDist,
        userGrowth: analyticsSeed.userGrowth,
        regionalSales: analyticsSeed.regionalSales,
    },
    finance: {
        pl: [
            { label: 'GMV', value: 198600000 },
            { label: 'Commission', value: 12400000 },
            { label: 'Ads Revenue', value: 3200000 },
            { label: 'Ops Cost', value: -4800000 },
            { label: 'Net', value: 10800000 },
        ],
        payoutsSummary: { pending: 2450000, processing: 890000, paidThisMonth: 11200000 },
    },
};
export function logAudit(actor, action, resource, details) {
    const entry = {
        id: generateId('aud'),
        actor,
        action,
        resource,
        details,
        timestamp: nowISO(),
    };
    db.auditLogs.unshift(entry);
    void prisma.auditLog
        .create({ data: entry })
        .catch((err) => console.error('Failed to persist audit log:', err));
}
export async function persistModerationStats() {
    const { saveModerationStats } = await import('./persist.js');
    await saveModerationStats(db.moderationStats);
}
/** Normalize seller ids: products use s001 style, sellers use sel_001 */
export function normalizeSellerId(id) {
    if (id.startsWith('sel_'))
        return id;
    const m = id.match(/^s0*(\d+)$/);
    if (m)
        return `sel_${m[1].padStart(3, '0')}`;
    return id;
}
export function sellerMatches(productSellerId, sellerId) {
    return normalizeSellerId(productSellerId) === normalizeSellerId(sellerId);
}
