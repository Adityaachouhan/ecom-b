import '../src/lib/env.js'
import { PrismaClient, Role, type Prisma } from '@prisma/client'
import { products as seedProducts } from '../src/data/products.js'
import { orders as seedOrders } from '../src/data/orders.js'
import { customers as seedCustomers } from '../src/data/users.js'
import { sellers as seedSellers } from '../src/data/sellers.js'
import { categories as seedCategories } from '../src/data/categories.js'
import * as analyticsSeed from '../src/data/analytics.js'

const prisma = new PrismaClient()
const DEFAULT_PASSWORD = 'password123'

function normalizeSellerId(id: string): string {
  if (id.startsWith('sel_')) return id
  const m = id.match(/^s0*(\d+)$/)
  if (m) return `sel_${m[1].padStart(3, '0')}`
  return id
}

function toDate(value?: string | null): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

async function main() {
  console.log('Seeding database...')

  // Clear in dependency order
  await prisma.orderItem.deleteMany()
  await prisma.returnRequest.deleteMany()
  await prisma.order.deleteMany()
  await prisma.cartItem.deleteMany()
  await prisma.wishlistItem.deleteMany()
  await prisma.review.deleteMany()
  await prisma.productVariant.deleteMany()
  await prisma.product.deleteMany()
  await prisma.subcategory.deleteMany()
  await prisma.category.deleteMany()
  await prisma.payout.deleteMany()
  await prisma.ad.deleteMany()
  await prisma.campaign.deleteMany()
  await prisma.address.deleteMany()
  await prisma.paymentMethod.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.flaggedReview.deleteMany()
  await prisma.flaggedProduct.deleteMany()
  await prisma.escalation.deleteMany()
  await prisma.approval.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.teamMember.deleteMany()
  await prisma.alert.deleteMany()
  await prisma.coupon.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.seller.deleteMany()
  await prisma.user.deleteMany()
  await prisma.moderationStats.deleteMany()
  await prisma.platformConfig.deleteMany()
  await prisma.analyticsSnapshot.deleteMany()

  // Staff + demo accounts
  const staff = [
    { id: 'usr_001', email: 'priya.sharma@email.com', name: 'Priya Sharma', role: Role.customer, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya', phone: '+91 98765 43210', joinedAt: '2023-06-15' },
    { id: 'sel_001', email: 'rahul@electronics.in', name: 'Rahul Electronics', role: Role.seller, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul', phone: '+91 91234 56789', sellerId: 'sel_001', joinedAt: '2022-11-20' },
    { id: 'mgr_001', email: 'anita.verma@marketplace.com', name: 'Anita Verma', role: Role.manager, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anita', phone: '+91 90000 11111', joinedAt: '2021-08-01' },
    { id: 'adm_001', email: 'vikram.singh@marketplace.com', name: 'Vikram Singh', role: Role.admin, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Vikram', phone: '+91 88000 99999', joinedAt: '2020-03-15' },
    { id: 'sad_001', email: 'root@marketplace.com', name: 'CEO Root', role: Role.superadmin, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Root', phone: '+91 80000 00001', joinedAt: '2019-01-01' },
  ]

  for (const u of staff) {
    await prisma.user.create({
      data: {
        id: u.id,
        email: u.email,
        password: DEFAULT_PASSWORD,
        name: u.name,
        role: u.role,
        avatar: u.avatar,
        phone: u.phone,
        sellerId: 'sellerId' in u ? u.sellerId : undefined,
        joinedAt: toDate(u.joinedAt) || new Date(),
      },
    })
  }

  // Sellers first (products depend on them)
  for (const s of seedSellers) {
    await prisma.seller.create({
      data: {
        id: s.id,
        name: s.name,
        ownerName: s.ownerName,
        email: s.email,
        phone: s.phone,
        avatar: s.avatar,
        gstNumber: s.gstNumber,
        panNumber: s.panNumber,
        category: s.category,
        city: s.city,
        state: s.state,
        rating: s.rating,
        reviewCount: s.reviewCount,
        totalProducts: s.totalProducts,
        totalOrders: s.totalOrders,
        totalRevenue: s.totalRevenue,
        pendingPayouts: s.pendingPayouts,
        status: s.status,
        commissionRate: s.commissionRate,
        joinedAt: toDate(s.joinedAt) || new Date(),
        lastActive: toDate(s.lastActive) || new Date(),
        bankName: s.bankAccount.bankName,
        bankAccountNumber: s.bankAccount.accountNumber,
        bankIfsc: s.bankAccount.ifsc,
        performanceScore: s.performanceScore,
        returnRate: s.returnRate,
        cancellationRate: s.cancellationRate,
      },
    })
  }

  // Customers + matching users (skip usr_001 already created)
  for (const c of seedCustomers) {
    if (c.id !== 'usr_001') {
      await prisma.user.create({
        data: {
          id: c.id,
          email: c.email,
          password: DEFAULT_PASSWORD,
          name: c.name,
          role: Role.customer,
          avatar: c.avatar,
          phone: c.phone,
          joinedAt: toDate(c.joinedAt) || new Date(),
        },
      })
    }
    await prisma.customer.create({
      data: {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        avatar: c.avatar,
        city: c.city,
        state: c.state,
        joinedAt: toDate(c.joinedAt) || new Date(),
        lastOrderAt: toDate(c.lastOrderAt),
        totalOrders: c.totalOrders,
        totalSpent: c.totalSpent,
        status: c.status,
        tier: c.tier,
        savedAddresses: c.savedAddresses,
        isVerified: Boolean(c.isVerified),
      },
    })
  }

  // Categories
  for (const cat of seedCategories) {
    await prisma.category.create({
      data: {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        color: cat.color,
        bgColor: cat.bgColor,
        image: cat.image,
        productCount: cat.productCount,
        subcategories: {
          create: cat.subcategories.map((sub) => ({
            id: sub.id,
            name: sub.name,
            slug: sub.slug,
            productCount: sub.productCount,
          })),
        },
      },
    })
  }

  // Products
  for (const p of seedProducts) {
    const sellerId = normalizeSellerId(p.sellerId)
    const seller = await prisma.seller.findUnique({ where: { id: sellerId } })
    if (!seller) {
      console.warn(`Skipping product ${p.id} — seller ${sellerId} missing`)
      continue
    }
    await prisma.product.create({
      data: {
        id: p.id,
        title: p.title,
        description: p.description,
        category: p.category,
        subcategory: p.subcategory,
        brand: p.brand,
        images: p.images,
        price: p.price,
        discount: p.discount,
        stock: p.stock,
        sellerId,
        sellerName: p.sellerName,
        sellerRating: p.sellerRating,
        rating: p.rating,
        reviewCount: p.reviewCount,
        tags: p.tags,
        isFeatured: p.isFeatured,
        isTrending: p.isTrending,
        isNewArrival: p.isNewArrival,
        deliveryDays: p.deliveryDays,
        specifications: p.specifications as Prisma.InputJsonValue,
        weight: p.weight,
        warranty: p.warranty,
        variants: {
          create: p.variants.map((v) => ({
            id: `${p.id}_${v.id}`,
            type: v.type,
            label: v.label,
            value: v.value,
            stock: v.stock,
            priceModifier: v.priceModifier,
          })),
        },
        reviews: {
          create: p.reviews.map((r, idx) => ({
            id: `${p.id}_${r.id || `rev${idx}`}`,
            userId: r.userId,
            userName: r.userName,
            rating: r.rating,
            title: r.title,
            body: r.body,
            date: toDate(r.date) || new Date(),
            helpful: r.helpful,
            verified: r.verified,
          })),
        },
      },
    })
  }

  // Orders
  for (const o of seedOrders) {
    const customer = await prisma.user.findUnique({ where: { id: o.customerId } })
    if (!customer) {
      console.warn(`Skipping order ${o.id} — customer ${o.customerId} missing`)
      continue
    }
    const items = []
    for (const item of o.items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } })
      if (!product) {
        console.warn(`Skipping item ${item.productId} on ${o.id}`)
        continue
      }
      items.push({
        productId: item.productId,
        productName: item.productName,
        image: item.image,
        quantity: item.quantity,
        price: item.price,
        sellerId: normalizeSellerId(item.sellerId),
        sellerName: item.sellerName,
        variant: item.variant,
        size: item.size,
      })
    }
    if (!items.length) continue

    await prisma.order.create({
      data: {
        id: o.id,
        customerId: o.customerId,
        customerName: o.customerName,
        status: o.status,
        shippingName: o.shippingAddress.name,
        shippingPhone: o.shippingAddress.phone,
        shippingLine1: o.shippingAddress.line1,
        shippingLine2: o.shippingAddress.line2,
        shippingCity: o.shippingAddress.city,
        shippingState: o.shippingAddress.state,
        shippingPincode: o.shippingAddress.pincode,
        shippingType: o.shippingAddress.type,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        subtotal: o.subtotal,
        discount: o.discount,
        deliveryFee: o.deliveryFee,
        total: o.total,
        couponCode: o.couponCode,
        orderedAt: toDate(o.orderedAt) || new Date(),
        estimatedDelivery: toDate(o.estimatedDelivery),
        deliveredAt: toDate(o.deliveredAt),
        trackingId: o.trackingId,
        trackingEvents: o.trackingEvents as unknown as Prisma.InputJsonValue,
        items: { create: items },
      },
    })
  }

  await prisma.address.createMany({
    data: [
      {
        id: 'addr_001',
        userId: 'usr_001',
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
        userId: 'usr_001',
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
  })

  await prisma.paymentMethod.createMany({
    data: [
      { id: 'pm_001', userId: 'usr_001', type: 'upi', label: 'priya@upi', isDefault: true },
      { id: 'pm_002', userId: 'usr_001', type: 'card', label: 'HDFC ****4242', last4: '4242', isDefault: false },
    ],
  })

  await prisma.coupon.createMany({
    data: [
      { code: 'SAVE10', type: 'percent', value: 10, minOrder: 500, active: true },
      { code: 'FLAT200', type: 'flat', value: 200, minOrder: 999, active: true },
      { code: 'WELCOME15', type: 'percent', value: 15, minOrder: 1000, active: true },
    ],
  })

  await prisma.flaggedReview.createMany({
    data: [
      { id: 'rev_001', productId: 'p001', product: 'iPhone 15 Pro Max', reviewer: 'user_xyz', rating: 1, content: 'This product is fake! Complete fraud. Do not buy from this seller.', reason: 'Inappropriate language', date: new Date('2024-06-28'), status: 'pending' },
      { id: 'rev_002', productId: 'p002', product: 'Sony WH-1000XM5', reviewer: 'angry_buyer', rating: 1, content: 'My competitor told me to write this review to harm their sales', reason: 'Suspected fake review', date: new Date('2024-06-27'), status: 'pending' },
      { id: 'rev_003', productId: 'p010', product: 'Nike Air Max 270', reviewer: 'shopper_99', rating: 5, content: 'Best product ever! Visit my website for more deals: spam.com', reason: 'Spam/promotional content', date: new Date('2024-06-26'), status: 'pending' },
      { id: 'rev_004', productId: 'p018', product: 'Himalaya Face Wash', reviewer: 'review_bot_12', rating: 5, content: 'Amazing product amazing product amazing amazing five stars', reason: 'Bot-generated content', date: new Date('2024-06-25'), status: 'reviewing' },
      { id: 'rev_005', productId: 'p012', product: "Levi's 511 Jeans", reviewer: 'troll_user', rating: 2, content: 'Off-topic personal attack content', reason: 'Off-topic content', date: new Date('2024-06-24'), status: 'approved' },
      { id: 'rev_006', productId: 'p003', product: 'Samsung Galaxy S24', reviewer: 'fake_acc_44', rating: 1, content: 'Worst ever! seller fraud!', reason: 'Unverified claim', date: new Date('2024-06-23'), status: 'rejected' },
    ],
  })

  await prisma.flaggedProduct.createMany({
    data: [
      { id: 'prd_f01', product: 'Cheap iPhone Clone 15', seller: 'FastDeals99', reason: 'Counterfeit / brand impersonation', category: 'Electronics', price: 2999, date: new Date('2024-06-29'), status: 'pending' },
      { id: 'prd_f02', product: 'Generic Headphones XM5 Pro', seller: 'AliDeals', reason: 'Misleading title', category: 'Electronics', price: 499, date: new Date('2024-06-28'), status: 'pending' },
      { id: 'prd_f03', product: 'Weight Loss Pills 100% Guaranteed', seller: 'HealthKing', reason: 'Unverified health claims', category: 'Health', price: 1299, date: new Date('2024-06-27'), status: 'reviewing' },
      { id: 'prd_f04', product: 'Fake Designer Bag LV Style', seller: 'LuxuryReplica', reason: 'Trademark infringement', category: 'Fashion', price: 799, date: new Date('2024-06-26'), status: 'removed' },
      { id: 'prd_f05', product: 'Expired Skin Cream Bundle', seller: 'BeautyHub', reason: 'Expired product listing', category: 'Beauty', price: 349, date: new Date('2024-06-25'), status: 'removed' },
    ],
  })

  await prisma.moderationStats.create({ data: { id: 1, approvedToday: 12, removedToday: 4 } })

  await prisma.escalation.createMany({
    data: [
      { id: 'esc_001', title: 'Seller payout dispute', type: 'finance', priority: 'high', status: 'open', raisedBy: 'sel_002', assignedTo: 'mgr_001', createdAt: new Date('2024-06-28'), description: 'Seller claims missing payout for May cycle' },
      { id: 'esc_002', title: 'Counterfeit listing report', type: 'compliance', priority: 'critical', status: 'in_progress', raisedBy: 'usr_003', assignedTo: 'mgr_001', createdAt: new Date('2024-06-27'), description: 'Customer reported fake branded goods' },
      { id: 'esc_003', title: 'Delivery SLA breach', type: 'logistics', priority: 'medium', status: 'open', raisedBy: 'sel_001', assignedTo: 'mgr_001', createdAt: new Date('2024-06-26'), description: '3 orders delayed beyond promised ETA' },
      { id: 'esc_004', title: 'Refund loop', type: 'support', priority: 'low', status: 'resolved', raisedBy: 'usr_007', assignedTo: 'mgr_001', createdAt: new Date('2024-06-20'), description: 'Customer received duplicate refund' },
    ],
  })

  await prisma.approval.createMany({
    data: [
      { id: 'appr_001', type: 'seller_onboarding', title: 'Approve new seller: TechNest', submittedBy: 'TechNest', status: 'pending', createdAt: new Date('2024-06-29'), details: 'GST and bank docs uploaded' },
      { id: 'appr_002', type: 'product', title: 'New category: Smart Home', submittedBy: 'adm_001', status: 'pending', createdAt: new Date('2024-06-28'), details: 'Request to add Smart Home subcategory' },
      { id: 'appr_003', type: 'campaign', title: 'Monsoon Sale 20%', submittedBy: 'sel_001', status: 'pending', createdAt: new Date('2024-06-27'), details: 'Platform-wide promotion request' },
      { id: 'appr_004', type: 'payout', title: 'Manual payout override', submittedBy: 'sel_003', status: 'approved', createdAt: new Date('2024-06-25'), details: 'Emergency payout approved' },
    ],
  })

  await prisma.campaign.createMany({
    data: [
      { id: 'camp_001', name: 'Monsoon Mega Sale', type: 'platform', status: 'active', discount: 20, startDate: new Date('2024-06-01'), endDate: new Date('2024-07-15'), budget: 500000, spent: 182000 },
      { id: 'camp_002', name: 'Electronics Flash', type: 'category', status: 'active', discount: 15, startDate: new Date('2024-06-20'), endDate: new Date('2024-07-05'), budget: 200000, spent: 89000 },
      { id: 'camp_003', name: 'Seller Spotlight', type: 'seller', status: 'paused', discount: 10, startDate: new Date('2024-05-01'), endDate: new Date('2024-08-01'), budget: 50000, spent: 12000, sellerId: 'sel_001' },
      { id: 'camp_004', name: 'New User Welcome', type: 'coupon', status: 'ended', discount: 15, startDate: new Date('2024-01-01'), endDate: new Date('2024-05-31'), budget: 100000, spent: 98000 },
    ],
  })

  await prisma.ad.createMany({
    data: [
      {
        id: 'ad_home_top_1',
        image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&q=90',
        title: 'Weekend fashion edit',
        link: '/products?deals=true',
        placement: 'HOME_TOP_BANNER',
        startDate: new Date('2024-06-01'),
        endDate: new Date('2027-12-31'),
        status: 'active',
        displayOrder: 0,
      },
      {
        id: 'ad_home_primary_1',
        image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=1100&q=90',
        title: 'All-day power phones',
        link: '/products?category=electronics',
        placement: 'HOME_PRIMARY_RAIL',
        startDate: new Date('2024-06-01'),
        endDate: new Date('2027-12-31'),
        status: 'active',
        displayOrder: 0,
      },
      {
        id: 'ad_home_compact_1',
        image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=700&q=85',
        title: 'Everyday beauty picks',
        link: '/products?category=beauty',
        placement: 'HOME_COMPACT_RAIL',
        startDate: new Date('2024-06-01'),
        endDate: new Date('2027-12-31'),
        status: 'active',
        displayOrder: 0,
      },
      {
        id: 'ad_home_brand_1',
        image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=700&q=85',
        title: 'Discover premium brands',
        link: '/products',
        placement: 'HOME_BRAND_SHOWCASE',
        startDate: new Date('2024-06-01'),
        endDate: new Date('2027-12-31'),
        status: 'active',
        displayOrder: 0,
      },
      {
        id: 'ad_home_category_1',
        image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=900&q=85',
        title: 'Offers across electronics',
        link: '/products?category=electronics',
        placement: 'HOME_CATEGORY_GRID',
        startDate: new Date('2024-06-01'),
        endDate: new Date('2027-12-31'),
        status: 'active',
        displayOrder: 0,
      },
    ],
  })

  // Returns — only if order exists
  const order1 = await prisma.order.findUnique({ where: { id: 'ORD-2024-001' } })
  if (order1) {
    await prisma.returnRequest.create({
      data: {
        id: 'ret_001',
        orderId: 'ORD-2024-001',
        productName: 'Apple iPhone 15 Pro Max',
        reason: 'Defective screen',
        status: 'pending',
        sellerId: 'sel_001',
        customerName: 'Priya Sharma',
        amount: 134900,
        createdAt: new Date('2024-06-10'),
      },
    })
  }

  await prisma.payout.createMany({
    data: [
      { id: 'pay_001', sellerId: 'sel_001', amount: 145000, status: 'pending', period: '2024-06' },
      { id: 'pay_002', sellerId: 'sel_001', amount: 128000, status: 'paid', period: '2024-05', paidAt: new Date('2024-06-05') },
      { id: 'pay_003', sellerId: 'sel_001', amount: 112000, status: 'paid', period: '2024-04', paidAt: new Date('2024-05-05') },
    ],
  })

  await prisma.auditLog.createMany({
    data: [
      { id: 'aud_001', actor: 'root@marketplace.com', action: 'UPDATE_CONFIG', resource: 'platform', details: 'Updated commission default to 12%', timestamp: new Date('2024-06-29T10:00:00Z'), ip: '10.0.0.1' },
      { id: 'aud_002', actor: 'vikram.singh@marketplace.com', action: 'SUSPEND_SELLER', resource: 'sel_008', details: 'Suspended for policy violation', timestamp: new Date('2024-06-28T14:22:00Z') },
      { id: 'aud_003', actor: 'anita.verma@marketplace.com', action: 'RESOLVE_ESCALATION', resource: 'esc_004', details: 'Closed refund loop ticket', timestamp: new Date('2024-06-27T09:15:00Z') },
      { id: 'aud_004', actor: 'vikram.singh@marketplace.com', action: 'APPROVE_PRODUCT', resource: 'p015', details: 'Catalog approval', timestamp: new Date('2024-06-26T16:40:00Z') },
    ],
  })

  await prisma.teamMember.createMany({
    data: [
      { id: 'team_001', name: 'CEO Root', email: 'root@marketplace.com', role: Role.superadmin, status: 'active', permissions: ['*'], joinedAt: new Date('2019-01-01') },
      { id: 'team_002', name: 'Vikram Singh', email: 'vikram.singh@marketplace.com', role: Role.admin, status: 'active', permissions: ['users', 'sellers', 'catalog', 'orders', 'moderation', 'marketing'], joinedAt: new Date('2020-03-15') },
      { id: 'team_003', name: 'Anita Verma', email: 'anita.verma@marketplace.com', role: Role.manager, status: 'active', permissions: ['sellers', 'escalations', 'approvals', 'inventory'], joinedAt: new Date('2021-08-01') },
    ],
  })

  await prisma.alert.createMany({
    data: [
      { id: 'alert_001', title: 'High return rate spike', severity: 'warning', status: 'open', createdAt: new Date('2024-06-29'), message: 'Fashion category returns up 18% WoW' },
      { id: 'alert_002', title: 'Payment gateway latency', severity: 'critical', status: 'acknowledged', createdAt: new Date('2024-06-28'), message: 'UPI success rate dropped below 95%' },
      { id: 'alert_003', title: 'Seller onboarding backlog', severity: 'info', status: 'open', createdAt: new Date('2024-06-27'), message: '42 sellers awaiting KYC review' },
    ],
  })

  await prisma.notification.createMany({
    data: [
      { id: 'notif_001', userId: 'usr_001', title: 'Order shipped', body: 'Your order ORD-2024-001 is on the way', read: false, type: 'order' },
      { id: 'notif_002', userId: 'sel_001', title: 'New order', body: 'You received a new order', read: false, type: 'order' },
      { id: 'notif_003', userId: 'adm_001', title: 'Moderation queue', body: '6 items pending review', read: true, type: 'moderation' },
    ],
  })

  await prisma.platformConfig.create({
    data: {
      id: 1,
      siteName: 'Uniqora',
      supportEmail: 'support@uniqora.com',
      defaultCommission: 12,
      minPayoutAmount: 1000,
      freeShippingThreshold: 499,
      codEnabled: true,
      maxCartItems: 50,
      maintenanceMode: false,
      otpExpiryMinutes: 10,
      returnWindowDays: 7,
    },
  })

  await prisma.analyticsSnapshot.create({
    data: {
      id: 1,
      data: {
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
      } as unknown as Prisma.InputJsonValue,
    },
  })

  const counts = {
    users: await prisma.user.count(),
    products: await prisma.product.count(),
    orders: await prisma.order.count(),
    sellers: await prisma.seller.count(),
    categories: await prisma.category.count(),
  }
  console.log('Seed complete:', counts)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
