import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { match, team } from '@/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import crypto from 'crypto';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
// Схема валидации для создания матча
const matchSchema = z.object({
    competitionType: z.enum(['FRIENDLY', 'LEAGUE', 'CUP']),
    date: z.string(),
    time: z.string(),
    isHome: z.boolean(),
    teamId: z.string().uuid(),
    opponentName: z.string().min(1, 'Введите название команды соперника'),
    teamGoals: z.number().int().min(0).default(0),
    opponentGoals: z.number().int().min(0).default(0),
});
// GET метод для получения матчей
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
        }
        const { searchParams } = new URL(request.url);
        const teamId = searchParams.get('teamId');
        const fromDate = searchParams.get('fromDate');
        const toDate = searchParams.get('toDate');
        // Базовые условия фильтрации
        const whereArr = [eq(match.clubId, session.user.clubId)];
        // Применяем фильтры, если они указаны
        if (teamId) {
            whereArr.push(eq(match.teamId, teamId));
        }
        if (fromDate) {
            whereArr.push(gte(match.date, new Date(fromDate)));
        }
        if (toDate) {
            const endDate = new Date(toDate);
            endDate.setHours(23, 59, 59, 999);
            whereArr.push(lte(match.date, endDate));
        }
        const rows = await db.select({
            id: match.id,
            competitionType: match.competitionType,
            date: match.date,
            time: match.time,
            isHome: match.isHome,
            teamId: match.teamId,
            opponentName: match.opponentName,
            teamGoals: match.teamGoals,
            opponentGoals: match.opponentGoals,
            createdAt: match.createdAt,
            updatedAt: match.updatedAt,
            clubId: match.clubId,
            formation: match.formation,
            gameFormat: match.gameFormat,
            markerColor: match.markerColor,
            notes: match.notes,
            playerPositions: match.playerPositions,
            positionAssignments: match.positionAssignments,
            teamName: team.name
        })
            .from(match)
            .leftJoin(team, eq(match.teamId, team.id))
            .where(and(...whereArr))
            .orderBy(desc(match.date));
        return NextResponse.json(rows);
    }
    catch (error) {
        console.error('Ошибка при получении матчей:', error);
        return NextResponse.json({ error: 'Ошибка при получении матчей' }, { status: 500 });
    }
}
// POST метод для создания нового матча
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
        }
        const body = await request.json();
        // Валидация данных
        const validationResult = matchSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json({ error: 'Ошибка валидации', details: validationResult.error.format() }, { status: 400 });
        }
        const { competitionType, date, time, isHome, teamId, opponentName, teamGoals, opponentGoals } = validationResult.data;
        // Проверка существования команды и её принадлежности к клубу пользователя
        const [teamRow] = await db.select().from(team).where(and(eq(team.id, teamId), eq(team.clubId, session.user.clubId)));
        if (!teamRow) {
            return NextResponse.json({ error: 'Команда не найдена' }, { status: 404 });
        }
        // Создание нового матча
        const now = new Date();
        const [created] = await db.insert(match).values({
            id: crypto.randomUUID(),
            competitionType,
            date: new Date(date),
            time,
            isHome,
            teamId,
            opponentName,
            teamGoals,
            opponentGoals,
            clubId: session.user.clubId,
            createdAt: now,
            updatedAt: now,
        }).returning();
        return NextResponse.json(created, { status: 201 });
    }
    catch (error) {
        const err = error;
        console.error('Ошибка при создании матча:', err);
        return NextResponse.json({ error: 'Ошибка при создании матча', details: err === null || err === void 0 ? void 0 : err.message, stack: err === null || err === void 0 ? void 0 : err.stack }, { status: 500 });
    }
}
