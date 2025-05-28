import { PrismaClient } from '../src/generated/prisma';
const prisma = new PrismaClient();

async function main() {
  const clubs = await prisma.club.findMany();
  for (const club of clubs) {
    const team = await prisma.team.create({
      data: { name: `Основная команда ${club.name}`, clubId: club.id }
    });
    console.log(`Создана команда '${team.name}' для клуба '${club.name}' (ID: ${team.id})`);
  }
  await prisma.$disconnect();
}

main(); 