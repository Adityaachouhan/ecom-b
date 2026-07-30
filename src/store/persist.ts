/**
 * Dual-write helpers: keep the in-memory store for fast reads,
 * and persist every mutation to PostgreSQL via Prisma.
 */
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { normalizeSellerId } from './db.js'
import type {
  Address,
  Ad,
  Alert,
  Approval,
  AuthAccount,
  Campaign,
  CartItem,
  Escalation,
  FlaggedProduct,
  FlaggedReview,
  Notification,
  PaymentMethod,
  Payout,
  ReturnRequest,
  TeamMember,
} from './db.js'

function toDate(value?: string | null): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function toDateRequired(value?: string | null): Date {
  return toDate(value) || new Date()
}

/** Fire-and-forget with logging — use when response shouldn't block on DB. */
export function persistLater(label: string, fn: () => Promise<unknown>) {
  void fn().catch((err) => console.error(`Failed to persist ${label}:`, err))
}

export async function saveUser(account: AuthAccount) {
  await prisma.user.upsert({
    where: { id: account.id },
    create: {
      id: account.id,
      email: account.email,
      password: account.password,
      name: account.name,
      role: account.role,
      avatar: account.avatar || '',
      phone: account.phone || null,
      sellerId: account.sellerId || null,
      otp: account.otp || null,
      otpExpiresAt: toDate(account.otpExpiresAt),
      joinedAt: toDateRequired(account.joinedAt),
    },
    update: {
      email: account.email,
      password: account.password,
      name: account.name,
      role: account.role,
      avatar: account.avatar || '',
      phone: account.phone || null,
      sellerId: account.sellerId || null,
      otp: account.otp || null,
      otpExpiresAt: toDate(account.otpExpiresAt),
    },
  })
}

function toCustomerStatus(status: string): 'active' | 'inactive' | 'blocked' {
  if (status === 'inactive') return 'inactive'
  // UI/legacy may send "suspended" — Prisma CustomerStatus only allows blocked
  if (status === 'blocked' || status === 'suspended') return 'blocked'
  return 'active'
}

export async function saveCustomer(customer: {
  id: string
  name: string
  email: string
  phone: string
  avatar: string
  city: string
  state: string
  joinedAt: string
  lastOrderAt: string
  totalOrders: number
  totalSpent: number
  status: string
  tier: string
  savedAddresses: number
  isVerified?: boolean
}) {
  const isVerified = Boolean(customer.isVerified)
  const status = toCustomerStatus(customer.status)
  await prisma.customer.upsert({
    where: { id: customer.id },
    create: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone || '',
      avatar: customer.avatar || '',
      city: customer.city || '',
      state: customer.state || '',
      joinedAt: toDateRequired(customer.joinedAt),
      lastOrderAt: toDate(customer.lastOrderAt),
      totalOrders: customer.totalOrders,
      totalSpent: customer.totalSpent,
      status,
      tier: customer.tier as 'bronze' | 'silver' | 'gold' | 'platinum',
      savedAddresses: customer.savedAddresses,
      isVerified,
    },
    update: {
      name: customer.name,
      email: customer.email,
      phone: customer.phone || '',
      avatar: customer.avatar || '',
      city: customer.city || '',
      state: customer.state || '',
      lastOrderAt: toDate(customer.lastOrderAt),
      totalOrders: customer.totalOrders,
      totalSpent: customer.totalSpent,
      status,
      tier: customer.tier as 'bronze' | 'silver' | 'gold' | 'platinum',
      savedAddresses: customer.savedAddresses,
      isVerified,
    },
  })
}

