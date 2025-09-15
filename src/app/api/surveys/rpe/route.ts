import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rpeSurveyResponse, player, team } from '@/db/schema';
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
    const { playerId, teamId, date, durationMinutes } = body;

    if (!playerId || !teamId || !date) {
      return NextResponse.json({ error: 'playerId, teamId и date обязательны' }, { status: 400 });
    }

    // Формируем диапазон на весь день
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // Проверяем, есть ли уже ответ за сегодня
    const existingResponse = await db.select({
      id: rpeSurveyResponse.id,
    })
      .from(rpeSurveyResponse)
      .where(
        and(
          eq(rpeSurveyResponse.playerId, playerId),
          gte(rpeSurveyResponse.createdAt, startDate),
          lte(rpeSurveyResponse.createdAt, endDate)
        )
      )
      .limit(1);

    if (existingResponse.length > 0) {
      // Обновляем существующий ответ, добавляя длительность если она передана
      const updateData: any = {};
      if (durationMinutes !== undefined) {
        updateData.durationMinutes = durationMinutes;
      }
      
      await db.update(rpeSurveyResponse)
        .set(updateData)
        .where(eq(rpeSurveyResponse.id, existingResponse[0].id));
    } else {
      // Создаём новый ответ
      await db.insert(rpeSurveyResponse).values({
        id: uuidv4(),
        playerId,
        surveyId: uuidv4(), // TODO: получить реальный surveyId
        tenantId: token.clubId || uuidv4(), // TODO: получить реальный tenantId
        rpeScore: 0, // Пока что 0, игрок заполнит позже
        durationMinutes: durationMinutes || null,
        createdAt: new Date(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating RPE survey:', error);
    return NextResponse.json({ error: 'Ошибка при создании опросника' }, { status: 500 });
  }
} 