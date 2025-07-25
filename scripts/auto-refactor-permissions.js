// Скрипт для полуавтоматического рефакторинга проверок доступа по ролям на новую систему прав
// Запуск: node scripts/auto-refactor-permissions.js

const fs = require('fs');
const path = require('path');

// Мапа для автоматического определения прав по названию файла и методу (дополнить вручную по необходимости)
const PERMISSION_MAP = {
  'users/route.ts': { GET: 'users.read', POST: 'users.create' },
  'teams/route.ts': { GET: 'teams.read', POST: 'teams.create' },
  'matches/route.ts': { GET: 'matches.read', POST: 'matches.create' },
  'documents/route.ts': { GET: 'documents.read', POST: 'documents.create' },
  'exercises/route.ts': { GET: 'exercises.read', POST: 'exercises.create' },
  // ...дополнить по необходимости
};

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, callback);
    else callback(p);
  });
}

function insertImports(content) {
  let changed = false;
  if (!content.includes('getUserPermissions')) {
    content = `import { getUserPermissions } from '@/services/user.service';\nimport { hasPermission } from '@/lib/permissions';\n` + content;
    changed = true;
  }
  return { content, changed };
}

function refactorFile(file) {
  if (!file.endsWith('.ts') && !file.endsWith('.tsx')) return;
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Удаляем объявление allowedRoles
  content = content.replace(/const allowedRoles = .+?;\n/g, () => {
    changed = true;
    return '';
  });

  // Заменяем проверки allowedRoles.includes(...)
  content = content.replace(
    /if\s*\(\s*!\s*token\s*\|\|\s*!allowedRoles\.includes\(token\.role as string\)\s*\)/g,
    () => {
      changed = true;
      return 'if (!token)'; // Дальше вставим проверку прав
    }
  );

  // Вставляем импорт, если его нет
  const importResult = insertImports(content);
  content = importResult.content;
  if (importResult.changed) changed = true;

  // Вставляем проверку прав (TODO — доработать под каждый метод)
  content = content.replace(
    /if\s*\(\s*!\s*token\s*\)/g,
    match => {
      changed = true;
      // Определяем право по имени файла и методу (GET/POST)
      const fileName = file.split('/').slice(-2).join('/');
      const methodMatch = content.match(/export async function (\w+)/);
      const method = methodMatch ? methodMatch[1].toUpperCase() : 'GET';
      const perm = PERMISSION_MAP[fileName]?.[method] || 'TODO_PERMISSION_CODE';
      return `${match}\n  // TODO: Проверьте правильность кода права!\n  const permissions = await getUserPermissions(token.id);\n  if (!hasPermission(permissions, '${perm}')) {\n    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });\n  }`;
    }
  );

  // Помечаем файл как изменённый
  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Refactored:', file);
  }
}

// Запуск по всем API-роутам
walk(path.join(__dirname, '../src/app/api'), refactorFile);

console.log('\n---\nРефакторинг завершён. Проверьте TODO в файлах и укажите корректные коды прав.'); 