export async function saveSeller(seller: {
  id: string
  name: string
  ownerName: string
  email: string
  phone: string
  avatar: string
  gstNumber: string
  panNumber: string
  category: string[]
  city: string
  state: string
  rating: number
  reviewCount: number
  totalProducts: number
  totalOrders: number
  totalRevenue: number
  pendingPayouts: number
  status: string
  commissionRate: number
  joinedAt: string
  lastActive: string
  bankAccount: { bankName: string; accountNumber: string; ifsc: string }
  performanceScore: number
  returnRate: number
  cancellationRate: number
}) {
  const data = {
    name: seller.name,
    ownerName: seller.ownerName,
    email: seller.email,
    phone: seller.phone || '',
    avatar: seller.avatar || '',
    gstNumber: seller.gstNumber || '',
    panNumber: seller.panNumber || '',
    category: seller.category || [],
    city: seller.city || '',
    state: seller.state || '',
    rating: seller.rating,
    reviewCount: seller.reviewCount,
    totalProducts: seller.totalProducts,
    totalOrders: seller.totalOrders,
    totalRevenue: seller.totalRevenue,
    pendingPayouts: seller.pendingPayouts,
    status: seller.status as 'active' | 'pending' | 'suspended' | 'onboarding',
    commissionRate: seller.commissionRate,
    joinedAt: toDateRequired(seller.joinedAt),
    lastActive: toDateRequired(seller.lastActive),
    bankName: seller.bankAccount?.bankName || '',
    bankAccountNumber: seller.bankAccount?.accountNumber || '',
    bankIfsc: seller.bankAccount?.ifsc || '',
    performanceScore: seller.performanceScore,
    returnRate: seller.returnRate,
    cancellationRate: seller.cancellationRate,
  }
  await prisma.seller.upsert({
    where: { id: seller.id },
    create: { id: seller.id, ...data },
    update: data,
  })
}

type ProductLike = {
  id: string
  title: string
  description?: string
  category: string
  subcategory?: string
  brand?: string
  images?: string[]
  price: number
  discount?: number
  stock?: number
  sellerId: string
  sellerName?: string
  sellerRating?: number
  rating?: number
  reviewCount?: number
  tags?: string[]
  isFeatured?: boolean
  isTrending?: boolean
  isNewArrival?: boolean
  deliveryDays?: number
  specifications?: Record<string, string>
  weight?: string
  warranty?: string
  variants?: Array<{
    id: string
    type: string
    label: string
    value: string
    stock: number
    priceModifier?: number
  }>
}

export async function saveProduct(product: ProductLike) {
  const sellerId = normalizeSellerId(product.sellerId)
  const seller = await prisma.seller.findUnique({ where: { id: sellerId } })
  if (!seller) {
    throw new Error(`Cannot persist product ${product.id}: seller ${sellerId} missing`)
  }

  const base = {
    title: product.title,
    description: product.description || '',
    category: product.category,
    subcategory: product.subcategory || '',
    brand: product.brand || '',
    images: product.images || [],
    price: product.price,
    discount: product.discount || 0,
    stock: product.stock ?? 0,
    sellerId,
    sellerName: product.sellerName || '',
    sellerRating: product.sellerRating || 0,
    rating: product.rating || 0,
    reviewCount: product.reviewCount || 0,
    tags: product.tags || [],
    isFeatured: Boolean(product.isFeatured),
    isTrending: Boolean(product.isTrending),
    isNewArrival: Boolean(product.isNewArrival),
    deliveryDays: product.deliveryDays ?? 5,
    specifications: (product.specifications || {}) as Prisma.InputJsonValue,
    weight: product.weight || null,
    warranty: product.warranty || null,
  }

  await prisma.product.upsert({
    where: { id: product.id },
    create: { id: product.id, ...base },
    update: base,
  })

  if (product.variants?.length) {
    await prisma.productVariant.deleteMany({ where: { productId: product.id } })
    await prisma.productVariant.createMany({
      data: product.variants.map((v) => ({
        id: v.id.includes('_') ? v.id : `${product.id}_${v.id}`,
        productId: product.id,
        type: v.type,
        label: v.label,
        value: v.value,
        stock: v.stock,
        priceModifier: v.priceModifier ?? null,
      })),
    })
  }
}

export async function deleteProduct(productId: string) {
  await prisma.product.delete({ where: { id: productId } }).catch(() => undefined)
}

export async function saveReview(
  productId: string,
  review: {
    id: string
    userId: string
    userName: string
    rating: number
    title: string
    body: string
    date: string
    helpful: number
    verified: boolean
  },
  productMeta?: { rating: number; reviewCount: number }
) {
  const reviewId = review.id.includes('_') ? review.id : `${productId}_${review.id}`
  await prisma.review.upsert({
    where: { id: reviewId },
    create: {
      id: reviewId,
      productId,
      userId: review.userId,
      userName: review.userName,
      rating: review.rating,
      title: review.title || '',
      body: review.body,
      date: toDateRequired(review.date),
      helpful: review.helpful,
      verified: review.verified,
    },
    update: {
      rating: review.rating,
      title: review.title || '',
      body: review.body,
      helpful: review.helpful,
      verified: review.verified,
    },
  })
  if (productMeta) {
    await prisma.product.update({
      where: { id: productId },
      data: { rating: productMeta.rating, reviewCount: productMeta.reviewCount },
    })
  }
}

