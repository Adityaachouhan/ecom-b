import { Router } from 'express'
import { db, sellerMatches } from '../store/db.js'
import {
  deleteProduct,
  saveFlaggedProduct,
  saveProduct,
  saveReview,
} from '../store/persist.js'
import { authenticate, optionalAuth, requireRoles, adminRoles } from '../middleware/auth.js'
import { fail, generateId, paginate, success, todayISO } from '../utils/helpers.js'

const router = Router()

/** GET /api/products */
router.get('/', optionalAuth, (req, res) => {
  let list = [...db.products]
  const {
    category,
    subcategory,
    brand,
    sellerId,
    search,
    q,
    featured,
    trending,
    minPrice,
    maxPrice,
    sort,
    page,
    limit,
  } = req.query

  const query = String(search || q || '').toLowerCase()
  if (query) {
    list = list.filter(
      (p) =>
        p.title.toLowerCase().includes(query) ||
        p.brand.toLowerCase().includes(query) ||
        p.tags.some((t) => t.includes(query)) ||
        p.category.toLowerCase().includes(query)
    )
  }
  if (category) list = list.filter((p) => p.category.toLowerCase() === String(category).toLowerCase())
  if (subcategory) list = list.filter((p) => p.subcategory.toLowerCase() === String(subcategory).toLowerCase())
  if (brand) list = list.filter((p) => p.brand.toLowerCase() === String(brand).toLowerCase())
  if (sellerId) list = list.filter((p) => sellerMatches(p.sellerId, String(sellerId)))
  if (featured === 'true') list = list.filter((p) => p.isFeatured)
  if (trending === 'true') list = list.filter((p) => p.isTrending)
  if (minPrice) list = list.filter((p) => p.price >= Number(minPrice))
  if (maxPrice) list = list.filter((p) => p.price <= Number(maxPrice))

  switch (String(sort || '')) {
    case 'price_asc':
      list.sort((a, b) => a.price - b.price)
      break
    case 'price_desc':
      list.sort((a, b) => b.price - a.price)
      break
    case 'rating':
      list.sort((a, b) => b.rating - a.rating)
      break
    case 'newest':
      list.sort((a, b) => Number(b.isNewArrival) - Number(a.isNewArrival))
      break
    case 'popular':
      list.sort((a, b) => b.reviewCount - a.reviewCount)
      break
  }

  res.json(success(paginate(list, Number(page), Number(limit))))
})

/** GET /api/products/featured */
router.get('/featured', (_req, res) => {
  res.json(success(db.products.filter((p) => p.isFeatured)))
})

/** GET /api/products/trending */
router.get('/trending', (_req, res) => {
  res.json(success(db.products.filter((p) => p.isTrending)))
})

/** GET /api/products/search */
router.get('/search', (req, res) => {
  const q = String(req.query.q || '').toLowerCase()
  const list = db.products.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.tags.some((t) => t.includes(q))
  )
  res.json(success(paginate(list, Number(req.query.page), Number(req.query.limit))))
})

/** GET /api/products/:id */
router.get('/:id', (req, res, next) => {
  try {
    const product = db.products.find((p) => p.id === req.params.id)
    if (!product) throw fail('Product not found', 404)
    res.json(success(product))
  } catch (e) {
    next(e)
  }
})

/** GET /api/products/:id/reviews */
router.get('/:id/reviews', (req, res, next) => {
  try {
    const product = db.products.find((p) => p.id === req.params.id)
    if (!product) throw fail('Product not found', 404)
    res.json(success(paginate(product.reviews, Number(req.query.page), Number(req.query.limit))))
  } catch (e) {
    next(e)
  }
})

/** POST /api/products/:id/reviews */
router.post('/:id/reviews', authenticate, async (req, res, next) => {
  try {
    const product = db.products.find((p) => p.id === req.params.id)
    if (!product) throw fail('Product not found', 404)
    const { rating, title, body } = req.body
    if (!rating || !body) throw fail('rating and body are required')
    const review = {
      id: generateId('rev'),
      userId: req.user!.id,
      userName: req.user!.name,
      rating: Number(rating),
      title: title || '',
      body: String(body),
      date: todayISO(),
      helpful: 0,
      verified: true,
    }
    product.reviews.unshift(review)
    product.reviewCount = product.reviews.length
    product.rating =
      Math.round((product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length) * 10) / 10
    await saveReview(product.id, review, { rating: product.rating, reviewCount: product.reviewCount })
    res.status(201).json(success(review, 'Review added'))
  } catch (e) {
    next(e)
  }
})

