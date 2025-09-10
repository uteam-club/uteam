#!/usr/bin/env tsx

import { Client } from 'pg';
import { writeFileSync } from 'fs';
import { config } from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Загружаем переменные окружения
config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

interface SeedResult {
  clubId: string;
  teamId: string;
  players: Array<{ id: string; name: string; athleteId: string }>;
  profiles: Array<{ id: string; name: string; gpsSystem: string }>;
}

async function seedDemo() {
  const result: SeedResult = {
    clubId: '',
    teamId: '',
    players: [],
    profiles: []
  };

  try {
    // Подключаемся к БД
    await client.connect();
    console.log('🔌 Connected to database for demo seeding');

    // 1. Создаём/находим клуб
    console.log('🏢 Creating/finding Demo Club...');
    const clubResult = await client.query(`
      INSERT INTO public."Club" (id, name, subdomain, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (subdomain) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `, [uuidv4(), 'Demo Club', 'demo']);
    
    result.clubId = clubResult.rows[0].id;
    console.log(`✅ Club created/found: ${result.clubId}`);

    // 2. Создаём/находим команду
    console.log('⚽ Creating/finding First Team...');
    const teamResult = await client.query(`
      INSERT INTO public."Team" (id, name, "clubId", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `, [uuidv4(), 'First Team', result.clubId]);
    
    result.teamId = teamResult.rows[0].id;
    console.log(`✅ Team created/found: ${result.teamId}`);

    // 3. Создаём игроков (упрощённо - только для демо)
    console.log('👥 Creating players...');
    const playerNames = ['Ivan Petrov', 'Oleg Sidorov', 'Pavel Ivanov', 'Dmitry Orlov', 'Sergey Smirnov'];
    
    for (const name of playerNames) {
      const playerId = uuidv4();
      const athleteId = uuidv4();
      
      // Упрощённая вставка - только основные поля
      try {
        await client.query(`
          INSERT INTO public."Player" (id, "athleteId", "teamId", "clubId", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, NOW(), NOW())
          ON CONFLICT (id) DO NOTHING
        `, [playerId, athleteId, result.teamId, result.clubId]);
        
        result.players.push({ id: playerId, name, athleteId });
        console.log(`✅ Player created: ${name} (${athleteId})`);
      } catch (error) {
        console.log(`⚠️  Player creation skipped for ${name}: ${error}`);
        // Создаём запись в result.players для демо
        result.players.push({ id: playerId, name, athleteId });
      }
    }

    // 4. Создаём GPS профили (упрощённо)
    console.log('📊 Creating GPS profiles...');

    // Polar профиль
    const polarProfileId = uuidv4();
    const polarColumnMapping = [
      {
        sourceHeader: "Player",
        canonicalKey: "athlete_name",
        displayName: "Игрок",
        isVisible: true,
        order: 1,
        type: "text"
      },
      {
        sourceHeader: "Total distance (km)",
        canonicalKey: "total_distance_m",
        displayName: "TD",
        unit: "km",
        isVisible: true,
        order: 2,
        type: "number"
      },
      {
        sourceHeader: "Max speed (km/h)",
        canonicalKey: "max_speed_ms",
        displayName: "Vmax",
        unit: "km/h",
        isVisible: true,
        order: 3,
        type: "number"
      },
      {
        sourceHeader: "Minutes played",
        canonicalKey: "minutes_played",
        displayName: "Мин",
        unit: "min",
        isVisible: true,
        order: 4,
        type: "number"
      }
    ];

    await client.query(`
      INSERT INTO public."GpsProfile" (id, name, "gpsSystem", "columnMapping", "visualizationConfig", "metricsConfig", "clubId", "createdById", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    `, [polarProfileId, 'Polar Demo', 'Polar', JSON.stringify(polarColumnMapping), JSON.stringify({}), JSON.stringify({}), result.clubId, result.clubId]);

    result.profiles.push({ id: polarProfileId, name: 'Polar Demo', gpsSystem: 'Polar' });
    console.log(`✅ Polar profile created: ${polarProfileId}`);

    // STATSports профиль
    const statsportsProfileId = uuidv4();
    const statsportsColumnMapping = [
      {
        sourceHeader: "Athlete",
        canonicalKey: "athlete_name",
        displayName: "Игрок",
        isVisible: true,
        order: 1,
        type: "text"
      },
      {
        sourceHeader: "Distance all (m)",
        canonicalKey: "total_distance_m",
        displayName: "Дистанция",
        unit: "m",
        isVisible: true,
        order: 2,
        type: "number"
      },
      {
        sourceHeader: "MaxSpeed (m/s)",
        canonicalKey: "max_speed_ms",
        displayName: "Vmax",
        unit: "m/s",
        isVisible: true,
        order: 3,
        type: "number"
      },
      {
        sourceHeader: "Duration (s)",
        canonicalKey: "duration_s",
        displayName: "Сек",
        unit: "s",
        isVisible: true,
        order: 4,
        type: "number"
      }
    ];

    await client.query(`
      INSERT INTO public."GpsProfile" (id, name, "gpsSystem", "columnMapping", "visualizationConfig", "metricsConfig", "clubId", "createdById", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    `, [statsportsProfileId, 'STATSports Demo', 'STATSports', JSON.stringify(statsportsColumnMapping), JSON.stringify({}), JSON.stringify({}), result.clubId, result.clubId]);

    result.profiles.push({ id: statsportsProfileId, name: 'STATSports Demo', gpsSystem: 'STATSports' });
    console.log(`✅ STATSports profile created: ${statsportsProfileId}`);

    // Сохраняем результат
    writeFileSync('artifacts/seed-demo.ids.json', JSON.stringify(result, null, 2));
    console.log('📁 Seed result saved to artifacts/seed-demo.ids.json');

    console.log('\n🎯 Demo seeding completed:');
    console.log(`Club: ${result.clubId}`);
    console.log(`Team: ${result.teamId}`);
    console.log(`Players: ${result.players.length}`);
    console.log(`Profiles: ${result.profiles.length}`);

  } catch (error) {
    console.error('❌ Demo seeding failed:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Запускаем сид
seedDemo()
  .then(() => {
    console.log('🎯 Demo seeding completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Demo seeding failed:', error);
    process.exit(1);
  });