export async function incrementReviewHelpful(reviewId: string, helpful: number) {
  // Try exact id, then any review ending with the id (seed uses productId_reviewId)
  const existing = await prisma.review.findFirst({
    where: { OR: [{ id: reviewId }, { id: { endsWith: `_${reviewId}` } }] },
  })
  if (!existing) return
  await prisma.review.update({ where: { id: existing.id }, data: { helpful } })
}

type OrderLike = {
  id: string
  customerId: string
  customerName: string
  items: Array<{
    productId: string
    productName: string
    image: string
    quantity: number
    price: number
    sellerId: string
    sellerName: string
    variant?: string
    size?: string
  }>
  status: string
  shippingAddress: {
    name: string
    phone: string
    line1: string
    line2?: string
    city: string
    state: string
    pincode: string
    type: string
  }
  paymentMethod: string
  paymentStatus: string
  subtotal: number
  discount: number
  deliveryFee: number
  total: number
  couponCode?: string
  orderedAt: string
  estimatedDelivery?: string
  deliveredAt?: string
  trackingId?: string
  trackingEvents?: unknown
}

export async function saveOrder(order: OrderLike) {
  const data = {
    customerId: order.customerId,
    customerName: order.customerName,
    status: order.status as
      | 'pending'
      | 'confirmed'
      | 'processing'
      | 'shipped'
      | 'out_for_delivery'
      | 'delivered'
      | 'cancelled'
      | 'return_requested'
      | 'returned'
      | 'refunded',
    shippingName: order.shippingAddress.name,
    shippingPhone: order.shippingAddress.phone,
    shippingLine1: order.shippingAddress.line1,
    shippingLine2: order.shippingAddress.line2 || null,
    shippingCity: order.shippingAddress.city,
    shippingState: order.shippingAddress.state,
    shippingPincode: order.shippingAddress.pincode,
    shippingType: order.shippingAddress.type || 'home',
    paymentMethod: order.paymentMethod as 'upi' | 'card' | 'cod' | 'netbanking' | 'wallet',
    paymentStatus: order.paymentStatus as 'paid' | 'pending' | 'failed' | 'refunded',
    subtotal: order.subtotal,
    discount: order.discount,
    deliveryFee: order.deliveryFee,
    total: order.total,
    couponCode: order.couponCode || null,
    orderedAt: toDateRequired(order.orderedAt),
    estimatedDelivery: toDate(order.estimatedDelivery),
    deliveredAt: toDate(order.deliveredAt),
    trackingId: order.trackingId || null,
    trackingEvents: (order.trackingEvents || []) as Prisma.InputJsonValue,
  }

  const existing = await prisma.order.findUnique({ where: { id: order.id } })
  if (existing) {
    await prisma.order.update({ where: { id: order.id }, data })
  } else {
    // Only create items that reference existing products
    const validItems = []
    for (const item of order.items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } })
      if (!product) continue
      validItems.push({
        productId: item.productId,
        productName: item.productName,
        image: item.image || '',
        quantity: item.quantity,
        price: item.price,
        sellerId: normalizeSellerId(item.sellerId),
        sellerName: item.sellerName || '',
        variant: item.variant || null,
        size: item.size || null,
      })
    }
    await prisma.order.create({
      data: {
        id: order.id,
        ...data,
        items: { create: validItems },
      },
    })
  }
}

export async function saveCart(userId: string, items: CartItem[]) {
  await prisma.cartItem.deleteMany({ where: { userId } })
  if (!items.length) return
  const data = []
  for (const item of items) {
    const product = await prisma.product.findUnique({ where: { id: item.productId } })
    if (!product) continue
    data.push({
      userId,
      productId: item.productId,
      quantity: item.quantity,
      variantId: item.variantId || '',
      size: item.size || '',
    })
  }
  if (data.length) {
    await prisma.cartItem.createMany({ data, skipDuplicates: true })
  }
}

