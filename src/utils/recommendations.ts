import type { Product } from '../data/products.js'

interface OrderLike {
  items: Array<{ productId: string }>
}

/**
 * "Customers who bought this also bought" — a simple co-occurrence count
 * over historical order line items (the same idea Amazon's original
 * recommendation engine used, before any ML was involved). No aggregation
 * framework needed: for every order containing `productId`, count how often
 * every other product appeared alongside it, then rank by frequency.
 */
export function coOccurringProductIds(orders: OrderLike[], productId: string, limit: number): string[] {
  const counts = new Map<string, number>()

  for (const order of orders) {
    const ids = order.items.map((i) => i.productId)
    if (!ids.includes(productId)) continue
    for (const otherId of ids) {
      if (otherId === productId) continue
      counts.set(otherId, (counts.get(otherId) || 0) + 1)
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id)
}

/**
 * Related-products rail for a PDP: co-occurrence first (real behavioral
 * signal), topped up with same-category products to avoid a sparse/empty
 * rail while the order history is still small (cold-start fallback).
 */
export function getRelatedProducts(
  products: Product[],
  orders: OrderLike[],
  product: Product,
  limit = 4
): Product[] {
  const byId = new Map(products.map((p) => [p.id, p]))
  const coOccurring = coOccurringProductIds(orders, product.id, limit)
    .map((id) => byId.get(id))
    .filter((p): p is Product => Boolean(p))

  if (coOccurring.length >= limit) return coOccurring.slice(0, limit)

  const usedIds = new Set([product.id, ...coOccurring.map((p) => p.id)])
  const sameCategory = products
    .filter((p) => !usedIds.has(p.id) && p.category === product.category)
    .sort((a, b) => b.rating - a.rating)

  return [...coOccurring, ...sameCategory].slice(0, limit)
}
