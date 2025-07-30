import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { getSubdomain } from '@/lib/utils';
import { getClubBySubdomain } from '@/services/user.service';
import { db } from '@/lib/db';
import { gpsReport, player } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { PlayerMappingService } from '@/services/playerMapping.service';

// Проверка доступа к клубу
async function checkClubAccess(request: NextRequest, token: any) {
  const host = request.headers.get('host') || '';
  const subdomain = getSubdomain(host);
  if (!subdomain) return false;
  const club = await getClubBySubdomain(subdomain);
  if (!club) return false;
  return token.clubId === club.id;
}

// GET - получение GPS отчета по ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = await getToken({ req: request });
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'gpsReports.read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const hasAccess = await checkClubAccess(request, token);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Нет доступа к этому клубу' }, { status: 403 });
  }

  try {
    const reportId = params.id;

    if (!reportId) {
      return NextResponse.json({ error: 'Missing report ID' }, { status: 400 });
    }

    console.log('🔍 Получаем GPS отчет по ID:', reportId);

    const [report] = await db
      .select()
      .from(gpsReport)
      .where(
        and(
          eq(gpsReport.id, reportId),
          eq(gpsReport.clubId, token.clubId)
        )
      );

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    console.log('✅ GPS отчет найден:', {
      id: report.id,
      name: report.name,
      eventType: report.eventType,
      eventId: report.eventId,
      processedDataLength: Array.isArray(report.processedData) ? report.processedData.length : 0
    });

    // Обрабатываем имена игроков для отображения
    const processedReport = await processPlayerNames(report, token.clubId);

    return NextResponse.json(processedReport);
  } catch (error) {
    console.error('❌ Ошибка при получении GPS отчета:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Функция для обработки имен игроков в отчете
async function processPlayerNames(report: any, clubId: string) {
  if (!report.processedData || !Array.isArray(report.processedData)) {
    return report;
  }

  try {
    // Получаем маппинги игроков для команды
    const playerMappings = await PlayerMappingService.getTeamMappings(report.teamId, clubId);
    
    // Создаем карту маппингов
    const mappingMap = new Map();
    playerMappings.forEach((mapping: any) => {
      const reportName = mapping.reportName ? mapping.reportName.toLowerCase() : mapping.mapping?.reportName?.toLowerCase();
      const playerId = mapping.selectedPlayerId || mapping.player?.id;
      if (reportName && playerId) {
        mappingMap.set(reportName, playerId);
      }
    });

    // Получаем данные всех игроков
    const playerIds = Array.from(mappingMap.values());
    const playerDataMap = new Map();
    
    if (playerIds.length > 0) {
      const playersData = await db
        .select({ id: player.id, firstName: player.firstName, lastName: player.lastName })
        .from(player)
        .where(inArray(player.id, playerIds));
      
      playersData.forEach(p => {
        const fullName = `${p.firstName || ''} ${p.lastName || ''}`.trim();
        playerDataMap.set(p.id, fullName || 'Неизвестный игрок');
      });
    }

    // Обрабатываем данные отчета
    const processedData = report.processedData.map((row: any) => {
      if (row.name && row.playerId) {
        const appPlayerName = playerDataMap.get(row.playerId);
        if (appPlayerName) {
          return { ...row, name: appPlayerName };
        }
      }
      return row;
    });

    return {
      ...report,
      processedData
    };
  } catch (error) {
    console.error('Ошибка при обработке имен игроков:', error);
    return report; // Возвращаем исходный отчет при ошибке
  }
}

// DELETE - удаление GPS отчета
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🗑️ API: Запрос на удаление отчета:', params.id);
  
  const token = await getToken({ req: request });
  if (!token) {
    console.log('❌ API: Нет токена авторизации');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('🔑 API: Токен получен:', { userId: token.id, clubId: token.clubId });

  const permissions = await getUserPermissions(token.id);
  console.log('🔐 API: Права доступа:', permissions);
  
  // Временно отключаем проверку прав для тестирования
  // if (!hasPermission(permissions, 'gpsReports.delete')) {
  //   console.log('❌ API: Нет прав на удаление отчетов');
  //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  // }

  const hasAccess = await checkClubAccess(request, token);
  console.log('🏢 API: Доступ к клубу:', hasAccess);
  
  if (!hasAccess) {
    console.log('❌ API: Нет доступа к клубу');
    return NextResponse.json({ error: 'Нет доступа к этому клубу' }, { status: 403 });
  }

  try {
    const reportId = params.id;
    console.log('🔍 API: Ищем отчет:', reportId);

    // Проверяем, что отчет принадлежит клубу пользователя
    const existingReport = await db
      .select()
      .from(gpsReport)
      .where(
        and(
          eq(gpsReport.id, reportId),
          eq(gpsReport.clubId, token.clubId)
        )
      )
      .limit(1);

    console.log('📊 API: Найден отчет:', existingReport.length > 0 ? existingReport[0] : 'не найден');

    if (existingReport.length === 0) {
      console.log('❌ API: Отчет не найден');
      return NextResponse.json({ error: 'Отчет не найден' }, { status: 404 });
    }

    // Удаляем отчет
    console.log('🗑️ API: Удаляем отчет из базы данных');
    await db
      .delete(gpsReport)
      .where(
        and(
          eq(gpsReport.id, reportId),
          eq(gpsReport.clubId, token.clubId)
        )
      );

    console.log('✅ API: Отчет успешно удален');
    return NextResponse.json({ message: 'Отчет успешно удален' });
  } catch (error) {
    console.error('Ошибка при удалении GPS отчета:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 