import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rpeSurveyResponse, player, team } from '@/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { getToken } from 'next-auth/jwt';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';


// GET /api/surveys/rpe
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'rpeSurvey.read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
    const responses = await db.select({
      id: rpeSurveyResponse.id,
      createdAt: rpeSurveyResponse.createdAt,
      playerId: rpeSurveyResponse.playerId,
      player: {
        id: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        teamId: player.teamId,
      },
      rpeScore: rpeSurveyResponse.rpeScore,
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
  const token = await getToken({ req: request });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'rpeSurvey.update')) {
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
    const botRes = await fetch('http://158.160.189.99:8080/send-rpe-survey', {
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