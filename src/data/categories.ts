export interface Category {
  id: string
  name: string
  slug: string
  icon: string
  color: string
  bgColor: string
  image: string
  productCount: number
  subcategories: Subcategory[]
}

export interface Subcategory {
  id: string
  name: string
  slug: string
  productCount: number
}

export const categories: Category[] = [
  {
    id: 'cat_001',
    name: 'Electronics',
    slug: 'electronics',
    icon: '🔌',
    color: '#6C47FF',
    bgColor: '#f0ebff',
    image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&q=80',
    productCount: 1240,
    subcategories: [
      { id: 'sub_001', name: 'Smartphones', slug: 'smartphones', productCount: 320 },
      { id: 'sub_002', name: 'Laptops', slug: 'laptops', productCount: 180 },
      { id: 'sub_003', name: 'Televisions', slug: 'televisions', productCount: 95 },
      { id: 'sub_004', name: 'Audio', slug: 'audio', productCount: 210 },
      { id: 'sub_005', name: 'Cameras', slug: 'cameras', productCount: 78 },
      { id: 'sub_006', name: 'Wearables', slug: 'wearables', productCount: 145 },
      { id: 'sub_007', name: 'E-Readers', slug: 'e-readers', productCount: 34 },
      { id: 'sub_008', name: 'Accessories', slug: 'accessories', productCount: 178 },
    ],
  },
  {
    id: 'cat_002',
    name: 'Fashion',
    slug: 'fashion',
    icon: '👗',
    color: '#FF6B35',
    bgColor: '#fff3ee',
    image: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=400&q=80',
    productCount: 5670,
    subcategories: [
      { id: 'sub_009', name: 'Clothing', slug: 'clothing', productCount: 2340 },
      { id: 'sub_010', name: 'Footwear', slug: 'footwear', productCount: 890 },
      { id: 'sub_011', name: 'Bags', slug: 'bags', productCount: 456 },
      { id: 'sub_012', name: 'Accessories', slug: 'accessories-fashion', productCount: 678 },
      { id: 'sub_013', name: 'Watches', slug: 'watches', productCount: 234 },
      { id: 'sub_014', name: 'Jewellery', slug: 'jewellery', productCount: 567 },
      { id: 'sub_015', name: 'Sunglasses', slug: 'sunglasses', productCount: 189 },
    ],
  },
  {
    id: 'cat_003',
    name: 'Home & Living',
    slug: 'home',
    icon: '🏠',
    color: '#0D9488',
    bgColor: '#f0fdfa',
    image: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=400&q=80',
    productCount: 3210,
    subcategories: [
      { id: 'sub_016', name: 'Furniture', slug: 'furniture', productCount: 678 },
      { id: 'sub_017', name: 'Kitchen', slug: 'kitchen', productCount: 890 },
      { id: 'sub_018', name: 'Appliances', slug: 'appliances', productCount: 345 },
      { id: 'sub_019', name: 'Decor', slug: 'decor', productCount: 567 },
      { id: 'sub_020', name: 'Bedding', slug: 'bedding', productCount: 289 },
      { id: 'sub_021', name: 'Outdoor', slug: 'outdoor', productCount: 156 },
      { id: 'sub_022', name: 'Lighting', slug: 'lighting', productCount: 285 },
    ],
  },
  {
    id: 'cat_004',
    name: 'Beauty',
    slug: 'beauty',
    icon: '💄',
    color: '#EAB308',
    bgColor: '#fefce8',
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&q=80',
    productCount: 2890,
    subcategories: [
      { id: 'sub_023', name: 'Skincare', slug: 'skincare', productCount: 1200 },
      { id: 'sub_024', name: 'Makeup', slug: 'makeup', productCount: 890 },
      { id: 'sub_025', name: 'Hair Care', slug: 'hair-care', productCount: 456 },
      { id: 'sub_026', name: 'Fragrances', slug: 'fragrances', productCount: 234 },
      { id: 'sub_027', name: 'Bath & Body', slug: 'bath-body', productCount: 110 },
    ],
  },
  {
    id: 'cat_005',
    name: 'Sports',
    slug: 'sports',
    icon: '⚽',
    color: '#22C55E',
    bgColor: '#f0fdf4',
    image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&q=80',
    productCount: 1560,
    subcategories: [
      { id: 'sub_028', name: 'Fitness', slug: 'fitness', productCount: 456 },
      { id: 'sub_029', name: 'Cricket', slug: 'cricket', productCount: 234 },
      { id: 'sub_030', name: 'Football', slug: 'football', productCount: 189 },
      { id: 'sub_031', name: 'Cycling', slug: 'cycling', productCount: 145 },
      { id: 'sub_032', name: 'Swimming', slug: 'swimming', productCount: 89 },
      { id: 'sub_033', name: 'Yoga', slug: 'yoga', productCount: 178 },
    ],
  },
  {
    id: 'cat_006',
    name: 'Books',
    slug: 'books',
    icon: '📚',
    color: '#4F46E5',
    bgColor: '#eef2ff',
    image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&q=80',
    productCount: 4500,
    subcategories: [
      { id: 'sub_034', name: 'Fiction', slug: 'fiction', productCount: 1800 },
      { id: 'sub_035', name: 'Non-Fiction', slug: 'non-fiction', productCount: 1200 },
      { id: 'sub_036', name: 'Academic', slug: 'academic', productCount: 678 },
      { id: 'sub_037', name: 'Children', slug: 'children', productCount: 456 },
      { id: 'sub_038', name: 'Comics', slug: 'comics', productCount: 234 },
    ],
  },
]

export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug)
}

export function getAllSubcategories(): Subcategory[] {
  return categories.flatMap((c) => c.subcategories)
}
