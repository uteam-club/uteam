// Скрипт для миграции игроков из старой базы данных в новую
const { createClient } = require('@supabase/supabase-js');
const { PrismaClient } = require('../src/generated/prisma');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Клиент для старой базы данных
const OLD_SUPABASE_URL = 'https://gtmpyyttkzjoiufiizwl.supabase.co';
const OLD_SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0bXB5eXR0a3pqb2l1ZmlpendsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDI2NTc1MCwiZXhwIjoyMDU5ODQxNzUwfQ.8TovFEqNKe5kwNbGC9Hwn3Zt8BDQvRJzfHvspoPj_qE';
const oldSupabase = createClient(OLD_SUPABASE_URL, OLD_SUPABASE_SERVICE_KEY);

// Клиент для новой базы данных
const prisma = new PrismaClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Функция для сохранения лога миграции
function logMigration(message) {
  const logDir = path.join(__dirname, '../logs');
  const logFile = path.join(logDir, `migration-${new Date().toISOString().split('T')[0]}.log`);
  
  if (!fs.existsSync(logDir)){
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  const logMessage = `[${new Date().toISOString()}] ${message}\n`;
  console.log(message);
  fs.appendFileSync(logFile, logMessage);
}

// Функция для генерации уникального пин-кода
function generatePinCode() {
  const min = 100000; // 6 цифр, начиная с 100000
  const max = 999999; // до 999999
  return Math.floor(Math.random() * (max - min + 1) + min).toString();
}

// Вспомогательная функция для загрузки изображения игрока
async function migratePlayerImage(playerId, oldImageUrl, clubId, teamId) {
  if (!oldImageUrl) return null;
  
  try {
    // Получаем файл из старого URL
    const response = await fetch(oldImageUrl);
    if (!response.ok) {
      logMigration(`Ошибка при загрузке изображения для игрока ${playerId}: Статус ${response.status}`);
      return null;
    }
    
    const fileData = await response.arrayBuffer();
    
    // Создаем уникальное имя файла с временной меткой
    const timestamp = new Date().getTime();
    const fileName = `${timestamp}-profile.jpg`;
    
    // Формируем путь к файлу в хранилище согласно структуре проекта
    const filePath = `players/${clubId}/${teamId}/${playerId}/avatars/${fileName}`;
    
    // Загружаем в новое хранилище
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('club-media')
      .upload(filePath, fileData, {
        contentType: 'image/jpeg',
        upsert: true,
        metadata: {
          fileType: 'avatar',
          playerId,
          teamId,
          clubId
        }
      });
    
    if (uploadError) {
      logMigration(`Ошибка при сохранении изображения для игрока ${playerId}: ${uploadError.message}`);
      return null;
    }
    
    // Получаем публичный URL
    const { data: publicUrlData } = supabase
      .storage
      .from('club-media')
      .getPublicUrl(filePath);
    
    return {
      path: filePath,
      url: filePath,
      publicUrl: publicUrlData.publicUrl
    };
  } catch (error) {
    logMigration(`Ошибка при миграции изображения: ${error.message}`);
    return null;
  }
}

// Основная функция миграции
async function migratePlayersFromOldDb() {
  try {
    logMigration('Начало миграции игроков из старой базы данных');
    
    // Получаем команды из старой базы данных
    const { data: oldTeams, error: teamsError } = await oldSupabase
      .from('teams')
      .select('*');
    
    if (teamsError) {
      throw new Error(`Ошибка при получении команд: ${teamsError.message}`);
    }
    
    logMigration(`Получено ${oldTeams.length} команд из старой базы данных`);
    
    // Получаем все команды из новой базы данных
    const newTeams = await prisma.team.findMany();
    logMigration(`Найдено ${newTeams.length} команд в новой базе данных`);
    
    // Получаем игроков из старой базы данных
    const { data: oldPlayers, error: playersError } = await oldSupabase
      .from('players')
      .select('*');
    
    if (playersError) {
      throw new Error(`Ошибка при получении игроков: ${playersError.message}`);
    }
    
    logMigration(`Получено ${oldPlayers.length} игроков из старой базы данных`);
    
    // Сопоставляем команды по названиям
    const teamMapping = {};
    for (const oldTeam of oldTeams) {
      const matchingNewTeam = newTeams.find(newTeam => newTeam.name === oldTeam.name);
      if (matchingNewTeam) {
        teamMapping[oldTeam.id] = {
          newId: matchingNewTeam.id,
          clubId: matchingNewTeam.clubId
        };
        logMigration(`Сопоставлена команда: ${oldTeam.name} (${oldTeam.id} -> ${matchingNewTeam.id})`);
      } else {
        logMigration(`Не найдена соответствующая команда для: ${oldTeam.name} (${oldTeam.id})`);
      }
    }
    
    // Мигрируем игроков
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const oldPlayer of oldPlayers) {
      try {
        // Пропускаем, если нет сопоставления команды
        if (!teamMapping[oldPlayer.teamId]) {
          logMigration(`Пропуск игрока ${oldPlayer.lastName} ${oldPlayer.firstName}: нет сопоставления команды`);
          skippedCount++;
          continue;
        }
        
        const teamInfo = teamMapping[oldPlayer.teamId];
        
        // Проверяем, существует ли игрок в новой базе данных
        const existingPlayer = await prisma.player.findFirst({
          where: {
            firstName: oldPlayer.firstName,
            lastName: oldPlayer.lastName,
            teamId: teamInfo.newId
          }
        });
        
        if (existingPlayer) {
          logMigration(`Игрок ${oldPlayer.lastName} ${oldPlayer.firstName} уже существует в новой базе данных`);
          skippedCount++;
          continue;
        }
        
        // Мигрируем изображение игрока, если есть
        let imageData = null;
        if (oldPlayer.photoUrl) {
          imageData = await migratePlayerImage(
            oldPlayer.id, 
            oldPlayer.photoUrl,
            teamInfo.clubId,
            teamInfo.newId
          );
        }
        
        // Преобразуем статус
        let status = 'READY';
        if (oldPlayer.status) {
          // Возможные статусы в новой БД: READY, REHABILITATION, SICK, STUDY, OTHER
          status = oldPlayer.status; // Используем статус из старой БД, если он совпадает с новой схемой
        }
        
        // Генерируем уникальный пин-код, если его нет
        const pinCode = oldPlayer.pinCode || generatePinCode();
        
        // Создаем игрока в новой базе данных
        const newPlayer = await prisma.player.create({
          data: {
            firstName: oldPlayer.firstName,
            lastName: oldPlayer.lastName,
            middleName: oldPlayer.middleName || null,
            number: oldPlayer.number || null,
            position: oldPlayer.position || null,
            strongFoot: oldPlayer.foot || null,
            dateOfBirth: oldPlayer.birthDate ? new Date(oldPlayer.birthDate) : null,
            academyJoinDate: oldPlayer.academyJoinDate ? new Date(oldPlayer.academyJoinDate) : null,
            nationality: oldPlayer.nationality || null,
            imageUrl: imageData ? imageData.path : null,
            status: status,
            birthCertificateNumber: oldPlayer.birthCertificateNumber || null,
            pinCode: pinCode,
            teamId: teamInfo.newId
          }
        });
        
        // Если у игрока есть документы, мигрируем их
        if (oldPlayer.passportUrl || oldPlayer.birthCertificateUrl || oldPlayer.insuranceUrl) {
          await migratePlayerDocuments(newPlayer.id, oldPlayer, teamInfo);
        }
        
        logMigration(`Успешно перенесен игрок: ${oldPlayer.lastName} ${oldPlayer.firstName}`);
        migratedCount++;
      } catch (error) {
        logMigration(`Ошибка при миграции игрока ${oldPlayer.lastName} ${oldPlayer.firstName}: ${error.message}`);
        skippedCount++;
      }
    }
    
    logMigration(`Миграция завершена. Перенесено игроков: ${migratedCount}, пропущено: ${skippedCount}`);
  } catch (error) {
    logMigration(`Критическая ошибка при миграции: ${error.message}`);
  } finally {
    await prisma.$disconnect();
  }
}

