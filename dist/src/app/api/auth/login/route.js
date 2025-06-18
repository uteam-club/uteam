import { NextResponse } from 'next/server';
import { getUserByEmail, verifyPassword } from '@/services/user.service';
import { getClubBySubdomain } from '@/services/club.service';
import { getSubdomain } from '@/lib/utils';
import { sign } from 'jsonwebtoken';
import { cookies } from 'next/headers';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export async function POST(request) {
    try {
        const formData = await request.formData();
        const email = formData.get('email');
        const password = formData.get('password');
        const isAdmin = formData.get('admin') === 'true';
        // Проверка обязательных полей
        if (!email || !password) {
            return NextResponse.json({ error: 'Email и пароль обязательны для заполнения' }, { status: 400 });
        }
        // Получаем пользователя по email
        const user = await getUserByEmail(email);
        if (!user) {
            return NextResponse.json({ error: 'Неверный email или пароль' }, { status: 401 });
        }
        // Проверяем пароль
        const isPasswordValid = await verifyPassword(user, password);
        if (!isPasswordValid) {
            return NextResponse.json({ error: 'Неверный email или пароль' }, { status: 401 });
        }
        // Если это вход в админку, проверяем роль пользователя
        if (isAdmin && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'У вас нет прав доступа к админке' }, { status: 403 });
        }
        // Если это вход на поддомене, проверяем принадлежность пользователя к клубу
        if (!isAdmin) {
            const headersList = request.headers;
            const host = headersList.get('host') || '';
            const subdomain = getSubdomain(host);
            if (subdomain) {
                const club = await getClubBySubdomain(subdomain);
                if (!club) {
                    return NextResponse.json({ error: 'Клуб не найден' }, { status: 404 });
                }
                if (user.clubId !== club.id) {
                    return NextResponse.json({ error: 'У вас нет доступа к этому клубу' }, { status: 403 });
                }
            }
        }
        // Создаем JWT токен
        const token = sign({
            userId: user.id,
            email: user.email,
            role: user.role,
            clubId: user.clubId
        }, process.env.NEXTAUTH_SECRET || 'secret', { expiresIn: '1d' });
        // Устанавливаем cookie с токеном
        cookies().set({
            name: 'token',
            value: token,
            httpOnly: true,
            path: '/',
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 // 1 день
        });
        // Редирект на нужную страницу в зависимости от роли и места входа
        if (isAdmin) {
            return NextResponse.redirect(new URL('/admin', request.url));
        }
        else {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
    }
    catch (error) {
        console.error('Error during login:', error);
        return NextResponse.json({ error: 'Произошла ошибка при входе в систему' }, { status: 500 });
    }
}
