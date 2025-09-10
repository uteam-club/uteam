#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const ART_DIR = path.join(process.cwd(), 'artifacts', 'selftest');
fs.mkdirSync(ART_DIR, { recursive: true });

const OUT = (name) => path.join(ART_DIR, name);
const write = (name, data) => fs.writeFileSync(OUT(name), typeof data === 'string' ? data : JSON.stringify(data, null, 2));

(async () => {
  const ctx = { step: 'start', stats: {}, notes: [] };
  try {
    // 0) ENV + defaults
    const gpsSystem = process.env.GPS_SELFTEST_SYSTEM || 'B-SIGHT';
    const applyApi = process.env.GPS_SELFTEST_API === '1';
    const fixtureRel = process.env.GPS_SELFTEST_FILE || 'fixtures/gps/statsports_demo.csv';
    const fixture = path.isAbsolute(fixtureRel) ? fixtureRel : path.join(process.cwd(), fixtureRel);

    ctx.step = 'env';
    ctx.env = { gpsSystem, applyApi, fixture };
    if (!fs.existsSync(fixture)) {
      ctx.notes.push(`Фикстура не найдена: ${fixture}. Создаем заглушку.`);
      // Создаем простую CSV заглушку
      const mockCsv = `Игрок,Индивидуальное время,Дистанция общая м,Макс. скорость км/ч
Иван Петров,01:20:00,8200,32.4
Петр Сидоров,00:45:00,5100,28.7`;
      fs.writeFileSync(fixture, mockCsv);
    }
    write('00_env.json', ctx.env);

    // 1) DB snapshot (read-only)
    ctx.step = 'db-snapshot';
    let db = null;
    try {
      const { Pool } = require('pg');
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      const q = async (sql, args=[]) => (await pool.query(sql, args)).rows;
      const profiles = await q(`select id, name, "gpsSystem", "createdAt"
                                from public."GpsProfile"
                                where "gpsSystem" = $1
                                order by "createdAt" desc
                                limit 5`, [gpsSystem]);
      const reports = await q(`select id, name, "gpsSystem", "createdAt", "profileId",
                                      (processedData is not null) as has_processed,
                                      (profileSnapshot is not null) as has_snapshot
                               from public."GpsReport"
                               where "gpsSystem" = $1
                               order by "createdAt" desc
                               limit 5`, [gpsSystem]);
      ctx.db = { profiles, reports };
      write('01_db.json', ctx.db);
      await pool.end();
    } catch (e) {
      ctx.notes.push(`DB недоступна или нет переменной DATABASE_URL: ${e.message}`);
    }

    // 2) Load registry
    ctx.step = 'load-registry';
    let registry = {};
    try {
      registry = require(path.join(process.cwd(), 'src/canon/metrics.registry.json'));
    } catch (e) {
      ctx.notes.push(`Не удалось загрузить registry: ${e.message}`);
    }

    // 3) Выбери профиль (последний по системе), или сформивай «временный» из 4 базовых метрик
    ctx.step = 'pick-profile';
    let picked = ctx.db?.profiles?.[0] || null;
    let profile = null;
    if (picked) {
      // читаем полный профиль
      try {
        const { Pool } = require('pg');
        const pool = new (require('pg').Pool)({ connectionString: process.env.DATABASE_URL });
        const rows = (await pool.query(`select * from public."GpsProfile" where id = $1`, [picked.id])).rows;
        await pool.end();
        profile = rows[0];
        write('02_profile_db.json', profile);
      } catch (e) {
        ctx.notes.push(`Не удалось загрузить профиль из БД: ${e.message}`);
        picked = null;
      }
    }
    
    if (!picked) {
      // заглушка-профиль на 4 колонки
      profile = {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'SELFTEST-TEMP',
        gpsSystem,
        columnMapping: [
          { type: 'column', name: 'Игрок', sourceHeader: 'Игрок', mappedColumn: 'Игрок', canonicalKey: 'athlete_name', isVisible: true, order: 1 },
          { type: 'column', name: 'Индивидуальное время', sourceHeader: 'Индивидуальное время', mappedColumn: 'Индивидуальное время', canonicalKey: 'minutes_played', isVisible: true, order: 2, displayUnit: 'min' },
          { type: 'column', name: 'Дистанция общая, м', sourceHeader: 'Дистанция общая м', mappedColumn: 'Дистанция общая м', canonicalKey: 'total_distance_m', isVisible: true, order: 3, displayUnit: 'm' },
          { type: 'column', name: 'Макс. скорость, км/ч', sourceHeader: 'Макс. скорость км/ч', mappedColumn: 'Макс. скорость км/ч', canonicalKey: 'max_speed_ms', isVisible: true, order: 4, displayUnit: 'km/h' },
        ],
        metricsConfig: {},
        visualizationConfig: {},
      };
      write('02_profile_fallback.json', profile);
    }

    // 4) Построим snapshot (упрощенная версия)
    ctx.step = 'build-snapshot';
    const snapshot = {
      columns: (profile.columnMapping || profile.columns || []).map(col => ({
        name: col.name || col.sourceHeader,
        sourceHeader: col.sourceHeader || col.mappedColumn,
        canonicalKey: col.canonicalKey,
        displayUnit: col.displayUnit,
        isVisible: col.isVisible !== false,
        order: col.order || 0
      }))
    };
    write('03_snapshot.json', snapshot);

    // 5) Парсим файл (упрощенная версия)
    ctx.step = 'parse-file';
    let headers = [];
    let rows = [];
    try {
      const content = fs.readFileSync(fixture, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      if (lines.length > 0) {
        headers = lines[0].split(',').map(h => h.trim());
        rows = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          const row = {};
          headers.forEach((header, i) => {
            row[header] = values[i] || '';
          });
          return row;
        });
      }
    } catch (e) {
      ctx.notes.push(`Ошибка парсинга файла: ${e.message}`);
    }
    
    ctx.stats.rawHeaders = headers?.length || 0;
    ctx.stats.rawRows = rows?.length || 0;
    write('04_parsed.json', { headers, sampleRows: rows.slice(0, 5) });

    // 6) Нормализуем строки под snapshot (упрощенная версия)
    ctx.step = 'normalize';
    const normalized = rows.map(row => {
      const normalizedRow = {};
      snapshot.columns.forEach(col => {
        const value = row[col.sourceHeader];
        if (value !== undefined) {
          normalizedRow[col.sourceHeader] = value;
        }
      });
      return normalizedRow;
    });
    ctx.stats.normRows = normalized.length;
    write('05_normalized.json', { sample: normalized.slice(0, 5) });

    // 7) Маппинг в канон (упрощенная версия)
    ctx.step = 'map-canon';
    const canonical = {
      rows: normalized.map(row => {
        const canonicalRow = {};
        snapshot.columns.forEach(col => {
          const value = row[col.sourceHeader];
          if (value !== undefined) {
            // Простая конвертация значений
            if (col.canonicalKey === 'total_distance_m' || col.canonicalKey === 'max_speed_ms') {
              canonicalRow[col.canonicalKey] = parseFloat(value) || 0;
            } else if (col.canonicalKey === 'minutes_played') {
              // Конвертируем время в минуты
              const timeStr = value.toString();
              if (timeStr.includes(':')) {
                const parts = timeStr.split(':');
                const hours = parseInt(parts[0]) || 0;
                const minutes = parseInt(parts[1]) || 0;
                const seconds = parseInt(parts[2]) || 0;
                canonicalRow[col.canonicalKey] = hours * 60 + minutes + seconds / 60;
              } else {
                canonicalRow[col.canonicalKey] = parseFloat(value) || 0;
              }
            } else {
              canonicalRow[col.canonicalKey] = value;
            }
          }
        });
        return canonicalRow;
      }),
      summary: {}
    };
    ctx.stats.canonRows = canonical.rows?.length || 0;
    write('06_canonical.json', canonical);

    // 8) Диагностический отчёт
    ctx.step = 'report';
    const md = [
      '# GPS SELFTEST REPORT (read-only)',
      '',
      `**System:** ${gpsSystem}`,
      `**Fixture:** ${fixture}`,
      '',
      '## Stats',
      `- raw headers: ${ctx.stats.rawHeaders}`,
      `- raw rows: ${ctx.stats.rawRows}`,
      `- normalized rows: ${ctx.stats.normRows}`,
      `- canonical rows: ${ctx.stats.canonRows}`,
      '',
      '## Snapshot columns',
      ...snapshot.columns.map((c, i) => `- ${i+1}. ${c.name} → ${c.canonicalKey}${c.displayUnit ? ` [${c.displayUnit}]` : ''}`),
      '',
      '## Notes',
      ...ctx.notes.map(note => `- ${note}`),
      '',
      '## Hints',
      ctx.stats.canonRows === 0
        ? '- ❌ Канон пуст. Частые причины: не совпали заголовки/индексы, профиль с неправильными mappedColumn, или файл без ожидаемых колонок.'
        : '- ✅ Канон получен. Если в UI ошибка — ищем в API/валидации/FormData.',
      '',
    ].join('\n');
    write('07_report.md', md);

    // 9) (Опционально) Реальный вызов API с тем же файлом — только если GPS_SELFTEST_API=1
    if (applyApi) {
      ctx.step = 'api-call';
      const meta = {
        eventId: process.env.GPS_SELFTEST_EVENT_ID || '00000000-0000-0000-0000-000000000000',
        teamId: process.env.GPS_SELFTEST_TEAM_ID  || '00000000-0000-0000-0000-000000000000',
        gpsSystem,
        profileId: profile.id,
        fileName: path.basename(fixture),
        eventType: 'TRAINING',
        playerMappings: [], // пусто — чтобы проверить, что они реально опциональны
      };
      
      try {
        const FormData = (await import('form-data')).default;
        const fd = new FormData();
        fd.append('file', fs.createReadStream(fixture));
        fd.append('meta', JSON.stringify(meta));
        const fetch = (await import('node-fetch')).default;
        const url = process.env.GPS_SELFTEST_API_URL || 'http://localhost:3000/api/gps-reports';
        const res = await fetch(url, { method: 'POST', body: fd });
        const text = await res.text();
        write('08_api_response.txt', `STATUS: ${res.status}\n\n${text}`);
        ctx.stats.apiStatus = res.status;
        ctx.notes.push(`API call done: ${url} (status: ${res.status})`);
      } catch (e) {
        ctx.notes.push(`API call failed: ${e.message}`);
      }
    }

    ctx.step = 'done';
    write('99_context.json', ctx);
    console.log('✅ SELFTEST DONE. See artifacts/selftest/07_report.md');
    process.exit(0);
  } catch (e) {
    const fail = {
      error: e.message,
      step: ctx.step,
      stats: ctx.stats,
      notes: ctx.notes
    };
    write('ZZ_error.json', fail);
    console.error('❌ SELFTEST FAIL at step:', ctx.step, '\n', e);
    process.exit(1);
  }
})();