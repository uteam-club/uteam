import { NextResponse } from 'next/server';
import { getSubdomain, isMainDomain } from './lib/utils';
export function middleware(request) {
    const url = request.nextUrl;
    const host = request.headers.get('host') || '';
    // Если основной домен — ничего не делаем
    if (isMainDomain(host)) {
        return NextResponse.next();
    }
    // Если это поддомен клуба
    const subdomain = getSubdomain(host);
    // Разрешаем /login и /dashboard без редиректа
    if (url.pathname === '/login' || url.pathname.startsWith('/dashboard')) {
        return NextResponse.next();
    }
    // Если пользователь на главной странице поддомена — редиректим на /login
    if (url.pathname === '/') {
        const newUrl = new URL(`/login`, url.origin);
        return NextResponse.redirect(newUrl);
    }
    // Все остальные страницы доступны как есть
    return NextResponse.next();
}
// Указываем пути, к которым должен применяться middleware
export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * 1. /api routes
         * 2. /_next (Next.js internals)
         * 3. /fonts, /icons (static files)
         * 4. /favicon.ico, sitemap.xml (static files)
         */
        '/((?!api|_next|fonts|icons|favicon.ico|sitemap.xml).*)',
    ],
};
