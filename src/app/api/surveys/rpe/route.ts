import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rpeSurveyResponse, player, team, training } from '@/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { getToken } from 'next-auth/jwt';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

// Для совместимости с Node.js
const fetch = globalThis.fetch || require('node-fetch');


// GET /api/surveys/rpe
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  try {
    const permissions = await getUserPermissions(token.id);
    if (!hasPermission(permissions, 'rpeSurvey.read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } catch (error) {
    console.error('Error getting permissions in GET:', error);
    return NextResponse.json({ error: 'Ошибка при проверке прав доступа' }, { status: 500 });
  }
  
  try {
    // token уже проверен выше, дополнительных проверок не требуется
    
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const teamId = searchParams.get("teamId");
    
    const whereArr = [];
    if (startDate) whereArr.push(gte(rpeSurveyResponse.createdAt, new Date(startDate)));
    if (endDate) whereArr.push(lte(rpeSurveyResponse.createdAt, new Date(endDate)));
    if (teamId) whereArr.push(eq(player.teamId, teamId));
    
    // Выбираем все нужные поля для отчёта
    const responses = await db
      .select({
        id: rpeSurveyResponse.id,
        playerId: rpeSurveyResponse.playerId,
        rpeScore: rpeSurveyResponse.rpeScore,
        durationMinutes: rpeSurveyResponse.durationMinutes,
        completedAt: rpeSurveyResponse.completedAt,
        createdAt: rpeSurveyResponse.createdAt,
        trainingId: rpeSurveyResponse.trainingId,
        trainingDate: training.date,
        trainingTime: training.time,
        player: {
          id: player.id,
          firstName: player.firstName,
          lastName: player.lastName,
          number: player.number,
          position: player.position,
          imageUrl: player.imageUrl,
        },
      })
      .from(rpeSurveyResponse)
      .leftJoin(player, eq(rpeSurveyResponse.playerId, player.id))
      .leftJoin(training, eq(rpeSurveyResponse.trainingId, training.id))
      .where(whereArr.length ? and(...whereArr) : undefined)
      .orderBy(desc(rpeSurveyResponse.createdAt));

    return NextResponse.json(responses);
  } catch (error) {
    console.error('Error fetching RPE survey responses:', error);
    return NextResponse.json({ error: 'Ошибка при получении данных' }, { status: 500 });
  }
}

// POST /api/surveys/rpe
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { playerId, teamId, date, durationMinutes, trainingId } = body;

    if (!playerId || !teamId) {
      return NextResponse.json({ error: 'playerId и teamId обязательны' }, { status: 400 });
    }

    // Получаем игрока из базы
    const players = await db.select().from(player).where(eq(player.id, playerId));
    const playerRow = players[0];
    if (!playerRow || !playerRow.telegramId) {
      return NextResponse.json({ error: 'У игрока нет Telegram ID' }, { status: 400 });
    }

    // Получаем команду
    const teams = await db.select().from(team).where(eq(team.id, teamId));
    const teamRow = teams[0];
    if (!teamRow) {
      return NextResponse.json({ error: 'Команда не найдена' }, { status: 404 });
    }

    // Если не передали date, но есть trainingId — возьмём дату тренировки для текста сообщения (необязательно для ссылки)
    let effectiveDate = date;
    let trainingRow: any = null;
    if (!effectiveDate && trainingId) {
      const trainingRows = await db.select().from(training).where(eq(training.id, trainingId));
      trainingRow = trainingRows[0] || null;
      if (trainingRow?.date) {
        effectiveDate = trainingRow.date;
      }
    }

    // Отправляем через бота
    try {
      const botRes = await fetch('http://158.160.189.99:8080/send-rpe-survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          telegramId: playerRow.telegramId, 
          clubId: teamRow.clubId, 
          teamId: teamId, 
          date: effectiveDate,
          trainingId: trainingId || null,
          surveyType: 'rpe'
        })
      });
      
      const botData = await botRes.json();
      if (!botRes.ok || !botData.success) {
        return NextResponse.json({ error: botData.error || 'Ошибка при отправке через бота' }, { status: 500 });
      }
      
      return NextResponse.json({ success: true });
      
    } catch (botError) {
      console.error('RPE: Error calling bot server:', botError);
      return NextResponse.json({ error: 'Ошибка при обращении к серверу бота', details: String(botError) }, { status: 500 });
    }
    
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка при повторной отправке', details: String(error) }, { status: 500 });
  }
} 