import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'example@citydent.com';
  const plainPassword = 'password123';
  
  const passwordHash = await bcrypt.hash(plainPassword, 10);
  
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: 'MASTER' },
    create: {
      email,
      passwordHash,
      role: 'MASTER',
    },
  });
  
  console.log(`Created user with email: ${user.email} and password: ${plainPassword}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
