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

async function seedFDCVistaCategories() {
  try {
    console.log('🌱 Добавляем базовые данные для FDC Vista...\n');

    const fdcvistaClubId = '0af208e0-aed2-4374-bb67-c38443a46b8a';

    // 1. Добавляем категории тренировок
    const trainingCategories = [
      'Техническая тренировка',
      'Тактическая тренировка', 
      'Физическая тренировка',
      'Игровая тренировка',
      'Восстановительная тренировка'
    ];

    console.log('🏃‍♂️ Добавляем категории тренировок:');
    for (const name of trainingCategories) {
      const result = await pool.query(
        'INSERT INTO "TrainingCategory" (id, name, "clubId", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, NOW(), NOW()) RETURNING id, name',
        [name, fdcvistaClubId]
      );
      console.log(`  ✅ ${result.rows[0].name} (ID: ${result.rows[0].id})`);
    }
    console.log('');

    // 2. Получаем существующие категории упражнений
    const exerciseCategoriesResult = await pool.query(
      'SELECT id, name FROM "ExerciseCategory" WHERE "clubId" = $1',
      [fdcvistaClubId]
    );
    
    console.log('💪 Существующие категории упражнений:');
    exerciseCategoriesResult.rows.forEach(cat => {
      console.log(`  - ${cat.name} (ID: ${cat.id})`);
    });
    console.log('');

    // 3. Добавляем теги упражнений для каждой категории
    const exerciseTags = {
      'First team': [
        'Пас',
        'Удар',
        'Дриблинг',
        'Тактика',
        'Стандарты',
        'Игра в обороне',
        'Атака'
      ],
      'Academy': [
        'Техника',
        'Координация',
        'Скорость',
        'Выносливость',
        'Игровые упражнения',
        'Разминка',
        'Заминка'
      ]
    };

    console.log('🏷️ Добавляем теги упражнений:');
    for (const [categoryName, tags] of Object.entries(exerciseTags)) {
      const category = exerciseCategoriesResult.rows.find(cat => cat.name === categoryName);
      if (category) {
        console.log(`  📂 Категория: ${categoryName}`);
        for (const tagName of tags) {
          const result = await pool.query(
            'INSERT INTO "ExerciseTag" (id, name, "clubId", "exerciseCategoryId", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW()) RETURNING id, name',
            [tagName, fdcvistaClubId, category.id]
          );
          console.log(`    ✅ ${result.rows[0].name} (ID: ${result.rows[0].id})`);
        }
      }
    }
    console.log('');

    console.log('🎉 Все данные успешно добавлены для FDC Vista!');

  } catch (error) {
    console.error('❌ Ошибка при добавлении данных:', error);
  } finally {
    await pool.end();
  }
}

seedFDCVistaCategories(); 