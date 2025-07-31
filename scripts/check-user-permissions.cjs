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

async function checkUserPermissions() {
  try {
    console.log('🔍 Проверяем права пользователей...\n');

    const fdcvistaClubId = '0af208e0-aed2-4374-bb67-c38443a46b8a';

    // Проверяем пользователей FDC Vista
    const usersResult = await pool.query(`
      SELECT id, email, name, role, "clubId" 
      FROM "User" 
      WHERE "clubId" = $1
      ORDER BY role, name
    `, [fdcvistaClubId]);

    console.log('👥 Пользователи FDC Vista:');
    usersResult.rows.forEach(user => {
      console.log(`  - ${user.name || user.email} (${user.role}) - ID: ${user.id}`);
    });
    console.log('');

    // Проверяем права ролей
    console.log('🔐 Права ролей:');
    const rolePermissionsResult = await pool.query(`
      SELECT rp.role, p.code, rp.allowed
      FROM "RolePermission" rp
      JOIN "Permission" p ON rp."permissionId" = p.id
      WHERE p.code LIKE '%admin%' OR p.code LIKE '%training%' OR p.code LIKE '%exercise%'
      ORDER BY rp.role, p.code
    `);

    const permissionsByRole = {};
    rolePermissionsResult.rows.forEach(row => {
      if (!permissionsByRole[row.role]) {
        permissionsByRole[row.role] = [];
      }
      permissionsByRole[row.role].push(`${row.code}: ${row.allowed}`);
    });

    Object.entries(permissionsByRole).forEach(([role, permissions]) => {
      console.log(`  📋 ${role}:`);
      permissions.forEach(perm => {
        console.log(`    - ${perm}`);
      });
    });
    console.log('');

    // Проверяем индивидуальные права пользователей
    console.log('👤 Индивидуальные права пользователей:');
    const userPermissionsResult = await pool.query(`
      SELECT up."userId", u.name, u.email, p.code, up.allowed
      FROM "UserPermission" up
      JOIN "User" u ON up."userId" = u.id
      JOIN "Permission" p ON up."permissionId" = p.id
      WHERE u."clubId" = $1
      ORDER BY u.name, p.code
    `, [fdcvistaClubId]);

    if (userPermissionsResult.rows.length === 0) {
      console.log('  ❌ Нет индивидуальных прав');
    } else {
      const userPerms = {};
      userPermissionsResult.rows.forEach(row => {
        if (!userPerms[row.name || row.email]) {
          userPerms[row.name || row.email] = [];
        }
        userPerms[row.name || row.email].push(`${row.code}: ${row.allowed}`);
      });

      Object.entries(userPerms).forEach(([user, permissions]) => {
        console.log(`  👤 ${user}:`);
        permissions.forEach(perm => {
          console.log(`    - ${perm}`);
        });
      });
    }

  } catch (error) {
    console.error('❌ Ошибка при проверке прав:', error);
  } finally {
    await pool.end();
  }
}

checkUserPermissions(); 