export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'return_requested' | 'returned' | 'refunded';
export interface OrderItem {
    productId: string;
    productName: string;
    image: string;
    quantity: number;
    price: number;
    sellerId: string;
    sellerName: string;
    variant?: string;
    size?: string;
}
export interface Address {
    name: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    type: 'home' | 'work' | 'other';
}
export interface Order {
    id: string;
    customerId: string;
    customerName: string;
    items: OrderItem[];
    status: OrderStatus;
    shippingAddress: Address;
    paymentMethod: 'upi' | 'card' | 'cod' | 'netbanking' | 'wallet';
    paymentStatus: 'paid' | 'pending' | 'failed' | 'refunded';
    subtotal: number;
    discount: number;
    deliveryFee: number;
    total: number;
    couponCode?: string;
    orderedAt: string;
    estimatedDelivery: string;
    deliveredAt?: string;
    trackingId?: string;
    trackingEvents: TrackingEvent[];
}
export interface TrackingEvent {
    status: string;
    description: string;
    timestamp: string;
    location?: string;
    isCompleted: boolean;
    isCurrent: boolean;
}
export declare const orders: Order[];
export declare function getOrdersByCustomer(customerId: string): Order[];
export declare function getOrderById(id: string): Order | undefined;
export declare function getOrdersBySeller(sellerId: string): Order[];
export declare const STATUS_LABELS: Record<OrderStatus, string>;
export declare const STATUS_COLORS: Record<OrderStatus, string>;
