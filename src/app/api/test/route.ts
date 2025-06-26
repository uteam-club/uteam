import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { db } from '@/lib/db';
import { user } from '@/db/schema';

const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'COACH'];

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !allowedRoles.includes(token.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    console.log('Test API called');
    // Проверка соединения с базой данных через Drizzle
    try {
      const users = await db.select({ id: user.id }).from(user);
      console.log('Database connection successful. Users count:', users.length);
    } catch (dbError) {
      console.error('Database connection failed:', dbError);
      return NextResponse.json({ 
        status: 'error', 
        message: 'Database connection failed',
        error: dbError instanceof Error ? dbError.message : String(dbError)
      }, { status: 500 });
    }
    // Проверка токена
    let tokenInfo = null;
    try {
      const token = await getToken({ req: request });
      tokenInfo = token ? {
        id: token.id,
        email: token.email,
        role: token.role,
        clubId: token.clubId
      } : null;
      console.log('Token info:', tokenInfo);
    } catch (tokenError) {
      console.error('Token error:', tokenError);
      tokenInfo = { error: tokenError instanceof Error ? tokenError.message : String(tokenError) };
    }
    return NextResponse.json({
      status: 'ok',
      time: new Date().toISOString(),
      token: tokenInfo,
      environment: {
        node_env: process.env.NODE_ENV,
        nextauth_url: process.env.NEXTAUTH_URL || 'not set',
        nextauth_secret: process.env.NEXTAUTH_SECRET ? 'is set' : 'not set',
      }
    });
  } catch (error) {
    console.error('Test API error:', error);
    return NextResponse.json({ 
      status: 'error',
      message: 'Test API failed',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 