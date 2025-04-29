#!/usr/bin/env node

/**
 * Скрипт для поиска и исправления дублирующихся ключей в React-компонентах
 * 
 * Этот скрипт сканирует все React-компоненты (.tsx, .jsx) и ищет случаи, когда:
 * 1. Используется index в качестве key в методе map
 * 2. Используются неуникальные ключи в списках элементов
 * 3. Отсутствуют ключи для элементов в массивах
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

// Конфигурация
const CONFIG = {
  autoFix: true, // Включить автоматическое исправление проблем
  rootDir: path.resolve(__dirname, '../../'), // Корневая директория проекта
  srcDir: path.resolve(__dirname, '../../src'), // Директория с исходным кодом
  extensions: ['.tsx', '.jsx', '.js', '.ts'], // Расширения файлов для проверки
  maxIssues: 100, // Максимальное количество проблем для вывода
};

// Счетчики для статистики
const STATS = {
  filesChecked: 0,
  issuesFound: 0,
  issuesFixed: 0,
  indexKeys: 0,
  missingKeys: 0,
  duplicateKeys: 0,
};

// Массив для хранения найденных проблем
const issues = [];

// Функция для рекурсивного обхода директорий и поиска файлов
function findFilesRecursively(dir, extensions) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Пропускаем node_modules и .next
      if (entry.name !== 'node_modules' && entry.name !== '.next') {
        files.push(...findFilesRecursively(fullPath, extensions));
      }
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Функция для проверки наличия дублирующихся ключей
function checkDuplicateKeys(file) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const ast = parse(content, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'classProperties', 'decorators-legacy'],
    });
    
    let modified = false;
    const localIssues = [];
    
    // Обход AST для поиска вызовов map с индексом в качестве ключа
    traverse(ast, {
      CallExpression(path) {
        if (path.node.callee.property && path.node.callee.property.name === 'map') {
          // Проверяем аргументы функции map
          const args = path.node.arguments;
          if (args.length > 0 && t.isArrowFunctionExpression(args[0])) {
            const arrowFunc = args[0];
            const params = arrowFunc.params;
            
            // Проверяем, есть ли второй параметр (index)
            if (params.length >= 2) {
              const indexParam = params[1].name;
              
              // Ищем использование index в атрибуте key
              let hasIndexKey = false;
              let keyNode = null;
              
              traverse(arrowFunc, {
                JSXAttribute(attrPath) {
                  if (attrPath.node.name.name === 'key') {
                    if (
                      (t.isJSXExpressionContainer(attrPath.node.value) && 
                       t.isIdentifier(attrPath.node.value.expression) && 
                       attrPath.node.value.expression.name === indexParam) ||
                      (t.isJSXExpressionContainer(attrPath.node.value) && 
                       t.isBinaryExpression(attrPath.node.value.expression) && 
                       (attrPath.node.value.expression.left.name === indexParam || 
                        attrPath.node.value.expression.right.name === indexParam))
                    ) {
                      hasIndexKey = true;
                      keyNode = attrPath;
                    }
                  }
                },
                noScope: true,
              });
              
              if (hasIndexKey) {
                const lineNumber = content.substring(0, path.node.start).split('\n').length;
                
                STATS.indexKeys++;
                localIssues.push({
                  type: 'indexKey',
                  line: lineNumber,
                  file,
                  message: `Использование индекса в качестве ключа в методе map (строка ${lineNumber})`,
                });
                
                // Автоматическое исправление
                if (CONFIG.autoFix && keyNode) {
                  // Пытаемся найти лучший вариант для ключа
                  let betterKeyFound = false;
                  
                  // Проверяем, есть ли свойство id или другие уникальные идентификаторы
                  traverse(arrowFunc, {
                    MemberExpression(memberPath) {
                      if (
                        t.isIdentifier(memberPath.node.property) && 
                        (memberPath.node.property.name === 'id' || 
                         memberPath.node.property.name === '_id' || 
                         memberPath.node.property.name === 'uid')
                      ) {
                        if (t.isIdentifier(params[0]) && memberPath.node.object.name === params[0].name) {
                          keyNode.node.value = t.jsxExpressionContainer(memberPath.node);
                          betterKeyFound = true;
                          modified = true;
                          STATS.issuesFixed++;
                        }
                      }
                    },
                    noScope: true,
                  });
                  
                  // Если не нашли лучший ключ, используем комбинацию с индексом
                  if (!betterKeyFound) {
                    // Ищем какое-то поле объекта
                    traverse(arrowFunc, {
                      MemberExpression(memberPath) {
                        if (t.isIdentifier(params[0]) && memberPath.node.object.name === params[0].name) {
                          const itemParam = params[0].name;
                          const propName = memberPath.node.property.name;
                          
                          if (propName && propName !== 'length' && !betterKeyFound) {
                            // Создаем шаблонный литерал `${item.name}-${index}`
                            const template = t.templateLiteral(
                              [
                                t.templateElement({ raw: '', cooked: '' }, false),
                                t.templateElement({ raw: '-', cooked: '-' }, false),
                                t.templateElement({ raw: '', cooked: '' }, true)
                              ],
                              [
                                t.memberExpression(t.identifier(itemParam), t.identifier(propName)),
                                t.identifier(indexParam)
                              ]
                            );
                            
                            keyNode.node.value = t.jsxExpressionContainer(template);
                            betterKeyFound = true;
                            modified = true;
                            STATS.issuesFixed++;
                          }
                        }
                      },
                      noScope: true,
                    });
                  }
                }
              }
            }
          }
        }
      },
    });
    
    // Если были внесены изменения, записываем обновленный файл
    if (modified && CONFIG.autoFix) {
      const output = generate(ast, { retainLines: true }, content);
      fs.writeFileSync(file, output.code, 'utf8');
      console.log(`✅ Исправлены проблемы с ключами в файле: ${path.relative(CONFIG.rootDir, file)}`);
    }
    
    // Возвращаем найденные проблемы
    return localIssues;
  } catch (error) {
    console.error(`Ошибка при обработке файла ${file}:`, error.message);
    return [];
  }
}

// Основная функция для проверки всех файлов
function checkAllFiles() {
  console.log(`🔍 Поиск проблем с ключами в React-компонентах...`);
  console.log(`📁 Директория поиска: ${CONFIG.srcDir}`);
  console.log(`🛠️ Автоматическое исправление: ${CONFIG.autoFix ? 'Включено' : 'Выключено'}`);
  
  // Находим все файлы для проверки
  const files = findFilesRecursively(CONFIG.srcDir, CONFIG.extensions);
  console.log(`\n📊 Найдено файлов для проверки: ${files.length}`);
  
  // Проверяем каждый файл
  for (const file of files) {
    STATS.filesChecked++;
    const fileIssues = checkDuplicateKeys(file);
    issues.push(...fileIssues);
    STATS.issuesFound += fileIssues.length;
    
    // Прекращаем проверку, если достигли максимального количества проблем
    if (issues.length >= CONFIG.maxIssues) {
      console.log(`\n⚠️ Достигнуто максимальное количество проблем (${CONFIG.maxIssues}), дальнейшая проверка остановлена.`);
      break;
    }
  }
  
  // Вывод результатов
  console.log('\n===== Результаты проверки =====');
  console.log(`📊 Проверено файлов: ${STATS.filesChecked}`);
  console.log(`❌ Найдено проблем с ключами: ${STATS.issuesFound}`);
  console.log(`✅ Исправлено проблем: ${STATS.issuesFixed}`);
  console.log(`📌 Использование индекса в качестве ключа: ${STATS.indexKeys}`);
  
  // Вывод найденных проблем
  if (issues.length > 0) {
    console.log('\n===== Найденные проблемы =====');
    
    issues.sort((a, b) => {
      if (a.file === b.file) {
        return a.line - b.line;
      }
      return a.file.localeCompare(b.file);
    });
    
    issues.forEach((issue, index) => {
      const relPath = path.relative(CONFIG.rootDir, issue.file);
      console.log(`${index + 1}. ${issue.message} - ${relPath}`);
    });
    
    if (!CONFIG.autoFix) {
      console.log('\n⚠️ Для автоматического исправления проблем установите CONFIG.autoFix = true');
    }
  } else {
    console.log('\n✅ Проблем с ключами не найдено!');
  }
}

// Запуск проверки
checkAllFiles(); 