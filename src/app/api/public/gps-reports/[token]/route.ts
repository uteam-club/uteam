import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { gpsReport, gpsProfile, player, team, match, training } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

// GET - получение публичного GPS отчета по токену
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    console.log('🔍 Получаем публичный GPS отчет по токену:', token);

    // Находим отчет по токену
    const [report] = await db
      .select()
      .from(gpsReport)
      .where(eq(gpsReport.id, token));

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Получаем профиль для отчета
    const [profile] = await db
      .select()
      .from(gpsProfile)
      .where(eq(gpsProfile.id, report.profileId));

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Получаем информацию о команде
    const [teamData] = await db
      .select()
      .from(team)
      .where(eq(team.id, report.teamId));

    // Получаем информацию о событии (матч или тренировка)
    let eventData = null;
    if (report.eventType === 'MATCH') {
      const [matchData] = await db
        .select()
        .from(match)
        .where(eq(match.id, report.eventId));
      eventData = matchData;
    } else if (report.eventType === 'TRAINING') {
      const [trainingData] = await db
        .select()
        .from(training)
        .where(eq(training.id, report.eventId));
      eventData = trainingData;
    }

    // Добавляем информацию о команде и событии к отчету
    const reportWithTeam = {
      ...report,
      team: teamData || null,
      event: eventData || null
    };

    console.log('✅ Публичный GPS отчет найден:', {
      id: report.id,
      name: report.name,
      eventType: report.eventType,
      eventId: report.eventId,
      processedDataLength: Array.isArray(report.processedData) ? report.processedData.length : 0,
      eventData: eventData
    });

    // Обрабатываем имена игроков для отображения
    const processedReport = await processPlayerNames(reportWithTeam, report.clubId);

    return NextResponse.json({
      report: processedReport,
      profile: profile
    });
  } catch (error) {
    console.error('❌ Ошибка при получении публичного GPS отчета:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Функция для обработки имен игроков в отчете
async function processPlayerNames(report: any, clubId: string) {
  if (!report.processedData || !Array.isArray(report.processedData)) {
    return report;
  }

  // Собираем все playerId из данных
  const playerIds = report.processedData
    .map((row: any) => row.playerId)
    .filter((id: string) => id);

  if (playerIds.length === 0) {
    return report;
  }

  // Получаем данные игроков
  const playersData = await db
    .select({ id: player.id, firstName: player.firstName, lastName: player.lastName })
    .from(player)
    .where(inArray(player.id, playerIds));

  // Создаем мапу для быстрого поиска
  const playerMap = new Map();
  playersData.forEach(p => {
    const fullName = `${p.firstName || ''} ${p.lastName || ''}`.trim();
    playerMap.set(p.id, fullName || 'Неизвестный игрок');
  });

  // Обновляем имена в данных
  const updatedProcessedData = report.processedData.map((row: any) => {
    if (row.playerId && playerMap.has(row.playerId)) {
      return {
        ...row,
        name: playerMap.get(row.playerId)
      };
    }
    return row;
  });

  return {
    ...report,
    processedData: updatedProcessedData
  };
} 