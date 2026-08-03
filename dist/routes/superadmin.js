import { Router } from 'express';
import { db, logAudit } from '../store/db.js';
import { saveAlert, savePlatformConfig, savePayout, saveTeamMember } from '../store/persist.js';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { fail, generateId, paginate, success, todayISO } from '../utils/helpers.js';
const router = Router();
router.use(authenticate, requireRoles('superadmin'));
/** Team */
router.get('/team', (_req, res) => {
    res.json(success(db.team));
});
router.post('/team', async (req, res, next) => {
    try {
        const { name, email, role, permissions } = req.body;
        if (!name || !email || !role)
            throw fail('name, email, role required');
        const member = {
            id: generateId('team'),
            name,
            email,
            role,
            status: 'active',
            permissions: permissions || [],
            joinedAt: todayISO(),
        };
        db.team.push(member);
        await saveTeamMember(member);
        logAudit(req.user.email, 'ADD_TEAM_MEMBER', member.id, email);
        res.status(201).json(success(member, 'Team member added'));
    }
    catch (e) {
        next(e);
    }
});
router.patch('/team/:id/permissions', async (req, res, next) => {
    try {
        const member = db.team.find((t) => t.id === req.params.id);
        if (!member)
            throw fail('Team member not found', 404);
        member.permissions = req.body.permissions || member.permissions;
        if (req.body.role)
            member.role = req.body.role;
        if (req.body.status)
            member.status = req.body.status;
        await saveTeamMember(member);
        res.json(success(member, 'Permissions updated'));
    }
    catch (e) {
        next(e);
    }
});
/** Config */
router.get('/config', (_req, res) => {
    res.json(success(db.platformConfig));
});
router.patch('/config', async (req, res, next) => {
    try {
        db.platformConfig = { ...db.platformConfig, ...req.body };
        await savePlatformConfig(db.platformConfig);
        logAudit(req.user.email, 'UPDATE_CONFIG', 'platform', JSON.stringify(req.body));
        res.json(success(db.platformConfig, 'Config updated'));
    }
    catch (e) {
        next(e);
    }
});
/** Audit */
router.get('/audit-logs', (req, res) => {
    res.json(success(paginate(db.auditLogs, Number(req.query.page), Number(req.query.limit || 50))));
});
/** Finance */
router.get('/finance/pl', (_req, res) => {
    res.json(success(db.finance.pl));
});
router.get('/finance/payouts', (_req, res) => {
    res.json(success({ summary: db.finance.payoutsSummary, payouts: db.payouts }));
});
/** PATCH /api/superadmin/finance/payouts/:id — mark payout paid (Feature 4 trigger) */
router.patch('/finance/payouts/:id', async (req, res, next) => {
    try {
        const payout = db.payouts.find((p) => p.id === req.params.id);
        if (!payout)
            throw fail('Payout not found', 404);
        if (req.body.status)
            payout.status = req.body.status;
        if (payout.status === 'paid') {
            payout.paidAt = payout.paidAt || new Date().toISOString().slice(0, 10);
            const { sendNotification } = await import('../lib/notifications.js');
            const sellerAccount = db.accounts.find((a) => a.sellerId === payout.sellerId || a.id === payout.sellerId);
            if (sellerAccount) {
                await sendNotification('payout_processed', sellerAccount.id, {
                    amount: payout.amount,
                    period: payout.period,
                    refId: payout.id,
                });
            }
        }
        await savePayout(payout);
        logAudit(req.user.email, 'UPDATE_PAYOUT', payout.id, `Status → ${payout.status}`);
        res.json(success(payout, 'Payout updated'));
    }
    catch (e) {
        next(e);
    }
});
/** Alerts */
router.get('/alerts', (req, res) => {
    let list = [...db.alerts];
    if (req.query.status)
        list = list.filter((a) => a.status === req.query.status);
    res.json(success(list));
});
router.patch('/alerts/:id', async (req, res, next) => {
    try {
        const alert = db.alerts.find((a) => a.id === req.params.id);
        if (!alert)
            throw fail('Alert not found', 404);
        if (req.body.action === 'acknowledge')
            alert.status = 'acknowledged';
        else if (req.body.action === 'resolve')
            alert.status = 'resolved';
        else
            Object.assign(alert, req.body);
        await saveAlert(alert);
        res.json(success(alert, 'Alert updated'));
    }
    catch (e) {
        next(e);
    }
});
/** Regions */
router.get('/regions', (_req, res) => {
    res.json(success(db.analytics.regionalSales));
});
export default router;
