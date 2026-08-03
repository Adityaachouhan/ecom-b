import { db, normalizeSellerId } from '../store/db.js';
import { saveSeller, saveSellerSettlement } from '../store/persist.js';
import { generateId, nowISO, todayISO } from '../utils/helpers.js';
import { sendNotification } from './notifications.js';
function commissionRateFor(sellerId) {
    const seller = db.sellers.find((s) => normalizeSellerId(s.id) === normalizeSellerId(sellerId));
    if (seller?.commissionRate != null)
        return Number(seller.commissionRate);
    return Number(db.platformConfig.defaultCommission ?? 12);
}
function hasBlockingReturn(orderId, sellerId) {
    return db.returns.some((r) => r.orderId === orderId &&
        normalizeSellerId(r.sellerId) === normalizeSellerId(sellerId) &&
        (r.status === 'pending' || r.status === 'approved'));
}
/** Create pending settlements for each seller on a delivered order (idempotent). */
export async function ensureSettlementsForOrder(order) {
    const items = order.items || [];
    if (!items.length)
        return;
    const bySeller = new Map();
    for (const item of items) {
        const sid = normalizeSellerId(item.sellerId);
        const line = Number(item.price) * Number(item.quantity);
        bySeller.set(sid, (bySeller.get(sid) || 0) + line);
    }
    for (const [sellerId, orderAmount] of bySeller) {
        const existing = db.settlements.find((s) => s.orderId === order.id && normalizeSellerId(s.sellerId) === sellerId);
        if (existing)
            continue;
        const rate = commissionRateFor(sellerId);
        const commissionAmount = Math.round(orderAmount * (rate / 100) * 100) / 100;
        const netAmount = Math.round((orderAmount - commissionAmount) * 100) / 100;
        const settlement = {
            id: generateId('stl'),
            sellerId,
            orderId: order.id,
            orderDate: order.orderedAt || nowISO(),
            orderAmount,
            commissionRate: rate,
            commissionAmount,
            netAmount,
            status: 'pending',
            createdAt: nowISO(),
        };
        db.settlements.unshift(settlement);
        await saveSellerSettlement(settlement);
        const seller = db.sellers.find((s) => normalizeSellerId(s.id) === sellerId);
        if (seller) {
            seller.pendingPayouts = Math.round((Number(seller.pendingPayouts) + netAmount) * 100) / 100;
            await saveSeller(seller);
        }
    }
}
async function advancePendingToProcessing() {
    const windowDays = Number(db.platformConfig.returnWindowDays ?? 7);
    const cutoffMs = Date.now() - windowDays * 24 * 60 * 60 * 1000;
    for (const settlement of db.settlements) {
        if (settlement.status !== 'pending')
            continue;
        const order = db.orders.find((o) => o.id === settlement.orderId);
        const deliveredAt = order?.deliveredAt || settlement.createdAt;
        if (!deliveredAt)
            continue;
        if (new Date(deliveredAt).getTime() > cutoffMs)
            continue;
        if (hasBlockingReturn(settlement.orderId, settlement.sellerId))
            continue;
        settlement.status = 'processing';
        await saveSellerSettlement(settlement);
    }
}
async function processPayoutBatches() {
    const minAmount = Number(db.platformConfig.minPayoutAmount ?? 1000);
    const bySeller = new Map();
    for (const s of db.settlements) {
        if (s.status !== 'processing')
            continue;
        const sid = normalizeSellerId(s.sellerId);
        const list = bySeller.get(sid) || [];
        list.push(s);
        bySeller.set(sid, list);
    }
    for (const [sellerId, rows] of bySeller) {
        const totalNet = rows.reduce((sum, r) => sum + Number(r.netAmount), 0);
        if (totalNet < minAmount)
            continue;
        const payoutDate = todayISO();
        for (const row of rows) {
            row.status = 'paid';
            row.payoutDate = payoutDate;
            await saveSellerSettlement(row);
        }
        const seller = db.sellers.find((s) => normalizeSellerId(s.id) === sellerId);
        if (seller) {
            seller.pendingPayouts = Math.max(0, Math.round((Number(seller.pendingPayouts) - totalNet) * 100) / 100);
            await saveSeller(seller);
        }
        const sellerAccount = db.accounts.find((a) => (a.sellerId && normalizeSellerId(a.sellerId) === sellerId) || a.id === sellerId);
        if (sellerAccount) {
            await sendNotification('payout_processed', sellerAccount.id, {
                amount: totalNet,
                period: payoutDate,
                refId: `settlement-batch:${sellerId}:${payoutDate}`,
            });
        }
    }
}
export async function runSettlementJobs() {
    await advancePendingToProcessing();
    await processPayoutBatches();
}
export function startSettlementScheduler() {
    setInterval(() => {
        void runSettlementJobs().catch((err) => console.error('Settlement job failed:', err));
    }, 30_000);
}
export function settlementSummaryForSeller(sellerId) {
    const sid = normalizeSellerId(sellerId);
    const list = db.settlements.filter((s) => normalizeSellerId(s.sellerId) === sid);
    const sum = (status) => list.filter((s) => s.status === status).reduce((acc, s) => acc + Number(s.netAmount), 0);
    const commissionTotal = list.reduce((acc, s) => acc + Number(s.commissionAmount), 0);
    return {
        pending: sum('pending'),
        processing: sum('processing'),
        paid: sum('paid'),
        commissionTotal,
        pendingPayouts: sum('pending') + sum('processing'),
    };
}
