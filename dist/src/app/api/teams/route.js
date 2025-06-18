import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { team } from '@/db/schema';
import { eq, asc, desc } from 'drizzle-orm';
import { getToken } from 'next-auth/jwt';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
const allowedRoles = ['ADMIN', 'SUPER_ADMIN'];
// Функция для чтения токена из заголовка Authorization
async function getTokenFromRequest(request) {
    // Сначала пробуем стандартный способ NextAuth
    const token = await getToken({ req: request });
    if (token)
        return token;
    // Если нет токена NextAuth, проверяем заголовок Authorization
    const authHeader = request.headers.get('Authorization');
    if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer ')))
        return null;
    try {
        // Извлекаем токен из заголовка
        const bearerToken = authHeader.replace('Bearer ', '');
        // Верифицируем JWT токен
        const decodedToken = jwt.verify(bearerToken, (() => {
            if (!process.env.NEXTAUTH_SECRET)
                throw new Error('NEXTAUTH_SECRET не задан в .env');
            return process.env.NEXTAUTH_SECRET;
        })());
        // Возвращаем декодированный токен в том же формате, что и NextAuth
        return {
            id: decodedToken.id,
            email: decodedToken.email,
            name: decodedToken.name,
            role: decodedToken.role,
            clubId: decodedToken.clubId,
        };
    }
    catch (error) {
        console.error('Ошибка при декодировании токена:', error);
        return null;
    }
}
/**
 * GET /api/teams
 * Получение списка команд клуба
 */
export async function GET(request) {
    try {
        // Получаем токен пользователя
        const token = await getTokenFromRequest(request);
        if (!token) {
            return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: {
                    'Content-Type': 'application/json',
                }
            });
        }
        const role = token.role;
        const clubId = token.clubId;
        if (!clubId) {
            return new NextResponse(JSON.stringify({ error: 'Отсутствует ID клуба' }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                }
            });
        }
        // Получаем команды клуба
        const teams = await db.select().from(team)
            .where(eq(team.clubId, clubId))
            .orderBy(asc(team.order), asc(team.name));
        return new NextResponse(JSON.stringify(teams), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
            }
        });
    }
    catch (error) {
        console.error('Error fetching teams:', error);
        return new NextResponse(JSON.stringify({
            error: 'Failed to fetch teams',
            details: error.message || 'Unknown error'
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
            }
        });
    }
}
/**
 * POST /api/teams
 * Создание новой команды
 */
export async function POST(request) {
    try {
        console.log('Начало обработки запроса на создание команды');
        // Получаем токен пользователя
        const token = await getTokenFromRequest(request);
        if (!token) {
            console.log('Ошибка аутентификации: пользователь не авторизован');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const role = token.role;
        const clubId = token.clubId;
        // Проверяем права (только админ или суперадмин)
        if (!allowedRoles.includes(role)) {
            console.log('Ошибка доступа: у пользователя недостаточно прав');
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        // Парсим тело запроса
        const data = await request.json();
        console.log('Получены данные для создания команды:', data);
        // Проверка наличия необходимых полей
        if (!data.name || !data.name.trim()) {
            console.log('Отсутствует обязательное поле: name');
            return NextResponse.json({
                error: 'Missing required field: name'
            }, { status: 400 });
        }
        // Создаем объект с данными для создания команды
        // Генерируем id на сервере, чтобы избежать проблем с default в базе
        const teamData = {
            id: uuidv4(),
            name: data.name.trim(),
            clubId,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        // Находим максимальный порядок среди существующих команд
        const [maxOrderTeam] = await db.select().from(team)
            .where(eq(team.clubId, clubId))
            .orderBy(desc(team.order))
            .limit(1);
        // Устанавливаем порядок для новой команды
        if (maxOrderTeam) {
            teamData.order = maxOrderTeam.order + 1;
        }
        else {
            teamData.order = 1;
        }
        console.log('teamData перед вставкой:', teamData);
        // Создаем команду
        const [createdTeam] = await db.insert(team).values(teamData).returning();
        console.log('Команда успешно создана:', createdTeam.id);
        return NextResponse.json(createdTeam);
    }
    catch (error) {
        console.error('Необработанная ошибка при создании команды:', error);
        return NextResponse.json({
            error: 'Failed to create team',
            details: error.message || 'Unknown error'
        }, { status: 500 });
    }
}
