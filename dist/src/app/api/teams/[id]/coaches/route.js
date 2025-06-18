import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { user, team, teamCoach } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getToken } from 'next-auth/jwt';
import * as z from 'zod';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
// Схема для валидации данных при добавлении тренеров
const addCoachesSchema = z.object({
    coachIds: z.array(z.string().uuid()).min(1)
});
// Схема для валидации данных при удалении тренеров
const removeCoachesSchema = z.object({
    coachIds: z.array(z.string().uuid()).min(1)
});
/**
 * Получение токена из запроса с проверкой
 */
async function getTokenFromRequest(req) {
    try {
        return await getToken({ req });
    }
    catch (error) {
        console.error('Error getting token:', error);
        return null;
    }
}
/**
 * GET /api/teams/[id]/coaches
 * Получение списка тренеров команды
 */
export async function GET(request, { params }) {
    try {
        // Получаем токен пользователя
        const token = await getTokenFromRequest(request);
        if (!token) {
            console.log('GET /team/coaches: Unauthorized access attempt');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const clubId = token.clubId;
        const teamId = params.id;
        console.log(`GET /team/coaches: Fetching coaches for team ${teamId} in club ${clubId}`);
        // Проверяем, принадлежит ли команда клубу пользователя
        const [foundTeam] = await db.select().from(team)
            .where(and(eq(team.id, teamId), eq(team.clubId, clubId)))
            .limit(1);
        if (!foundTeam) {
            console.log(`GET /team/coaches: Team ${teamId} not found in club ${clubId}`);
            return NextResponse.json({ error: 'Team not found' }, { status: 404 });
        }
        // Получаем список тренеров команды с информацией о пользователях
        const teamCoaches = await db.select({
            userId: teamCoach.userId,
            teamId: teamCoach.teamId,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                imageUrl: user.imageUrl,
                role: user.role
            }
        })
            .from(teamCoach)
            .leftJoin(user, eq(teamCoach.userId, user.id))
            .where(eq(teamCoach.teamId, teamId));
        console.log(`GET /team/coaches: Found ${teamCoaches.length} coaches for team ${teamId}`);
        // Возвращаем данные о тренерах
        return NextResponse.json(teamCoaches);
    }
    catch (error) {
        console.error('GET /team/coaches: Error:', error);
        return NextResponse.json({ error: 'Failed to fetch team coaches' }, { status: 500 });
    }
}
/**
 * POST /api/teams/[id]/coaches
 * Добавление тренеров в команду
 */
export async function POST(request, { params }) {
    try {
        // Получаем токен пользователя
        const token = await getTokenFromRequest(request);
        if (!token) {
            console.log('POST /team/coaches: Unauthorized access attempt');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const clubId = token.clubId;
        const teamId = params.id;
        // Проверяем, принадлежит ли команда клубу пользователя
        const [foundTeam] = await db.select().from(team)
            .where(and(eq(team.id, teamId), eq(team.clubId, clubId)))
            .limit(1);
        if (!foundTeam) {
            console.log(`POST /team/coaches: Team ${teamId} not found in club ${clubId}`);
            return NextResponse.json({ error: 'Team not found' }, { status: 404 });
        }
        // Получаем и валидируем данные из запроса
        const body = await request.json();
        const validationResult = addCoachesSchema.safeParse(body);
        if (!validationResult.success) {
            console.log('POST /team/coaches: Invalid request data', validationResult.error);
            return NextResponse.json({ error: 'Invalid request data', details: validationResult.error.format() }, { status: 400 });
        }
        const { coachIds } = validationResult.data;
        // Проверяем, что все пользователи существуют и имеют роль COACH в том же клубе
        const coaches = await db.select().from(user)
            .where(and(inArray(user.id, coachIds), eq(user.clubId, clubId), eq(user.role, 'COACH')));
        if (coaches.length !== coachIds.length) {
            console.log(`POST /team/coaches: Some coaches not found or not COACH role`);
            return NextResponse.json({ error: 'One or more coaches not found or not COACH role' }, { status: 400 });
        }
        // Получаем существующих тренеров, чтобы избежать дубликатов
        const existingCoaches = await db.select().from(teamCoach)
            .where(and(eq(teamCoach.teamId, teamId), inArray(teamCoach.userId, coachIds)));
        const existingCoachIds = existingCoaches.map(coach => coach.userId);
        const newCoachIds = coachIds.filter(id => !existingCoachIds.includes(id));
        if (newCoachIds.length === 0) {
            console.log(`POST /team/coaches: All coaches already assigned to the team`);
            return NextResponse.json({ message: 'All coaches already assigned to the team' }, { status: 200 });
        }
        // Добавляем новых тренеров
        const inserted = await db.insert(teamCoach).values(newCoachIds.map(coachId => ({ teamId, userId: coachId }))).returning();
        console.log(`POST /team/coaches: Added ${inserted.length} coaches to team ${teamId}`);
        return NextResponse.json(inserted);
    }
    catch (error) {
        console.error('POST /team/coaches: Error:', error);
        return NextResponse.json({ error: 'Failed to add coaches to team' }, { status: 500 });
    }
}
/**
 * DELETE /api/teams/[id]/coaches
 * Удаление тренеров из команды
 */
export async function DELETE(request, { params }) {
    try {
        // Получаем токен пользователя
        const token = await getTokenFromRequest(request);
        if (!token) {
            console.log('DELETE /team/coaches: Unauthorized access attempt');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const clubId = token.clubId;
        const teamId = params.id;
        // Проверяем, принадлежит ли команда клубу пользователя
        const [foundTeam] = await db.select().from(team)
            .where(and(eq(team.id, teamId), eq(team.clubId, clubId)))
            .limit(1);
        if (!foundTeam) {
            console.log(`DELETE /team/coaches: Team ${teamId} not found in club ${clubId}`);
            return NextResponse.json({ error: 'Team not found' }, { status: 404 });
        }
        // Получаем и валидируем данные из запроса
        const body = await request.json();
        const validationResult = removeCoachesSchema.safeParse(body);
        if (!validationResult.success) {
            console.log('DELETE /team/coaches: Invalid request data', validationResult.error);
            return NextResponse.json({ error: 'Invalid request data', details: validationResult.error.format() }, { status: 400 });
        }
        const { coachIds } = validationResult.data;
        // Удаляем связи тренеров с командой
        const result = await db.delete(teamCoach)
            .where(and(eq(teamCoach.teamId, teamId), inArray(teamCoach.userId, coachIds)));
        console.log(`DELETE /team/coaches: Removed coaches from team ${teamId}`);
        return NextResponse.json({ success: true });
    }
    catch (error) {
        console.error('DELETE /team/coaches: Error:', error);
        return NextResponse.json({ error: 'Failed to remove coaches from team' }, { status: 500 });
    }
}
