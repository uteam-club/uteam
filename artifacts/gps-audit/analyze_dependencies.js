import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем инвентарь
const inventory = JSON.parse(fs.readFileSync('/Users/artem/Desktop/uteam-multi/artifacts/gps-audit/INVENTORY.json', 'utf8'));

// Создаем граф зависимостей
const nodes = [];
const edges = [];
const sharedModules = [];
const purgeCandidates = [];

// Создаем узлы
inventory.forEach(file => {
  nodes.push({
    id: file.path,
    kind: file.kind,
    size: file.size
  });
});

// Создаем рёбра (зависимости)
inventory.forEach(file => {
  file.imports.forEach(importPath => {
    // Ищем файл, который импортируется
    const targetFile = inventory.find(f => 
      importPath.includes(f.path.replace('.ts', '').replace('.tsx', '')) ||
      f.path.includes(importPath.replace('@/', 'src/'))
    );
    
    if (targetFile) {
      edges.push({
        from: file.path,
        to: targetFile.path
      });
    }
  });
});

// Анализируем shared-модули (используются вне GPS)
inventory.forEach(file => {
  if (file.kind === 'canon' || file.path.includes('/canon/')) {
    // Проверяем, используется ли canon вне GPS
    const externalUsage = edges.filter(edge => 
      edge.to === file.path && 
      !edge.from.includes('gps') && 
      !edge.from.includes('canon')
    );
    
    if (externalUsage.length > 0) {
      sharedModules.push({
        path: file.path,
        used_by: externalUsage.map(e => e.from),
        suggestion: 'keep/move to shared',
        reason: 'used outside GPS'
      });
    }
  }
});

// Анализируем кандидатов к удалению
inventory.forEach(file => {
  const referencedBy = edges.filter(edge => edge.to === file.path);
  const referencedByOutsideGps = referencedBy.filter(edge => 
    !edge.from.includes('gps') && 
    !edge.from.includes('canon')
  );
  
  let safeToDelete = true;
  let reason = 'exclusive to gps v1';
  let impacts = [];
  
  // Проверяем зависимости
  if (referencedByOutsideGps.length > 0) {
    safeToDelete = false;
    reason = 'referenced by non-gps modules';
  }
  
  // Специальные случаи
  if (file.path.includes('/canon/') && sharedModules.some(sm => sm.path === file.path)) {
    safeToDelete = false;
    reason = 'shared module used outside GPS';
  }
  
  // Определяем воздействие
  if (file.kind === 'api-route') {
    impacts.push(`API: ${file.path}`);
  }
  if (file.kind === 'ui-component') {
    impacts.push(`UI: ${file.path}`);
  }
  if (file.kind === 'db') {
    impacts.push(`DB: ${file.path}`);
  }
  
  purgeCandidates.push({
    path: file.path,
    kind: file.kind,
    safe_to_delete: safeToDelete,
    referenced_by_outside_gps: referencedByOutsideGps.length,
    reason: reason,
    impacts: impacts,
    size: file.size
  });
});

// Сохраняем результаты
fs.writeFileSync('/Users/artem/Desktop/uteam-multi/artifacts/gps-audit/DEPENDENCIES.json', JSON.stringify({
  nodes,
  edges
}, null, 2));

fs.writeFileSync('/Users/artem/Desktop/uteam-multi/artifacts/gps-audit/KEEP_SHARED.json', JSON.stringify(sharedModules, null, 2));

fs.writeFileSync('/Users/artem/Desktop/uteam-multi/artifacts/gps-audit/PURGE_CANDIDATES.json', JSON.stringify(purgeCandidates, null, 2));

console.log(`Created dependency graph with ${nodes.length} nodes and ${edges.length} edges`);
console.log(`Found ${sharedModules.length} shared modules`);
console.log(`Found ${purgeCandidates.length} purge candidates`);
console.log(`Safe to delete: ${purgeCandidates.filter(c => c.safe_to_delete).length}`);