// Функция для миграции документов игрока
async function migratePlayerDocuments(playerId, oldPlayer, teamInfo) {
  try {
    // Находим администратора для привязки загрузки документов
    const adminUser = await prisma.user.findFirst({
      where: {
        role: 'ADMIN',
        clubId: teamInfo.clubId
      }
    });
    
    if (!adminUser) {
      logMigration(`Не найден администратор для клуба ${teamInfo.clubId}`);
      return;
    }
    
    // Мигрируем паспорт, если есть
    if (oldPlayer.passportUrl) {
      await migrateDocument(
        playerId,
        oldPlayer.passportUrl,
        'PASSPORT',
        'Паспорт',
        teamInfo.clubId,
        teamInfo.newId,
        adminUser.id,
        oldPlayer.passportFileName,
        oldPlayer.passportFileSize
      );
    }
    
    // Мигрируем свидетельство о рождении, если есть
    if (oldPlayer.birthCertificateUrl) {
      await migrateDocument(
        playerId,
        oldPlayer.birthCertificateUrl,
        'BIRTH_CERTIFICATE',
        'Свидетельство о рождении',
        teamInfo.clubId,
        teamInfo.newId,
        adminUser.id,
        oldPlayer.birthCertificateFileName,
        oldPlayer.birthCertificateFileSize
      );
    }
    
    // Мигрируем медицинскую страховку, если есть
    if (oldPlayer.insuranceUrl) {
      await migrateDocument(
        playerId,
        oldPlayer.insuranceUrl,
        'MEDICAL_INSURANCE',
        'Медицинская страховка',
        teamInfo.clubId,
        teamInfo.newId,
        adminUser.id,
        oldPlayer.insuranceFileName,
        oldPlayer.insuranceFileSize
      );
    }
  } catch (error) {
    logMigration(`Ошибка при миграции документов для игрока ${playerId}: ${error.message}`);
  }
}