export async function clearCart(userId: string) {
  await prisma.cartItem.deleteMany({ where: { userId } })
}

export async function saveWishlistAdd(userId: string, productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) return
  await prisma.wishlistItem.upsert({
    where: { userId_productId: { userId, productId } },
    create: { userId, productId },
    update: {},
  })
}

export async function saveWishlistRemove(userId: string, productId: string) {
  await prisma.wishlistItem.deleteMany({ where: { userId, productId } })
}

export async function clearWishlist(userId: string) {
  await prisma.wishlistItem.deleteMany({ where: { userId } })
}

export async function saveAddress(userId: string, addr: Address) {
  await prisma.address.upsert({
    where: { id: addr.id },
    create: {
      id: addr.id,
      userId,
      name: addr.name,
      phone: addr.phone,
      line1: addr.line1,
      line2: addr.line2 || null,
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      type: addr.type,
      isDefault: Boolean(addr.isDefault),
    },
    update: {
      name: addr.name,
      phone: addr.phone,
      line1: addr.line1,
      line2: addr.line2 || null,
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      type: addr.type,
      isDefault: Boolean(addr.isDefault),
    },
  })
}

export async function deleteAddress(id: string) {
  await prisma.address.delete({ where: { id } }).catch(() => undefined)
}

export async function saveAddressesDefaults(userId: string, addresses: Address[]) {
  for (const addr of addresses) {
    await prisma.address.updateMany({
      where: { id: addr.id, userId },
      data: { isDefault: Boolean(addr.isDefault) },
    })
  }
}

export async function savePaymentMethod(pm: PaymentMethod) {
  await prisma.paymentMethod.upsert({
    where: { id: pm.id },
    create: {
      id: pm.id,
      userId: pm.userId,
      type: pm.type,
      label: pm.label,
      last4: pm.last4 || null,
      isDefault: pm.isDefault,
    },
    update: {
      type: pm.type,
      label: pm.label,
      last4: pm.last4 || null,
      isDefault: pm.isDefault,
    },
  })
}

export async function deletePaymentMethod(id: string) {
  await prisma.paymentMethod.delete({ where: { id } }).catch(() => undefined)
}

export async function saveCategory(cat: {
  id: string
  name: string
  slug: string
  icon: string
  color: string
  bgColor: string
  image: string
  productCount: number
  subcategories: Array<{ id: string; name: string; slug: string; productCount: number }>
}) {
  await prisma.category.upsert({
    where: { id: cat.id },
    create: {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon,
      color: cat.color,
      bgColor: cat.bgColor,
      image: cat.image || '',
      productCount: cat.productCount,
    },
    update: {
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon,
      color: cat.color,
      bgColor: cat.bgColor,
      image: cat.image || '',
      productCount: cat.productCount,
    },
  })
  for (const sub of cat.subcategories || []) {
    await prisma.subcategory.upsert({
      where: { id: sub.id },
      create: {
        id: sub.id,
        name: sub.name,
        slug: sub.slug,
        productCount: sub.productCount,
        categoryId: cat.id,
      },
      update: {
        name: sub.name,
        slug: sub.slug,
        productCount: sub.productCount,
      },
    })
  }
}

export async function saveFlaggedReview(item: FlaggedReview) {
  await prisma.flaggedReview.upsert({
    where: { id: item.id },
    create: {
      id: item.id,
      productId: item.productId || null,
      product: item.product,
      reviewer: item.reviewer,
      rating: item.rating,
      content: item.content,
      reason: item.reason,
      date: toDateRequired(item.date),
      status: item.status as 'pending' | 'reviewing' | 'approved' | 'rejected' | 'removed',
    },
    update: {
      status: item.status as 'pending' | 'reviewing' | 'approved' | 'rejected' | 'removed',
      reason: item.reason,
      content: item.content,
    },
  })
}

