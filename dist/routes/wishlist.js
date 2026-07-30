import { Router } from 'express';
import { db } from '../store/db.js';
import { saveWishlistAdd, saveWishlistRemove } from '../store/persist.js';
import { authenticate } from '../middleware/auth.js';
import { fail, success } from '../utils/helpers.js';
const router = Router();
function getWishlist(userId) {
    if (!db.wishlists[userId])
        db.wishlists[userId] = [];
    return db.wishlists[userId];
}
router.use(authenticate);
/** GET /api/wishlist */
router.get('/', (req, res) => {
    const ids = getWishlist(req.user.id);
    const products = ids.map((id) => db.products.find((p) => p.id === id)).filter(Boolean);
    res.json(success(products));
});
/** POST /api/wishlist/:productId */
router.post('/:productId', async (req, res, next) => {
    try {
        const product = db.products.find((p) => p.id === req.params.productId);
        if (!product)
            throw fail('Product not found', 404);
        const list = getWishlist(req.user.id);
        if (!list.includes(product.id))
            list.push(product.id);
        await saveWishlistAdd(req.user.id, product.id);
        res.status(201).json(success(product, 'Added to wishlist'));
    }
    catch (e) {
        next(e);
    }
});
/** DELETE /api/wishlist/:productId */
router.delete('/:productId', async (req, res, next) => {
    try {
        const list = getWishlist(req.user.id);
        db.wishlists[req.user.id] = list.filter((id) => id !== req.params.productId);
        await saveWishlistRemove(req.user.id, req.params.productId);
        res.json(success(null, 'Removed from wishlist'));
    }
    catch (e) {
        next(e);
    }
});
export default router;
