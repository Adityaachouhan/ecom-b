export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'return_requested'
  | 'returned'
  | 'refunded'

export interface OrderItem {
  productId: string
  productName: string
  image: string
  quantity: number
  price: number
  sellerId: string
  sellerName: string
  variant?: string
  size?: string
}

export interface Address {
  name: string
  phone: string
  line1: string
  line2?: string
  city: string
  state: string
  pincode: string
  type: 'home' | 'work' | 'other'
}

export interface Order {
  id: string
  customerId: string
  customerName: string
  items: OrderItem[]
  status: OrderStatus
  shippingAddress: Address
  paymentMethod: 'upi' | 'card' | 'cod' | 'netbanking' | 'wallet'
  paymentStatus: 'paid' | 'pending' | 'failed' | 'refunded'
  subtotal: number
  discount: number
  deliveryFee: number
  total: number
  couponCode?: string
  orderedAt: string
  estimatedDelivery: string
  deliveredAt?: string
  trackingId?: string
  trackingEvents: TrackingEvent[]
}

export interface TrackingEvent {
  status: string
  description: string
  timestamp: string
  location?: string
  isCompleted: boolean
  isCurrent: boolean
}

export const orders: Order[] = [
  {
    id: 'ORD-2024-001',
    customerId: 'usr_001',
    customerName: 'Priya Sharma',
    items: [
      {
        productId: 'p001',
        productName: 'Apple iPhone 15 Pro Max',
        image: 'https://cdn.dummyjson.com/product-images/smartphones/iphone-13-pro/1.webp',
        quantity: 1,
        price: 134900,
        sellerId: 'sel_001',
        sellerName: 'Rahul Electronics',
        variant: 'Black Titanium',
      },
    ],
    status: 'delivered',
    shippingAddress: {
      name: 'Priya Sharma',
      phone: '+91 98765 43210',
      line1: '42, Lotus Colony',
      line2: 'Near City Mall',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      type: 'home',
    },
    paymentMethod: 'upi',
    paymentStatus: 'paid',
    subtotal: 134900,
    discount: 25000,
    deliveryFee: 0,
    total: 109900,
    orderedAt: '2024-05-10T10:30:00Z',
    estimatedDelivery: '2024-05-13T23:59:00Z',
    deliveredAt: '2024-05-12T15:45:00Z',
    trackingId: 'DTDC1234567890',
    trackingEvents: [
      { status: 'Order Placed', description: 'Your order has been placed', timestamp: '2024-05-10T10:30:00Z', isCompleted: true, isCurrent: false },
      { status: 'Confirmed', description: 'Seller confirmed your order', timestamp: '2024-05-10T11:00:00Z', location: 'Rahul Electronics, Bangalore', isCompleted: true, isCurrent: false },
      { status: 'Shipped', description: 'Package picked up by DTDC', timestamp: '2024-05-11T09:00:00Z', location: 'Bangalore Hub', isCompleted: true, isCurrent: false },
      { status: 'In Transit', description: 'Package in transit to destination', timestamp: '2024-05-12T06:00:00Z', location: 'Bangalore Sorting Center', isCompleted: true, isCurrent: false },
      { status: 'Delivered', description: 'Package delivered successfully', timestamp: '2024-05-12T15:45:00Z', location: 'Bangalore - 560001', isCompleted: true, isCurrent: true },
    ],
  },
  {
    id: 'ORD-2024-002',
    customerId: 'usr_001',
    customerName: 'Priya Sharma',
    items: [
      {
        productId: 'p003',
        productName: 'Sony WH-1000XM5 Headphones',
        image: 'https://cdn.dummyjson.com/product-images/mobile-accessories/apple-airpods-max-silver/1.webp',
        quantity: 1,
        price: 24990,
        sellerId: 'sel_001',
        sellerName: 'Rahul Electronics',
        variant: 'Black',
      },
      {
        productId: 'p010',
        productName: 'The Ordinary Niacinamide 10%',
        image: 'https://cdn.dummyjson.com/product-images/skin-care/olay-ultra-moisture-shea-butter-body-wash/1.webp',
        quantity: 2,
        price: 699,
        sellerId: 'sel_006',
        sellerName: 'Beauty Hub',
      },
    ],
    status: 'shipped',
    shippingAddress: {
      name: 'Priya Sharma',
      phone: '+91 98765 43210',
      line1: '42, Lotus Colony',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      type: 'home',
    },
    paymentMethod: 'card',
    paymentStatus: 'paid',
    subtotal: 26388,
    discount: 2000,
    deliveryFee: 40,
    total: 24428,
    orderedAt: '2024-06-01T14:20:00Z',
    estimatedDelivery: '2024-06-05T23:59:00Z',
    trackingId: 'BLUEDART987654',
    trackingEvents: [
      { status: 'Order Placed', description: 'Your order has been placed', timestamp: '2024-06-01T14:20:00Z', isCompleted: true, isCurrent: false },
      { status: 'Confirmed', description: 'Seller confirmed your order', timestamp: '2024-06-01T15:00:00Z', isCompleted: true, isCurrent: false },
      { status: 'Shipped', description: 'Package picked up by BlueDart', timestamp: '2024-06-02T10:00:00Z', location: 'Bangalore Hub', isCompleted: true, isCurrent: true },
      { status: 'In Transit', description: 'Package in transit', timestamp: '', isCompleted: false, isCurrent: false },
      { status: 'Delivered', description: 'Expected delivery', timestamp: '2024-06-05T23:59:00Z', isCompleted: false, isCurrent: false },
    ],
  },
  {
    id: 'ORD-2024-003',
    customerId: 'usr_002',
    customerName: 'Amit Patel',
    items: [
      {
        productId: 'p004',
        productName: 'MacBook Pro 14" M3',
        image: 'https://cdn.dummyjson.com/product-images/laptops/apple-macbook-pro-14-inch-space-grey/1.webp',
        quantity: 1,
        price: 168990,
        sellerId: 'sel_003',
        sellerName: 'Apple Reseller Official',
        variant: 'Space Black',
      },
    ],
    status: 'processing',
    shippingAddress: {
      name: 'Amit Patel',
      phone: '+91 87654 32109',
      line1: '15, Green Park Society',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      type: 'home',
    },
    paymentMethod: 'netbanking',
    paymentStatus: 'paid',
    subtotal: 168990,
    discount: 20000,
    deliveryFee: 0,
    total: 148990,
    orderedAt: '2024-06-03T09:15:00Z',
    estimatedDelivery: '2024-06-07T23:59:00Z',
    trackingEvents: [
      { status: 'Order Placed', description: 'Your order has been placed', timestamp: '2024-06-03T09:15:00Z', isCompleted: true, isCurrent: false },
      { status: 'Confirmed', description: 'Seller confirmed your order', timestamp: '2024-06-03T10:00:00Z', isCompleted: true, isCurrent: false },
      { status: 'Processing', description: 'Being packed at seller warehouse', timestamp: '2024-06-03T14:00:00Z', isCompleted: true, isCurrent: true },
      { status: 'Shipped', description: 'Awaiting pickup', timestamp: '', isCompleted: false, isCurrent: false },
      { status: 'Delivered', description: 'Expected delivery', timestamp: '2024-06-07T23:59:00Z', isCompleted: false, isCurrent: false },
    ],
  },
  {
    id: 'ORD-2024-004',
    customerId: 'usr_003',
    customerName: 'Sneha Gupta',
    items: [
      {
        productId: 'p005',
        productName: 'Nike Air Max 270',
        image: 'https://cdn.dummyjson.com/product-images/mens-shoes/nike-air-jordan-1-red-and-black/1.webp',
        quantity: 1,
        price: 9495,
        sellerId: 'sel_004',
        sellerName: 'Fashion Forward',
        variant: 'Black/White',
        size: '8',
      },
      {
        productId: 'p006',
        productName: "Levi's 511 Slim Fit Jeans",
        image: 'https://cdn.dummyjson.com/product-images/mens-shirts/man-plaid-shirt/1.webp',
        quantity: 2,
        price: 3499,
        sellerId: 'sel_004',
        sellerName: 'Fashion Forward',
        variant: 'Dark Indigo',
        size: '32',
      },
    ],
    status: 'cancelled',
    shippingAddress: {
      name: 'Sneha Gupta',
      phone: '+91 76543 21098',
      line1: '7, Rose Garden Apt',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
      type: 'home',
    },
    paymentMethod: 'upi',
    paymentStatus: 'refunded',
    subtotal: 16493,
    discount: 1493,
    deliveryFee: 40,
    total: 15040,
    orderedAt: '2024-05-25T16:00:00Z',
    estimatedDelivery: '2024-05-29T23:59:00Z',
    trackingEvents: [
      { status: 'Order Placed', description: 'Your order has been placed', timestamp: '2024-05-25T16:00:00Z', isCompleted: true, isCurrent: false },
      { status: 'Cancelled', description: 'Order cancelled by customer', timestamp: '2024-05-25T18:00:00Z', isCompleted: true, isCurrent: true },
    ],
  },
  {
    id: 'ORD-2024-005',
    customerId: 'usr_001',
    customerName: 'Priya Sharma',
    items: [
      {
        productId: 'p007',
        productName: 'Instant Pot Duo 7-in-1',
        image: 'https://cdn.dummyjson.com/product-images/kitchen-accessories/silver-pot-with-glass-cap/1.webp',
        quantity: 1,
        price: 8999,
        sellerId: 'sel_005',
        sellerName: 'HomeEssentials',
      },
    ],
    status: 'out_for_delivery',
    shippingAddress: {
      name: 'Priya Sharma',
      phone: '+91 98765 43210',
      line1: '42, Lotus Colony',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      type: 'home',
    },
    paymentMethod: 'cod',
    paymentStatus: 'pending',
    subtotal: 8999,
    discount: 4000,
    deliveryFee: 40,
    total: 5039,
    orderedAt: '2024-06-04T08:00:00Z',
    estimatedDelivery: '2024-06-06T23:59:00Z',
    trackingId: 'ECOM5432109876',
    trackingEvents: [
      { status: 'Order Placed', description: 'Your order has been placed', timestamp: '2024-06-04T08:00:00Z', isCompleted: true, isCurrent: false },
      { status: 'Confirmed', description: 'Seller confirmed your order', timestamp: '2024-06-04T09:00:00Z', isCompleted: true, isCurrent: false },
      { status: 'Shipped', description: 'Package dispatched', timestamp: '2024-06-05T07:00:00Z', isCompleted: true, isCurrent: false },
      { status: 'Out for Delivery', description: 'Package is out for delivery today', timestamp: '2024-06-06T08:30:00Z', location: 'Bangalore - 560001 Delivery Hub', isCompleted: true, isCurrent: true },
      { status: 'Delivered', description: 'Awaiting delivery', timestamp: '2024-06-06T23:59:00Z', isCompleted: false, isCurrent: false },
    ],
  },
]

export function getOrdersByCustomer(customerId: string): Order[] {
  return orders.filter((o) => o.customerId === customerId)
}

export function getOrderById(id: string): Order | undefined {
  return orders.find((o) => o.id === id)
}

export function getOrdersBySeller(sellerId: string): Order[] {
  return orders.filter((o) => o.items.some((i) => i.sellerId === sellerId))
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  return_requested: 'Return Requested',
  returned: 'Returned',
  refunded: 'Refunded',
}

export const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  processing: 'bg-purple-100 text-purple-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  out_for_delivery: 'bg-cyan-100 text-cyan-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  return_requested: 'bg-orange-100 text-orange-700',
  returned: 'bg-gray-100 text-gray-700',
  refunded: 'bg-teal-100 text-teal-700',
}
