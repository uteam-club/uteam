const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function comprehensiveGpsPermissionsTest() {
  try {
    console.log('🔍 Выполняю комплексную проверку GPS разрешений...\n');
    
    // 1. Проверяем все GPS разрешения
    console.log('1️⃣ Проверяю GPS разрешения в базе данных...');
    const permissionsResult = await pool.query(`
      SELECT id, code, name, category, description
      FROM "GpsPermission" 
      ORDER BY category, name
    `);
    
    console.log(`   📊 Всего GPS разрешений: ${permissionsResult.rows.length}`);
    
    const expectedPermissions = [
      { code: 'gps.admin.permissions', name: 'Управление GPS разрешениями', category: 'admin' },
      { code: 'gps.admin.manage', name: 'Управление GPS системой', category: 'admin' },
      { code: 'gps.data.view', name: 'Просмотр GPS данных', category: 'data' },
      { code: 'gps.data.edit', name: 'Редактирование GPS данных', category: 'data' },
      { code: 'gps.data.export', name: 'Экспорт GPS данных', category: 'data' },
      { code: 'gps.profiles.view', name: 'Просмотр GPS профилей', category: 'profiles' },
      { code: 'gps.profiles.edit', name: 'Редактирование GPS профилей', category: 'profiles' },
      { code: 'gps.profiles.create', name: 'Создание GPS профилей', category: 'profiles' },
      { code: 'gps.profiles.delete', name: 'Удаление GPS профилей', category: 'profiles' },
      { code: 'gps.reports.view', name: 'Просмотр GPS отчетов', category: 'reports' },
      { code: 'gps.reports.edit', name: 'Редактирование GPS отчетов', category: 'reports' },
      { code: 'gps.reports.create', name: 'Создание GPS отчетов', category: 'reports' },
      { code: 'gps.reports.delete', name: 'Удаление GPS отчетов', category: 'reports' },
      { code: 'gps.reports.export', name: 'Экспорт GPS данных', category: 'reports' }
    ];
    
    let missingPermissions = [];
    let extraPermissions = [];
    
    for (const expected of expectedPermissions) {
      const found = permissionsResult.rows.find(p => p.code === expected.code);
      if (!found) {
        missingPermissions.push(expected);
      } else if (found.name !== expected.name || found.category !== expected.category) {
        console.log(`   ⚠️  Несоответствие: ${expected.code} - ожидалось "${expected.name}" (${expected.category}), найдено "${found.name}" (${found.category})`);
      }
    }
    
    for (const found of permissionsResult.rows) {
      const expected = expectedPermissions.find(p => p.code === found.code);
      if (!expected) {
        extraPermissions.push(found);
      }
    }
    
    if (missingPermissions.length > 0) {
      console.log(`   ❌ Отсутствующие разрешения: ${missingPermissions.length}`);
      missingPermissions.forEach(p => console.log(`      - ${p.code}: ${p.name}`));
    }
    
    if (extraPermissions.length > 0) {
      console.log(`   ⚠️  Лишние разрешения: ${extraPermissions.length}`);
      extraPermissions.forEach(p => console.log(`      - ${p.code}: ${p.name}`));
    }
    
    if (missingPermissions.length === 0 && extraPermissions.length === 0) {
      console.log('   ✅ Все GPS разрешения корректны');
    }
    
    // 2. Проверяем роли
    console.log('\n2️⃣ Проверяю роли...');
    const roles = ['SUPER_ADMIN', 'ADMIN', 'COACH', 'MEMBER', 'SCOUT', 'DOCTOR', 'DIRECTOR'];
    console.log(`   📊 Ролей для проверки: ${roles.length}`);
    
    // 3. Проверяем разрешения для каждой роли
    console.log('\n3️⃣ Проверяю разрешения для каждой роли...');
    
    const expectedRolePermissions = {
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
    
    let totalIssues = 0;
    
    for (const role of roles) {
      console.log(`\n   🔸 Роль: ${role}`);
      
      const currentResult = await pool.query(`
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
      
      const currentPermissions = currentResult.rows.map(r => r.permissionId);
      const expectedPermissions = expectedRolePermissions[role] || [];
      
      // Находим недостающие разрешения
      const missing = expectedPermissions.filter(permId => !currentPermissions.includes(permId));
      
      // Находим лишние разрешения
      const extra = currentPermissions.filter(permId => !expectedPermissions.includes(permId));
      
      // Находим разрешения с неправильным статусом (должны быть true)
      const wrongStatus = currentResult.rows.filter(r => !r.allowed);
      
      if (missing.length > 0) {
        console.log(`      ❌ Недостающие разрешения: ${missing.length}`);
        missing.forEach(permId => {
          const perm = permissionsResult.rows.find(p => p.id === permId);
          if (perm) {
            console.log(`         - ${perm.code}: ${perm.name}`);
          }
        });
        totalIssues += missing.length;
      }
      
      if (extra.length > 0) {
        console.log(`      ⚠️  Лишние разрешения: ${extra.length}`);
        extra.forEach(permId => {
          const perm = currentResult.rows.find(r => r.permissionId === permId);
          if (perm) {
            console.log(`         - ${perm.code}: ${perm.name}`);
          }
        });
      }
      
      if (wrongStatus.length > 0) {
        console.log(`      ❌ Разрешения с неправильным статусом: ${wrongStatus.length}`);
        wrongStatus.forEach(r => {
          console.log(`         - ${r.code}: ${r.name} (${r.allowed ? 'разрешено' : 'запрещено'})`);
        });
        totalIssues += wrongStatus.length;
      }
      
      if (missing.length === 0 && extra.length === 0 && wrongStatus.length === 0) {
        console.log(`      ✅ Все разрешения корректны (${currentPermissions.length})`);
      }
    }
    
    // 4. Проверяем индексы
    console.log('\n4️⃣ Проверяю индексы...');
    const indexesResult = await pool.query(`
      SELECT 
        indexname,
        tablename,
        indexdef
      FROM pg_indexes 
      WHERE tablename IN ('GpsPermission', 'GpsRolePermission', 'GpsUserPermission')
      ORDER BY tablename, indexname
    `);
    
    console.log(`   📊 Найдено индексов: ${indexesResult.rows.length}`);
    indexesResult.rows.forEach(idx => {
      console.log(`      - ${idx.tablename}.${idx.indexname}`);
    });
    
    // 5. Проверяем ограничения
    console.log('\n5️⃣ Проверяю ограничения...');
    const constraintsResult = await pool.query(`
      SELECT 
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name IN ('GpsPermission', 'GpsRolePermission', 'GpsUserPermission')
      ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name
    `);
    
    console.log(`   📊 Найдено ограничений: ${constraintsResult.rows.length}`);
    constraintsResult.rows.forEach(constraint => {
      console.log(`      - ${constraint.table_name}.${constraint.constraint_name} (${constraint.constraint_type})`);
    });
    
    // 6. Проверяем статистику
    console.log('\n6️⃣ Проверяю статистику...');
    const statsResult = await pool.query(`
      SELECT 
        'GpsPermission' as table_name,
        COUNT(*) as total_permissions,
        COUNT(DISTINCT category) as categories
      FROM "GpsPermission"
      UNION ALL
      SELECT 
        'GpsRolePermission' as table_name,
        COUNT(*) as total_permissions,
        COUNT(DISTINCT role) as categories
      FROM "GpsRolePermission"
      UNION ALL
      SELECT 
        'GpsUserPermission' as table_name,
        COUNT(*) as total_permissions,
        COUNT(DISTINCT "userId") as categories
      FROM "GpsUserPermission"
    `);
    
    statsResult.rows.forEach(stat => {
      console.log(`   📊 ${stat.table_name}: ${stat.total_permissions} записей, ${stat.categories} уникальных значений`);
    });
    
    // 7. Итоговый отчет
    console.log('\n📋 ИТОГОВЫЙ ОТЧЕТ:');
    console.log(`   🔍 Проверено разрешений: ${permissionsResult.rows.length}`);
    console.log(`   🔍 Проверено ролей: ${roles.length}`);
    console.log(`   🔍 Найдено проблем: ${totalIssues}`);
    
    if (totalIssues === 0) {
      console.log('   ✅ ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ УСПЕШНО!');
      console.log('   🎉 GPS разрешения настроены корректно!');
    } else {
      console.log('   ❌ НАЙДЕНЫ ПРОБЛЕМЫ, ТРЕБУЕТСЯ ИСПРАВЛЕНИЕ');
    }
    
  } catch (error) {
    console.error('❌ Ошибка при комплексной проверке:', error.message);
  } finally {
    await pool.end();
  }
}

comprehensiveGpsPermissionsTest();
