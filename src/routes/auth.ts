import { Router } from 'express'
import { db } from '../store/db.js'
import { saveCustomer, saveUser } from '../store/persist.js'
import {
  ALL_ROLES,
  authenticate,
  requireSuperAdminOrigin,
  signToken,
  type AuthUser,
  type Role,
} from '../middleware/auth.js'
import { fail, generateId, success, todayISO } from '../utils/helpers.js'

const router = Router()

function toAuthUser(account: (typeof db.accounts)[0], extras?: Partial<AuthUser>): AuthUser {
  return {
    id: account.id,
    email: account.email,
    name: account.name,
    role: account.role,
    avatar: account.avatar,
    phone: account.phone,
    sellerId: account.sellerId,
    ...extras,
  }
}

function publicAccount(account: (typeof db.accounts)[0]) {
  const { password: _, otp: __, otpExpiresAt: ___, ...rest } = account
  return rest
}

function resolveSuperAdminAccount(reqUser: AuthUser) {
  const superAdminId = reqUser.impersonating ? reqUser.originalUserId : reqUser.id
  const account = db.accounts.find((a) => a.id === superAdminId && a.role === 'superadmin')
  if (!account) throw fail('Super Admin account not found', 404)
  return account
}

/** POST /api/auth/register */
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, phone, role = 'customer' } = req.body
    if (!name || !email || !password) throw fail('name, email, and password are required')
    if (db.accounts.find((a) => a.email.toLowerCase() === String(email).toLowerCase())) {
      throw fail('Email already registered', 409)
    }
    const allowed = ['customer', 'seller']
    if (!allowed.includes(role)) throw fail('Invalid role for registration')

    const id = role === 'seller' ? generateId('sel') : generateId('usr')
    const account = {
      id,
      email: String(email).toLowerCase(),
      password: String(password),
      name: String(name),
      role: role as 'customer' | 'seller',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
      phone,
      sellerId: role === 'seller' ? id : undefined,
      joinedAt: todayISO(),
      otp: String(Math.floor(100000 + Math.random() * 900000)),
      otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    }
    db.accounts.push(account)
    await saveUser(account)

    if (role === 'customer') {
      const customer = {
        id,
        name: account.name,
        email: account.email,
        phone: phone || '',
        avatar: account.avatar,
        city: '',
        state: '',
        joinedAt: account.joinedAt,
        lastOrderAt: '',
        totalOrders: 0,
        totalSpent: 0,
        status: 'active' as const,
        tier: 'bronze' as const,
        savedAddresses: 0,
        isVerified: false,
      }
      db.customers.push(customer)
      await saveCustomer(customer)
    }

    res.status(201).json(
      success(
        { user: publicAccount(account), otp: account.otp, requiresOtp: true },
        'Registered. Verify OTP to continue.'
      )
    )
  } catch (e) {
    next(e)
  }
})

/** POST /api/auth/login */
router.post('/login', (req, res, next) => {
  try {
    const { email, password, expectedRole } = req.body
    if (!email || !password) throw fail('email and password are required')
    const account = db.accounts.find((a) => a.email.toLowerCase() === String(email).toLowerCase())
    if (!account || account.password !== String(password)) throw fail('Invalid credentials', 401)

    if (expectedRole) {
      if (!ALL_ROLES.includes(expectedRole as Role)) throw fail('Invalid portal role', 400)
      if (account.role !== expectedRole) {
        throw fail(`This account cannot sign in through the ${expectedRole} portal`, 403)
      }
    }

    const user = toAuthUser(account)
    const token = signToken(user)
    res.json(success({ token, user }, 'Logged in'))
  } catch (e) {
    next(e)
  }
})

/** POST /api/auth/logout */
router.post('/logout', authenticate, (_req, res) => {
  res.json(success(null, 'Logged out'))
})

/** POST /api/auth/verify-otp */
router.post('/verify-otp', async (req, res, next) => {
  try {
    const { email, otp } = req.body
    const account = db.accounts.find((a) => a.email.toLowerCase() === String(email).toLowerCase())
    if (!account) throw fail('Account not found', 404)
    if (!account.otp || account.otp !== String(otp)) throw fail('Invalid OTP', 400)
    if (account.otpExpiresAt && new Date(account.otpExpiresAt) < new Date()) {
      throw fail('OTP expired', 400)
    }
    account.otp = undefined
    account.otpExpiresAt = undefined
    const customer = db.customers.find((c) => c.id === account.id)
    if (customer) customer.isVerified = true
    await saveUser(account)
    if (customer) await saveCustomer(customer)
    const user = toAuthUser(account)
    const token = signToken(user)
    res.json(success({ token, user }, 'OTP verified'))
  } catch (e) {
    next(e)
  }
})

