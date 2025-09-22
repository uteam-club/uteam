const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function fixMissingGpsPermissions() {
  try {
    console.log('🔧 Исправляю недостающие GPS разрешения...\n');
    
    // Получаем все GPS разрешения
    const permissionsResult = await pool.query(`
      SELECT id, code, name, category 
      FROM "GpsPermission" 
      ORDER BY category, name
    `);
    
    console.log('📋 Найденные GPS разрешения:');
    permissionsResult.rows.forEach(perm => {
      console.log(`  ${perm.code} - ${perm.name} (${perm.category})`);
    });
    
    // Определяем, какие разрешения должны быть у каждой роли
    const rolePermissions = {
      'SUPER_ADMIN': permissionsResult.rows.map(p => p.id), // Все разрешения
      'ADMIN': permissionsResult.rows.filter(p => p.code !== 'gps.admin.permissions' && p.code !== 'gps.admin.manage').map(p => p.id),
      'COACH': permissionsResult.rows.filter(p => 
        p.code.startsWith('gps.data.') || 
        p.code.startsWith('gps.profiles.') || 
        p.code.startsWith('gps.reports.')
      ).map(p => p.id),
      'MEMBER': permissionsResult.rows.filter(p => 
        p.code === 'gps.data.view' || 
        p.code === 'gps.profiles.view' || 
        p.code === 'gps.reports.view'
      ).map(p => p.id),
      'SCOUT': permissionsResult.rows.filter(p => 
        p.code === 'gps.data.view' || 
        p.code === 'gps.data.export' || 
        p.code === 'gps.profiles.view' || 
        p.code === 'gps.reports.view' || 
        p.code === 'gps.reports.export'
      ).map(p => p.id),
      'DOCTOR': permissionsResult.rows.filter(p => 
        p.code === 'gps.data.view' || 
        p.code === 'gps.data.export' || 
        p.code === 'gps.profiles.view' || 
        p.code === 'gps.reports.view' || 
        p.code === 'gps.reports.export'
      ).map(p => p.id),
      'DIRECTOR': permissionsResult.rows.filter(p => 
        p.code === 'gps.data.view' || 
        p.code === 'gps.data.export' || 
        p.code === 'gps.profiles.view' || 
        p.code === 'gps.reports.view' || 
        p.code === 'gps.reports.export'
      ).map(p => p.id)
    };
    
    console.log('\n🔍 Проверяю текущие разрешения ролей...');
    
    for (const [role, expectedPermissions] of Object.entries(rolePermissions)) {
      console.log(`\n🔸 Роль: ${role}`);
      
      // Получаем текущие разрешения роли
      const currentResult = await pool.query(`
        SELECT "permissionId" 
        FROM "GpsRolePermission" 
        WHERE role = $1
      `, [role]);
      
      const currentPermissions = currentResult.rows.map(r => r.permissionId);
      
      // Находим недостающие разрешения
      const missingPermissions = expectedPermissions.filter(permId => 
        !currentPermissions.includes(permId)
      );
      
      if (missingPermissions.length > 0) {
        console.log(`  ❌ Недостающие разрешения: ${missingPermissions.length}`);
        
        // Добавляем недостающие разрешения
        for (const permissionId of missingPermissions) {
          const perm = permissionsResult.rows.find(p => p.id === permissionId);
          console.log(`    ➕ Добавляю: ${perm.code} - ${perm.name}`);
          
          await pool.query(`
            INSERT INTO "GpsRolePermission" (role, "permissionId", allowed)
            VALUES ($1, $2, true)
          `, [role, permissionId]);
        }
      } else {
        console.log(`  ✅ Все разрешения на месте`);
      }
    }
    
    console.log('\n✅ Исправление завершено!');
    
    // Проверяем результат
    console.log('\n🔍 Проверяю результат...');
    
    const finalCheck = await pool.query(`
      SELECT 
        rp.role,
        p.code,
        p.name,
        rp.allowed
      FROM "GpsRolePermission" rp
      JOIN "GpsPermission" p ON rp."permissionId" = p.id
      WHERE rp.role = 'COACH' AND p.code = 'gps.profiles.delete'
    `);
    
    if (finalCheck.rows.length > 0) {
      const perm = finalCheck.rows[0];
      console.log(`  ✅ COACH теперь имеет: ${perm.code} - ${perm.name} (${perm.allowed ? 'разрешено' : 'запрещено'})`);
    } else {
      console.log('  ❌ COACH все еще не имеет gps.profiles.delete');
    }
    
  } catch (error) {
    console.error('❌ Ошибка при исправлении GPS разрешений:', error.message);
  } finally {
    await pool.end();
  }
}

fixMissingGpsPermissions();
