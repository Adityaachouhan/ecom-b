import { Router } from 'express'
import { db } from '../store/db.js'
import { fail, nowISO, success } from '../utils/helpers.js'

const router = Router()

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** POST /api/newsletter/subscribe */
router.post('/subscribe', (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase()
    if (!EMAIL_RE.test(email)) throw fail('Enter a valid email address', 422)

    const alreadySubscribed = db.newsletterSubscribers.some((s) => s.email === email)
    if (alreadySubscribed) {
      res.json(success({ email, alreadySubscribed: true }, "You're already on the list"))
      return
    }

    db.newsletterSubscribers.push({ email, subscribedAt: nowISO() })
    res.status(201).json(success({ email, alreadySubscribed: false }, 'Thanks, check your inbox!'))
  } catch (e) {
    next(e)
  }
})

export default router
