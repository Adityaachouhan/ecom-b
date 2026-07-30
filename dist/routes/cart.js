import { Router } from 'express';
import { db } from '../store/db.js';
import { clearCart, saveCart } from '../store/persist.js';
import { authenticate } from '../middleware/auth.js';
import { fail, success } from '../utils/helpers.js';
const router = Router();
function getCart(userId) {
    if (!db.carts[userId])
        db.carts[userId] = [];
    return db.carts[userId];
}
function enrichCart(userId) {
    const items = getCart(userId);
    const enriched = items
        .map((item) => {
        const product = db.products.find((p) => p.id === item.productId);
        if (!product)
            return null;
        const unitPrice = Math.round(product.price * (1 - product.discount / 100));
        return {
            ...item,
            product,
            unitPrice,
            lineTotal: unitPrice * item.quantity,
        };
    })
        .filter(Boolean);
    const subtotal = enriched.reduce((s, i) => s + i.lineTotal, 0);
    return { items: enriched, subtotal, itemCount: enriched.reduce((s, i) => s + i.quantity, 0) };
}
router.use(authenticate);
/** GET /api/cart */
router.get('/', (req, res) => {
    res.json(success(enrichCart(req.user.id)));
});
/** POST /api/cart/items */
router.post('/items', async (req, res, next) => {
    try {
        const { productId, quantity = 1, variantId, size } = req.body;
        if (!productId)
            throw fail('productId is required');
        const product = db.products.find((p) => p.id === productId);
        if (!product)
            throw fail('Product not found', 404);
        const cart = getCart(req.user.id);
        const existing = cart.find((i) => i.productId === productId && i.variantId === variantId && i.size === size);
        if (existing)
            existing.quantity += Number(quantity);
        else
            cart.push({ productId, quantity: Number(quantity), variantId, size });
        await saveCart(req.user.id, cart);
        res.status(201).json(success(enrichCart(req.user.id), 'Item added'));
    }
    catch (e) {
        next(e);
    }
});
/** PATCH /api/cart/items/:productId */
router.patch('/items/:productId', async (req, res, next) => {
    try {
        const cart = getCart(req.user.id);
        const item = cart.find((i) => i.productId === req.params.productId);
        if (!item)
            throw fail('Cart item not found', 404);
        if (req.body.quantity !== undefined) {
            const qty = Number(req.body.quantity);
            if (qty <= 0) {
                db.carts[req.user.id] = cart.filter((i) => i.productId !== req.params.productId);
            }
            else {
                item.quantity = qty;
            }
        }
        if (req.body.variantId !== undefined)
            item.variantId = req.body.variantId;
        if (req.body.size !== undefined)
            item.size = req.body.size;
        await saveCart(req.user.id, getCart(req.user.id));
        res.json(success(enrichCart(req.user.id), 'Cart updated'));
    }
    catch (e) {
        next(e);
    }
});
/** DELETE /api/cart/items/:productId */
router.delete('/items/:productId', async (req, res, next) => {
    try {
        const cart = getCart(req.user.id);
        db.carts[req.user.id] = cart.filter((i) => i.productId !== req.params.productId);
        await saveCart(req.user.id, db.carts[req.user.id]);
        res.json(success(enrichCart(req.user.id), 'Item removed'));
    }
    catch (e) {
        next(e);
    }
});
/** DELETE /api/cart */
router.delete('/', async (req, res, next) => {
    try {
        db.carts[req.user.id] = [];
        await clearCart(req.user.id);
        res.json(success(enrichCart(req.user.id), 'Cart cleared'));
    }
    catch (e) {
        next(e);
    }
});
export default router;
