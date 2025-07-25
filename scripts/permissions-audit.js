// permissions-audit.js
const fs = require('fs');
const path = require('path');

// 1. Собираем все коды прав из кода (hasPermission(..., 'code'))
function findUsedPermissions(dir, result = new Set()) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      findUsedPermissions(fullPath, result);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const regex = /hasPermission\([^,]+, ['"]([a-zA-Z0-9_.]+)['"]\)/g;
      let match;
      while ((match = regex.exec(content))) {
        result.add(match[1]);
      }
    }
  }
  return result;
}

// 2. Собираем все коды из seed-permissions.ts
function findSeedPermissions(seedFile) {
  const content = fs.readFileSync(seedFile, 'utf8');
  const regex = /code: ['"]([a-zA-Z0-9_.]+)['"]/g;
  const result = new Set();
  let match;
  while ((match = regex.exec(content))) {
    result.add(match[1]);
  }
  return result;
}

// 3. Собираем все коды из базы (Permission.json, если есть дамп, иначе пропустить)
function findDbPermissions(dbFile) {
  if (!fs.existsSync(dbFile)) return null;
  const arr = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
  return new Set(arr.map(p => p.code));
}

// MAIN
const used = findUsedPermissions(path.join(__dirname, '../src'));
const seed = findSeedPermissions(path.join(__dirname, 'seed-permissions.ts'));
const db = findDbPermissions(path.join(__dirname, '../backup/permissions.json'));

function diff(setA, setB) {
  return [...setA].filter(x => !setB.has(x));
}

console.log('--- Permissions Audit ---');
console.log('Used in code:', used.size);
console.log('In seed script:', seed.size);
if (db) console.log('In DB dump:', db.size);

const missingInSeed = diff(used, seed);
const extraInSeed = diff(seed, used);
console.log('\nИспользуются в коде, но отсутствуют в seed:', missingInSeed);
console.log('\nЕсть в seed, но не используются в коде:', extraInSeed);
if (db) {
  const missingInDb = diff(used, db);
  const extraInDb = diff(db, used);
  console.log('\nИспользуются в коде, но отсутствуют в базе:', missingInDb);
  console.log('\nЕсть в базе, но не используются в коде:', extraInDb);
} 