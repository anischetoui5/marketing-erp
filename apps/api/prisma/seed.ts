import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Admin123!@#', 12);

  const admin = await prisma.users.upsert({
    where: { email: 'admin@marketingERP.com' },
    update: {},
    create: {
      email: 'admin@marketingERP.com',
      full_name: 'System Admin',
      role: 'admin',
      department: 'marketing',
      password_hash: passwordHash,
    },
  });

  console.log('Seeded admin user:', admin.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
