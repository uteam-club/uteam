// Скрипт для массового рефакторинга проверок доступа по карте permissions-map.json
// Запуск: node scripts/auto-refactor-permissions-map.js

const fs = require('fs');
const path = require('path');

const mapPath = path.join(__dirname, 'permissions-map.json');
const permissionsMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, callback);
    else callback(p);
  });
}

function getPermission(file, method) {
  // file: абсолютный путь, method: GET/POST/PUT/DELETE/PATCH
  const rel = file.split('src/app/api/')[1];
  if (!rel) return null;
  const map = permissionsMap[rel];
  if (!map) return null;
  return map[method] || null;
}

function refactorFile(file) {
  if (!file.endsWith('.ts') && !file.endsWith('.tsx')) return;
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Найти все export async function ...
  const methodRegex = /export async function (\w+)/g;
  let match;
  const methods = [];
  while ((match = methodRegex.exec(content))) {
    methods.push(match[1].toUpperCase());
  }

  // Для каждого метода — заменить TODO_PERMISSION_CODE на нужный код права
  methods.forEach(method => {
    const perm = getPermission(file, method) || 'TODO_PERMISSION_CODE';
    // Заменить только если есть TODO_PERMISSION_CODE рядом с этим методом
    const methodBlockRegex = new RegExp(`(export async function ${method.toLowerCase()}[\s\S]*?)(hasPermission\(permissions, ')(TODO_PERMISSION_CODE)('\))`, 'g');
    content = content.replace(methodBlockRegex, (full, before, hp1, todo, hp2) => {
      changed = true;
      return before + hp1 + perm + hp2;
    });
  });

  // Удалить строки с TODO: Проверьте правильность кода права!
  content = content.replace(/\s*\/\/ TODO: Проверьте правильность кода права!\n/g, () => {
    changed = true;
    return '';
  });

  // Удалить дублирующиеся проверки прав (двойные if (!hasPermission...))
  content = content.replace(/if \(!hasPermission\(permissions, '[^']+'\)\) {\s*return NextResponse\.json\({ error: 'Forbidden' }, { status: 403 }\);\s*}\s*if \(!hasPermission\(permissions, '[^']+'\)\) {\s*return NextResponse\.json\({ error: 'Forbidden' }, { status: 403 }\);\s*}/g, match => {
    changed = true;
    // Оставить только одну
    return match.split('if ')[0] + match.match(/if \(!hasPermission\([^)]+\)\) {[^}]+}/)[0];
  });

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Refactored:', file);
  }
}

walk(path.join(__dirname, '../src/app/api'), refactorFile);

console.log('\n---\nМассовый рефакторинг по карте permissions-map.json завершён. Проверьте результат!'); 