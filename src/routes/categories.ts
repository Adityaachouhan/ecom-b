import { Router } from 'express'
import { db } from '../store/db.js'
import { saveCategory } from '../store/persist.js'
import { authenticate, requireRoles, adminRoles } from '../middleware/auth.js'
import { fail, generateId, success } from '../utils/helpers.js'

const router = Router()

/** GET /api/categories */
router.get('/', (_req, res) => {
  res.json(success(db.categories))
})

/** GET /api/categories/:slug */
router.get('/:slug', (req, res, next) => {
  try {
    const cat = db.categories.find((c) => c.slug === req.params.slug || c.id === req.params.slug)
    if (!cat) throw fail('Category not found', 404)
    res.json(success(cat))
  } catch (e) {
    next(e)
  }
})

/** POST /api/categories */
router.post('/', authenticate, requireRoles(...adminRoles), async (req, res, next) => {
  try {
    const { name, slug, icon, color, bgColor, image } = req.body
    if (!name) throw fail('name is required')
    const cat = {
      id: generateId('cat'),
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      icon: icon || '📦',
      color: color || '#6C47FF',
      bgColor: bgColor || '#f0ebff',
      image: image || '',
      productCount: 0,
      subcategories: req.body.subcategories || [],
    }
    db.categories.push(cat)
    await saveCategory(cat)
    res.status(201).json(success(cat, 'Category created'))
  } catch (e) {
    next(e)
  }
})

/** PATCH /api/categories/:id */
router.patch('/:id', authenticate, requireRoles(...adminRoles), async (req, res, next) => {
  try {
    const idx = db.categories.findIndex((c) => c.id === req.params.id)
    if (idx === -1) throw fail('Category not found', 404)
    db.categories[idx] = { ...db.categories[idx], ...req.body, id: db.categories[idx].id }
    await saveCategory(db.categories[idx])
    res.json(success(db.categories[idx], 'Category updated'))
  } catch (e) {
    next(e)
  }
})

export default router
