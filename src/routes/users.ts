import { Router } from 'express'
import { db, logAudit, type Address, type PaymentMethod } from '../store/db.js'
import {
  deleteAddress,
  deletePaymentMethod,
  saveAddress,
  saveAddressesDefaults,
  saveCustomer,
  savePaymentMethod,
  saveUser,
} from '../store/persist.js'
import { authenticate, requireRoles, adminRoles } from '../middleware/auth.js'
import { fail, generateId, paginate, success } from '../utils/helpers.js'

const router = Router()

router.use(authenticate)

/** GET /api/users/me */
router.get('/me', (req, res, next) => {
  try {
    const account = db.accounts.find((a) => a.id === req.user!.id)
    if (!account) throw fail('User not found', 404)
    const { password: _, otp: __, otpExpiresAt: ___, ...user } = account
    const customer = db.customers.find((c) => c.id === account.id)
    res.json(success({ ...user, customer }))
  } catch (e) {
    next(e)
  }
})

/** PATCH /api/users/me */
router.patch('/me', async (req, res, next) => {
  try {
    const account = db.accounts.find((a) => a.id === req.user!.id)
    if (!account) throw fail('User not found', 404)
    const { name, phone, avatar } = req.body
    if (name) account.name = name
    if (phone) account.phone = phone
    if (avatar) account.avatar = avatar
    const customer = db.customers.find((c) => c.id === account.id)
    if (customer) {
      if (name) customer.name = name
      if (phone) customer.phone = phone
      if (avatar) customer.avatar = avatar
    }
    await saveUser(account)
    if (customer) await saveCustomer(customer)
    const { password: _, ...user } = account
    res.json(success(user, 'Profile updated'))
  } catch (e) {
    next(e)
  }
})

/** Addresses */
router.get('/me/addresses', (req, res) => {
  res.json(success(db.addresses[req.user!.id] || []))
})

router.post('/me/addresses', async (req, res, next) => {
  try {
    const body = req.body
    if (!body.line1 || !body.city || !body.pincode) throw fail('line1, city, pincode required')
    const list = db.addresses[req.user!.id] || (db.addresses[req.user!.id] = [])
    const addr: Address = {
      id: generateId('addr'),
      name: body.name || req.user!.name,
      phone: body.phone || req.user!.phone || '',
      line1: body.line1,
      line2: body.line2,
      city: body.city,
      state: body.state || '',
      pincode: body.pincode,
      type: body.type || 'home',
      isDefault: list.length === 0 || Boolean(body.isDefault),
    }
    if (addr.isDefault) list.forEach((a) => (a.isDefault = false))
    list.push(addr)
    if (addr.isDefault) await saveAddressesDefaults(req.user!.id, list)
    await saveAddress(req.user!.id, addr)
    const customer = db.customers.find((c) => c.id === req.user!.id)
    if (customer) {
      customer.savedAddresses = list.length
      await saveCustomer(customer)
    }
    res.status(201).json(success(addr, 'Address added'))
  } catch (e) {
    next(e)
  }
})

router.patch('/me/addresses/:id', async (req, res, next) => {
  try {
    const list = db.addresses[req.user!.id] || []
    const idx = list.findIndex((a) => a.id === req.params.id)
    if (idx === -1) throw fail('Address not found', 404)
    list[idx] = { ...list[idx], ...req.body, id: list[idx].id }
    await saveAddress(req.user!.id, list[idx])
    res.json(success(list[idx], 'Address updated'))
  } catch (e) {
    next(e)
  }
})

router.delete('/me/addresses/:id', async (req, res, next) => {
  try {
    const list = db.addresses[req.user!.id] || []
    db.addresses[req.user!.id] = list.filter((a) => a.id !== req.params.id)
    await deleteAddress(req.params.id)
    const customer = db.customers.find((c) => c.id === req.user!.id)
    if (customer) {
      customer.savedAddresses = db.addresses[req.user!.id].length
      await saveCustomer(customer)
    }
    res.json(success(null, 'Address deleted'))
  } catch (e) {
    next(e)
  }
})

router.patch('/me/addresses/:id/default', async (req, res, next) => {
  try {
    const list = db.addresses[req.user!.id] || []
    const addr = list.find((a) => a.id === req.params.id)
    if (!addr) throw fail('Address not found', 404)
    list.forEach((a) => (a.isDefault = a.id === addr.id))
    await saveAddressesDefaults(req.user!.id, list)
    res.json(success(addr, 'Default address set'))
  } catch (e) {
    next(e)
  }
})

/** Payment methods */
router.get('/me/payment-methods', (req, res) => {
  res.json(success(db.paymentMethods[req.user!.id] || []))
})

router.post('/me/payment-methods', async (req, res, next) => {
  try {
    const { type, label, last4, isDefault } = req.body
    if (!type || !label) throw fail('type and label required')
    const list = db.paymentMethods[req.user!.id] || (db.paymentMethods[req.user!.id] = [])
    const pm: PaymentMethod = {
      id: generateId('pm'),
      userId: req.user!.id,
      type,
      label,
      last4,
      isDefault: list.length === 0 || Boolean(isDefault),
    }
    if (pm.isDefault) list.forEach((p) => (p.isDefault = false))
    list.push(pm)
    for (const existing of list) await savePaymentMethod(existing)
    res.status(201).json(success(pm, 'Payment method added'))
  } catch (e) {
    next(e)
  }
})

router.delete('/me/payment-methods/:id', async (req, res, next) => {
  try {
    const list = db.paymentMethods[req.user!.id] || []
    db.paymentMethods[req.user!.id] = list.filter((p) => p.id !== req.params.id)
    await deletePaymentMethod(req.params.id)
    res.json(success(null, 'Payment method removed'))
  } catch (e) {
    next(e)
  }
})

/** Admin users */
router.get('/', requireRoles(...adminRoles), (req, res) => {
  let list = [...db.customers]
  const { status, tier, search, page, limit } = req.query
  if (status) list = list.filter((u) => u.status === status)
  if (tier) list = list.filter((u) => u.tier === tier)
  if (search) {
    const q = String(search).toLowerCase()
    list = list.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.phone.includes(q)
    )
  }
  res.json(success(paginate(list, Number(page), Number(limit))))
})

router.get('/export', requireRoles(...adminRoles), (_req, res) => {
  res.json(success(db.customers, 'Export ready'))
})

router.get('/:id', requireRoles(...adminRoles), (req, res, next) => {
  try {
    const user = db.customers.find((u) => u.id === req.params.id)
    if (!user) throw fail('User not found', 404)
    res.json(success(user))
  } catch (e) {
    next(e)
  }
})

router.patch('/:id', requireRoles(...adminRoles), async (req, res, next) => {
  try {
    const idx = db.customers.findIndex((u) => u.id === req.params.id)
    if (idx === -1) throw fail('User not found', 404)
    const action = req.body.action as string | undefined
    if (action === 'block' || action === 'suspend') db.customers[idx].status = 'blocked'
    else if (action === 'unblock') db.customers[idx].status = 'active'
    else if (action === 'verify') db.customers[idx].isVerified = true
    else {
      const body = { ...req.body }
      // Map legacy UI value "suspended" → Prisma CustomerStatus "blocked"
      if (body.status === 'suspended') body.status = 'blocked'
      db.customers[idx] = { ...db.customers[idx], ...body, id: db.customers[idx].id }
    }
    await saveCustomer(db.customers[idx])
    logAudit(req.user!.email, 'UPDATE_USER', String(req.params.id), action || 'patch')
    res.json(success(db.customers[idx], 'User updated'))
  } catch (e) {
    next(e)
  }
})

export default router
