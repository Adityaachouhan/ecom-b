export interface ProductVariant {
    id: string;
    type: 'size' | 'color' | 'storage';
    label: string;
    value: string;
    stock: number;
    priceModifier?: number;
    color?: string;
    colorHex?: string;
}
export interface ProductReview {
    id: string;
    userId: string;
    userName: string;
    rating: number;
    title: string;
    body: string;
    date: string;
    helpful: number;
    verified: boolean;
}
export interface Product {
    id: string;
    /** Display title */
    title: string;
    /** Alias for title — used by some pages */
    name: string;
    description: string;
    category: string;
    subcategory: string;
    brand: string;
    images: string[];
    /** Full (pre-discount) price in INR */
    price: number;
    /** Alias for price — used by some pages */
    originalPrice: number;
    discount: number;
    stock: number;
    /** Alias for stock */
    stockCount: number;
    /** Derived: stock > 0 */
    inStock: boolean;
    isNewArrival: boolean;
    sellerId: string;
    sellerName: string;
    sellerRating: number;
    rating: number;
    reviewCount: number;
    tags: string[];
    variants: ProductVariant[];
    sizes?: string[];
    reviews: ProductReview[];
    isFeatured: boolean;
    isTrending: boolean;
    deliveryDays: number;
    specifications: Record<string, string>;
    weight?: string;
    warranty?: string;
}
export declare const products: Product[];
export declare const featuredProducts: Product[];
export declare const bestSellers: Product[];
export declare const newArrivals: Product[];
export declare const trendingProducts: Product[];
export declare const getProductById: (id: string) => Product | undefined;
export declare const getFeaturedProducts: () => Product[];
export declare const getTrendingProducts: () => Product[];
export declare const getProductsByCategory: (cat: string) => Product[];
export declare const getProductsBySeller: (sellerId: string) => Product[];
