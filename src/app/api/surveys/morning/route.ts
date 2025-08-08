import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { NextResponse, NextRequest } from "next/server";
import { db } from '@/lib/db';
import { morningSurveyResponse, player, team } from '@/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import fetch from 'node-fetch';
import { getToken } from 'next-auth/jwt';

export const dynamic = 'force-dynamic';
export const revalidate = 0;


// GET /api/surveys/morning
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'morningSurvey.read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const teamId = searchParams.get("teamId");
    const whereArr = [];
    if (startDate) whereArr.push(gte(morningSurveyResponse.createdAt, new Date(startDate)));
    if (endDate) whereArr.push(lte(morningSurveyResponse.createdAt, new Date(endDate)));
    if (teamId) whereArr.push(eq(player.teamId, teamId));
    // Выбираем все нужные поля для отчёта
    const responses = await db.select({
      id: morningSurveyResponse.id,
      createdAt: morningSurveyResponse.createdAt,
      playerId: morningSurveyResponse.playerId,
      player: {
        id: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        teamId: player.teamId,
      },
      sleepDuration: morningSurveyResponse.sleepDuration,
      sleepQuality: morningSurveyResponse.sleepQuality,
      recovery: morningSurveyResponse.recovery,
      mood: morningSurveyResponse.mood,
      muscleCondition: morningSurveyResponse.muscleCondition,
    })
      .from(morningSurveyResponse)
      .leftJoin(player, eq(morningSurveyResponse.playerId, player.id))
      .where(whereArr.length ? and(...whereArr) : undefined)
      .orderBy(desc(morningSurveyResponse.createdAt));
    // Для каждого ответа подгружаем painAreas
    const responseWithPain = await Promise.all(responses.map(async (resp) => {
      const painAreas = await db.select().from(require('@/db/schema').painArea)
        .where(eq(require('@/db/schema').painArea.surveyId, resp.id));
      return { ...resp, painAreas };
    }));
    return NextResponse.json(responseWithPain);
  } catch (error) {
    console.error("Error fetching survey responses:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/surveys/morning
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'morningSurvey.update')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const { playerId, teamId, date } = await request.json();
    if (!playerId || !teamId || !date) {
      return NextResponse.json({ error: 'playerId, teamId и date обязательны' }, { status: 400 });
    }
    // Получаем игрока из базы (чтобы узнать telegramId и teamId)
    const players = await db.select().from(player).where(eq(player.id, playerId));
    const playerRow = players[0];
    if (!playerRow) {
      return NextResponse.json({ error: 'Игрок не найден' }, { status: 404 });
    }
    const telegramId = playerRow.telegramId;
    const playerTeamId = playerRow.teamId;
    const pinCode = playerRow.pinCode;
    const language = playerRow.language || 'ru';
    if (!telegramId || !playerTeamId) {
      return NextResponse.json({ error: 'У игрока не указан telegramId или teamId' }, { status: 400 });
    }
    // Получаем команду, чтобы узнать clubId
    const teams = await db.select().from(team).where(eq(team.id, playerTeamId));
    const teamRow = teams[0];
    if (!teamRow) {
      return NextResponse.json({ error: 'Команда не найдена' }, { status: 404 });
    }
    const clubId = teamRow.clubId;
    if (!clubId) {
      return NextResponse.json({ error: 'У команды не указан clubId' }, { status: 400 });
    }
    // Отправляем запрос на сервер бота
    const botRes = await fetch('http://158.160.189.99:8080/send-morning-survey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        telegramId, 
        clubId, 
        teamId: playerTeamId, 
        date,
        pinCode: pinCode || '------',
        language
      })
    });
    const botData = await botRes.json();
    if (!botRes.ok || !botData.success) {
      return NextResponse.json({ error: botData.error || 'Ошибка при отправке через бота' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка при повторной отправке', details: String(error) }, { status: 500 });
  }
} 