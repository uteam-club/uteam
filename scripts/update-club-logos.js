const { PrismaClient } = require('../src/generated/prisma');
const prisma = new PrismaClient();

// ID клубов
const VISTA_CLUB_ID = '56233e76-6e97-4d50-977b-f6272fe0f5e9';
const VAN_CLUB_ID = '24e0bd68-d7d8-4fc1-a16e-a97ea25231b1';

async function main() {
  try {
    console.log('Обновление логотипов клубов...');
    
    // Обновление логотипа для клуба FDC VISTA
    const vistaClub = await prisma.club.update({
      where: { id: VISTA_CLUB_ID },
      data: { logoUrl: '/vista.png' } // Путь к логотипу в папке public
    });
    
    console.log(`Обновлен логотип для клуба ${vistaClub.name}: ${vistaClub.logoUrl}`);
    
    // Обновление логотипа для клуба FC VAN
    const vanClub = await prisma.club.update({
      where: { id: VAN_CLUB_ID },
      data: { logoUrl: '/van.png' } // Путь к логотипу в папке public
    });
    
    console.log(`Обновлен логотип для клуба ${vanClub.name}: ${vanClub.logoUrl}`);
    
    console.log('Обновление логотипов завершено успешно!');
  } catch (error) {
    console.error('Ошибка при обновлении логотипов:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 