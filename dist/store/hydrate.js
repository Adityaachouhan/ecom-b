import { prisma } from '../lib/prisma.js';
function iso(d) {
    if (!d)
        return '';
    return new Date(d).toISOString();
}
function dateOnly(d) {
    if (!d)
        return '';
    return new Date(d).toISOString().slice(0, 10);
}
/** Load all tables from PostgreSQL into the in-memory store shape used by routes. */
export async function hydrateFromDatabase(target) {
    const [users, customers, sellers, categories, products, orders, addresses, paymentMethods, cartItems, wishlistItems, coupons, flaggedReviews, flaggedProducts, moderationStats, escalations, approvals, campaigns, ads, returns, payouts, auditLogs, team, alerts, notifications, platformConfig, analyticsSnapshot,] = await Promise.all([
        prisma.user.findMany(),
        prisma.customer.findMany(),
        prisma.seller.findMany(),
        prisma.category.findMany({ include: { subcategories: true } }),
        prisma.product.findMany({ include: { variants: true, reviews: true } }),
        prisma.order.findMany({ include: { items: true } }),
        prisma.address.findMany(),
        prisma.paymentMethod.findMany(),
        prisma.cartItem.findMany(),
        prisma.wishlistItem.findMany(),
        prisma.coupon.findMany(),
        prisma.flaggedReview.findMany(),
        prisma.flaggedProduct.findMany(),
        prisma.moderationStats.findUnique({ where: { id: 1 } }),
        prisma.escalation.findMany(),
        prisma.approval.findMany(),
        prisma.campaign.findMany(),
        prisma.ad.findMany(),
        prisma.returnRequest.findMany(),
        prisma.payout.findMany(),
        prisma.auditLog.findMany({ orderBy: { timestamp: 'desc' } }),
        prisma.teamMember.findMany(),
        prisma.alert.findMany(),
        prisma.notification.findMany(),
        prisma.platformConfig.findUnique({ where: { id: 1 } }),
        prisma.analyticsSnapshot.findUnique({ where: { id: 1 } }),
    ]);
    target.accounts.splice(0, target.accounts.length, ...users.map((u) => ({
        id: u.id,
        email: u.email,
        password: u.password,
        name: u.name,
        role: u.role,
        avatar: u.avatar || '',
        phone: u.phone || undefined,
        sellerId: u.sellerId || undefined,
        otp: u.otp || undefined,
        otpExpiresAt: u.otpExpiresAt ? iso(u.otpExpiresAt) : undefined,
        joinedAt: dateOnly(u.joinedAt),
    })));
    target.customers.splice(0, target.customers.length, ...customers.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        avatar: c.avatar,
        city: c.city,
        state: c.state,
        joinedAt: dateOnly(c.joinedAt),
        lastOrderAt: dateOnly(c.lastOrderAt),
        totalOrders: c.totalOrders,
        totalSpent: c.totalSpent,
        status: c.status,
        tier: c.tier,
        savedAddresses: c.savedAddresses,
        isVerified: c.isVerified,
    })));
    target.sellers.splice(0, target.sellers.length, ...sellers.map((s) => ({
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
        joinedAt: dateOnly(s.joinedAt),
        lastActive: dateOnly(s.lastActive),
        bankAccount: {
            bankName: s.bankName,
            accountNumber: s.bankAccountNumber,
            ifsc: s.bankIfsc,
        },
        performanceScore: s.performanceScore,
        returnRate: s.returnRate,
        cancellationRate: s.cancellationRate,
    })));
    target.categories.splice(0, target.categories.length, ...categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        icon: c.icon,
        color: c.color,
        bgColor: c.bgColor,
        image: c.image,
        productCount: c.productCount,
        subcategories: c.subcategories.map((sub) => ({
            id: sub.id,
            name: sub.name,
            slug: sub.slug,
            productCount: sub.productCount,
        })),
    })));
    target.products.splice(0, target.products.length, ...products.map((p) => {
        const variants = p.variants.map((v) => ({
            id: v.id.includes('_') ? v.id.split('_').slice(1).join('_') : v.id,
            type: v.type,
            label: v.label,
            value: v.value,
            stock: v.stock,
            priceModifier: v.priceModifier ?? undefined,
            color: v.type === 'color' ? v.label : undefined,
            colorHex: v.type === 'color' ? v.value : undefined,
        }));
        return {
            id: p.id,
            title: p.title,
            name: p.title,
            description: p.description,
            category: p.category,
            subcategory: p.subcategory,
            brand: p.brand,
            images: p.images,
            price: p.price,
            originalPrice: p.price,
            discount: p.discount,
            stock: p.stock,
            stockCount: p.stock,
            inStock: p.stock > 0,
            isNewArrival: p.isNewArrival,
            sellerId: p.sellerId,
            sellerName: p.sellerName,
            sellerRating: p.sellerRating,
            rating: p.rating,
            reviewCount: p.reviewCount,
            tags: p.tags,
            variants,
            sizes: variants.filter((v) => v.type === 'size').map((v) => v.label),
            reviews: p.reviews.map((r) => ({
                id: r.id,
                userId: r.userId,
                userName: r.userName,
                rating: r.rating,
                title: r.title,
                body: r.body,
                date: dateOnly(r.date),
                helpful: r.helpful,
                verified: r.verified,
            })),
            isFeatured: p.isFeatured,
            isTrending: p.isTrending,
            deliveryDays: p.deliveryDays,
            specifications: p.specifications || {},
            weight: p.weight ?? undefined,
            warranty: p.warranty ?? undefined,
        };
    }));
    target.orders.splice(0, target.orders.length, ...orders.map((o) => ({
        id: o.id,
        customerId: o.customerId,
        customerName: o.customerName,
        items: o.items.map((i) => ({
            productId: i.productId,
            productName: i.productName,
            image: i.image,
            quantity: i.quantity,
            price: i.price,
            sellerId: i.sellerId,
            sellerName: i.sellerName,
            variant: i.variant ?? undefined,
            size: i.size ?? undefined,
        })),
        status: o.status,
        shippingAddress: {
            name: o.shippingName,
            phone: o.shippingPhone,
            line1: o.shippingLine1,
            line2: o.shippingLine2 ?? undefined,
            city: o.shippingCity,
            state: o.shippingState,
            pincode: o.shippingPincode,
            type: o.shippingType,
        },
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        subtotal: o.subtotal,
        discount: o.discount,
        deliveryFee: o.deliveryFee,
        total: o.total,
        couponCode: o.couponCode ?? undefined,
        orderedAt: iso(o.orderedAt),
        estimatedDelivery: dateOnly(o.estimatedDelivery),
        deliveredAt: o.deliveredAt ? iso(o.deliveredAt) : undefined,
        trackingId: o.trackingId ?? undefined,
        trackingEvents: o.trackingEvents || [],
    })));
    // Clear and rebuild maps
    for (const key of Object.keys(target.carts))
        delete target.carts[key];
    for (const key of Object.keys(target.wishlists))
        delete target.wishlists[key];
    for (const key of Object.keys(target.addresses))
        delete target.addresses[key];
    for (const key of Object.keys(target.paymentMethods))
        delete target.paymentMethods[key];
    for (const item of cartItems) {
        if (!target.carts[item.userId])
            target.carts[item.userId] = [];
        target.carts[item.userId].push({
            productId: item.productId,
            quantity: item.quantity,
            variantId: item.variantId || undefined,
            size: item.size || undefined,
        });
    }
    for (const item of wishlistItems) {
        if (!target.wishlists[item.userId])
            target.wishlists[item.userId] = [];
        target.wishlists[item.userId].push(item.productId);
    }
    for (const a of addresses) {
        if (!target.addresses[a.userId])
            target.addresses[a.userId] = [];
        target.addresses[a.userId].push({
            id: a.id,
            name: a.name,
            phone: a.phone,
            line1: a.line1,
            line2: a.line2 ?? undefined,
            city: a.city,
            state: a.state,
            pincode: a.pincode,
            type: a.type,
            isDefault: a.isDefault,
        });
    }
    for (const pm of paymentMethods) {
        if (!target.paymentMethods[pm.userId])
            target.paymentMethods[pm.userId] = [];
        target.paymentMethods[pm.userId].push({
            id: pm.id,
            userId: pm.userId,
            type: pm.type,
            label: pm.label,
            last4: pm.last4 ?? undefined,
            isDefault: pm.isDefault,
        });
    }
    target.coupons.splice(0, target.coupons.length, ...coupons.map((c) => ({
        code: c.code,
        type: c.type,
        value: c.value,
        minOrder: c.minOrder,
        active: c.active,
    })));
    target.flaggedReviews.splice(0, target.flaggedReviews.length, ...flaggedReviews.map((r) => ({
        id: r.id,
        productId: r.productId || undefined,
        product: r.product,
        reviewer: r.reviewer,
        rating: r.rating,
        content: r.content,
        reason: r.reason,
        date: dateOnly(r.date),
        status: r.status,
    })));
    target.flaggedProducts.splice(0, target.flaggedProducts.length, ...flaggedProducts.map((p) => ({
        id: p.id,
        productId: p.productId || undefined,
        product: p.product,
        seller: p.seller,
        reason: p.reason,
        category: p.category,
        price: p.price,
        date: dateOnly(p.date),
        status: p.status,
    })));
    target.moderationStats.approvedToday = moderationStats?.approvedToday ?? 0;
    target.moderationStats.removedToday = moderationStats?.removedToday ?? 0;
    target.escalations.splice(0, target.escalations.length, ...escalations.map((e) => ({
        id: e.id,
        title: e.title,
        type: e.type,
        priority: e.priority,
        status: e.status,
        raisedBy: e.raisedBy,
        assignedTo: e.assignedTo,
        createdAt: dateOnly(e.createdAt),
        description: e.description,
    })));
    target.approvals.splice(0, target.approvals.length, ...approvals.map((a) => ({
        id: a.id,
        type: a.type,
        title: a.title,
        submittedBy: a.submittedBy,
        status: a.status,
        createdAt: dateOnly(a.createdAt),
        details: a.details,
    })));
    target.campaigns.splice(0, target.campaigns.length, ...campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        status: c.status,
        discount: c.discount,
        startDate: dateOnly(c.startDate),
        endDate: dateOnly(c.endDate),
        budget: c.budget ?? undefined,
        spent: c.spent,
        sellerId: c.sellerId ?? undefined,
    })));
    target.ads.splice(0, target.ads.length, ...ads.map((ad) => ({
        id: ad.id,
        image: ad.image,
        title: ad.title,
        link: ad.link,
        placement: ad.placement,
        startDate: dateOnly(ad.startDate),
        endDate: dateOnly(ad.endDate),
        status: ad.status,
        displayOrder: ad.displayOrder,
    })));
    target.returns.splice(0, target.returns.length, ...returns.map((r) => ({
        id: r.id,
        orderId: r.orderId,
        productName: r.productName,
        reason: r.reason,
        status: r.status,
        sellerId: r.sellerId,
        customerName: r.customerName,
        amount: r.amount,
        createdAt: dateOnly(r.createdAt),
    })));
    target.payouts.splice(0, target.payouts.length, ...payouts.map((p) => ({
        id: p.id,
        sellerId: p.sellerId,
        amount: p.amount,
        status: p.status,
        period: p.period,
        paidAt: p.paidAt ? dateOnly(p.paidAt) : undefined,
    })));
    target.auditLogs.splice(0, target.auditLogs.length, ...auditLogs.map((a) => ({
        id: a.id,
        actor: a.actor,
        action: a.action,
        resource: a.resource,
        details: a.details,
        timestamp: iso(a.timestamp),
        ip: a.ip ?? undefined,
    })));
    target.team.splice(0, target.team.length, ...team.map((t) => ({
        id: t.id,
        name: t.name,
        email: t.email,
        role: t.role,
        status: t.status,
        permissions: t.permissions,
        joinedAt: dateOnly(t.joinedAt),
    })));
    target.alerts.splice(0, target.alerts.length, ...alerts.map((a) => ({
        id: a.id,
        title: a.title,
        severity: a.severity,
        status: a.status,
        createdAt: dateOnly(a.createdAt),
        message: a.message,
    })));
    target.notifications.splice(0, target.notifications.length, ...notifications.map((n) => ({
        id: n.id,
        userId: n.userId,
        title: n.title,
        body: n.body,
        read: n.read,
        createdAt: iso(n.createdAt),
        type: n.type,
    })));
    if (platformConfig) {
        Object.assign(target.platformConfig, {
            siteName: platformConfig.siteName === 'Atmosphere' ? 'Uniqora' : platformConfig.siteName,
            supportEmail: platformConfig.supportEmail === 'support@atmosphere.in'
                ? 'support@uniqora.com'
                : platformConfig.supportEmail,
            defaultCommission: platformConfig.defaultCommission,
            minPayoutAmount: platformConfig.minPayoutAmount,
            freeShippingThreshold: platformConfig.freeShippingThreshold,
            codEnabled: platformConfig.codEnabled,
            maxCartItems: platformConfig.maxCartItems,
            maintenanceMode: platformConfig.maintenanceMode,
            otpExpiryMinutes: platformConfig.otpExpiryMinutes,
            returnWindowDays: platformConfig.returnWindowDays,
        });
    }
    if (analyticsSnapshot?.data && typeof analyticsSnapshot.data === 'object') {
        const data = analyticsSnapshot.data;
        const { finance, ...analytics } = data;
        Object.assign(target.analytics, analytics);
        if (finance && typeof finance === 'object') {
            Object.assign(target.finance, finance);
        }
    }
    return {
        users: users.length,
        products: products.length,
        orders: orders.length,
        sellers: sellers.length,
    };
}
