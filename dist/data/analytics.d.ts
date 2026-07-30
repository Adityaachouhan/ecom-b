export interface DataPoint {
    label: string;
    value: number;
    value2?: number;
    value3?: number;
}
export declare const monthlyRevenue: DataPoint[];
export declare const weeklyOrders: DataPoint[];
export declare const categorySales: DataPoint[];
export declare const platformGMV: DataPoint[];
export declare const sellerPerformance: {
    metric: string;
    value: number;
}[];
export declare const returnRates: DataPoint[];
export declare const dailyVisitors: DataPoint[];
export declare const kpiData: {
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
export declare const earningsTimeline: DataPoint[];
export declare const orderStatusDist: DataPoint[];
export declare const userGrowth: DataPoint[];
export declare const regionalSales: DataPoint[];