export async function saveFlaggedProduct(item: FlaggedProduct) {
  await prisma.flaggedProduct.upsert({
    where: { id: item.id },
    create: {
      id: item.id,
      productId: item.productId || null,
      product: item.product,
      seller: item.seller,
      reason: item.reason,
      category: item.category,
      price: item.price,
      date: toDateRequired(item.date),
      status: item.status as 'pending' | 'reviewing' | 'approved' | 'rejected' | 'removed',
    },
    update: {
      status: item.status as 'pending' | 'reviewing' | 'approved' | 'rejected' | 'removed',
      reason: item.reason,
    },
  })
}

export async function saveModerationStats(stats: { approvedToday: number; removedToday: number }) {
  await prisma.moderationStats.upsert({
    where: { id: 1 },
    create: { id: 1, approvedToday: stats.approvedToday, removedToday: stats.removedToday },
    update: { approvedToday: stats.approvedToday, removedToday: stats.removedToday },
  })
}

export async function saveEscalation(item: Escalation) {
  await prisma.escalation.upsert({
    where: { id: item.id },
    create: {
      id: item.id,
      title: item.title,
      type: item.type,
      priority: item.priority,
      status: item.status,
      raisedBy: item.raisedBy,
      assignedTo: item.assignedTo,
      createdAt: toDateRequired(item.createdAt),
      description: item.description,
    },
    update: {
      title: item.title,
      type: item.type,
      priority: item.priority,
      status: item.status,
      raisedBy: item.raisedBy,
      assignedTo: item.assignedTo,
      description: item.description,
    },
  })
}

export async function saveApproval(item: Approval) {
  await prisma.approval.upsert({
    where: { id: item.id },
    create: {
      id: item.id,
      type: item.type,
      title: item.title,
      submittedBy: item.submittedBy,
      status: item.status,
      createdAt: toDateRequired(item.createdAt),
      details: item.details,
    },
    update: {
      type: item.type,
      title: item.title,
      submittedBy: item.submittedBy,
      status: item.status,
      details: item.details,
    },
  })
}

export async function saveCampaign(camp: Campaign) {
  await prisma.campaign.upsert({
    where: { id: camp.id },
    create: {
      id: camp.id,
      name: camp.name,
      type: camp.type,
      status: camp.status,
      discount: camp.discount,
      startDate: toDateRequired(camp.startDate),
      endDate: toDateRequired(camp.endDate),
      budget: camp.budget ?? null,
      spent: camp.spent ?? 0,
      sellerId: camp.sellerId || null,
    },
    update: {
      name: camp.name,
      type: camp.type,
      status: camp.status,
      discount: camp.discount,
      startDate: toDateRequired(camp.startDate),
      endDate: toDateRequired(camp.endDate),
      budget: camp.budget ?? null,
      spent: camp.spent ?? 0,
      sellerId: camp.sellerId || null,
    },
  })
}

export async function deleteCampaign(id: string) {
  await prisma.campaign.delete({ where: { id } }).catch(() => undefined)
}

export async function saveAd(ad: Ad) {
  await prisma.ad.upsert({
    where: { id: ad.id },
    create: {
      id: ad.id,
      image: ad.image,
      title: ad.title,
      link: ad.link,
      placement: ad.placement,
      startDate: toDateRequired(ad.startDate),
      endDate: toDateRequired(ad.endDate),
      status: ad.status,
      displayOrder: Number(ad.displayOrder || 0),
    },
    update: {
      image: ad.image,
      title: ad.title,
      link: ad.link,
      placement: ad.placement,
      startDate: toDateRequired(ad.startDate),
      endDate: toDateRequired(ad.endDate),
      status: ad.status,
      displayOrder: Number(ad.displayOrder || 0),
    },
  })
}

export async function deleteAd(id: string) {
  await prisma.ad.delete({ where: { id } }).catch(() => undefined)
}

export async function saveReturn(ret: ReturnRequest) {
  const order = await prisma.order.findUnique({ where: { id: ret.orderId } })
  if (!order) return
  const sellerId = normalizeSellerId(ret.sellerId)
  const seller = await prisma.seller.findUnique({ where: { id: sellerId } })
  if (!seller) return
  await prisma.returnRequest.upsert({
    where: { id: ret.id },
    create: {
      id: ret.id,
      orderId: ret.orderId,
      productName: ret.productName,
      reason: ret.reason,
      status: ret.status,
      sellerId,
      customerName: ret.customerName,
      amount: ret.amount,
      createdAt: toDateRequired(ret.createdAt),
    },
    update: {
      reason: ret.reason,
      status: ret.status,
      amount: ret.amount,
    },
  })
}

