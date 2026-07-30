export interface Category {
    id: string;
    name: string;
    slug: string;
    icon: string;
    color: string;
    bgColor: string;
    image: string;
    productCount: number;
    subcategories: Subcategory[];
}
export interface Subcategory {
    id: string;
    name: string;
    slug: string;
    productCount: number;
}
export declare const categories: Category[];
export declare function getCategoryBySlug(slug: string): Category | undefined;
export declare function getAllSubcategories(): Subcategory[];
