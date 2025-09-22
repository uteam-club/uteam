import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { db } from '@/lib/db';
import { gpsReportData } from '@/db/schema/gpsReportData';
import { gpsReport } from '@/db/schema/gpsReport';
import { player } from '@/db/schema/player';
import { eq, inArray } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reportId = params.id;

    // Получаем данные отчета
    const reportData = await db.select()
      .from(gpsReportData)
      .where(eq(gpsReportData.gpsReportId, reportId));


    // Получаем информацию об отчете
    const [report] = await db.select()
      .from(gpsReport)
      .where(eq(gpsReport.id, reportId));

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }


    // Если нет данных, возвращаем пустой массив
    if (reportData.length === 0) {
      return NextResponse.json({
        report: {
          id: report.id,
          name: report.name,
          fileName: report.fileName,
          gpsSystem: report.gpsSystem,
          eventType: report.eventType,
          isProcessed: report.isProcessed,
          playersCount: report.playersCount,
          createdAt: report.createdAt,
        },
        data: [],
      });
    }

    // Получаем уникальные ID игроков
    const playerIds = [...new Set(reportData.map(item => item.playerId))];
    
    
    // Создаем мапу игроков
    const playerMap = new Map();
    
    if (playerIds.length > 0) {
      // Получаем информацию об игроках
      const players = await db.select({
        id: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
      }).from(player).where(inArray(player.id, playerIds));
      
      
      for (const p of players) {
        playerMap.set(p.id, `${p.firstName} ${p.lastName}`);
      }
    }
    
    // Преобразуем данные в формат для редактирования
    const editData = reportData.map(item => {
      // Для строковых значений (позиция, имя игрока) не парсим как число
      const isStringValue = item.unit === 'string' || item.canonicalMetric === 'athlete_name' || item.canonicalMetric === 'position';
      
      let numericValue = 0;
      if (!isStringValue) {
        const parsed = parseFloat(item.value);
        numericValue = isNaN(parsed) ? 0 : parsed;
      }
      
      return {
        id: item.id,
        playerId: item.playerId,
        playerName: playerMap.get(item.playerId) || `Player ${item.playerId.slice(-4)}`,
        fieldName: item.canonicalMetric,
        fieldLabel: item.canonicalMetric, // Можно добавить маппинг на человекочитаемые названия
        canonicalMetric: item.canonicalMetric,
        value: isStringValue ? item.value : numericValue,
        unit: item.unit,
        canonicalValue: isStringValue ? 0 : numericValue,
        canonicalUnit: item.unit,
      };
    });

    return NextResponse.json({
      report: {
        id: report.id,
        name: report.name,
        fileName: report.fileName,
        gpsSystem: report.gpsSystem,
        eventType: report.eventType,
        isProcessed: report.isProcessed,
        playersCount: report.playersCount,
        createdAt: report.createdAt,
      },
      data: editData,
    });

  } catch (error) {
    console.error('Error fetching report data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}