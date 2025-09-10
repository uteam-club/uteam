const { Pool } = require('pg');
require('dotenv').config();

// Подключение к базе данных
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixCanonicalData(reportId) {
  console.log(`🔧 Исправление canonical данных для отчёта: ${reportId}\n`);

  try {
    // Получаем полную информацию об отчёте
    const reportQuery = `
      SELECT 
        id,
        name,
        "createdAt",
        "gpsSystem",
        "profileId",
        "rawData",
        "processedData",
        "profileSnapshot",
        CASE 
          WHEN "profileSnapshot" IS NOT NULL AND "profileSnapshot"->'columns' IS NOT NULL 
          THEN jsonb_array_length("profileSnapshot"->'columns')::text
          ELSE '0'
        END as profileSnapshot_columns_length,
        CASE 
          WHEN "processedData" IS NOT NULL AND "processedData"->'canonical' IS NOT NULL 
          AND "processedData"->'canonical'->'rows' IS NOT NULL
          THEN jsonb_array_length("processedData"->'canonical'->'rows')::text
          ELSE '0'
        END as canonical_rows_length_before
      FROM public."GpsReport"
      WHERE id = $1
    `;

    const reportResult = await pool.query(reportQuery, [reportId]);
    
    if (reportResult.rows.length === 0) {
      console.log('❌ Отчёт не найден');
      return { success: false, reason: 'Report not found' };
    }

    const report = reportResult.rows[0];
    console.log('📊 Анализ отчёта:');
    console.log(`   ID: ${report.id}`);
    console.log(`   Название: ${report.name}`);
    console.log(`   ProfileSnapshot колонок: ${report.profilesnapshot_columns_length}`);
    console.log(`   Canonical строк: ${report.canonical_rows_length_before}`);
    console.log(`   RawData строк: ${report.rawData ? report.rawData.length : 0}`);

    // Проверяем, нужен ли пересчёт
    if (parseInt(report.profilesnapshot_columns_length) === 0) {
      console.log('⚠️  ProfileSnapshot пуст - исправление невозможно');
      return { success: false, reason: 'Empty profileSnapshot' };
    }

    if (!report.rawData || report.rawData.length === 0) {
      console.log('⚠️  RawData пуст - исправление невозможно');
      return { success: false, reason: 'Empty rawData' };
    }

    // Анализируем структуру данных
    console.log('\n🔍 Анализ структуры данных:');
    
    // Анализируем rawData
    if (report.rawData && report.rawData.length > 0) {
      console.log('📄 RawData:');
      console.log(`   Строк: ${report.rawData.length}`);
      console.log(`   Первая строка (заголовки): ${JSON.stringify(report.rawData[0])}`);
      if (report.rawData.length > 1) {
        console.log(`   Вторая строка (данные): ${JSON.stringify(report.rawData[1])}`);
      }
    }

    // Анализируем profileSnapshot
    if (report.profileSnapshot && report.profileSnapshot.columns) {
      console.log('\n📋 ProfileSnapshot columns:');
      report.profileSnapshot.columns.forEach((col, index) => {
        console.log(`   ${index + 1}. ${col.canonicalKey} -> ${col.sourceHeader}`);
      });
    }

    // Анализируем processedData
    if (report.processedData) {
      console.log('\n📊 ProcessedData:');
      console.log(`   Canonical: ${report.processedData.canonical ? 'есть' : 'нет'}`);
      if (report.processedData.canonical) {
        console.log(`   Canonical rows: ${report.processedData.canonical.rows ? report.processedData.canonical.rows.length : 'нет'}`);
        console.log(`   Canonical columns: ${report.processedData.canonical.columns ? Object.keys(report.processedData.canonical.columns).length : 'нет'}`);
      }
      if (report.processedData.players) {
        console.log(`   Players: ${report.processedData.players.length}`);
      }
    }

    // Создаем canonical данные на основе rawData и profileSnapshot
    console.log('\n🔧 Создание canonical данных...');
    
    if (!report.profileSnapshot || !report.profileSnapshot.columns) {
      console.log('❌ ProfileSnapshot.columns отсутствует');
      return { success: false, reason: 'Missing profileSnapshot.columns' };
    }

    // Создаем маппинг заголовков
    const headerMapping = {};
    report.profileSnapshot.columns.forEach(col => {
      if (col.canonicalKey && col.sourceHeader) {
        headerMapping[col.sourceHeader] = col.canonicalKey;
      }
    });

    console.log('📋 Маппинг заголовков:');
    Object.entries(headerMapping).forEach(([source, canonical]) => {
      console.log(`   ${source} -> ${canonical}`);
    });

    // Находим индексы колонок в rawData
    const columnIndexes = {};
    if (report.rawData && report.rawData.length > 0) {
      const headers = report.rawData[0];
      console.log('🔍 Поиск соответствий заголовков:');
      headers.forEach((header, index) => {
        console.log(`   ${index}: "${header}"`);
        if (headerMapping[header]) {
          columnIndexes[headerMapping[header]] = index;
          console.log(`     ✅ Найдено соответствие: ${header} -> ${headerMapping[header]}`);
        }
      });
    }

    console.log('\n📊 Найденные индексы колонок:');
    Object.entries(columnIndexes).forEach(([canonical, index]) => {
      console.log(`   ${canonical}: ${index}`);
    });

    // Если не нашли соответствий, попробуем найти по позиции
    if (Object.keys(columnIndexes).length === 0) {
      console.log('\n⚠️  Прямые соответствия не найдены, пробуем найти по позиции...');
      
      // Анализируем структуру rawData
      if (report.rawData.length > 1) {
        const firstDataRow = report.rawData[1];
        console.log('📄 Первая строка данных:', firstDataRow);
        
        // Анализируем данные и пытаемся понять структуру
        // Судя по данным, это может быть: имя, позиция, время, дистанция, ...
        console.log('🔍 Анализ структуры данных:');
        firstDataRow.forEach((value, index) => {
          console.log(`   ${index}: ${value} (${typeof value})`);
        });
        
        // Пытаемся сопоставить по логике данных
        // athlete_name - обычно первая колонка (строка)
        // minutes_played - время в формате HH:MM:SS
        // total_distance_m - число (дистанция)
        // hsr_ratio - процент (число)
        // max_speed_kmh - скорость (число)
        
        const dataMapping = {};
        firstDataRow.forEach((value, index) => {
          if (typeof value === 'string') {
            // Если это время в формате HH:MM:SS
            if (value.match(/^\d{1,2}:\d{2}:\d{2}$/)) {
              dataMapping.minutes_played = index;
              console.log(`   ⏰ Время найдено в позиции ${index}: ${value}`);
            }
            // Если это имя (не число и не время)
            else if (!value.match(/^\d+$/) && !value.match(/^\d+\.\d+$/)) {
              dataMapping.athlete_name = index;
              console.log(`   👤 Имя найдено в позиции ${index}: ${value}`);
            }
          } else if (typeof value === 'number') {
            // Большие числа - скорее всего дистанция
            if (value > 1000) {
              dataMapping.total_distance_m = index;
              console.log(`   📏 Дистанция найдена в позиции ${index}: ${value}`);
            }
            // Проценты - скорее всего hsr_ratio
            else if (value <= 100 && value > 0) {
              dataMapping.hsr_ratio = index;
              console.log(`   📊 Процент найден в позиции ${index}: ${value}`);
            }
            // Скорость - средние числа
            else if (value > 100 && value <= 1000) {
              dataMapping.max_speed_kmh = index;
              console.log(`   🏃 Скорость найдена в позиции ${index}: ${value}`);
            }
          }
        });
        
        // Применяем найденные соответствия
        Object.entries(dataMapping).forEach(([canonical, index]) => {
          columnIndexes[canonical] = index;
          console.log(`   ✅ ${canonical}: ${index}`);
        });
      }
    }

    // Создаем canonical строки
    const canonicalRows = [];
    if (report.rawData && report.rawData.length > 1) {
      for (let i = 1; i < report.rawData.length; i++) {
        const row = report.rawData[i];
        const canonicalRow = {};
        
        Object.entries(columnIndexes).forEach(([canonicalKey, index]) => {
          if (index < row.length) {
            let value = row[index];
            
            // Преобразуем значения в зависимости от типа
            if (canonicalKey === 'athlete_name') {
              canonicalRow[canonicalKey] = String(value || '');
            } else if (canonicalKey === 'minutes_played') {
              // Преобразуем время в минуты
              if (typeof value === 'string' && value.includes(':')) {
                const parts = value.split(':');
                const hours = parseInt(parts[0]) || 0;
                const minutes = parseInt(parts[1]) || 0;
                const seconds = parseInt(parts[2]) || 0;
                canonicalRow[canonicalKey] = hours * 60 + minutes + seconds / 60;
              } else {
                canonicalRow[canonicalKey] = parseFloat(value) || 0;
              }
            } else {
              canonicalRow[canonicalKey] = parseFloat(value) || 0;
            }
          }
        });
        
        canonicalRows.push(canonicalRow);
      }
    }

    console.log(`✅ Создано ${canonicalRows.length} canonical строк`);

    if (canonicalRows.length > 0) {
      console.log('📄 Первая canonical строка:');
      console.log(JSON.stringify(canonicalRows[0], null, 2));
    }

    // Создаем canonical структуру
    const canonicalData = {
      rows: canonicalRows,
      columns: {},
      metadata: {
        generated_at: new Date().toISOString(),
        source: 'manual_fix',
        total_rows: canonicalRows.length
      }
    };

    // Создаем колонки для canonical
    report.profileSnapshot.columns.forEach(col => {
      if (col.canonicalKey) {
        canonicalData.columns[col.canonicalKey] = {
          type: col.dataType || 'string',
          source: col.sourceHeader,
          canonicalKey: col.canonicalKey
        };
      }
    });

    // Обновляем processedData
    const updatedProcessedData = {
      ...report.processedData,
      canonical: canonicalData
    };

    // Сохраняем в БД
    console.log('\n💾 Сохранение в БД...');
    const updateQuery = `
      UPDATE public."GpsReport"
      SET 
        "processedData" = $1,
        "isProcessed" = true,
        "updatedAt" = NOW()
      WHERE id = $2
    `;
    
    await pool.query(updateQuery, [JSON.stringify(updatedProcessedData), reportId]);
    console.log('✅ Отчёт обновлён в БД');

    // Проверяем результат
    const afterQuery = `
      SELECT 
        CASE 
          WHEN "processedData" IS NOT NULL AND "processedData"->'canonical' IS NOT NULL 
          AND "processedData"->'canonical'->'rows' IS NOT NULL
          THEN jsonb_array_length("processedData"->'canonical'->'rows')::text
          ELSE '0'
        END as canonical_rows_length_after
      FROM public."GpsReport"
      WHERE id = $1
    `;

    const afterResult = await pool.query(afterQuery, [reportId]);
    const reportAfter = afterResult.rows[0];

    console.log('\n📊 Результат:');
    console.log(`   Canonical строк: ${reportAfter.canonical_rows_length_after}`);

    const success = parseInt(reportAfter.canonical_rows_length_after) > 0;
    
    if (success) {
      console.log('✅ Исправление успешно!');
    } else {
      console.log('❌ Исправление не дало результатов');
    }

    return {
      success,
      before: {
        profileSnapshotColumns: parseInt(report.profilesnapshot_columns_length),
        canonicalRows: parseInt(report.canonical_rows_length_before)
      },
      after: {
        canonicalRows: parseInt(reportAfter.canonical_rows_length_after)
      },
      canonicalData: canonicalData
    };

  } catch (error) {
    console.error('❌ Ошибка исправления:', error);
    return { success: false, reason: error.message };
  } finally {
    await pool.end();
  }
}

// Запускаем исправление
const reportId = process.argv[2];
if (!reportId) {
  console.log('❌ Укажите ID отчёта: node scripts/gps-fix-canonical.cjs <reportId>');
  process.exit(1);
}

fixCanonicalData(reportId).then(result => {
  console.log('\n=== РЕЗУЛЬТАТ ===');
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
}).catch(console.error);
