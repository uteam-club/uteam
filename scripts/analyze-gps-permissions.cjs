const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function analyzeGpsPermissions() {
  try {
    console.log('🔍 Анализирую GPS разрешения и их связи с ролями...\n');
    
    // Получаем все GPS разрешения с их ID
    const permissionsResult = await pool.query(`
      SELECT id, code, name, category 
      FROM "GpsPermission" 
      ORDER BY category, name
    `);
    
    console.log('📋 GPS разрешения:');
    permissionsResult.rows.forEach(perm => {
      console.log(`  ${perm.id}: ${perm.code} - ${perm.name} (${perm.category})`);
    });
    
    console.log('\n👥 GPS разрешения по ролям:');
    
    // Анализируем каждую роль
    const roles = ['SUPER_ADMIN', 'ADMIN', 'COACH', 'MEMBER', 'SCOUT', 'DOCTOR', 'DIRECTOR'];
    
    for (const role of roles) {
      console.log(`\n🔸 Роль: ${role}`);
      
      const rolePermissionsResult = await pool.query(`
        SELECT 
          rp."permissionId",
          rp.allowed,
          p.code,
          p.name,
          p.category
        FROM "GpsRolePermission" rp
        JOIN "GpsPermission" p ON rp."permissionId" = p.id
        WHERE rp.role = $1
        ORDER BY p.category, p.name
      `, [role]);
      
      if (rolePermissionsResult.rows.length === 0) {
        console.log('  ❌ Нет разрешений');
        continue;
      }
      
      // Группируем по категориям
      const byCategory = {};
      rolePermissionsResult.rows.forEach(rp => {
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
    }
    
    // Проверяем, есть ли разрешение "gps.profiles.delete" для роли COACH
    console.log('\n🔍 Проверяю конкретно "gps.profiles.delete" для роли COACH:');
    
    const specificCheck = await pool.query(`
      SELECT 
        rp."permissionId",
        rp.allowed,
        p.code,
        p.name
      FROM "GpsRolePermission" rp
      JOIN "GpsPermission" p ON rp."permissionId" = p.id
      WHERE rp.role = 'COACH' AND p.code = 'gps.profiles.delete'
    `);
    
    if (specificCheck.rows.length > 0) {
      const perm = specificCheck.rows[0];
      console.log(`  Найдено: ${perm.code} - ${perm.name} (${perm.allowed ? 'разрешено' : 'запрещено'})`);
    } else {
      console.log('  ❌ Разрешение gps.profiles.delete НЕ НАЙДЕНО для роли COACH');
    }
    
    // Проверяем, есть ли вообще разрешение gps.profiles.delete
    console.log('\n🔍 Проверяю, существует ли разрешение gps.profiles.delete:');
    
    const permExists = await pool.query(`
      SELECT id, code, name, category 
      FROM "GpsPermission" 
      WHERE code = 'gps.profiles.delete'
    `);
    
    if (permExists.rows.length > 0) {
      const perm = permExists.rows[0];
      console.log(`  ✅ Найдено: ${perm.id} - ${perm.code} - ${perm.name} (${perm.category})`);
    } else {
      console.log('  ❌ Разрешение gps.profiles.delete НЕ СУЩЕСТВУЕТ в базе данных');
    }
    
  } catch (error) {
    console.error('❌ Ошибка при анализе GPS разрешений:', error.message);
  } finally {
    await pool.end();
  }
}

analyzeGpsPermissions();
