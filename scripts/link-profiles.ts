import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: { employeeProfile: true }
  });

  for (const user of users) {
    if (!user.employeeProfile) {
      await prisma.employeeProfile.create({
        data: {
          userId: user.id,
          name: user.email.split('@')[0] || "Unknown",
          employeeType: user.role === 'MASTER' ? 'Super Admin' : 'Employee'
        }
      });
      console.log(`Created profile for ${user.email}`);
    }
  }
  console.log("Done linking profiles.");
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
