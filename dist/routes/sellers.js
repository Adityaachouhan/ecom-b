import { Router } from 'express';
import { db, logAudit, sellerMatches } from '../store/db.js';
import { saveApproval, saveCampaign, saveReturn, saveSeller, saveUser, } from '../store/persist.js';
import { authenticate, requireRoles, adminRoles, staffRoles } from '../middleware/auth.js';
import { fail, generateId, paginate, success, todayISO } from '../utils/helpers.js';
import { settlementSummaryForSeller } from '../lib/settlements.js';
const router = Router();
/** POST /api/sellers/onboarding */
router.post('/onboarding', authenticate, async (req, res, next) => {
    try {
        const body = req.body;
        if (!body.name || !body.email || !body.gstNumber)
            throw fail('name, email, gstNumber required');
        const id = req.user.sellerId || (req.user.id.startsWith('sel_') ? req.user.id : generateId('sel'));
        const existing = db.sellers.find((s) => s.id === id || s.email === body.email);
        if (existing) {
            Object.assign(existing, {
                ...body,
                status: 'pending',
                bankAccount: body.bankAccount || existing.bankAccount,
            });
            await saveSeller(existing);
            res.json(success(existing, 'Onboarding updated'));
            return;
        }
        const seller = {
            id,
            name: body.name,
            ownerName: body.ownerName || req.user.name,
            email: body.email,
            phone: body.phone || '',
            avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(body.name)}`,
            gstNumber: body.gstNumber,
            panNumber: body.panNumber || '',
            category: body.category || [],
            city: body.city || '',
            state: body.state || '',
            rating: 0,
            reviewCount: 0,
            totalProducts: 0,
            totalOrders: 0,
            totalRevenue: 0,
            pendingPayouts: 0,
            status: 'pending',
            commissionRate: db.platformConfig.defaultCommission,
            joinedAt: todayISO(),
            lastActive: todayISO(),
            bankAccount: body.bankAccount || { bankName: '', accountNumber: '', ifsc: '' },
            performanceScore: 0,
            returnRate: 0,
            cancellationRate: 0,
        };
        db.sellers.push(seller);
        await saveSeller(seller);
        const account = db.accounts.find((a) => a.id === req.user.id);
        if (account) {
            account.role = 'seller';
            account.sellerId = id;
            await saveUser(account);
        }
        const approval = {
            id: generateId('appr'),
            type: 'seller_onboarding',
            title: `Approve new seller: ${seller.name}`,
            submittedBy: seller.name,
            status: 'pending',
            createdAt: todayISO(),
            details: 'KYC submitted via onboarding',
        };
        db.approvals.unshift(approval);
        await saveApproval(approval);
        res.status(201).json(success(seller, 'Onboarding submitted'));
    }
    catch (e) {
        next(e);
    }
});
router.use(authenticate);
/** GET /api/sellers/me */
router.get('/me', requireRoles('seller', ...adminRoles), (req, res, next) => {
    try {
        const sid = req.user.sellerId || req.user.id;
        const seller = db.sellers.find((s) => s.id === sid);
        if (!seller)
            throw fail('Seller profile not found', 404);
        res.json(success(seller));
    }
    catch (e) {
        next(e);
    }
});
/** PATCH /api/sellers/me */
router.patch('/me', requireRoles('seller'), async (req, res, next) => {
    try {
        const sid = req.user.sellerId || req.user.id;
        const idx = db.sellers.findIndex((s) => s.id === sid);
        if (idx === -1)
            throw fail('Seller not found', 404);
        const { bankAccount, ...rest } = req.body;
        db.sellers[idx] = {
            ...db.sellers[idx],
            ...rest,
            id: db.sellers[idx].id,
            bankAccount: bankAccount ? { ...db.sellers[idx].bankAccount, ...bankAccount } : db.sellers[idx].bankAccount,
        };
        await saveSeller(db.sellers[idx]);
        res.json(success(db.sellers[idx], 'Seller profile updated'));
    }
    catch (e) {
        next(e);
    }
});
router.patch('/me/bank', requireRoles('seller'), async (req, res, next) => {
    try {
        const sid = req.user.sellerId || req.user.id;
        const seller = db.sellers.find((s) => s.id === sid);
        if (!seller)
            throw fail('Seller not found', 404);
        seller.bankAccount = { ...seller.bankAccount, ...req.body };
        await saveSeller(seller);
        res.json(success(seller.bankAccount, 'Bank details updated'));
    }
    catch (e) {
        next(e);
    }
});
router.patch('/me/shipping', requireRoles('seller'), async (req, res, next) => {
    try {
        const sid = req.user.sellerId || req.user.id;
        const seller = db.sellers.find((s) => s.id === sid);
        if (!seller)
            throw fail('Seller not found', 404);
        const body = req.body || {};
        seller.shippingSettings = {
            freeShippingAbove: Number(body.freeShippingAbove ?? seller.shippingSettings?.freeShippingAbove ?? 499),
            standardFee: Number(body.standardFee ?? seller.shippingSettings?.standardFee ?? 40),
            expressFee: Number(body.expressFee ?? seller.shippingSettings?.expressFee ?? 99),
            processingDays: Number(body.processingDays ?? seller.shippingSettings?.processingDays ?? 1),
        };
        await saveSeller(seller);
        res.json(success(seller.shippingSettings, 'Shipping settings saved'));
    }
    catch (e) {
        next(e);
    }
});
/** Seller products */
router.get('/me/products', requireRoles('seller'), (req, res) => {
    const sid = req.user.sellerId || req.user.id;
    const list = db.products.filter((p) => sellerMatches(p.sellerId, sid));
    res.json(success(paginate(list, Number(req.query.page), Number(req.query.limit))));
});
/** Seller orders */
router.get('/me/orders', requireRoles('seller'), (req, res) => {
    const sid = req.user.sellerId || req.user.id;
    let list = db.orders.filter((o) => o.items.some((i) => sellerMatches(i.sellerId, sid)));
    if (req.query.status)
        list = list.filter((o) => o.status === req.query.status);
    res.json(success(paginate(list, Number(req.query.page), Number(req.query.limit))));
});
/** Seller reviews */
router.get('/me/reviews', requireRoles('seller'), (req, res) => {
    const sid = req.user.sellerId || req.user.id;
    const reviews = db.products
        .filter((p) => sellerMatches(p.sellerId, sid))
        .flatMap((p) => p.reviews.map((r) => ({ ...r, productId: p.id, productTitle: p.title })));
    res.json(success(paginate(reviews, Number(req.query.page), Number(req.query.limit))));
});
router.post('/me/reviews/:id/reply', requireRoles('seller'), (req, res, next) => {
    try {
        const { reply } = req.body;
        if (!reply)
            throw fail('reply is required');
        res.json(success({ reviewId: req.params.id, reply }, 'Reply posted'));
    }
    catch (e) {
        next(e);
    }
});
/** Seller returns */
router.get('/me/returns', requireRoles('seller'), (req, res) => {
    const sid = req.user.sellerId || req.user.id;
    const list = db.returns.filter((r) => sellerMatches(r.sellerId, sid));
    res.json(success(paginate(list, Number(req.query.page), Number(req.query.limit))));
});
router.patch('/me/returns/:id', requireRoles('seller'), async (req, res, next) => {
    try {
        const ret = db.returns.find((r) => r.id === req.params.id);
        if (!ret)
            throw fail('Return not found', 404);
        const sid = req.user.sellerId || req.user.id;
        if (!sellerMatches(ret.sellerId, sid))
            throw fail('Forbidden', 403);
        const action = req.body.action || req.body.status;
        if (action === 'approve' || action === 'approved')
            ret.status = 'approved';
        else if (action === 'reject' || action === 'rejected')
            ret.status = 'rejected';
        else if (action === 'refunded')
            ret.status = 'refunded';
        await saveReturn(ret);
        res.json(success(ret, 'Return updated'));
    }
    catch (e) {
        next(e);
    }
});
/** Seller earnings / payouts */
router.get('/me/earnings', requireRoles('seller'), (req, res) => {
    const sid = req.user.sellerId || req.user.id;
    const seller = db.sellers.find((s) => s.id === sid);
    const summary = settlementSummaryForSeller(sid);
    const hasSettlements = db.settlements.some((s) => s.sellerId === sid);
    res.json(success({
        totalRevenue: seller?.totalRevenue || 0,
        pendingPayouts: hasSettlements ? summary.pendingPayouts : seller?.pendingPayouts || 0,
        commissionPaid: summary.commissionTotal,
        settlementSummary: summary,
        timeline: db.analytics.earningsTimeline,
        performance: db.analytics.sellerPerformance,
    }));
});
router.get('/me/payouts', requireRoles('seller'), (req, res) => {
    const sid = req.user.sellerId || req.user.id;
    const list = db.payouts.filter((p) => p.sellerId === sid);
    res.json(success(list));
});
router.get('/me/settlements', requireRoles('seller'), (req, res) => {
    const sid = req.user.sellerId || req.user.id;
    const list = db.settlements
        .filter((s) => s.sellerId === sid)
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    res.json(success({ settlements: list, summary: settlementSummaryForSeller(sid) }));
});
/** Seller campaigns */
router.get('/me/campaigns', requireRoles('seller'), (req, res) => {
    const sid = req.user.sellerId || req.user.id;
    const list = db.campaigns.filter((c) => !c.sellerId || c.sellerId === sid);
    res.json(success(list));
});
router.post('/me/campaigns', requireRoles('seller'), async (req, res, next) => {
    try {
        const sid = req.user.sellerId || req.user.id;
        const camp = {
            id: generateId('camp'),
            name: req.body.name,
            type: req.body.type || 'seller',
            status: 'draft',
            discount: Number(req.body.discount || 10),
            startDate: req.body.startDate || todayISO(),
            endDate: req.body.endDate || todayISO(),
            budget: req.body.budget,
            spent: 0,
            sellerId: sid,
        };
        if (!camp.name)
            throw fail('name is required');
        db.campaigns.push(camp);
        await saveCampaign(camp);
        res.status(201).json(success(camp, 'Campaign created'));
    }
    catch (e) {
        next(e);
    }
});
router.patch('/me/campaigns/:id', requireRoles('seller'), async (req, res, next) => {
    try {
        const sid = req.user.sellerId || req.user.id;
        const idx = db.campaigns.findIndex((c) => c.id === req.params.id && c.sellerId === sid);
        if (idx === -1)
            throw fail('Campaign not found', 404);
        db.campaigns[idx] = { ...db.campaigns[idx], ...req.body, id: db.campaigns[idx].id, sellerId: sid };
        await saveCampaign(db.campaigns[idx]);
        res.json(success(db.campaigns[idx], 'Campaign updated'));
    }
    catch (e) {
        next(e);
    }
});
/** Admin / manager list */
router.get('/', requireRoles(...staffRoles, ...adminRoles), (req, res) => {
    let list = [...db.sellers];
    const { status, search, page, limit } = req.query;
    if (status)
        list = list.filter((s) => s.status === status);
    if (search) {
        const q = String(search).toLowerCase();
        list = list.filter((s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q));
    }
    res.json(success(paginate(list, Number(page), Number(limit))));
});
router.get('/:id', requireRoles(...staffRoles, ...adminRoles), (req, res, next) => {
    try {
        const seller = db.sellers.find((s) => s.id === req.params.id);
        if (!seller)
            throw fail('Seller not found', 404);
        res.json(success(seller));
    }
    catch (e) {
        next(e);
    }
});
router.patch('/:id', requireRoles(...adminRoles, 'manager'), async (req, res, next) => {
    try {
        const idx = db.sellers.findIndex((s) => s.id === req.params.id);
        if (idx === -1)
            throw fail('Seller not found', 404);
        const action = req.body.action;
        if (action === 'approve')
            db.sellers[idx].status = 'active';
        else if (action === 'suspend')
            db.sellers[idx].status = 'suspended';
        else
            db.sellers[idx] = { ...db.sellers[idx], ...req.body, id: db.sellers[idx].id };
        await saveSeller(db.sellers[idx]);
        logAudit(req.user.email, 'UPDATE_SELLER', String(req.params.id), action || 'patch');
        res.json(success(db.sellers[idx], 'Seller updated'));
    }
    catch (e) {
        next(e);
    }
});
router.post('/invite', requireRoles(...adminRoles), (req, res, next) => {
    try {
        const { email, name } = req.body;
        if (!email)
            throw fail('email is required');
        res.status(201).json(success({ email, name, inviteSent: true }, 'Invite sent'));
    }
    catch (e) {
        next(e);
    }
});
export default router;
