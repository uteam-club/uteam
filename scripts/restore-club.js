const { PrismaClient } = require('../src/generated/prisma');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Фиксированная схема для Club, взятая из prisma/schema.prisma
const clubSchema = [
  'id',
  'name',
  'subdomain',
  'logoUrl',
  'createdAt',
  'updatedAt'
];

async function restoreClubs() {
  console.log('Начинаю восстановление клубов...');
  
  const backupDir = path.join(__dirname, '../backup');
  
  try {
    // Проверяем существование директории с бэкапами
    if (!fs.existsSync(backupDir)) {
      console.error('Директория с резервными копиями не найдена!');
      return;
    }
    
    // Восстановление клубов
    if (fs.existsSync(path.join(backupDir, 'clubs.json'))) {
      const clubs = JSON.parse(fs.readFileSync(path.join(backupDir, 'clubs.json'), 'utf8'));
      
      console.log(`Восстанавливаю ${clubs.length} клубов...`);
      
      // Очищаем текущую таблицу перед импортом
      try {
        console.log('Удаляю существующие записи в таблице клубов...');
        await prisma.club.deleteMany({});
        console.log('Существующие клубы успешно удалены');
      } catch (error) {
        console.error('Ошибка при очистке таблицы клубов:', error.message);
        console.log('Продолжаем восстановление без очистки...');
      }
      
      // Восстанавливаем данные
      let restored = 0;
      for (const club of clubs) {
        try {
          console.log(`Восстанавливаю клуб: ${club.name} (${club.id})`);
          
          // Приводим даты к правильному формату
          const clubData = {
            id: club.id,
            name: club.name,
            subdomain: club.subdomain,
            logoUrl: club.logoUrl || null,
            createdAt: new Date(club.createdAt || new Date()),
            updatedAt: new Date(club.updatedAt || new Date())
          };
          
          await prisma.club.create({
            data: clubData
          });
          
          restored++;
          console.log(`Успешно восстановлен клуб: ${club.name} (${club.id})`);
        } catch (error) {
          console.error(`Ошибка при восстановлении клуба ${club.id}:`, error.message);
        }
      }
      
      console.log(`Клубы восстановлены успешно! (${restored}/${clubs.length})`);
    } else {
      console.error('Файл с резервной копией клубов не найден!');
    }
    
    console.log('Восстановление клубов завершено!');
  } catch (error) {
    console.error('Ошибка при восстановлении данных:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем восстановление клубов
restoreClubs(); 