const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function analyzeAdminPermissions() {
  try {
    console.log('🔍 Анализирую административные GPS разрешения...\n');
    
    // 1. Получаем административные разрешения
    const adminPermsResult = await pool.query(`
      SELECT id, code, name, description, category
      FROM "GpsPermission" 
      WHERE category = 'admin'
      ORDER BY name
    `);
    
    console.log('📋 Административные GPS разрешения:');
    adminPermsResult.rows.forEach(perm => {
      console.log(`  - ${perm.code}: ${perm.name}`);
      console.log(`    Описание: ${perm.description}`);
      console.log(`    ID: ${perm.id}`);
    });
    
    // 2. Проверяем, какие роли имеют эти разрешения
    console.log('\n👥 Назначения административных разрешений:');
    for (const perm of adminPermsResult.rows) {
      const roleResult = await pool.query(`
        SELECT role, allowed
        FROM "GpsRolePermission" 
        WHERE "permissionId" = $1
        ORDER BY role
      `, [perm.id]);
      
      console.log(`\n  ${perm.code} (${perm.name}):`);
      if (roleResult.rows.length > 0) {
        roleResult.rows.forEach(rp => {
          const status = rp.allowed ? '✅ разрешено' : '❌ запрещено';
          console.log(`    ${rp.role}: ${status}`);
        });
      } else {
        console.log('    ❌ Нет назначений ролям');
      }
    }
    
    // 3. Анализируем, нужны ли эти разрешения
    console.log('\n🤔 Анализ необходимости разрешений:');
    
    console.log('\n  gps.admin.permissions (Управление GPS разрешениями):');
    console.log('    📝 Назначение: Управление системой GPS разрешений');
    console.log('    🎯 Кто должен иметь: Только SUPER_ADMIN');
    console.log('    ⚠️  Риск: Высокий - дает полный контроль над GPS разрешениями');
    console.log('    💡 Рекомендация: Оставить только для SUPER_ADMIN');
    
    console.log('\n  gps.admin.manage (Полное управление GPS системой):');
    console.log('    📝 Назначение: Полный контроль над GPS системой');
    console.log('    🎯 Кто должен иметь: Только SUPER_ADMIN');
    console.log('    ⚠️  Риск: Критический - дает полный доступ ко всем GPS функциям');
    console.log('    💡 Рекомендация: Оставить только для SUPER_ADMIN');
    
    // 4. Проверяем использование в коде
    console.log('\n💻 Использование в коде:');
    console.log('    - gps.admin.permissions: Используется в gps-permissions.ts');
    console.log('    - gps.admin.manage: Используется в gps-permissions.ts');
    console.log('    - Оба разрешения привязаны к canManageProfiles в пользовательских разрешениях');
    
    // 5. Рекомендации
    console.log('\n📋 РЕКОМЕНДАЦИИ:');
    console.log('  1. ✅ Оставить оба разрешения только для SUPER_ADMIN');
    console.log('  2. ✅ Заблокировать редактирование этих разрешений в админке');
    console.log('  3. ✅ Добавить визуальную индикацию, что это системные разрешения');
    console.log('  4. ✅ Обновить UI, чтобы показать, что эти разрешения недоступны для редактирования');
    
    console.log('\n🔧 Возможные действия:');
    console.log('  A. Удалить эти разрешения полностью (если не используются)');
    console.log('  B. Оставить только для SUPER_ADMIN и заблокировать редактирование');
    console.log('  C. Скрыть их из интерфейса админки');
    
  } catch (error) {
    console.error('❌ Ошибка при анализе:', error.message);
  } finally {
    await pool.end();
  }
}

analyzeAdminPermissions();
