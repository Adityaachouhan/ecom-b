import { Router } from 'express';
import { db } from '../store/db.js';
import { markNotificationsRead, saveNotification } from '../store/persist.js';
import { authenticate } from '../middleware/auth.js';
import { fail, success } from '../utils/helpers.js';
const router = Router();
router.use(authenticate);
/** GET /api/notifications */
router.get('/', (req, res) => {
    const list = db.notifications.filter((n) => n.userId === req.user.id);
    res.json(success(list));
});
/** PATCH /api/notifications/read-all — must be before /:id/read */
router.patch('/read-all', async (req, res, next) => {
    try {
        db.notifications.filter((n) => n.userId === req.user.id).forEach((n) => (n.read = true));
        await markNotificationsRead(req.user.id);
        res.json(success(null, 'All notifications marked read'));
    }
    catch (e) {
        next(e);
    }
});
/** PATCH /api/notifications/:id/read */
router.patch('/:id/read', async (req, res, next) => {
    try {
        const notif = db.notifications.find((n) => n.id === req.params.id && n.userId === req.user.id);
        if (!notif)
            throw fail('Notification not found', 404);
        notif.read = true;
        await saveNotification(notif);
        res.json(success(notif));
    }
    catch (e) {
        next(e);
    }
});
export default router;
