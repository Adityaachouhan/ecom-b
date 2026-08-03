import type { Product } from '../data/products.js';
interface OrderLike {
    items: Array<{
        productId: string;
    }>;
}
/**
 * "Customers who bought this also bought" — a simple co-occurrence count
 * over historical order line items (the same idea Amazon's original
 * recommendation engine used, before any ML was involved). No aggregation
 * framework needed: for every order containing `productId`, count how often
 * every other product appeared alongside it, then rank by frequency.
 */
export declare function coOccurringProductIds(orders: OrderLike[], productId: string, limit: number): string[];
/**
 * Related-products rail for a PDP: co-occurrence first (real behavioral
 * signal), topped up with same-category products to avoid a sparse/empty
 * rail while the order history is still small (cold-start fallback).
 */
export declare function getRelatedProducts(products: Product[], orders: OrderLike[], product: Product, limit?: number): Product[];
export {};
