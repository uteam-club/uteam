import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { surveySchedule, team } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { randomUUID } from 'crypto';
// GET: получить время рассылки для команды
export async function GET(req) {
    var _a;
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get('teamId');
    if (!teamId) {
        return NextResponse.json({ error: 'No teamId provided' }, { status: 400 });
    }
    // Проверяем, что команда принадлежит клубу пользователя
    const [foundTeam] = await db.select().from(team).where(and(eq(team.id, teamId), eq(team.clubId, session.user.clubId))).limit(1);
    if (!foundTeam) {
        return NextResponse.json({ error: 'Team not found or not in your club' }, { status: 404 });
    }
    const [schedule] = await db.select().from(surveySchedule).where(and(eq(surveySchedule.teamId, teamId), eq(surveySchedule.surveyType, 'morning'))).limit(1);
    return NextResponse.json({
        time: (schedule === null || schedule === void 0 ? void 0 : schedule.sendTime) || '08:00',
        enabled: (_a = schedule === null || schedule === void 0 ? void 0 : schedule.enabled) !== null && _a !== void 0 ? _a : true,
    });
}
// POST: сохранить время рассылки для команды
export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { teamId, time, enabled } = await req.json();
        if (!teamId || typeof time !== 'string' || typeof enabled !== 'boolean') {
            return NextResponse.json({ error: 'Invalid input', teamId, time, enabled }, { status: 400 });
        }
        // Проверяем, что команда принадлежит клубу пользователя
        const [foundTeam] = await db.select().from(team).where(and(eq(team.id, teamId), eq(team.clubId, session.user.clubId))).limit(1);
        if (!foundTeam) {
            return NextResponse.json({ error: 'Team not found or not in your club' }, { status: 404 });
        }
        // Обновляем или создаём расписание
        const [existing] = await db.select().from(surveySchedule).where(and(eq(surveySchedule.teamId, teamId), eq(surveySchedule.surveyType, 'morning'))).limit(1);
        let result;
        if (existing) {
            [result] = await db.update(surveySchedule)
                .set({ sendTime: time, enabled, updatedAt: new Date() })
                .where(eq(surveySchedule.id, existing.id))
                .returning();
        }
        else {
            [result] = await db.insert(surveySchedule)
                .values({ id: randomUUID(), teamId, surveyType: 'morning', sendTime: time, enabled })
                .returning();
        }
        return NextResponse.json({ message: 'Настройки рассылки сохранены!', result });
    }
    catch (e) {
        return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
    }
}
