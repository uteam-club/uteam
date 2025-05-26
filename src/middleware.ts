import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSubdomain, isMainDomain } from './lib/utils';

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const host = request.headers.get('host') || '';
  
  // Проверяем, является ли это запросом к основному домену
  const isMain = isMainDomain(host);
  
  // Если это не основной домен, значит это поддомен клуба
  if (!isMain) {
    const subdomain = getSubdomain(host);
    
    // Если это API запрос или запрос к статическим файлам, пропускаем его
    if (url.pathname.startsWith('/api') || url.pathname.startsWith('/_next') || url.pathname.startsWith('/static')) {
      return NextResponse.next();
    }
    
    // Перенаправляем на страницу клуба, если не находимся на ней
    if (!url.pathname.startsWith('/club/')) {
      const newUrl = new URL(`/club/${subdomain}`, url.origin);
      return NextResponse.redirect(newUrl);
    }
  }
  
  // Для всех остальных запросов просто продолжаем обработку
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