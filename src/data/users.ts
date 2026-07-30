export interface Customer {
  id: string
  name: string
  email: string
  phone: string
  avatar: string
  city: string
  state: string
  joinedAt: string
  lastOrderAt: string
  totalOrders: number
  totalSpent: number
  status: 'active' | 'inactive' | 'blocked'
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  savedAddresses: number
  isVerified?: boolean
}

export const customers: Customer[] = [
  { id: 'usr_001', name: 'Priya Sharma', email: 'priya.sharma@email.com', phone: '+91 98765 43210', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya', city: 'Bangalore', state: 'Karnataka', joinedAt: '2023-06-15', lastOrderAt: '2024-06-04', totalOrders: 12, totalSpent: 156000, status: 'active', tier: 'gold', savedAddresses: 2 },
  { id: 'usr_002', name: 'Amit Patel', email: 'amit.patel@email.com', phone: '+91 87654 32109', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Amit', city: 'Mumbai', state: 'Maharashtra', joinedAt: '2023-08-20', lastOrderAt: '2024-06-03', totalOrders: 5, totalSpent: 290000, status: 'active', tier: 'platinum', savedAddresses: 1 },
  { id: 'usr_003', name: 'Sneha Gupta', email: 'sneha.gupta@email.com', phone: '+91 76543 21098', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sneha', city: 'Delhi', state: 'Delhi', joinedAt: '2022-12-01', lastOrderAt: '2024-05-25', totalOrders: 28, totalSpent: 78000, status: 'active', tier: 'silver', savedAddresses: 3 },
  { id: 'usr_004', name: 'Ravi Kumar', email: 'ravi.kumar@email.com', phone: '+91 65432 10987', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ravi', city: 'Hyderabad', state: 'Telangana', joinedAt: '2024-01-10', lastOrderAt: '2024-05-30', totalOrders: 3, totalSpent: 15000, status: 'active', tier: 'bronze', savedAddresses: 1 },
  { id: 'usr_005', name: 'Meena Iyer', email: 'meena.iyer@email.com', phone: '+91 54321 09876', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Meena', city: 'Chennai', state: 'Tamil Nadu', joinedAt: '2023-03-15', lastOrderAt: '2024-04-10', totalOrders: 18, totalSpent: 95000, status: 'active', tier: 'gold', savedAddresses: 2 },
  { id: 'usr_006', name: 'Arjun Reddy', email: 'arjun.reddy@email.com', phone: '+91 43210 98765', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Arjun', city: 'Pune', state: 'Maharashtra', joinedAt: '2023-11-05', lastOrderAt: '2024-03-20', totalOrders: 7, totalSpent: 32000, status: 'inactive', tier: 'bronze', savedAddresses: 1 },
  { id: 'usr_007', name: 'Kavya Singh', email: 'kavya.singh@email.com', phone: '+91 32109 87654', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kavya', city: 'Jaipur', state: 'Rajasthan', joinedAt: '2022-09-20', lastOrderAt: '2024-06-01', totalOrders: 42, totalSpent: 234000, status: 'active', tier: 'platinum', savedAddresses: 4 },
  { id: 'usr_008', name: 'Suresh Pillai', email: 'suresh.pillai@email.com', phone: '+91 21098 76543', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Suresh', city: 'Kochi', state: 'Kerala', joinedAt: '2023-07-01', lastOrderAt: '2024-05-15', totalOrders: 9, totalSpent: 45000, status: 'active', tier: 'silver', savedAddresses: 2 },
  { id: 'usr_009', name: 'Divya Menon', email: 'divya.menon@email.com', phone: '+91 10987 65432', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Divya', city: 'Thrissur', state: 'Kerala', joinedAt: '2024-02-14', lastOrderAt: '2024-06-02', totalOrders: 2, totalSpent: 8500, status: 'active', tier: 'bronze', savedAddresses: 1 },
  { id: 'usr_010', name: 'Rohit Joshi', email: 'rohit.joshi@email.com', phone: '+91 09876 54321', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rohit', city: 'Ahmedabad', state: 'Gujarat', joinedAt: '2022-05-10', lastOrderAt: '2024-01-15', totalOrders: 15, totalSpent: 67000, status: 'inactive', tier: 'silver', savedAddresses: 2 },
  { id: 'usr_011', name: 'Anjali Verma', email: 'anjali.verma@email.com', phone: '+91 89012 34567', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anjali', city: 'Lucknow', state: 'Uttar Pradesh', joinedAt: '2023-04-20', lastOrderAt: '2024-05-28', totalOrders: 11, totalSpent: 43000, status: 'active', tier: 'silver', savedAddresses: 1 },
  { id: 'usr_012', name: 'Kiran Bhat', email: 'kiran.bhat@email.com', phone: '+91 78901 23456', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kiran', city: 'Mangalore', state: 'Karnataka', joinedAt: '2021-12-01', lastOrderAt: '2023-12-10', totalOrders: 35, totalSpent: 189000, status: 'blocked', tier: 'gold', savedAddresses: 3 },
]

export function getCustomerById(id: string): Customer | undefined {
  return customers.find((c) => c.id === id)
}

export const TIER_COLORS = {
  bronze: 'bg-orange-100 text-orange-700',
  silver: 'bg-gray-100 text-gray-700',
  gold: 'bg-yellow-100 text-yellow-700',
  platinum: 'bg-purple-100 text-purple-700',
}

// Alias — some pages import `users` instead of `customers`
export { customers as users }