/** POST /api/auth/resend-otp */
router.post('/resend-otp', async (req, res, next) => {
  try {
    const { email } = req.body
    const account = db.accounts.find((a) => a.email.toLowerCase() === String(email).toLowerCase())
    if (!account) throw fail('Account not found', 404)
    account.otp = String(Math.floor(100000 + Math.random() * 900000))
    account.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
    await saveUser(account)
    res.json(success({ otp: account.otp }, 'OTP resent'))
  } catch (e) {
    next(e)
  }
})

/** POST /api/auth/forgot-password */
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body
    const account = db.accounts.find((a) => a.email.toLowerCase() === String(email).toLowerCase())
    if (!account) throw fail('Account not found', 404)
    account.otp = String(Math.floor(100000 + Math.random() * 900000))
    account.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
    await saveUser(account)
    res.json(success({ otp: account.otp }, 'Password reset OTP sent'))
  } catch (e) {
    next(e)
  }
})

/** POST /api/auth/reset-password */
router.post('/reset-password', async (req, res, next) => {
  try {
    const { email, otp, password } = req.body
    const account = db.accounts.find((a) => a.email.toLowerCase() === String(email).toLowerCase())
    if (!account) throw fail('Account not found', 404)
    if (!account.otp || account.otp !== String(otp)) throw fail('Invalid OTP')
    account.password = String(password)
    account.otp = undefined
    account.otpExpiresAt = undefined
    await saveUser(account)
    res.json(success(null, 'Password reset successful'))
  } catch (e) {
    next(e)
  }
})

/** POST /api/auth/oauth/google | apple — demo stub (customer only) */
router.post('/oauth/:provider', async (req, res, next) => {
  try {
    const { provider } = req.params
    if (!['google', 'apple'].includes(provider)) throw fail('Unsupported provider')
    const email = req.body.email || `demo@${provider}.com`
    let account = db.accounts.find((a) => a.email === email)
    if (!account) {
      account = {
        id: generateId('usr'),
        email,
        password: generateId(),
        name: req.body.name || `${provider} User`,
        role: 'customer',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${provider}`,
        joinedAt: todayISO(),
      }
      db.accounts.push(account)
      await saveUser(account)
      const customer = {
        id: account.id,
        name: account.name,
        email: account.email,
        phone: '',
        avatar: account.avatar,
        city: '',
        state: '',
        joinedAt: account.joinedAt,
        lastOrderAt: '',
        totalOrders: 0,
        totalSpent: 0,
        status: 'active' as const,
        tier: 'bronze' as const,
        savedAddresses: 0,
        isVerified: true,
      }
      db.customers.push(customer)
      await saveCustomer(customer)
    }
    if (account.role !== 'customer') {
      throw fail('This account cannot sign in through the customer portal', 403)
    }
    const user = toAuthUser(account)
    res.json(success({ token: signToken(user), user }, `Signed in with ${provider}`))
  } catch (e) {
    next(e)
  }
})

/** GET /api/auth/me */
router.get('/me', authenticate, (req, res, next) => {
  try {
    const account = db.accounts.find((a) => a.id === req.user!.id)
    if (!account) throw fail('User not found', 404)
    res.json(
      success({
        ...publicAccount(account),
        impersonating: Boolean(req.user!.impersonating),
        originalUserId: req.user!.originalUserId,
        originalRole: req.user!.originalRole,
      })
    )
  } catch (e) {
    next(e)
  }
})

/**
 * POST /api/auth/impersonate
 * Super Admin only — switch effective role by minting a token for a demo account of that role,
 * while retaining the original Super Admin identity for auditing / return.
 */
router.post('/impersonate', authenticate, requireSuperAdminOrigin, (req, res, next) => {
  try {
    const role = req.body.role as Role
    if (!role || !ALL_ROLES.includes(role)) throw fail('Valid role is required', 400)

    const superAdmin = resolveSuperAdminAccount(req.user!)

    if (role === 'superadmin') {
      const user = toAuthUser(superAdmin)
      const token = signToken(user)
      return res.json(success({ token, user, impersonating: false }, 'Returned to Super Admin'))
    }

    const target = db.accounts.find((a) => a.role === role)
    if (!target) throw fail(`No account found for role ${role}`, 404)

    const user = toAuthUser(target, {
      impersonating: true,
      originalUserId: superAdmin.id,
      originalRole: 'superadmin',
    })
    const token = signToken(user)
    res.json(success({ token, user, impersonating: true }, `Now viewing as ${role}`))
  } catch (e) {
    next(e)
  }
})

/** POST /api/auth/stop-impersonate — return to genuine Super Admin session */
router.post('/stop-impersonate', authenticate, requireSuperAdminOrigin, (req, res, next) => {
  try {
    if (!req.user!.impersonating) {
      throw fail('Not currently impersonating', 400)
    }
    const superAdmin = resolveSuperAdminAccount(req.user!)
    const user = toAuthUser(superAdmin)
    const token = signToken(user)
    res.json(success({ token, user, impersonating: false }, 'Returned to Super Admin'))
  } catch (e) {
    next(e)
  }
})

export default router
