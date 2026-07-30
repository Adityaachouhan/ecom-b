// Time-series data for charts across all dashboards
// Monthly revenue for seller/admin dashboards
export const monthlyRevenue = [
    { label: 'Jan', value: 420000, value2: 380000 },
    { label: 'Feb', value: 560000, value2: 490000 },
    { label: 'Mar', value: 780000, value2: 620000 },
    { label: 'Apr', value: 690000, value2: 580000 },
    { label: 'May', value: 890000, value2: 740000 },
    { label: 'Jun', value: 1020000, value2: 870000 },
    { label: 'Jul', value: 940000, value2: 810000 },
    { label: 'Aug', value: 1150000, value2: 980000 },
    { label: 'Sep', value: 1340000, value2: 1120000 },
    { label: 'Oct', value: 1560000, value2: 1290000 },
    { label: 'Nov', value: 1890000, value2: 1560000 },
    { label: 'Dec', value: 2100000, value2: 1760000 },
];
// Weekly orders
export const weeklyOrders = [
    { label: 'Mon', value: 234, value2: 45 },
    { label: 'Tue', value: 312, value2: 67 },
    { label: 'Wed', value: 289, value2: 52 },
    { label: 'Thu', value: 423, value2: 78 },
    { label: 'Fri', value: 567, value2: 89 },
    { label: 'Sat', value: 678, value2: 123 },
    { label: 'Sun', value: 456, value2: 98 },
];
// Category-wise sales (pie chart)
export const categorySales = [
    { label: 'Electronics', value: 4230000 },
    { label: 'Fashion', value: 2890000 },
    { label: 'Home', value: 1780000 },
    { label: 'Beauty', value: 1230000 },
    { label: 'Sports', value: 890000 },
    { label: 'Books', value: 456000 },
];
// Platform GMV (super admin)
export const platformGMV = [
    { label: 'Jan', value: 8900000, value2: 7800000, value3: 6700000 },
    { label: 'Feb', value: 9800000, value2: 8500000, value3: 7200000 },
    { label: 'Mar', value: 12300000, value2: 10800000, value3: 9400000 },
    { label: 'Apr', value: 11200000, value2: 9900000, value3: 8700000 },
    { label: 'May', value: 14500000, value2: 12800000, value3: 11200000 },
    { label: 'Jun', value: 16800000, value2: 14900000, value3: 13000000 },
];
// Seller performance (radar-ready data)
export const sellerPerformance = [
    { metric: 'Rating', value: 92 },
    { metric: 'Fulfillment', value: 87 },
    { metric: 'Response', value: 78 },
    { metric: 'Returns', value: 94 },
    { metric: 'Pricing', value: 85 },
];
// Return rates by category
export const returnRates = [
    { label: 'Electronics', value: 3.2 },
    { label: 'Fashion', value: 12.4 },
    { label: 'Home', value: 4.8 },
    { label: 'Beauty', value: 2.1 },
    { label: 'Sports', value: 5.6 },
    { label: 'Books', value: 0.8 },
];
// Daily visitors (last 30 days, sampled)
export const dailyVisitors = Array.from({ length: 30 }, (_, i) => ({
    label: `Day ${i + 1}`,
    value: Math.floor(12000 + Math.random() * 8000),
    value2: Math.floor(3000 + Math.random() * 4000),
}));
// Revenue summary KPIs
export const kpiData = {
    totalRevenue: 125400000,
    revenueGrowth: 18.4,
    totalOrders: 89432,
    orderGrowth: 12.7,
    totalCustomers: 45678,
    customerGrowth: 8.9,
    activeSellers: 1234,
    sellerGrowth: 5.6,
    avgOrderValue: 1402,
    aovGrowth: 5.1,
    returnRate: 4.2,
    returnRateChange: -0.8,
    totalGMV: 198600000,
    gmvGrowth: 22.3,
    platformCommission: 12400000,
    commissionGrowth: 19.8,
};
// Seller earnings timeline
export const earningsTimeline = [
    { label: 'Jan', value: 245000 },
    { label: 'Feb', value: 312000 },
    { label: 'Mar', value: 287000 },
    { label: 'Apr', value: 398000 },
    { label: 'May', value: 445000 },
    { label: 'Jun', value: 521000 },
];
// Order status distribution
export const orderStatusDist = [
    { label: 'Delivered', value: 67234 },
    { label: 'Processing', value: 8923 },
    { label: 'Shipped', value: 5678 },
    { label: 'Cancelled', value: 4321 },
    { label: 'Returned', value: 2145 },
    { label: 'Pending', value: 1131 },
];
// User growth (admin dashboard)
export const userGrowth = [
    { label: 'Jan', value: 8420, value2: 540 },
    { label: 'Feb', value: 9810, value2: 620 },
    { label: 'Mar', value: 11230, value2: 710 },
    { label: 'Apr', value: 10540, value2: 680 },
    { label: 'May', value: 13890, value2: 890 },
    { label: 'Jun', value: 16200, value2: 1100 },
    { label: 'Jul', value: 14700, value2: 950 },
    { label: 'Aug', value: 17400, value2: 1200 },
    { label: 'Sep', value: 19800, value2: 1380 },
    { label: 'Oct', value: 22100, value2: 1560 },
    { label: 'Nov', value: 26500, value2: 1890 },
    { label: 'Dec', value: 29800, value2: 2100 },
];
// Regional sales (super admin)
export const regionalSales = [
    { label: 'Maharashtra', value: 34500000 },
    { label: 'Karnataka', value: 28900000 },
    { label: 'Tamil Nadu', value: 21200000 },
    { label: 'Delhi', value: 19800000 },
    { label: 'Telangana', value: 15600000 },
    { label: 'Gujarat', value: 14300000 },
    { label: 'West Bengal', value: 11200000 },
    { label: 'Rajasthan', value: 9800000 },
];
