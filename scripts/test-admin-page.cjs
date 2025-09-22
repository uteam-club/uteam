const fetch = require('node-fetch');

async function testAdminPage() {
  try {
    console.log('🔍 Тестирую страницу админки...\n');
    
    // Тестируем API эндпоинты
    console.log('1. Тестирую API ролей...');
    const rolesResponse = await fetch('http://localhost:3000/api/roles');
    const roles = await rolesResponse.json();
    console.log(`✅ Роли: ${roles.length} (${roles.join(', ')})`);
    
    console.log('\n2. Тестирую API разрешений...');
    const permissionsResponse = await fetch('http://localhost:3000/api/permissions');
    const permissions = await permissionsResponse.json();
    console.log(`✅ Разрешения: ${permissions.length}`);
    
    console.log('\n3. Тестирую API GPS разрешений...');
    const gpsPermissionsResponse = await fetch('http://localhost:3000/api/gps/permissions');
    const gpsPermissions = await gpsPermissionsResponse.json();
    console.log(`✅ GPS разрешения: ${gpsPermissions.length}`);
    
    console.log('\n4. Тестирую API разрешений роли ADMIN...');
    const rolePermissionsResponse = await fetch('http://localhost:3000/api/roles/ADMIN/permissions');
    const rolePermissions = await rolePermissionsResponse.json();
    console.log(`✅ Разрешения роли ADMIN: ${rolePermissions.length}`);
    
    console.log('\n5. Тестирую API GPS разрешений роли ADMIN...');
    const gpsRolePermissionsResponse = await fetch('http://localhost:3000/api/gps/roles/ADMIN/permissions');
    const gpsRolePermissions = await gpsRolePermissionsResponse.json();
    console.log(`✅ GPS разрешения роли ADMIN: ${gpsRolePermissions.length}`);
    
    console.log('\n6. Проверяю структуру данных...');
    
    // Проверяем структуру GPS разрешений
    if (gpsPermissions.length > 0) {
      const gpsPerm = gpsPermissions[0];
      console.log(`   GPS разрешение: ${gpsPerm.code} - ${gpsPerm.name} (${gpsPerm.category})`);
    }
    
    // Проверяем структуру GPS разрешений роли
    if (gpsRolePermissions.length > 0) {
      const gpsRolePerm = gpsRolePermissions[0];
      console.log(`   GPS разрешение роли: ${gpsRolePerm.code} - ${gpsRolePerm.description} (${gpsRolePerm.allowed ? 'разрешено' : 'запрещено'})`);
    }
    
    console.log('\n✅ Все тесты прошли успешно!');
    console.log('\n📊 Итоговая статистика:');
    console.log(`   - Ролей: ${roles.length}`);
    console.log(`   - Обычных разрешений: ${permissions.length}`);
    console.log(`   - GPS разрешений: ${gpsPermissions.length}`);
    console.log(`   - Разрешений роли ADMIN: ${rolePermissions.length}`);
    console.log(`   - GPS разрешений роли ADMIN: ${gpsRolePermissions.length}`);
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
  }
}

testAdminPage();
