const { Pool } = require('pg');
require('dotenv').config();

// Подключение к базе данных
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function diagnoseGpsReportsDetailed() {
  console.log('🔍 GPS Детальная диагностика: Поиск отчётов с пустыми canonical данными\n');

  try {
    // Ищем отчёты с profileSnapshot, но пустыми canonical данными
    console.log('=== ПОИСК ПРОБЛЕМНЫХ ОТЧЁТОВ ===');
    const reportsQuery = `
      SELECT 
        id,
        name,
        "createdAt",
        "gpsSystem",
        "profileId",
        CASE 
          WHEN "profileSnapshot" IS NOT NULL THEN 'есть'
          ELSE 'нет'
        END as profileSnapshot_exists,
        CASE 
          WHEN "profileSnapshot" IS NOT NULL AND "profileSnapshot"->'columns' IS NOT NULL 
          THEN jsonb_array_length("profileSnapshot"->'columns')::text
          ELSE '0'
        END as profileSnapshot_columns_length,
        CASE 
          WHEN "processedData" IS NOT NULL AND "processedData"->'canonical' IS NOT NULL THEN 'есть'
          ELSE 'нет'
        END as canonical_exists,
        CASE 
          WHEN "processedData" IS NOT NULL AND "processedData"->'canonical' IS NOT NULL 
          AND "processedData"->'canonical'->'rows' IS NOT NULL
          THEN jsonb_array_length("processedData"->'canonical'->'rows')::text
          ELSE '0'
        END as canonical_rows_length,
        "importMeta"
      FROM public."GpsReport"
      WHERE 
        "profileSnapshot" IS NOT NULL 
        AND "profileSnapshot"->'columns' IS NOT NULL 
        AND jsonb_array_length("profileSnapshot"->'columns') > 0
        AND (
          "processedData" IS NULL 
          OR "processedData"->'canonical' IS NULL 
          OR "processedData"->'canonical'->'rows' IS NULL
          OR jsonb_array_length("processedData"->'canonical'->'rows') = 0
        )
      ORDER BY "createdAt" DESC
      LIMIT 10
    `;

    const reportsResult = await pool.query(reportsQuery);
    
    console.log(`📊 Найдено проблемных отчётов: ${reportsResult.rows.length}\n`);
    
    if (reportsResult.rows.length === 0) {
      console.log('✅ Проблемных отчётов не найдено');
      return;
    }

    // Анализируем первый проблемный отчёт
    const problematicReport = reportsResult.rows[0];
    console.log(`🚨 АНАЛИЗ ПРОБЛЕМНОГО ОТЧЁТА: ${problematicReport.id}`);
    console.log(`   Название: ${problematicReport.name}`);
    console.log(`   Создан: ${problematicReport.createdAt}`);
    console.log(`   GPS система: ${problematicReport.gpsSystem}`);
    console.log(`   Profile ID: ${problematicReport.profileId}`);
    console.log(`   ProfileSnapshot: ${problematicReport.profilesnapshot_exists} (${problematicReport.profilesnapshot_columns_length} колонок)`);
    console.log(`   Canonical: ${problematicReport.canonical_exists} (${problematicReport.canonical_rows_length} строк)`);
    
    // Получаем детальную информацию о проблемном отчёте
    const detailedQuery = `
      SELECT 
        "profileSnapshot",
        "processedData",
        "rawData"
      FROM public."GpsReport"
      WHERE id = $1
    `;
    
    const detailedResult = await pool.query(detailedQuery, [problematicReport.id]);
    const reportData = detailedResult.rows[0];
    
    // Анализируем profileSnapshot
    console.log('\n=== АНАЛИЗ PROFILE SNAPSHOT ===');
    if (reportData.profileSnapshot && reportData.profileSnapshot.columns) {
      console.log('📋 Колонки profileSnapshot:');
      reportData.profileSnapshot.columns.forEach((col, index) => {
        console.log(`   ${index + 1}. canonicalKey: ${col.canonicalKey}`);
        console.log(`      sourceHeader: ${col.sourceHeader}`);
        console.log(`      dataType: ${col.dataType || 'не указан'}`);
        console.log('');
      });
    }
    
    // Анализируем processedData
    console.log('=== АНАЛИЗ PROCESSED DATA ===');
    if (reportData.processedData) {
      console.log('📊 Структура processedData:');
      console.log(`   Canonical: ${reportData.processedData.canonical ? 'есть' : 'нет'}`);
      if (reportData.processedData.canonical) {
        console.log(`   Canonical rows: ${reportData.processedData.canonical.rows ? reportData.processedData.canonical.rows.length : 'нет'}`);
        console.log(`   Canonical columns: ${reportData.processedData.canonical.columns ? Object.keys(reportData.processedData.canonical.columns).length : 'нет'}`);
      }
      if (reportData.processedData.profile && reportData.processedData.profile.headers) {
        console.log(`   Profile headers: ${JSON.stringify(reportData.processedData.profile.headers)}`);
      }
    } else {
      console.log('❌ processedData отсутствует');
    }
    
    // Анализируем rawData
    console.log('\n=== АНАЛИЗ RAW DATA ===');
    if (reportData.rawData && reportData.rawData.length > 0) {
      console.log(`📄 RawData строк: ${reportData.rawData.length}`);
      console.log(`   Первая строка (заголовки): ${JSON.stringify(reportData.rawData[0])}`);
      if (reportData.rawData.length > 1) {
        console.log(`   Вторая строка (данные): ${JSON.stringify(reportData.rawData[1])}`);
      }
    } else {
      console.log('❌ rawData отсутствует или пуст');
    }

    // Получаем профиль
    console.log(`\n=== АНАЛИЗ ПРОФИЛЯ ${problematicReport.profileId} ===`);
    const profileQuery = `
      SELECT 
        id,
        name,
        "gpsSystem",
        "columnMapping",
        "metricsConfig"
      FROM public."GpsProfile"
      WHERE id = $1
    `;
    
    const profileResult = await pool.query(profileQuery, [problematicReport.profileId]);
    
    if (profileResult.rows.length === 0) {
      console.log('❌ Профиль не найден!');
      return;
    }
    
    const profile = profileResult.rows[0];
    console.log(`📋 Профиль: ${profile.name} (${profile.gpsSystem})`);
    console.log(`   ColumnMapping: ${JSON.stringify(profile.columnMapping)}`);
    console.log(`   MetricsConfig: ${JSON.stringify(profile.metricsConfig)}`);
    
    // Загружаем реестр канонических ключей
    console.log('\n=== ПРОВЕРКА РЕЕСТРА КАНОНИЧЕСКИХ КЛЮЧЕЙ ===');
    const fs = require('fs');
    const path = require('path');
    
    try {
      const registryPath = path.join(__dirname, '..', 'src', 'canon', 'metrics.registry.json');
      const registryContent = fs.readFileSync(registryPath, 'utf8');
      const registry = JSON.parse(registryContent);
      
      // Создаем мапу ключей из реестра
      const registryKeys = new Set();
      if (registry.metrics && Array.isArray(registry.metrics)) {
        registry.metrics.forEach(metric => {
          registryKeys.add(metric.key);
        });
      }
      
      console.log('📚 Реестр загружен, ключи:');
      Array.from(registryKeys).forEach(key => {
        console.log(`   - ${key}`);
      });
      
      // Проверяем ключи из профиля (из columnMapping)
      const unknownKeys = [];
      if (profile.columnMapping) {
        // Извлекаем canonicalKey из columnMapping
        Object.values(profile.columnMapping).forEach(mapping => {
          if (mapping && mapping.canonicalKey && !registryKeys.has(mapping.canonicalKey)) {
            unknownKeys.push(mapping.canonicalKey);
          }
        });
      }
      
      if (unknownKeys.length > 0) {
        console.log(`\n⚠️  UNKNOWN_CANON_KEYS из профиля: ${JSON.stringify(unknownKeys)}`);
      } else {
        console.log('\n✅ Все ключи профиля найдены в реестре');
      }
      
      // Проверяем ключи из snapshot
      const snapshotUnknownKeys = [];
      if (reportData.profileSnapshot && reportData.profileSnapshot.columns) {
        reportData.profileSnapshot.columns.forEach(col => {
          if (col.canonicalKey && !registryKeys.has(col.canonicalKey)) {
            snapshotUnknownKeys.push(col.canonicalKey);
          }
        });
      }
      
      if (snapshotUnknownKeys.length > 0) {
        console.log(`\n⚠️  UNKNOWN_CANON_KEYS из snapshot: ${JSON.stringify(snapshotUnknownKeys)}`);
      } else {
        console.log('\n✅ Все ключи snapshot найдены в реестре');
      }
      
      // Проверяем соответствие заголовков
      console.log('\n=== ПРОВЕРКА СООТВЕТСТВИЯ ЗАГОЛОВКОВ ===');
      const headerMismatches = [];
      
      if (reportData.profileSnapshot && reportData.profileSnapshot.columns) {
        reportData.profileSnapshot.columns.forEach(col => {
          if (col.sourceHeader) {
            // Проверяем в rawData
            let foundInRaw = false;
            if (reportData.rawData && reportData.rawData.length > 0) {
              foundInRaw = reportData.rawData[0].includes(col.sourceHeader);
            }
            
            // Проверяем в processedData.profile.headers
            let foundInProcessed = false;
            if (reportData.processedData && reportData.processedData.profile && reportData.processedData.profile.headers) {
              foundInProcessed = reportData.processedData.profile.headers.includes(col.sourceHeader);
            }
            
            if (!foundInRaw && !foundInProcessed) {
              headerMismatches.push(col.sourceHeader);
            }
          }
        });
      }
      
      if (headerMismatches.length > 0) {
        console.log(`\n⚠️  HEADER_MISMATCH: ${JSON.stringify(headerMismatches)}`);
      } else {
        console.log('\n✅ Все заголовки найдены в данных');
      }
      
    } catch (error) {
      console.log(`❌ Ошибка загрузки реестра: ${error.message}`);
    }

    console.log('\n=== ИТОГОВАЯ СВОДКА ===');
    console.log(`Report ID: ${problematicReport.id}`);
    console.log(`Name: ${problematicReport.name}`);
    console.log(`Created At: ${problematicReport.createdAt}`);
    console.log(`ProfileSnapshot columns: ${problematicReport.profilesnapshot_columns_length}`);
    console.log(`Canonical rows: ${problematicReport.canonical_rows_length}`);
    console.log(`Status: ПРОБЛЕМА - canonical данные пусты или отсутствуют`);

  } catch (error) {
    console.error('❌ Ошибка диагностики:', error);
  } finally {
    await pool.end();
  }
}

// Запускаем диагностику
diagnoseGpsReportsDetailed().catch(console.error);
