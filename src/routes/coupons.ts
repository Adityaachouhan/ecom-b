import { Router } from 'express'
import { db } from '../store/db.js'
import { authenticate } from '../middleware/auth.js'
import { fail, success } from '../utils/helpers.js'

const router = Router()

/** POST /api/coupons/validate */
router.post('/validate', authenticate, (req, res, next) => {
  try {
    const { code, subtotal = 0 } = req.body
    const coupon = db.coupons.find((c) => c.code.toUpperCase() === String(code || '').toUpperCase() && c.active)
    if (!coupon) throw fail('Invalid coupon code', 404)
    if (Number(subtotal) < coupon.minOrder) {
      throw fail(`Minimum order of ₹${coupon.minOrder} required`)
    }
    const discount =
      coupon.type === 'percent'
        ? Math.round((Number(subtotal) * coupon.value) / 100)
        : coupon.value
    res.json(
      success({
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        discount,
      })
    )
  } catch (e) {
    next(e)
  }
})

/** GET /api/coupons — list active (admin-facing via marketing too) */
router.get('/', authenticate, (_req, res) => {
  res.json(success(db.coupons.filter((c) => c.active)))
})

export default router
