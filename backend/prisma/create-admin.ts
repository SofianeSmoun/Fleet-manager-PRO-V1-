// Usage : pnpm --filter backend exec tsx prisma/create-admin.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = process.env['ADMIN_EMAIL'];
  const password = process.env['ADMIN_PASSWORD'];
  if (!email || !password) {
    console.error('ADMIN_EMAIL et ADMIN_PASSWORD requis dans .env');
    process.exit(1);
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.warn('Compte deja existant pour', email);
    process.exit(0);
  }
  const hash = await bcrypt.hash(password, 12);
  const admin = await prisma.user.create({
    data: {
      email,
      passwordHash: hash,
      firstName: 'Admin',
      lastName: 'FleetManager',
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.warn('Compte admin cree :', admin.email);
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