/** POST /api/products/:id/flag */
router.post('/:id/flag', authenticate, async (req, res, next) => {
  try {
    const product = db.products.find((p) => p.id === req.params.id)
    if (!product) throw fail('Product not found', 404)
    const item = {
      id: generateId('prd_f'),
      productId: product.id,
      product: product.title,
      seller: product.sellerName,
      reason: req.body.reason || 'User report',
      category: product.category,
      price: product.price,
      date: todayISO(),
      status: 'pending' as const,
    }
    db.flaggedProducts.unshift(item)
    await saveFlaggedProduct(item)
    res.status(201).json(success(item, 'Product flagged'))
  } catch (e) {
    next(e)
  }
})

/** Admin create/update/delete */
router.post('/', authenticate, requireRoles(...adminRoles, 'seller'), async (req, res, next) => {
  try {
    const body = req.body
    if (!body.title || !body.price) throw fail('title and price are required')
    const id = generateId('p')
    const sellerId = req.user!.role === 'seller' ? req.user!.sellerId || req.user!.id : body.sellerId || 'sel_001'
    const seller = db.sellers.find((s) => s.id === sellerId)
    const product = {
      id,
      title: body.title,
      name: body.title,
      description: body.description || '',
      category: body.category || 'Electronics',
      subcategory: body.subcategory || '',
      brand: body.brand || '',
      images: body.images || [],
      price: Number(body.price),
      originalPrice: Number(body.price),
      discount: Number(body.discount || 0),
      stock: Number(body.stock || 0),
      stockCount: Number(body.stock || 0),
      inStock: Number(body.stock || 0) > 0,
      isNewArrival: true,
      sellerId,
      sellerName: seller?.name || req.user!.name,
      sellerRating: seller?.rating || 4.5,
      rating: 0,
      reviewCount: 0,
      tags: body.tags || [],
      variants: body.variants || [],
      sizes: body.sizes || [],
      reviews: [],
      isFeatured: Boolean(body.isFeatured),
      isTrending: Boolean(body.isTrending),
      deliveryDays: Number(body.deliveryDays || 5),
      specifications: body.specifications || {},
    }
    db.products.unshift(product)
    await saveProduct(product)
    res.status(201).json(success(product, 'Product created'))
  } catch (e) {
    next(e)
  }
})

router.patch('/:id', authenticate, requireRoles(...adminRoles, 'seller'), async (req, res, next) => {
  try {
    const idx = db.products.findIndex((p) => p.id === req.params.id)
    if (idx === -1) throw fail('Product not found', 404)
    const product = db.products[idx]
    if (req.user!.role === 'seller' && !sellerMatches(product.sellerId, req.user!.sellerId || req.user!.id)) {
      throw fail('Forbidden', 403)
    }
    const updated = { ...product, ...req.body, id: product.id }
    if (req.body.title) {
      updated.name = req.body.title
      updated.title = req.body.title
    }
    if (req.body.stock !== undefined) {
      updated.stock = Number(req.body.stock)
      updated.stockCount = updated.stock
      updated.inStock = updated.stock > 0
    }
    if (req.body.price !== undefined) {
      updated.price = Number(req.body.price)
      updated.originalPrice = updated.price
    }
    db.products[idx] = updated
    await saveProduct(updated)
    res.json(success(updated, 'Product updated'))
  } catch (e) {
    next(e)
  }
})

router.delete('/:id', authenticate, requireRoles(...adminRoles, 'seller'), async (req, res, next) => {
  try {
    const idx = db.products.findIndex((p) => p.id === req.params.id)
    if (idx === -1) throw fail('Product not found', 404)
    const product = db.products[idx]
    if (req.user!.role === 'seller' && !sellerMatches(product.sellerId, req.user!.sellerId || req.user!.id)) {
      throw fail('Forbidden', 403)
    }
    db.products.splice(idx, 1)
    await deleteProduct(product.id)
    res.json(success(null, 'Product deleted'))
  } catch (e) {
    next(e)
  }
})

export default router
