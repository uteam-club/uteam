import { NextResponse } from 'next/server';
import { createUser, getUsersByClubId } from '@/services/user.service';
import { generateRandomPassword } from '@/lib/utils';
import { getToken } from 'next-auth/jwt';
import * as jwt from 'jsonwebtoken';
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
 * GET /api/users
 * Получение списка пользователей текущего клуба
 */
export async function GET(request) {
    try {
        // Получаем токен пользователя
        const token = await getTokenFromRequest(request);
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const clubId = token.clubId;
        const role = token.role;
        // Проверяем права (только админ или суперадмин)
        if (!allowedRoles.includes(role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const users = await getUsersByClubId(clubId);
        return NextResponse.json(users);
    }
    catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({
            error: 'Failed to fetch users',
            details: error.message || 'Unknown error'
        }, { status: 500 });
    }
}
/**
 * POST /api/users
 * Создание нового пользователя
 */
export async function POST(request) {
    var _a, _b;
    try {
        console.log('Начало обработки запроса на создание пользователя');
        // Получаем токен пользователя
        const token = await getTokenFromRequest(request);
        if (!token) {
            console.log('Ошибка аутентификации: пользователь не авторизован');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const clubId = token.clubId;
        const role = token.role;
        const email = token.email;
        console.log('Пользователь авторизован:', email);
        // Проверяем права (только админ или суперадмин)
        if (!allowedRoles.includes(role)) {
            console.log('Ошибка доступа: у пользователя недостаточно прав');
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        // Парсим тело запроса
        const data = await request.json();
        console.log('Получены данные:', data);
        // Проверяем обязательные поля
        if (!data.email) {
            console.log('Ошибка валидации: email обязателен');
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }
        // Генерируем случайный пароль
        const password = generateRandomPassword();
        console.log('Сгенерирован пароль для нового пользователя');
        // Составляем полное имя из имени и фамилии
        const name = data.firstName && data.lastName
            ? `${data.firstName} ${data.lastName}`
            : data.firstName || data.lastName || '';
        console.log('Создаем пользователя с данными:', {
            email: data.email,
            name,
            role: data.role || 'MEMBER',
            clubId
        });
        // Создаем пользователя
        try {
            const user = await createUser({
                email: data.email,
                name,
                password,
                role: data.role || 'MEMBER',
                clubId, // Привязываем к текущему клубу
            });
            if (!user) {
                console.error('Пользователь не был создан: функция вернула null');
                return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
            }
            console.log('Пользователь успешно создан:', user.id);
            // Возвращаем данные созданного пользователя вместе с паролем (для показа)
            return NextResponse.json(Object.assign(Object.assign({}, user), { password }));
        }
        catch (innerError) {
            console.error('Ошибка при создании пользователя в createUser:', innerError);
            // Проверяем ошибку уникальности email
            if (innerError.code === 'P2002' && ((_b = (_a = innerError.meta) === null || _a === void 0 ? void 0 : _a.target) === null || _b === void 0 ? void 0 : _b.includes('email'))) {
                return NextResponse.json({ error: 'Пользователь с таким email уже существует' }, { status: 400 });
            }
            throw innerError; // Пробрасываем ошибку дальше
        }
    }
    catch (error) {
        console.error('Необработанная ошибка при создании пользователя:', error);
        return NextResponse.json({
            error: 'Failed to create user',
            details: error.message || 'Unknown error'
        }, { status: 500 });
    }
}
