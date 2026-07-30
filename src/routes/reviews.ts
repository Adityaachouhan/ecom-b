import { Router } from 'express'
import { db } from '../store/db.js'
import { incrementReviewHelpful, saveFlaggedReview } from '../store/persist.js'
import { authenticate } from '../middleware/auth.js'
import { fail, generateId, success, todayISO } from '../utils/helpers.js'

const router = Router()

/** POST /api/reviews/:id/helpful */
router.post('/:id/helpful', authenticate, async (req, res, next) => {
  try {
    for (const product of db.products) {
      const review = product.reviews.find((r) => r.id === req.params.id)
      if (review) {
        review.helpful += 1
        await incrementReviewHelpful(review.id, review.helpful)
        res.json(success(review, 'Marked helpful'))
        return
      }
    }
    throw fail('Review not found', 404)
  } catch (e) {
    next(e)
  }
})

/** POST /api/reviews/:id/flag */
router.post('/:id/flag', authenticate, async (req, res, next) => {
  try {
    for (const product of db.products) {
      const review = product.reviews.find((r) => r.id === req.params.id)
      if (review) {
        const flagged = {
          id: generateId('rev'),
          productId: product.id,
          product: product.title,
          reviewer: review.userName,
          rating: review.rating,
          content: review.body,
          reason: req.body.reason || 'User report',
          date: todayISO(),
          status: 'pending' as const,
        }
        db.flaggedReviews.unshift(flagged)
        await saveFlaggedReview(flagged)
        res.status(201).json(success(flagged, 'Review flagged'))
        return
      }
    }
    throw fail('Review not found', 404)
  } catch (e) {
    next(e)
  }
})

export default router
