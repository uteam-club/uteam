import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { db } from '@/lib/db';
import { rpeSchedule, team, player } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// GET: получить настройки получателей для конкретного RPE расписания
export async function GET(
  req: NextRequest,
  { params }: { params: { scheduleId: string } }
) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'rpeSurvey.read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { scheduleId } = params;
  
  if (!scheduleId) {
    return NextResponse.json({ error: 'No scheduleId provided' }, { status: 400 });
  }

  try {
    // Получаем расписание и проверяем права доступа
    const [schedule] = await db.select().from(rpeSchedule).where(eq(rpeSchedule.id, scheduleId)).limit(1);
    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Проверяем, что команда принадлежит клубу пользователя
    const [foundTeam] = await db.select().from(team).where(and(eq(team.id, schedule.teamId), eq(team.clubId, token.clubId))).limit(1);
    if (!foundTeam) {
      return NextResponse.json({ error: 'Team not found or not in your club' }, { status: 404 });
    }

    // Получаем текущие настройки получателей
    if (schedule.recipientsConfig) {
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

// POST: сохранить настройки получателей для конкретного RPE расписания
export async function POST(
  req: NextRequest,
  { params }: { params: { scheduleId: string } }
) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'rpeSurvey.update')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { scheduleId } = params;
    const body = await req.json();
    console.log('Received RPE recipients request body:', body);
    
    const { isIndividualMode, selectedPlayerIds } = body;
    
    if (typeof isIndividualMode !== 'boolean') {
      console.log('RPE Validation failed:', { isIndividualMode, selectedPlayerIds });
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // Получаем расписание и проверяем права доступа
    const [schedule] = await db.select().from(rpeSchedule).where(eq(rpeSchedule.id, scheduleId)).limit(1);
    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Проверяем, что команда принадлежит клубу пользователя
    const [foundTeam] = await db.select().from(team).where(and(eq(team.id, schedule.teamId), eq(team.clubId, token.clubId))).limit(1);
    if (!foundTeam) {
      return NextResponse.json({ error: 'Team not found or not in your club' }, { status: 404 });
    }

    // Если включен индивидуальный режим, проверяем что выбраны игроки
    if (isIndividualMode && (!Array.isArray(selectedPlayerIds) || selectedPlayerIds.length === 0)) {
      return NextResponse.json({ error: 'Individual mode requires at least one selected player' }, { status: 400 });
    }

    // Проверяем, что все выбранные игроки принадлежат команде
    if (isIndividualMode && selectedPlayerIds.length > 0) {
      const players = await db.select().from(player).where(eq(player.teamId, schedule.teamId));
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

    // Обновляем расписание
    const [result] = await db.update(rpeSchedule)
      .set({ 
        recipientsConfig: JSON.stringify(recipientsConfig),
        updatedAt: new Date() 
      })
      .where(eq(rpeSchedule.id, scheduleId))
      .returning();
    
    console.log('RPE Database operation result:', result);

    return NextResponse.json({ 
      message: isIndividualMode 
        ? `Настройки получателей обновлены. Выбрано ${selectedPlayerIds.length} игроков.`
        : "Настройки получателей обновлены. Опросник будет отправляться всем игрокам команды.",
      recipientsConfig
    });

  } catch (error: any) {
    console.error('Error updating RPE recipients:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
