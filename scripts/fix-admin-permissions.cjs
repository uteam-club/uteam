const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function fixAdminPermissions() {
  try {
    console.log('🔧 Исправляю разрешения роли ADMIN...\n');
    
    // Получаем ID разрешения gps.admin.permissions
    const adminPermResult = await pool.query(`
      SELECT id, code, name 
      FROM "GpsPermission" 
      WHERE code = 'gps.admin.permissions'
    `);
    
    if (adminPermResult.rows.length === 0) {
      console.log('❌ Разрешение gps.admin.permissions не найдено');
      return;
    }
    
    const adminPerm = adminPermResult.rows[0];
    console.log(`📋 Найдено разрешение: ${adminPerm.code} - ${adminPerm.name} (ID: ${adminPerm.id})`);
    
    // Удаляем это разрешение для роли ADMIN
    const deleteResult = await pool.query(`
      DELETE FROM "GpsRolePermission" 
      WHERE role = 'ADMIN' AND "permissionId" = $1
    `, [adminPerm.id]);
    
    console.log(`✅ Удалено записей: ${deleteResult.rowCount}`);
    
    // Проверяем результат
    const checkResult = await pool.query(`
      SELECT 
        rp."permissionId",
        rp.allowed,
        p.code,
        p.name
      FROM "GpsRolePermission" rp
      JOIN "GpsPermission" p ON rp."permissionId" = p.id
      WHERE rp.role = 'ADMIN' AND p.code = 'gps.admin.permissions'
    `);
    
    if (checkResult.rows.length === 0) {
      console.log('✅ Разрешение gps.admin.permissions успешно удалено для роли ADMIN');
    } else {
      console.log('❌ Ошибка: разрешение все еще существует для роли ADMIN');
    }
    
    // Показываем итоговые разрешения роли ADMIN
    console.log('\n📋 Итоговые разрешения роли ADMIN:');
    const finalResult = await pool.query(`
      SELECT 
        p.code,
        p.name,
        p.category,
        rp.allowed
      FROM "GpsRolePermission" rp
      JOIN "GpsPermission" p ON rp."permissionId" = p.id
      WHERE rp.role = 'ADMIN'
      ORDER BY p.category, p.name
    `);
    
    const byCategory = {};
    finalResult.rows.forEach(rp => {
      if (!byCategory[rp.category]) {
        byCategory[rp.category] = [];
      }
      byCategory[rp.category].push(rp);
    });
    
    Object.keys(byCategory).forEach(category => {
      console.log(`  📁 ${category}:`);
      byCategory[category].forEach(rp => {
        const status = rp.allowed ? '✅' : '❌';
        console.log(`    ${status} ${rp.code} - ${rp.name}`);
      });
    });
    
    console.log(`\n📊 Всего разрешений у роли ADMIN: ${finalResult.rows.length}`);
    
  } catch (error) {
    console.error('❌ Ошибка при исправлении разрешений роли ADMIN:', error.message);
  } finally {
    await pool.end();
  }
}

fixAdminPermissions();
