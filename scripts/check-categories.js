const { Pool } = require('pg');

// Конфигурация базы данных
const pool = new Pool({
  host: 'rc1d-40uv9fbi8p02b5c0.mdb.yandexcloud.net',
  port: 6432,
  database: 'uteam',
  user: 'uteam_bot_reader',
  password: 'uteambot567234!',
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkCategories() {
  try {
    console.log('🔍 Проверяем данные в таблицах категорий...\n');

    // Проверяем клубы
    const clubsResult = await pool.query('SELECT id, name, subdomain FROM "Club" LIMIT 5');
    console.log('📋 Клубы:');
    clubsResult.rows.forEach(club => {
      console.log(`  - ${club.name} (${club.subdomain}) - ID: ${club.id}`);
    });
    console.log('');

    // Проверяем категории тренировок
    const trainingCategoriesResult = await pool.query('SELECT id, name, "clubId" FROM "TrainingCategory" LIMIT 10');
    console.log('🏃‍♂️ Категории тренировок:');
    if (trainingCategoriesResult.rows.length === 0) {
      console.log('  ❌ Нет данных');
    } else {
      trainingCategoriesResult.rows.forEach(cat => {
        console.log(`  - ${cat.name} (Club ID: ${cat.clubId})`);
      });
    }
    console.log('');

    // Проверяем категории упражнений
    const exerciseCategoriesResult = await pool.query('SELECT id, name, "clubId" FROM "ExerciseCategory" LIMIT 10');
    console.log('💪 Категории упражнений:');
    if (exerciseCategoriesResult.rows.length === 0) {
      console.log('  ❌ Нет данных');
    } else {
      exerciseCategoriesResult.rows.forEach(cat => {
        console.log(`  - ${cat.name} (Club ID: ${cat.clubId})`);
      });
    }
    console.log('');

    // Проверяем теги упражнений
    const exerciseTagsResult = await pool.query(`
      SELECT et.id, et.name, et."clubId", ec.name as category_name 
      FROM "ExerciseTag" et 
      LEFT JOIN "ExerciseCategory" ec ON et."exerciseCategoryId" = ec.id 
      LIMIT 10
    `);
    console.log('🏷️ Теги упражнений:');
    if (exerciseTagsResult.rows.length === 0) {
      console.log('  ❌ Нет данных');
    } else {
      exerciseTagsResult.rows.forEach(tag => {
        console.log(`  - ${tag.name} (Категория: ${tag.category_name || 'Не указана'}, Club ID: ${tag.clubId})`);
      });
    }
    console.log('');

    // Проверяем пользователей
    const usersResult = await pool.query('SELECT id, email, name, role, "clubId" FROM "User" LIMIT 5');
    console.log('👥 Пользователи:');
    usersResult.rows.forEach(user => {
      console.log(`  - ${user.name || user.email} (${user.role}) - Club ID: ${user.clubId}`);
    });

  } catch (error) {
    console.error('❌ Ошибка при проверке данных:', error);
  } finally {
    await pool.end();
  }
}

checkCategories(); 