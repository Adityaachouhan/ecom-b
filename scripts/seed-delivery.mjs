import '../src/lib/env.js'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.user.upsert({
    where: { id: 'dlv_001' },
    create: {
      id: 'dlv_001',
      email: 'arjun.rider@riviraa.com',
      password: 'password123',
      name: 'Arjun Rider',
      role: 'delivery',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Arjun',
      phone: '+91 98765 11111',
      joinedAt: new Date('2024-01-15'),
    },
    update: { role: 'delivery', password: 'password123', email: 'arjun.rider@riviraa.com' },
  })

  await prisma.deliveryPartner.upsert({
    where: { id: 'dp_001' },
    create: {
      id: 'dp_001',
      userId: 'dlv_001',
      name: 'Arjun Rider',
      phone: '+91 98765 11111',
      email: 'arjun.rider@riviraa.com',
      vehicleType: 'bike',
      kycStatus: 'approved',
      kycDocuments: {
        aadhaar: { url: 'https://example.com/aadhaar.pdf', status: 'verified' },
        pan: { url: 'https://example.com/pan.pdf', status: 'verified' },
        dl: { url: 'https://example.com/dl.pdf', status: 'verified' },
        rc: { url: 'https://example.com/rc.pdf', status: 'verified' },
      },
      availabilityStatus: 'online',
      currentLat: 12.9716,
      currentLng: 77.5946,
      rating: 4.8,
      totalDeliveries: 142,
      consecutiveFailures: 0,
      joinedDate: new Date('2024-01-15'),
    },
    update: {
      kycStatus: 'approved',
      availabilityStatus: 'online',
      currentLat: 12.9716,
      currentLng: 77.5946,
    },
  })

  console.log('Delivery partner seeded OK')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
