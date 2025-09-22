const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://uteam-admin:Mell567234!@rc1d-40uv9fbi8p02b5c0.mdb.yandexcloud.net:6432/uteam?sslmode=verify-full&sslrootcert=./yandex_root.crt'
});

async function testGpsPermissions() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Тестируем GPS разрешения...\n');

    // 1. Проверяем разрешения для каждой роли
    const roles = ['SUPER_ADMIN', 'ADMIN', 'COACH', 'DOCTOR', 'DIRECTOR', 'SCOUT', 'MEMBER'];
    
    for (const role of roles) {
      console.log(`📋 Роль: ${role}`);
      
      const result = await client.query(`
        SELECT p.code, p.name, p.category
        FROM "GpsRolePermission" rp
        JOIN "GpsPermission" p ON rp."permissionId" = p.id
        WHERE rp.role = $1 AND rp.allowed = true
        ORDER BY p.category, p.code
      `, [role]);
      
      const permissionsByCategory = {};
      result.rows.forEach(row => {
        if (!permissionsByCategory[row.category]) {
          permissionsByCategory[row.category] = [];
        }
        permissionsByCategory[row.category].push(row.code);
      });
      
      Object.entries(permissionsByCategory).forEach(([category, permissions]) => {
        console.log(`  ${category}: ${permissions.join(', ')}`);
      });
      
      console.log(`  Всего разрешений: ${result.rows.length}\n`);
    }

    // 2. Проверяем конкретные разрешения
    console.log('🔍 Проверяем конкретные разрешения...\n');
    
    const testCases = [
      { role: 'COACH', permission: 'gps.reports.create', expected: true },
      { role: 'COACH', permission: 'gps.reports.delete', expected: false },
      { role: 'DOCTOR', permission: 'gps.data.edit', expected: false },
      { role: 'DOCTOR', permission: 'gps.data.view', expected: true },
      { role: 'MEMBER', permission: 'gps.profiles.create', expected: false },
      { role: 'MEMBER', permission: 'gps.reports.view', expected: true },
      { role: 'SUPER_ADMIN', permission: 'gps.admin.manage', expected: true },
    ];
    
    for (const testCase of testCases) {
      const result = await client.query(`
        SELECT rp.allowed
        FROM "GpsRolePermission" rp
        JOIN "GpsPermission" p ON rp."permissionId" = p.id
        WHERE rp.role = $1 AND p.code = $2
      `, [testCase.role, testCase.permission]);
      
      const hasPermission = result.rows.length > 0 && result.rows[0].allowed;
      const status = hasPermission === testCase.expected ? '✅' : '❌';
      
      console.log(`${status} ${testCase.role} + ${testCase.permission}: ${hasPermission} (ожидалось: ${testCase.expected})`);
    }

    console.log('\n🎉 Тестирование GPS разрешений завершено!');

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testGpsPermissions();