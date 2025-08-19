const { Pool } = require('pg');

// Конфигурация базы данных
const pool = new Pool({
  host: 'rc1d-40uv9fbi8p02b5c0.mdb.yandexcloud.net',
  port: 6432,
  database: 'uteam',
  user: 'uteam-admin',
  password: 'Mell567234!',
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkExerciseData() {
  try {
    console.log('🔍 Проверяем данные упражнений в базе...\n');

    // 1. Проверяем категории упражнений
    console.log('📁 Категории упражнений:');
    const categoriesResult = await pool.query(
      'SELECT id, name, "clubId" FROM "ExerciseCategory" ORDER BY name'
    );
    
    if (categoriesResult.rows.length === 0) {
      console.log('  ❌ Категории упражнений не найдены');
    } else {
      categoriesResult.rows.forEach(cat => {
        console.log(`  ✅ ${cat.name} (ID: ${cat.id}, Club: ${cat.clubId})`);
      });
    }
    console.log('');

    // 2. Проверяем теги упражнений
    console.log('🏷️ Теги упражнений:');
    const tagsResult = await pool.query(
      'SELECT id, name, "clubId", "exerciseCategoryId" FROM "ExerciseTag" ORDER BY name'
    );
    
    if (tagsResult.rows.length === 0) {
      console.log('  ❌ Теги упражнений не найдены');
    } else {
      tagsResult.rows.forEach(tag => {
        console.log(`  ✅ ${tag.name} (ID: ${tag.id}, Club: ${tag.clubId}, Category: ${tag.exerciseCategoryId})`);
      });
    }
    console.log('');

    // 3. Проверяем связь тегов с категориями
    console.log('🔗 Связь тегов с категориями:');
    const tagsWithCategoriesResult = await pool.query(`
      SELECT 
        t.id as tag_id,
        t.name as tag_name,
        c.id as category_id,
        c.name as category_name,
        t."clubId"
      FROM "ExerciseTag" t
      LEFT JOIN "ExerciseCategory" c ON t."exerciseCategoryId" = c.id
      ORDER BY c.name, t.name
    `);
    
    if (tagsWithCategoriesResult.rows.length === 0) {
      console.log('  ❌ Связи тегов с категориями не найдены');
    } else {
      const groupedByCategory = {};
      tagsWithCategoriesResult.rows.forEach(row => {
        const categoryName = row.category_name || 'Без категории';
        if (!groupedByCategory[categoryName]) {
          groupedByCategory[categoryName] = [];
        }
        groupedByCategory[categoryName].push(row.tag_name);
      });
      
      Object.entries(groupedByCategory).forEach(([categoryName, tags]) => {
        console.log(`  📂 ${categoryName}:`);
        tags.forEach(tagName => {
          console.log(`    - ${tagName}`);
        });
      });
    }
    console.log('');

    // 4. Проверяем клубы
    console.log('🏢 Клубы:');
    const clubsResult = await pool.query(
      'SELECT id, name, subdomain FROM "Club" ORDER BY name'
    );
    
    if (clubsResult.rows.length === 0) {
      console.log('  ❌ Клубы не найдены');
    } else {
      clubsResult.rows.forEach(club => {
        console.log(`  ✅ ${club.name} (ID: ${club.id}, Subdomain: ${club.subdomain})`);
      });
    }

  } catch (error) {
    console.error('❌ Ошибка при проверке данных:', error);
  } finally {
    await pool.end();
  }
}

checkExerciseData();

