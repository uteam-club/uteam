const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Создаем папки для отчетов
const reportDir = 'artifacts/purge-quarantine';
if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}

// Читаем список кандидатов к удалению
const purgeCandidatesPath = 'artifacts/gps-audit/PURGE_CANDIDATES.json';
if (!fs.existsSync(purgeCandidatesPath)) {
  console.error('❌ Файл PURGE_CANDIDATES.json не найден');
  process.exit(1);
}

const purgeCandidates = JSON.parse(fs.readFileSync(purgeCandidatesPath, 'utf8'));
console.log(`📋 Найдено ${purgeCandidates.length} кандидатов к карантину`);

const moved = [];
const missing = [];

// Создаем структуру legacy/gps-v1/
const legacyDir = 'legacy/gps-v1';
if (!fs.existsSync(legacyDir)) {
  fs.mkdirSync(legacyDir, { recursive: true });
}

// Обрабатываем каждый файл
for (const candidate of purgeCandidates) {
  const sourcePath = candidate.path;
  const targetPath = path.join(legacyDir, sourcePath);
  const targetDir = path.dirname(targetPath);
  
  try {
    // Проверяем существование файла
    if (!fs.existsSync(sourcePath)) {
      missing.push({
        path: sourcePath,
        reason: 'file not found',
        timestamp: new Date().toISOString()
      });
      console.log(`⚠️  Пропущен (не найден): ${sourcePath}`);
      continue;
    }
    
    // Создаем целевую директорию
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    // Перемещаем файл через git mv
    try {
      execSync(`git mv "${sourcePath}" "${targetPath}"`, { stdio: 'pipe' });
      
      moved.push({
        path: sourcePath,
        target: targetPath,
        size: candidate.size || 0,
        kind: candidate.kind || 'unknown',
        timestamp: new Date().toISOString()
      });
      
      console.log(`✅ Перемещен: ${sourcePath} → ${targetPath}`);
    } catch (error) {
      // Если git mv не сработал, пробуем обычное перемещение
      try {
        fs.renameSync(sourcePath, targetPath);
        
        moved.push({
          path: sourcePath,
          target: targetPath,
          size: candidate.size || 0,
          kind: candidate.kind || 'unknown',
          method: 'fs.renameSync',
          timestamp: new Date().toISOString()
        });
        
        console.log(`✅ Перемещен (fs): ${sourcePath} → ${targetPath}`);
      } catch (fsError) {
        missing.push({
          path: sourcePath,
          reason: `git mv failed: ${error.message}, fs.renameSync failed: ${fsError.message}`,
          timestamp: new Date().toISOString()
        });
        console.log(`❌ Ошибка перемещения: ${sourcePath} - ${fsError.message}`);
      }
    }
  } catch (error) {
    missing.push({
      path: sourcePath,
      reason: error.message,
      timestamp: new Date().toISOString()
    });
    console.log(`❌ Ошибка: ${sourcePath} - ${error.message}`);
  }
}

// Сохраняем отчеты
fs.writeFileSync(
  path.join(reportDir, 'MOVED.json'),
  JSON.stringify(moved, null, 2)
);

fs.writeFileSync(
  path.join(reportDir, 'MISSING.json'),
  JSON.stringify(missing, null, 2)
);

// Создаем сводку
const summary = `# GPS v1 Quarantine Summary

## Statistics
- **Total candidates:** ${purgeCandidates.length}
- **Successfully moved:** ${moved.length}
- **Missing/failed:** ${missing.length}
- **Success rate:** ${((moved.length / purgeCandidates.length) * 100).toFixed(1)}%

## Moved Files
${moved.map(item => `- ${item.path} → ${item.target}`).join('\n')}

## Missing/Failed Files
${missing.map(item => `- ${item.path} (${item.reason})`).join('\n')}

## Timestamp
Generated: ${new Date().toISOString()}
`;

fs.writeFileSync(path.join(reportDir, 'SUMMARY.md'), summary);

console.log('\n📊 Сводка карантина:');
console.log(`✅ Успешно перемещено: ${moved.length}`);
console.log(`⚠️  Пропущено/ошибок: ${missing.length}`);
console.log(`📁 Отчеты сохранены в: ${reportDir}/`);
