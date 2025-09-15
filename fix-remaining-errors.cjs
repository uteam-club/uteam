#!/usr/bin/env node

const fs = require('fs');

// Функция для исправления конкретных файлов
function fixSpecificFiles() {
  const fixes = [
    {
      file: 'src/app/dashboard/analytics/attendance/page.tsx',
      patterns: [
        // Исправляем onChange с неправильным синтаксисом
        {
          from: /onChange=\{e\s*=>\s*\{\s*console\.log\('🔍[^']*',\s*e\.target\.value\);\s*setStartDate\(e\.target\.value\);\s*\}\}/g,
          to: 'onChange={e => {\n                        console.log(\'🔍 Изменение даты начала:\', e.target.value);\n                        setStartDate(e.target.value);\n                      }}'
        },
        {
          from: /onChange=\{e\s*=>\s*\{\s*console\.log\('🔍[^']*',\s*e\.target\.value\);\s*setEndDate\(e\.target\.value\);\s*\}\}/g,
          to: 'onChange={e => {\n                        console.log(\'🔍 Изменение даты окончания:\', e.target.value);\n                        setEndDate(e.target.value);\n                      }}'
        }
      ]
    },
    {
      file: 'src/app/dashboard/coaching/trainings/page.tsx',
      patterns: [
        {
          from: /onChange=\{e\s*=>\s*\{\s*console\.log\('🔍[^']*',\s*e\.target\.value\);\s*setSearchQuery\(e\.target\.value\);\s*\}\}/g,
          to: 'onChange={e => {\n                    console.log(\'🔍 Изменение поиска:\', e.target.value);\n                    setSearchQuery(e.target.value);\n                  }}'
        },
        {
          from: /onChange=\{e\s*=>\s*\{\s*console\.log\('🔍[^']*',\s*e\.target\.value\);\s*setStartDate\(e\.target\.value\);\s*\}\}/g,
          to: 'onChange={e => {\n                      console.log(\'🔍 Изменение даты начала:\', e.target.value);\n                      setStartDate(e.target.value);\n                    }}'
        },
        {
          from: /onChange=\{e\s*=>\s*\{\s*console\.log\('🔍[^']*',\s*e\.target\.value\);\s*setEndDate\(e\.target\.value\);\s*\}\}/g,
          to: 'onChange={e => {\n                      console.log(\'🔍 Изменение даты окончания:\', e.target.value);\n                      setEndDate(e.target.value);\n                    }}'
        }
      ]
    },
    {
      file: 'src/components/admin/EditUserModal.tsx',
      patterns: [
        // Исправляем onChange с handleChange
        {
          from: /onChange=\{e="handleChange\('([^']+)',\s*e\.target\.value\)\}\s*required\s*"\s*autoComplete="off"/g,
          to: 'onChange={e => handleChange(\'$1\', e.target.value)} required autoComplete="off"'
        },
        {
          from: /onChange=\{e="handleChange\('([^']+)',\s*e\.target\.value\)\}\s*"\s*autoComplete="off"/g,
          to: 'onChange={e => handleChange(\'$1\', e.target.value)} autoComplete="off"'
        },
        // Исправляем onFocus с неправильным синтаксисом
        {
          from: /onFocus=\{e\s*=\s*"\s*autoComplete="off">\s*\{\s*if\s*\(e\.target\.value\s*===\s*'0'\)\s*e\.target\.value\s*=\s*'';\s*\}\}/g,
          to: 'onFocus={e => { if (e.target.value === \'0\') e.target.value = \'\'; }} autoComplete="off"'
        }
      ]
    },
    {
      file: 'src/components/gps/CreateColumnMappingModal.tsx',
      patterns: [
        {
          from: /onChange=\{\(setFormData\(prev\s*=>\s*\(\{\s*\.\.\.prev,\s*([^:]+):\s*e\.target\.value\s*\)\)\)\}/g,
          to: 'onChange={e => setFormData(prev => ({ ...prev, $1: e.target.value }))}'
        }
      ]
    },
    {
      file: 'src/components/gps/EditColumnMappingModal.tsx',
      patterns: [
        {
          from: /onChange=\{\(setFormData\(prev\s*=>\s*\(\{\s*\.\.\.prev,\s*([^:]+):\s*e\.target\.value\s*\)\)\)\}/g,
          to: 'onChange={e => setFormData(prev => ({ ...prev, $1: e.target.value }))}'
        }
      ]
    },
    {
      file: 'src/components/training/CreateExerciseModal.tsx',
      patterns: [
        {
          from: /onFocus=\{e\s*=\s*autoComplete="off">\s*\{\s*if\s*\(e\.target\.value\s*===\s*'0'\)\s*e\.target\.value\s*=\s*'';\s*\}\}/g,
          to: 'onFocus={e => { if (e.target.value === \'0\') e.target.value = \'\'; }} autoComplete="off"'
        }
      ]
    },
    {
      file: 'src/components/training/PreviewExerciseModal.tsx',
      patterns: [
        {
          from: /onFocus=\{e\s*=\s*autoComplete="off">\s*\{\s*if\s*\(e\.target\.value\s*===\s*'0'\)\s*e\.target\.value\s*=\s*'';\s*\}\}/g,
          to: 'onFocus={e => { if (e.target.value === \'0\') e.target.value = \'\'; }} autoComplete="off"'
        }
      ]
    }
  ];

  let fixedCount = 0;

  fixes.forEach(({ file, patterns }) => {
    if (fs.existsSync(file)) {
      let content = fs.readFileSync(file, 'utf8');
      const originalContent = content;

      patterns.forEach(({ from, to }) => {
        content = content.replace(from, to);
      });

      if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`✅ Исправлен: ${file}`);
        fixedCount++;
      } else {
        console.log(`ℹ️  Без изменений: ${file}`);
      }
    } else {
      console.log(`❌ Файл не найден: ${file}`);
    }
  });

  return fixedCount;
}

console.log('🔧 Исправление оставшихся ошибок...');
const fixedCount = fixSpecificFiles();
console.log(`\n🎉 Исправлено файлов: ${fixedCount}`);
console.log('✨ Проверьте результат командой: npm run typecheck:ci');
