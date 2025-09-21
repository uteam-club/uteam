#!/usr/bin/env tsx

import { db } from '../src/lib/db';
import { gpsReport } from '../src/db/schema/gpsReport';
import { gpsReportData } from '../src/db/schema/gpsReportData';
import { gpsVisualizationProfile } from '../src/db/schema/gpsColumnMapping';
import { gpsProfileColumn } from '../src/db/schema/gpsColumnMapping';
import { gpsCanonicalMetric } from '../src/db/schema/gpsCanonicalMetric';
import { player } from '../src/db/schema/player';
import { team } from '../src/db/schema/team';
import { training } from '../src/db/schema/training';
import { eq } from 'drizzle-orm';

async function createTestGpsData() {
  console.log('🧪 Creating test GPS data...');

  try {
    // Получаем первую команду
    const [firstTeam] = await db.select().from(team).limit(1);
    if (!firstTeam) {
      console.log('❌ No teams found. Please create a team first.');
      return;
    }

    // Получаем игроков команды
    const players = await db.select().from(player).where(eq(player.teamId, firstTeam.id)).limit(8);
    if (players.length === 0) {
      console.log('❌ No players found for team. Please create players first.');
      return;
    }

    // Получаем первую тренировку
    const [firstTraining] = await db.select().from(training).where(eq(training.teamId, firstTeam.id)).limit(1);
    if (!firstTraining) {
      console.log('❌ No trainings found. Please create a training first.');
      return;
    }

    // Получаем канонические метрики
    const metrics = await db.select().from(gpsCanonicalMetric).limit(10);
    if (metrics.length === 0) {
      console.log('❌ No canonical metrics found. Please run seed-gps-data.ts first.');
      return;
    }

    // Создаем тестовый GPS отчет
    const [testReport] = await db.insert(gpsReport).values({
      name: 'Test GPS Report',
      fileName: 'test-gps-report.csv',
      fileUrl: '/uploads/test-gps-report.csv',
      gpsSystem: 'Polar',
      eventType: 'training',
      eventId: firstTraining.id,
      clubId: firstTeam.clubId,
      uploadedById: 'test-user-id',
      teamId: firstTeam.id,
      isProcessed: true,
      status: 'processed',
      playersCount: players.length,
    }).returning();

    console.log('✅ Created test GPS report:', testReport.id);

    // Создаем тестовые данные для каждого игрока
    const testData = [
      { metric: 'total_distance', value: '7000', unit: 'm' },
      { metric: 'max_speed', value: '8.5', unit: 'm/s' },
      { metric: 'avg_speed', value: '2.1', unit: 'm/s' },
      { metric: 'duration', value: '3600', unit: 's' },
      { metric: 'sprints', value: '10', unit: 'count' },
      { metric: 'highIntensityRuns', value: '25', unit: 'count' },
      { metric: 'accelerations', value: '40', unit: 'count' },
      { metric: 'decelerations', value: '35', unit: 'count' },
      { metric: 'avg_heart_rate', value: '145', unit: 'bpm' },
      { metric: 'max_heart_rate', value: '185', unit: 'bpm' },
    ];

    for (const playerData of players) {
      for (const data of testData) {
        await db.insert(gpsReportData).values({
          gpsReportId: testReport.id,
          playerId: playerData.id,
          canonicalMetric: data.metric,
          value: data.value,
          unit: data.unit,
        });
      }
    }

    console.log('✅ Created test GPS data for', players.length, 'players');

    // Создаем тестовый профиль визуализации
    const [testProfile] = await db.insert(gpsVisualizationProfile).values({
      name: 'Test Visualization Profile',
      description: 'Test profile for GPS data visualization',
      clubId: firstTeam.clubId,
      createdById: 'test-user-id',
    }).returning();

    console.log('✅ Created test visualization profile:', testProfile.id);

    // Создаем колонки профиля
    const profileColumns = [
      { metric: 'total_distance', displayName: 'TD', displayUnit: 'm', order: 1 },
      { metric: 'max_speed', displayName: 'Max speed', displayUnit: 'km/h', order: 2 },
      { metric: 'avg_speed', displayName: 'Avg speed', displayUnit: 'km/h', order: 3 },
      { metric: 'duration', displayName: 'Time', displayUnit: 'min', order: 4 },
      { metric: 'sprints', displayName: 'Sprint', displayUnit: 'count', order: 5 },
      { metric: 'highIntensityRuns', displayName: 'HSR', displayUnit: 'count', order: 6 },
      { metric: 'accelerations', displayName: 'Acc', displayUnit: 'count', order: 7 },
      { metric: 'decelerations', displayName: 'Dec', displayUnit: 'count', order: 8 },
    ];

    for (const col of profileColumns) {
      const metric = metrics.find(m => m.code === col.metric);
      if (metric) {
        await db.insert(gpsProfileColumn).values({
          profileId: testProfile.id,
          canonicalMetricId: metric.id,
          displayName: col.displayName,
          displayUnit: col.displayUnit,
          displayOrder: col.order,
          isVisible: true,
        });
      }
    }

    console.log('✅ Created test profile columns');

    console.log('\n🎉 Test GPS data created successfully!');
    console.log('📊 Report ID:', testReport.id);
    console.log('👥 Profile ID:', testProfile.id);
    console.log('🏃 Players:', players.length);
    console.log('📈 Metrics per player:', testData.length);

  } catch (error) {
    console.error('❌ Error creating test GPS data:', error);
    throw error;
  }
}

// Запускаем скрипт
if (require.main === module) {
  createTestGpsData()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { createTestGpsData };
