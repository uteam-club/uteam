import { PrismaClient } from '../src/generated/prisma';
const prisma = new PrismaClient();

async function main() {
  const teams = await prisma.team.findMany();
  for (const team of teams) {
    console.log(`Команда: ${team.name}, ID: ${team.id}, clubId: ${team.clubId}`);
  }
  await prisma.$disconnect();
}

main(); 