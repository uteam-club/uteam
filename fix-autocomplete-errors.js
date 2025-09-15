#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Паттерны для поиска неправильно добавленных autoComplete
const patterns = [
  // Паттерн 1: /  autoComplete="off">
  /\/\s+autoComplete="off">/g,
  // Паттерн 2: /"  autoComplete="off">
  /\/"\s+autoComplete="off">/g,
  // Паттерн 3: onChange={e="handleChange('field', e.target.value)} /"  autoComplete="off">
  /onChange=\{e="handleChange\('([^']+)',\s*e\.target\.value\)\}\s*\/"\s+autoComplete="off">/g,
  // Паттерн 4: onFocus={e =  autoComplete="off"> { if (e.target.value === '0') e.target.value = ''; }}
  /onFocus=\{e\s*=\s*autoComplete="off">\s*\{\s*if\s*\(e\.target\.value\s*===\s*'0'\)\s*e\.target\.value\s*=\s*'';\s*\}\}/g,
  // Паттерн 5: onChange={(setFormData(prev => ({ ...prev, field: e.target.value )}))}
  /onChange=\{\(setFormData\(prev\s*=>\s*\(\{\s*\.\.\.prev,\s*([^:]+):\s*e\.target\.value\s*\)\)\)\}/g,
  // Паттерн 6: console.log с неправильным синтаксисом
  /console\.log\('🔍[^']*',\s*e\.target\.value\);\s*setSearchQuery\(e\.target\.value\);\s*\)\}/g,
  /console\.log\('🔍[^']*',\s*e\.target\.value\);\s*setStartDate\(e\.target\.value\);\s*\)\}/g,
  /console\.log\('🔍[^']*',\s*e\.target\.value\);\s*setEndDate\(e\.target\.value\);\s*\)\}/g,
];

// Функция для исправления файла
function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Исправление 1: Удаляем неправильно добавленные autoComplete
  const originalContent = content;
  content = content.replace(/\/\s+autoComplete="off">/g, ' autoComplete="off" />');
  content = content.replace(/\/"\s+autoComplete="off">/g, '" autoComplete="off" />');
  
  // Исправление 2: Исправляем onChange с неправильным синтаксисом
  content = content.replace(
    /onChange=\{e="handleChange\('([^']+)',\s*e\.target\.value\)\}\s*\/"\s+autoComplete="off">/g,
    'onChange={e => handleChange(\'$1\', e.target.value)} autoComplete="off" />'
  );
  
  // Исправление 3: Исправляем onFocus с неправильным синтаксисом
  content = content.replace(
    /onFocus=\{e\s*=\s*autoComplete="off">\s*\{\s*if\s*\(e\.target\.value\s*===\s*'0'\)\s*e\.target\.value\s*=\s*'';\s*\}\}/g,
    'onFocus={e => { if (e.target.value === \'0\') e.target.value = \'\'; }} autoComplete="off" />'
  );
  
  // Исправление 4: Исправляем onChange с setFormData
  content = content.replace(
    /onChange=\{\(setFormData\(prev\s*=>\s*\(\{\s*\.\.\.prev,\s*([^:]+):\s*e\.target\.value\s*\)\)\)\}/g,
    'onChange={e => setFormData(prev => ({ ...prev, $1: e.target.value }))}'
  );
  
  // Исправление 5: Исправляем console.log с неправильным синтаксисом
  content = content.replace(
    /console\.log\('🔍[^']*',\s*e\.target\.value\);\s*setSearchQuery\(e\.target\.value\);\s*\)\}/g,
    'console.log(\'🔍 Изменение поиска:\', e.target.value);\n                    setSearchQuery(e.target.value);\n                  }}'
  );
  
  content = content.replace(
    /console\.log\('🔍[^']*',\s*e\.target\.value\);\s*setStartDate\(e\.target\.value\);\s*\)\}/g,
    'console.log(\'🔍 Изменение даты начала:\', e.target.value);\n                      setStartDate(e.target.value);\n                    }}'
  );
  
  content = content.replace(
    /console\.log\('🔍[^']*',\s*e\.target\.value\);\s*setEndDate\(e\.target\.value\);\s*\)\}/g,
    'console.log(\'🔍 Изменение даты окончания:\', e.target.value);\n                      setEndDate(e.target.value);\n                    }}'
  );

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    modified = true;
  }

  return modified;
}

// Находим все файлы с ошибками
const errorFiles = [
  'src/app/dashboard/analytics/attendance/page.tsx',
  'src/app/dashboard/coaching/matches/page.tsx',
  'src/app/dashboard/coaching/trainings/page.tsx',
  'src/app/dashboard/teams/create/page.tsx',
  'src/app/dashboard/training/exercises/page.tsx',
  'src/components/admin/AddExerciseCategoryModal.tsx',
  'src/components/admin/AddExerciseTagModal.tsx',
  'src/components/admin/AddTeamModal.tsx',
  'src/components/admin/AddTrainingCategoryModal.tsx',
  'src/components/admin/AddUserModal.tsx',
  'src/components/admin/EditExerciseCategoryModal.tsx',
  'src/components/admin/EditExerciseTagModal.tsx',
  'src/components/admin/EditTeamModal.tsx',
  'src/components/admin/EditTrainingCategoryModal.tsx',
  'src/components/admin/EditUserModal.tsx',
  'src/components/gps/CreateColumnMappingModal.tsx',
  'src/components/gps/EditColumnMappingModal.tsx',
  'src/components/teams/AddPlayerModal.tsx',
  'src/components/training/CreateExerciseModal.tsx',
  'src/components/training/PreviewExerciseModal.tsx'
];

console.log('🔧 Исправление ошибок autoComplete...');

let fixedCount = 0;
errorFiles.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    const modified = fixFile(filePath);
    if (modified) {
      console.log(`✅ Исправлен: ${filePath}`);
      fixedCount++;
    } else {
      console.log(`ℹ️  Без изменений: ${filePath}`);
    }
  } else {
    console.log(`❌ Файл не найден: ${filePath}`);
  }
});

console.log(`\n🎉 Исправлено файлов: ${fixedCount}`);
console.log('✨ Проверьте результат командой: npm run typecheck:ci');
