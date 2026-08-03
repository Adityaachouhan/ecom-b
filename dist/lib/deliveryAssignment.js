import { db } from '../store/db.js';
import { saveDelivery, saveDeliveryEarning, saveDeliveryPartner, saveEscalation, saveOrder, } from '../store/persist.js';
import { sendNotification } from './notifications.js';
import { generateId, nowISO, todayISO } from '../utils/helpers.js';
const ACCEPT_TIMEOUT_MS = 5 * 60 * 1000;
const BASE_FEE = 40;
const DISTANCE_BONUS_PER_KM = 5;
const PEAK_BONUS = 15;
const PEAK_HOURS = [8, 9, 12, 13, 18, 19, 20];
const DEFAULT_HUB = { lat: 12.9716, lng: 77.5946 };
export { BASE_FEE, DISTANCE_BONUS_PER_KM, DEFAULT_HUB };
/** Rough own-fleet cost estimate (no partner required) for mixed-mode comparison. */
export function estimateOwnFleetRate(order) {
    // Drop pin: approximate from pincode digits; pickup at default hub
    const pin = order.shippingAddress?.pincode || '560001';
    const dropLat = DEFAULT_HUB.lat + ((Number(pin.slice(0, 3)) || 560) % 50) * 0.01 - 0.25;
    const dropLng = DEFAULT_HUB.lng + ((Number(pin.slice(2, 5)) || 1) % 50) * 0.01 - 0.25;
    const dist = haversineKm(DEFAULT_HUB.lat, DEFAULT_HUB.lng, dropLat, dropLng);
    const distanceBonus = Math.round(dist * DISTANCE_BONUS_PER_KM);
    return BASE_FEE + distanceBonus;
}
export function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function formatAddress(parts) {
    return [parts.line1, parts.line2, parts.city, parts.state, parts.pincode].filter(Boolean).join(', ');
}
function isSameDay(isoDate, day = todayISO()) {
    return isoDate.slice(0, 10) === day.slice(0, 10);
}
function availablePartners(excludeIds = []) {
    return db.deliveryPartners.filter((p) => p.availabilityStatus === 'online' &&
        p.kycStatus === 'approved' &&
        !excludeIds.includes(p.id));
}
function nearestPartner(lat, lng, excludeIds = []) {
    const candidates = availablePartners(excludeIds);
    if (!candidates.length)
        return null;
    return candidates
        .map((p) => ({
        partner: p,
        dist: haversineKm(lat, lng, p.currentLat ?? DEFAULT_HUB.lat, p.currentLng ?? DEFAULT_HUB.lng),
    }))
        .sort((a, b) => a.dist - b.dist)[0].partner;
}
function buildTrackingForOrder(status) {
    const steps = [
        { status: 'Order Placed', description: 'Order confirmed', key: 'pending' },
        { status: 'Confirmed', description: 'Seller confirmed', key: 'confirmed' },
        { status: 'Processing', description: 'Packing your order', key: 'processing' },
        { status: 'Shipped', description: 'Package handed to courier', key: 'shipped' },
        { status: 'Out for Delivery', description: 'Courier is nearby', key: 'out_for_delivery' },
        { status: 'Delivered', description: 'Delivered successfully', key: 'delivered' },
    ];
    const order = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'];
    const idx = order.indexOf(status);
    return steps.map((s, i) => ({
        status: s.status,
        description: s.description,
        timestamp: nowISO(),
        location: 'Bangalore Hub',
        isCompleted: idx >= 0 && i <= idx,
        isCurrent: idx === i,
    }));
}
async function notify(userId, eventType, data = {}) {
    await sendNotification(eventType, userId, data);
}
export function createDeliveryForOrder(order, opts) {
    const addr = order.shippingAddress;
    const dropAddress = addr
        ? formatAddress(addr)
        : formatAddress({
            line1: order.shippingLine1,
            line2: order.shippingLine2,
            city: order.shippingCity,
            state: order.shippingState,
            pincode: order.shippingPincode,
        });
    const sellerId = order.items?.[0]?.sellerId;
    const seller = sellerId ? db.sellers.find((s) => s.id === sellerId) : undefined;
    const pickupAddress = seller
        ? `${seller.name}, ${seller.city}, ${seller.state}`
        : 'Riviraa Seller Hub, Bangalore';
    const dropLat = DEFAULT_HUB.lat + (Math.random() - 0.5) * 0.08;
    const dropLng = DEFAULT_HUB.lng + (Math.random() - 0.5) * 0.08;
    const pickupLat = DEFAULT_HUB.lat + (Math.random() - 0.5) * 0.04;
    const pickupLng = DEFAULT_HUB.lng + (Math.random() - 0.5) * 0.04;
    const exclude = opts?.excludePartnerIds || [];
    const partner = nearestPartner(pickupLat, pickupLng, exclude);
    const paymentType = order.paymentMethod === 'cod' ? 'cod' : 'prepaid';
    const delivery = {
        id: generateId('dlvry'),
        orderId: order.id,
        deliveryPartnerId: partner?.id,
        pickupAddress,
        dropAddress: dropAddress || 'Customer address',
        pickupLat,
        pickupLng,
        dropLat,
        dropLng,
        packageType: 'medium',
        paymentType,
        codAmount: paymentType === 'cod' ? order.total : 0,
        status: partner ? 'assigned' : 'assigned',
        assignedAt: nowISO(),
        codSubmitted: false,
        triedPartnerIds: partner ? [partner.id, ...exclude] : [...exclude],
        reattemptOf: opts?.reattemptOf,
    };
    db.deliveries.unshift(delivery);
    void saveDelivery(delivery);
    if (partner) {
        void notify(partner.userId, 'delivery_assigned', {
            orderId: order.id,
            refId: delivery.id,
        });
    }
    return delivery;
}
export async function assignNearestPartner(order) {
    const existing = db.deliveries.find((d) => d.orderId === order.id && d.status !== 'failed' && d.status !== 'delivered');
    if (existing)
        return existing;
    return createDeliveryForOrder(order);
}
export async function reassignDelivery(delivery) {
    const exclude = [...(delivery.triedPartnerIds || [])];
    if (delivery.deliveryPartnerId)
        exclude.push(delivery.deliveryPartnerId);
    const partner = nearestPartner(delivery.pickupLat ?? DEFAULT_HUB.lat, delivery.pickupLng ?? DEFAULT_HUB.lng, exclude);
    if (!partner) {
        delivery.deliveryPartnerId = undefined;
        delivery.triedPartnerIds = exclude;
        await saveDelivery(delivery);
        return null;
    }
    delivery.deliveryPartnerId = partner.id;
    delivery.status = 'assigned';
    delivery.assignedAt = nowISO();
    delivery.acceptedAt = undefined;
    delivery.triedPartnerIds = [...new Set([...exclude, partner.id])];
    await saveDelivery(delivery);
    await notify(partner.userId, 'delivery_assigned', {
        orderId: delivery.orderId,
        refId: delivery.id,
        title: 'New delivery assigned',
        body: `Order ${delivery.orderId} reassigned to you. Accept within 5 minutes.`,
    });
    return delivery;
}
export async function checkAcceptanceTimeouts() {
    const now = Date.now();
    const timedOut = db.deliveries.filter((d) => d.status === 'assigned' &&
        d.deliveryPartnerId &&
        now - new Date(d.assignedAt).getTime() > ACCEPT_TIMEOUT_MS);
    for (const delivery of timedOut) {
        await reassignDelivery(delivery);
    }
}
function computeEarnings(delivery) {
    const dist = haversineKm(delivery.pickupLat ?? DEFAULT_HUB.lat, delivery.pickupLng ?? DEFAULT_HUB.lng, delivery.dropLat ?? DEFAULT_HUB.lat, delivery.dropLng ?? DEFAULT_HUB.lng);
    const distanceBonus = Math.round(dist * DISTANCE_BONUS_PER_KM);
    const hour = new Date().getHours();
    const peakBonus = PEAK_HOURS.includes(hour) ? PEAK_BONUS : 0;
    const baseFee = BASE_FEE;
    return { baseFee, distanceBonus, peakBonus, total: baseFee + distanceBonus + peakBonus };
}
export async function onDelivered(delivery) {
    const order = db.orders.find((o) => o.id === delivery.orderId);
    if (order) {
        order.status = 'delivered';
        order.deliveredAt = nowISO();
        order.trackingEvents = buildTrackingForOrder('delivered');
        await saveOrder(order);
        const { ensureSettlementsForOrder } = await import('./settlements.js');
        await ensureSettlementsForOrder(order);
        await notify(order.customerId, 'order_delivered', {
            orderId: order.id,
            refId: `${order.id}:customer`,
        });
        const sellerIds = [...new Set((order.items || []).map((i) => i.sellerId))];
        for (const sellerId of sellerIds) {
            const sellerAccount = db.accounts.find((a) => a.sellerId === sellerId || a.id === sellerId);
            if (sellerAccount) {
                await notify(sellerAccount.id, 'order_delivered', {
                    orderId: order.id,
                    refId: `${order.id}:seller:${sellerAccount.id}`,
                    title: 'Order delivered',
                    body: `Order ${order.id} was delivered.`,
                });
            }
        }
    }
    if (delivery.deliveryPartnerId) {
        const partner = db.deliveryPartners.find((p) => p.id === delivery.deliveryPartnerId);
        if (partner) {
            partner.totalDeliveries += 1;
            partner.consecutiveFailures = 0;
            await saveDeliveryPartner(partner);
            const fees = computeEarnings(delivery);
            const earning = {
                id: generateId('dearn'),
                deliveryPartnerId: partner.id,
                deliveryId: delivery.id,
                ...fees,
                payoutStatus: 'pending',
                createdAt: nowISO(),
            };
            db.deliveryEarnings.unshift(earning);
            await saveDeliveryEarning(earning);
            await notify(partner.userId, 'order_delivered', {
                orderId: delivery.orderId,
                amount: fees.total,
                refId: `${delivery.orderId}:partner:${partner.id}`,
                title: 'Delivery completed',
                body: `You earned ₹${fees.total} for order ${delivery.orderId}.`,
            });
        }
    }
}
export async function onFailed(delivery) {
    if (!delivery.deliveryPartnerId)
        return;
    const partner = db.deliveryPartners.find((p) => p.id === delivery.deliveryPartnerId);
    if (!partner)
        return;
    partner.consecutiveFailures += 1;
    await saveDeliveryPartner(partner);
    const failuresToday = db.deliveries.filter((d) => d.deliveryPartnerId === partner.id &&
        d.status === 'failed' &&
        isSameDay(d.deliveredAt || d.assignedAt)).length;
    if (partner.consecutiveFailures >= 3 || failuresToday >= 3) {
        const esc = {
            id: generateId('esc'),
            title: `Delivery partner flagged: ${partner.name}`,
            type: 'logistics',
            priority: 'high',
            status: 'open',
            raisedBy: 'system',
            assignedTo: 'mgr_001',
            createdAt: todayISO(),
            description: `${partner.name} has ${partner.consecutiveFailures} consecutive failed deliveries. Review required.`,
        };
        db.escalations.unshift(esc);
        await saveEscalation(esc);
    }
    const returnToSeller = ['damaged_in_transit', 'customer_refused'].includes(delivery.failureReason || '');
    const order = db.orders.find((o) => o.id === delivery.orderId);
    if (order) {
        if (returnToSeller) {
            await notify(order.customerId, 'order_failed_returned', {
                orderId: order.id,
                message: 'could not be delivered and will return to seller',
                refId: `${order.id}:failed`,
            });
            const sellerIds = [...new Set((order.items || []).map((i) => i.sellerId))];
            for (const sellerId of sellerIds) {
                const sellerAccount = db.accounts.find((a) => a.sellerId === sellerId || a.id === sellerId);
                if (sellerAccount) {
                    await notify(sellerAccount.id, 'order_failed_returned', {
                        orderId: order.id,
                        message: 'is being returned to seller',
                        refId: `${order.id}:failed:seller:${sellerAccount.id}`,
                    });
                }
            }
        }
        else {
            await notify(order.customerId, 'order_failed_returned', {
                orderId: order.id,
                message: 'could not be delivered. A reattempt is being scheduled',
                refId: `${order.id}:reattempt`,
            });
            createDeliveryForOrder(order, {
                reattemptOf: delivery.id,
                excludePartnerIds: delivery.triedPartnerIds,
            });
        }
    }
}
export function optimizeRoute(partner, deliveries) {
    const remaining = [...deliveries];
    const ordered = [];
    let lat = partner.currentLat ?? DEFAULT_HUB.lat;
    let lng = partner.currentLng ?? DEFAULT_HUB.lng;
    while (remaining.length) {
        remaining.sort((a, b) => haversineKm(lat, lng, a.dropLat ?? DEFAULT_HUB.lat, a.dropLng ?? DEFAULT_HUB.lng) -
            haversineKm(lat, lng, b.dropLat ?? DEFAULT_HUB.lat, b.dropLng ?? DEFAULT_HUB.lng));
        const next = remaining.shift();
        ordered.push(next);
        lat = next.dropLat ?? lat;
        lng = next.dropLng ?? lng;
    }
    return ordered;
}
export function startDeliveryScheduler() {
    setInterval(() => {
        void checkAcceptanceTimeouts().catch((err) => console.error('Delivery acceptance timeout check failed:', err));
    }, 30_000);
}
