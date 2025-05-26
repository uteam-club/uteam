const { PrismaClient } = require('../src/generated/prisma');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function restoreUsers() {
  console.log('Начинаю восстановление пользователей...');
  
  const backupDir = path.join(__dirname, '../backup');
  
  try {
    // Проверяем существование директории с бэкапами
    if (!fs.existsSync(backupDir)) {
      console.error('Директория с резервными копиями не найдена!');
      return;
    }
    
    // Восстановление пользователей
    if (fs.existsSync(path.join(backupDir, 'users.json'))) {
      const users = JSON.parse(fs.readFileSync(path.join(backupDir, 'users.json'), 'utf8'));
      
      console.log(`Восстанавливаю ${users.length} пользователей...`);
      
      // Очищаем текущую таблицу перед импортом
      try {
        console.log('Удаляю существующие записи в таблице пользователей...');
        await prisma.user.deleteMany({});
        console.log('Существующие пользователи успешно удалены');
      } catch (error) {
        console.error('Ошибка при очистке таблицы пользователей:', error.message);
        console.log('Продолжаем восстановление без очистки...');
      }
      
      // Восстанавливаем данные
      let restored = 0;
      for (const user of users) {
        try {
          console.log(`Восстанавливаю пользователя: ${user.email} (${user.id})`);
          
          // Приводим даты к правильному формату
          const userData = {
            id: user.id,
            email: user.email,
            name: user.name || null,
            password: user.password,
            role: user.role || 'MEMBER',
            emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
            imageUrl: user.imageUrl || null,
            clubId: user.clubId,
            createdAt: new Date(user.createdAt || new Date()),
            updatedAt: new Date(user.updatedAt || new Date())
          };
          
          await prisma.user.create({
            data: userData
          });
          
          restored++;
          console.log(`Успешно восстановлен пользователь: ${user.email} (${user.id})`);
        } catch (error) {
          console.error(`Ошибка при восстановлении пользователя ${user.id}:`, error.message);
        }
      }
      
      console.log(`Пользователи восстановлены успешно! (${restored}/${users.length})`);
    } else {
      console.error('Файл с резервной копией пользователей не найден!');
    }
    
    console.log('Восстановление пользователей завершено!');
  } catch (error) {
    console.error('Ошибка при восстановлении данных:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем восстановление пользователей
restoreUsers(); 