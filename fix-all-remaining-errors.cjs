#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Функция для исправления всех оставшихся ошибок
function fixAllRemainingErrors() {
  const errorFiles = [
    'src/app/dashboard/coaching/matches/[id]/page.tsx',
    'src/app/dashboard/coaching/matches/page.tsx',
    'src/app/dashboard/coaching/trainings/[id]/page.tsx',
    'src/app/dashboard/documents/page.tsx',
    'src/app/dashboard/training/exercises/page.tsx',
    'src/components/fitness-tests/EditFitnessTestModal.tsx',
    'src/components/gps/CanonicalMetricSelectionModal.tsx',
    'src/components/gps/GpsDataTable.tsx',
    'src/components/gps/PlayerMappingModal.tsx',
    'src/components/matches/AddMatchModal.tsx',
    'src/components/surveys/DateBasedTrainingDurationModal.tsx',
    'src/components/surveys/RPESchedulingModal.tsx',
    'src/components/surveys/TrainingDurationManager.tsx',
    'src/components/surveys/TrainingDurationModal.tsx',
    'src/components/training/CreateTrainingModal.tsx',
    'src/components/training/ExerciseTimingModal.tsx',
    'src/components/training/SelectExercisesModal.tsx',
    'src/components/ui/timezone-select.tsx'
  ];

  let fixedCount = 0;

  errorFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;

      // Исправление 1: onChange с неправильным синтаксисом
      // Паттерн: onChange={e =  autoComplete="off"> function(e.target.value)}
      content = content.replace(
        /onChange=\{e\s*=\s*autoComplete="off">\s*([^(]+)\(e\.target\.value\)\}/g,
        'onChange={e => $1(e.target.value)} autoComplete="off"'
      );

      // Исправление 2: onChange с неправильным синтаксисом (другой вариант)
      // Паттерн: onChange={e =  autoComplete="off"> function(e.target.value)}
      content = content.replace(
        /onChange=\{e\s*=\s*autoComplete="off">\s*([^(]+)\(([^)]+)\)\}/g,
        'onChange={e => $1($2)} autoComplete="off"'
      );

      // Исправление 3: onChange с неправильным синтаксисом (третий вариант)
      // Паттерн: onChange={(setFunction(e.target.value))}
      content = content.replace(
        /onChange=\{\(([^(]+)\(e\.target\.value\)\)\}/g,
        'onChange={e => $1(e.target.value)}'
      );

      // Исправление 4: onChange с неправильным синтаксисом (четвертый вариант)
      // Паттерн: onChange={(setFunction(parseInt(e.target.value)))}
      content = content.replace(
        /onChange=\{\(([^(]+)\(parseInt\(e\.target\.value\)\)\)\}/g,
        'onChange={e => $1(parseInt(e.target.value))}'
      );

      // Исправление 5: onChange с неправильным синтаксисом (пятый вариант)
      // Паттерн: onChange={(setFunction(Number(e.target.value)))}
      content = content.replace(
        /onChange=\{\(([^(]+)\(Number\(e\.target\.value\)\)\)\}/g,
        'onChange={e => $1(Number(e.target.value))}'
      );

      // Исправление 6: onChange с неправильным синтаксисом (шестой вариант)
      // Паттерн: onChange={(handleFunction(e.target.value))}
      content = content.replace(
        /onChange=\{\(([^(]+)\(e\.target\.value\)\)\}/g,
        'onChange={e => $1(e.target.value)}'
      );

      // Исправление 7: onChange с неправильным синтаксисом (седьмой вариант)
      // Паттерн: onChange={(handleFunction(player.id, e.target.value))}
      content = content.replace(
        /onChange=\{\(([^(]+)\(([^,]+),\s*e\.target\.value\)\)\}/g,
        'onChange={e => $1($2, e.target.value)}'
      );

      // Исправление 8: onChange с неправильным синтаксисом (восьмой вариант)
      // Паттерн: onChange={(handleFunction(training.id, e.target.value))}
      content = content.replace(
        /onChange=\{\(([^(]+)\(([^,]+),\s*e\.target\.value\)\)\}/g,
        'onChange={e => $1($2, e.target.value)}'
      );

      // Исправление 9: onChange с неправильным синтаксисом (девятый вариант)
      // Паттерн: onChange={(handleFunction('field', e.target.value))}
      content = content.replace(
        /onChange=\{\(([^(]+)\('([^']+)',\s*e\.target\.value\)\)\}/g,
        'onChange={e => $1(\'$2\', e.target.value)}'
      );

      // Исправление 10: onChange с неправильным синтаксисом (десятый вариант)
      // Паттерн: onChange={(handleFunction(e.target.value, setFunction, 1, 20))}
      content = content.replace(
        /onChange=\{\(([^(]+)\(e\.target\.value,\s*([^,]+),\s*([^,]+),\s*([^)]+)\)\)\}/g,
        'onChange={e => $1(e.target.value, $2, $3, $4)}'
      );

      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Исправлен: ${filePath}`);
        fixedCount++;
      } else {
        console.log(`ℹ️  Без изменений: ${filePath}`);
      }
    } else {
      console.log(`❌ Файл не найден: ${filePath}`);
    }
  });

  return fixedCount;
}

console.log('🔧 Исправление всех оставшихся ошибок...');
const fixedCount = fixAllRemainingErrors();
console.log(`\n🎉 Исправлено файлов: ${fixedCount}`);
console.log('✨ Проверьте результат командой: npm run typecheck:ci');
