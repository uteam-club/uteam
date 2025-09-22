const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkGpsPermissions() {
  try {
    console.log('🔍 Проверяю GPS разрешения в базе данных...\n');
    
    // Проверяем GPS разрешения
    const permissionsResult = await pool.query('SELECT * FROM "GpsPermission" ORDER BY category, name');
    console.log(`📊 GPS разрешений: ${permissionsResult.rows.length}`);
    
    if (permissionsResult.rows.length > 0) {
      console.log('\n📋 Список GPS разрешений:');
      permissionsResult.rows.forEach(perm => {
        console.log(`  - ${perm.code}: ${perm.name} (${perm.category})`);
      });
    }
    
    // Проверяем GPS разрешения ролей
    const rolePermissionsResult = await pool.query('SELECT * FROM "GpsRolePermission" ORDER BY role, "permissionId"');
    console.log(`\n👥 GPS разрешений ролей: ${rolePermissionsResult.rows.length}`);
    
    if (rolePermissionsResult.rows.length > 0) {
      console.log('\n📋 Список GPS разрешений ролей:');
      rolePermissionsResult.rows.forEach(rp => {
        console.log(`  - ${rp.role}: ${rp.permissionId} (${rp.allowed ? 'разрешено' : 'запрещено'})`);
      });
    }
    
    // Проверяем GPS разрешения пользователей
    const userPermissionsResult = await pool.query('SELECT * FROM "GpsUserPermission" ORDER BY "userId", "clubId"');
    console.log(`\n👤 GPS разрешений пользователей: ${userPermissionsResult.rows.length}`);
    
    if (userPermissionsResult.rows.length > 0) {
      console.log('\n📋 Список GPS разрешений пользователей:');
      userPermissionsResult.rows.forEach(up => {
        console.log(`  - Пользователь ${up.userId}: клуб ${up.clubId} (view: ${up.canView}, edit: ${up.canEdit}, delete: ${up.canDelete}, export: ${up.canExport}, manage: ${up.canManageProfiles})`);
      });
    }
    
    console.log('\n✅ Проверка завершена!');
    
  } catch (error) {
    console.error('❌ Ошибка при проверке GPS разрешений:', error.message);
  } finally {
    await pool.end();
  }
}

checkGpsPermissions();
