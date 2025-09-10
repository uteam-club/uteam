const { Pool } = require('pg');
require('dotenv').config();

// Подключение к базе данных
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function diagnoseGpsReports() {
  console.log('🔍 GPS Диагностика: Поиск проблемных отчётов\n');

  try {
    // Шаг 1: Получаем последние 3 записи из GpsReport
    console.log('=== ШАГ 1: Последние 3 отчёта ===');
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
      ORDER BY "createdAt" DESC
      LIMIT 3
    `;

    const reportsResult = await pool.query(reportsQuery);
    
    console.log(`📊 Найдено отчётов: ${reportsResult.rows.length}\n`);
    
    let problematicReport = null;
    
    reportsResult.rows.forEach((report, index) => {
      console.log(`${index + 1}. Отчёт ID: ${report.id}`);
      console.log(`   Название: ${report.name}`);
      console.log(`   Создан: ${report.createdAt}`);
      console.log(`   GPS система: ${report.gpsSystem}`);
      console.log(`   Profile ID: ${report.profileId}`);
      console.log(`   ProfileSnapshot: ${report.profilesnapshot_exists} (${report.profilesnapshot_columns_length} колонок)`);
      console.log(`   Canonical: ${report.canonical_exists} (${report.canonical_rows_length} строк)`);
      
      if (report.importmeta) {
        const meta = typeof report.importmeta === 'string' ? JSON.parse(report.importmeta) : report.importmeta;
        if (meta.errors && meta.errors.length > 0) {
          console.log(`   Ошибки импорта: ${JSON.stringify(meta.errors)}`);
        }
        if (meta.warnings && meta.warnings.length > 0) {
          console.log(`   Предупреждения: ${JSON.stringify(meta.warnings)}`);
        }
      }
      console.log('');

      // Проверяем, является ли отчёт проблемным
      if (report.canonical_exists === 'нет' && parseInt(report.profilesnapshot_columns_length) > 0) {
        problematicReport = report;
        console.log(`🚨 НАЙДЕН ПРОБЛЕМНЫЙ ОТЧЁТ: ${report.id}`);
      }
    });

    if (!problematicReport) {
      console.log('✅ Проблемных отчётов не найдено (canonical отсутствует, но profileSnapshot.columns.length > 0)');
      return;
    }

    console.log(`\n=== ШАГ 2: Анализ проблемного отчёта ${problematicReport.id} ===`);
    
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
    if (reportData.profileSnapshot && reportData.profileSnapshot.columns) {
      console.log('📋 Анализ profileSnapshot.columns:');
      reportData.profileSnapshot.columns.forEach((col, index) => {
        console.log(`   ${index + 1}. ${col.canonicalKey} (sourceHeader: ${col.sourceHeader})`);
      });
    }
    
    // Анализируем processedData
    if (reportData.processedData) {
      console.log('\n📊 Анализ processedData:');
      console.log(`   Canonical: ${reportData.processedData.canonical ? 'есть' : 'нет'}`);
      if (reportData.processedData.canonical && reportData.processedData.canonical.rows) {
        console.log(`   Строк canonical: ${reportData.processedData.canonical.rows.length}`);
      }
      if (reportData.processedData.profile && reportData.processedData.profile.headers) {
        console.log(`   Заголовки профиля: ${JSON.stringify(reportData.processedData.profile.headers)}`);
      }
    }
    
    // Анализируем rawData
    if (reportData.rawData && reportData.rawData.length > 0) {
      console.log(`\n📄 Анализ rawData (первая строка):`);
      console.log(`   Заголовки: ${JSON.stringify(reportData.rawData[0])}`);
    }

    // Получаем профиль
    console.log(`\n=== ШАГ 3: Анализ профиля ${problematicReport.profileId} ===`);
    const profileQuery = `
      SELECT 
        id,
        name,
        "gpsSystem",
        "canonicalKeys"
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
    console.log(`   CanonicalKeys: ${JSON.stringify(profile.canonicalKeys)}`);
    
    // Загружаем реестр канонических ключей
    console.log('\n=== ШАГ 4: Проверка реестра канонических ключей ===');
    const fs = require('fs');
    const path = require('path');
    
    try {
      const registryPath = path.join(__dirname, '..', 'src', 'canon', 'metrics.registry.json');
      const registryContent = fs.readFileSync(registryPath, 'utf8');
      const registry = JSON.parse(registryContent);
      
      console.log('📚 Реестр загружен, ключи:');
      Object.keys(registry).forEach(key => {
        console.log(`   - ${key}`);
      });
      
      // Проверяем ключи из профиля
      const unknownKeys = [];
      if (profile.canonicalKeys) {
        profile.canonicalKeys.forEach(key => {
          if (!registry[key]) {
            unknownKeys.push(key);
          }
        });
      }
      
      if (unknownKeys.length > 0) {
        console.log(`\n⚠️  UNKNOWN_CANON_KEYS: ${JSON.stringify(unknownKeys)}`);
      } else {
        console.log('\n✅ Все ключи профиля найдены в реестре');
      }
      
      // Проверяем ключи из snapshot
      const snapshotUnknownKeys = [];
      if (reportData.profileSnapshot && reportData.profileSnapshot.columns) {
        reportData.profileSnapshot.columns.forEach(col => {
          if (col.canonicalKey && !registry[col.canonicalKey]) {
            snapshotUnknownKeys.push(col.canonicalKey);
          }
        });
      }
      
      if (snapshotUnknownKeys.length > 0) {
        console.log(`\n⚠️  SNAPSHOT UNKNOWN_CANON_KEYS: ${JSON.stringify(snapshotUnknownKeys)}`);
      }
      
    } catch (error) {
      console.log(`❌ Ошибка загрузки реестра: ${error.message}`);
    }

    console.log('\n=== РЕЗУЛЬТАТ ДИАГНОСТИКИ ===');
    console.log(`Проблемный отчёт: ${problematicReport.id} (${problematicReport.name})`);
    console.log(`ProfileSnapshot колонок: ${problematicReport.profilesnapshot_columns_length}`);
    console.log(`Canonical строк: ${problematicReport.canonical_rows_length}`);
    console.log(`Статус: ${problematicReport.canonical_exists === 'нет' ? 'ПРОБЛЕМА - нет canonical данных' : 'OK'}`);

  } catch (error) {
    console.error('❌ Ошибка диагностики:', error);
  } finally {
    await pool.end();
  }
}

// Запускаем диагностику
diagnoseGpsReports().catch(console.error);