export async function savePayout(payout: Payout) {
  await prisma.payout.upsert({
    where: { id: payout.id },
    create: {
      id: payout.id,
      sellerId: payout.sellerId,
      amount: payout.amount,
      status: payout.status,
      period: payout.period,
      paidAt: toDate(payout.paidAt),
    },
    update: {
      amount: payout.amount,
      status: payout.status,
      period: payout.period,
      paidAt: toDate(payout.paidAt),
    },
  })
}

export async function saveTeamMember(member: TeamMember) {
  await prisma.teamMember.upsert({
    where: { id: member.id },
    create: {
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      status: member.status,
      permissions: member.permissions,
      joinedAt: toDateRequired(member.joinedAt),
    },
    update: {
      name: member.name,
      email: member.email,
      role: member.role,
      status: member.status,
      permissions: member.permissions,
    },
  })
}

export async function saveAlert(alert: Alert) {
  await prisma.alert.upsert({
    where: { id: alert.id },
    create: {
      id: alert.id,
      title: alert.title,
      severity: alert.severity,
      status: alert.status,
      createdAt: toDateRequired(alert.createdAt),
      message: alert.message,
    },
    update: {
      title: alert.title,
      severity: alert.severity,
      status: alert.status,
      message: alert.message,
    },
  })
}

export async function saveNotification(notif: Notification) {
  const user = await prisma.user.findUnique({ where: { id: notif.userId } })
  if (!user) return
  await prisma.notification.upsert({
    where: { id: notif.id },
    create: {
      id: notif.id,
      userId: notif.userId,
      title: notif.title,
      body: notif.body,
      read: notif.read,
      createdAt: toDateRequired(notif.createdAt),
      type: notif.type,
    },
    update: {
      title: notif.title,
      body: notif.body,
      read: notif.read,
      type: notif.type,
    },
  })
}

export async function markNotificationsRead(userId: string, ids?: string[]) {
  if (ids?.length) {
    await prisma.notification.updateMany({
      where: { userId, id: { in: ids } },
      data: { read: true },
    })
  } else {
    await prisma.notification.updateMany({ where: { userId }, data: { read: true } })
  }
}

export async function savePlatformConfig(config: Record<string, unknown>) {
  await prisma.platformConfig.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      siteName: String(config.siteName ?? 'Uniqora'),
      supportEmail: String(config.supportEmail ?? 'support@uniqora.com'),
      defaultCommission: Number(config.defaultCommission ?? 12),
      minPayoutAmount: Number(config.minPayoutAmount ?? 1000),
      freeShippingThreshold: Number(config.freeShippingThreshold ?? 499),
      codEnabled: Boolean(config.codEnabled ?? true),
      maxCartItems: Number(config.maxCartItems ?? 50),
      maintenanceMode: Boolean(config.maintenanceMode ?? false),
      otpExpiryMinutes: Number(config.otpExpiryMinutes ?? 10),
      returnWindowDays: Number(config.returnWindowDays ?? 7),
    },
    update: {
      siteName: String(config.siteName ?? 'Uniqora'),
      supportEmail: String(config.supportEmail ?? 'support@uniqora.com'),
      defaultCommission: Number(config.defaultCommission ?? 12),
      minPayoutAmount: Number(config.minPayoutAmount ?? 1000),
      freeShippingThreshold: Number(config.freeShippingThreshold ?? 499),
      codEnabled: Boolean(config.codEnabled ?? true),
      maxCartItems: Number(config.maxCartItems ?? 50),
      maintenanceMode: Boolean(config.maintenanceMode ?? false),
      otpExpiryMinutes: Number(config.otpExpiryMinutes ?? 10),
      returnWindowDays: Number(config.returnWindowDays ?? 7),
    },
  })
}

export async function saveAnalyticsSnapshot(analytics: Record<string, unknown>, finance: Record<string, unknown>) {
  await prisma.analyticsSnapshot.upsert({
    where: { id: 1 },
    create: { id: 1, data: { ...analytics, finance } as Prisma.InputJsonValue },
    update: { data: { ...analytics, finance } as Prisma.InputJsonValue },
  })
}
