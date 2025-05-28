import { PrismaClient } from '../src/generated/prisma';
const prisma = new PrismaClient();

async function main() {
  const player = await prisma.player.create({
    data: {
      firstName: 'Тест',
      lastName: 'Игрок',
      pinCode: '123456',
      teamId: '86e24c88-e55e-4ccd-837d-02d5cf63dd2c'
    }
  });
  console.log('Игрок создан:', player);
  await prisma.$disconnect();
}

main(); 