// Функция для миграции одного документа
async function migrateDocument(playerId, oldUrl, docType, docName, clubId, teamId, adminId, fileName, fileSize) {
  try {
    if (!oldUrl) return;
    
    // Получаем файл из старого URL
    const response = await fetch(oldUrl);
    if (!response.ok) {
      logMigration(`Ошибка при загрузке документа ${docType} для игрока ${playerId}: Статус ${response.status}`);
      return;
    }
    
    const fileData = await response.arrayBuffer();
    
    // Создаем уникальное имя файла с временной меткой
    const timestamp = new Date().getTime();
    const fileExtension = fileName ? fileName.split('.').pop() : 'pdf';
    const newFileName = `${timestamp}-${docType.toLowerCase()}.${fileExtension}`;
    
    // Формируем путь к файлу в хранилище согласно структуре проекта
    const filePath = `players/${clubId}/${teamId}/${playerId}/documents/${newFileName}`;
    
    // Загружаем в новое хранилище
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('club-media')
      .upload(filePath, fileData, {
        contentType: 'application/octet-stream',
        upsert: true,
        metadata: {
          fileType: 'document',
          documentType: docType,
          playerId,
          teamId,
          clubId
        }
      });
    
    if (uploadError) {
      logMigration(`Ошибка при сохранении документа ${docType} для игрока ${playerId}: ${uploadError.message}`);
      return;
    }
    
    // Получаем публичный URL
    const { data: publicUrlData } = supabase
      .storage
      .from('club-media')
      .getPublicUrl(filePath);
    
    // Создаем запись документа в базе данных
    await prisma.playerDocument.create({
      data: {
        name: docName,
        type: docType,
        url: filePath,
        publicUrl: publicUrlData.publicUrl,
        size: fileSize || 0,
        playerId: playerId,
        clubId: clubId,
        uploadedById: adminId
      }
    });
    
    logMigration(`Успешно перенесен документ ${docType} для игрока ${playerId}`);
  } catch (error) {
    logMigration(`Ошибка при миграции документа ${docType} для игрока ${playerId}: ${error.message}`);
  }
}

// Запуск миграции
migratePlayersFromOldDb().catch((error) => {
  console.error('Ошибка при выполнении миграции:', error);
  process.exit(1);
}); 