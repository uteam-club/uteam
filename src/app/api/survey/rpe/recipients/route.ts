import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { db } from '@/lib/db';
import { surveySchedule, team, player } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// GET: получить настройки получателей для команды
export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'rpeSurvey.read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get('teamId');
  
  if (!teamId) {
    return NextResponse.json({ error: 'No teamId provided' }, { status: 400 });
  }

  try {
    // Проверяем, что команда принадлежит клубу пользователя
    const [foundTeam] = await db.select().from(team).where(and(eq(team.id, teamId), eq(team.clubId, token.clubId))).limit(1);
    if (!foundTeam) {
      return NextResponse.json({ error: 'Team not found or not in your club' }, { status: 404 });
    }

    // Получаем текущие настройки получателей
    const [schedule] = await db.select().from(surveySchedule).where(and(eq(surveySchedule.teamId, teamId), eq(surveySchedule.surveyType, 'rpe'))).limit(1);
    
    if (schedule && schedule.recipientsConfig) {
      try {
        const recipientsConfig = JSON.parse(schedule.recipientsConfig);
        return NextResponse.json({
          isIndividualMode: recipientsConfig.isIndividualMode || false,
          selectedPlayerIds: recipientsConfig.selectedPlayerIds || []
        });
      } catch (e) {
        // Если не удалось распарсить JSON, возвращаем дефолтные настройки
        return NextResponse.json({
          isIndividualMode: false,
          selectedPlayerIds: []
        });
      }
    }

    // Если настроек нет, возвращаем дефолтные (все игроки)
    return NextResponse.json({
      isIndividualMode: false,
      selectedPlayerIds: []
    });

  } catch (error: any) {
    console.error('Error getting RPE recipients:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: сохранить настройки получателей для команды
export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'rpeSurvey.update')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    console.log('Received RPE request body:', body);
    
    const { teamId, isIndividualMode, selectedPlayerIds } = body;
    
    if (!teamId || typeof isIndividualMode !== 'boolean') {
      console.log('RPE Validation failed:', { teamId, isIndividualMode, selectedPlayerIds });
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // Проверяем, что команда принадлежит клубу пользователя
    const [foundTeam] = await db.select().from(team).where(and(eq(team.id, teamId), eq(team.clubId, token.clubId))).limit(1);
    if (!foundTeam) {
      return NextResponse.json({ error: 'Team not found or not in your club' }, { status: 404 });
    }

    // Если включен индивидуальный режим, проверяем что выбраны игроки
    if (isIndividualMode && (!Array.isArray(selectedPlayerIds) || selectedPlayerIds.length === 0)) {
      return NextResponse.json({ error: 'Individual mode requires at least one selected player' }, { status: 400 });
    }

    // Проверяем, что все выбранные игроки принадлежат команде
    if (isIndividualMode && selectedPlayerIds.length > 0) {
      const players = await db.select().from(player).where(eq(player.teamId, teamId));
      const validPlayerIds = players.map(p => p.id);
      const invalidPlayerIds = selectedPlayerIds.filter((id: string) => !validPlayerIds.includes(id));
      
      if (invalidPlayerIds.length > 0) {
        return NextResponse.json({ error: 'Some selected players do not belong to the team' }, { status: 400 });
      }
    }

    // Создаем конфигурацию получателей
    const recipientsConfig = {
      isIndividualMode,
      selectedPlayerIds: isIndividualMode ? selectedPlayerIds : null,
      updatedAt: new Date().toISOString()
    };

    console.log('RPE Recipients config to save:', recipientsConfig);

    // Обновляем или создаём расписание
    const [existing] = await db.select().from(surveySchedule).where(and(eq(surveySchedule.teamId, teamId), eq(surveySchedule.surveyType, 'rpe'))).limit(1);
    
    console.log('RPE Existing schedule:', existing);
    
    let result;
    if (existing) {
      console.log('Updating existing RPE schedule...');
      [result] = await db.update(surveySchedule)
        .set({ 
          recipientsConfig: JSON.stringify(recipientsConfig),
          updatedAt: new Date() 
        })
        .where(eq(surveySchedule.id, existing.id))
        .returning();
    } else {
      console.log('Creating new RPE schedule...');
      [result] = await db.insert(surveySchedule)
        .values({ 
          id: randomUUID(), 
          teamId, 
          surveyType: 'rpe', 
          sendTime: '08:00', 
          enabled: true,
          recipientsConfig: JSON.stringify(recipientsConfig)
        })
        .returning();
    }
    
    console.log('RPE Database operation result:', result);

    return NextResponse.json({ 
      message: 'Настройки получателей RPE сохранены!', 
      result,
      recipientsConfig 
    });

  } catch (error: any) {
    console.error('Error saving RPE recipients:', error);
    return NextResponse.json({ 
      error: error.message, 
      stack: error.stack,
      details: 'Database operation failed'
    }, { status: 500 });
  }
}
