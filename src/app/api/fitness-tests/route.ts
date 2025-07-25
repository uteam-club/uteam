import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { fitnessTest } from '@/db/schema/fitnessTest';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getSubdomain } from '@/lib/utils';
import { getClubBySubdomain } from '@/services/user.service';
import { getToken } from 'next-auth/jwt';

const createTestSchema = z.object({
  name: z.string().min(2).max(128),
  type: z.string().min(2).max(64),
  unit: z.string().min(1).max(32),
  description: z.string().max(512).optional(),
});

// Добавляю тип Token
type Token = { clubId: string; [key: string]: any };

// Проверка clubId пользователя и клуба по subdomain
async function checkClubAccess(request: NextRequest, token: any) {
  const host = request.headers.get('host') || '';
  const subdomain = getSubdomain(host);
  if (!subdomain) return false;
  const club = await getClubBySubdomain(subdomain);
  if (!club) return false;
  // Глобальный SUPER_ADMIN имеет доступ ко всем клубам
  if (token.role === 'SUPER_ADMIN' && token.clubId === '00000000-0000-0000-0000-000000000000') {
    return true;
  }
  return token.clubId === club.id;
}


export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'fitnessTests.read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const hasAccess = await checkClubAccess(request, token);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Нет доступа к этому клубу' }, { status: 403 });
  }
  const tests = await db.select().from(fitnessTest).where(eq(fitnessTest.clubId, token.clubId));
  return NextResponse.json(tests);
}

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'fitnessTests.update')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const hasAccess = await checkClubAccess(request, token);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Нет доступа к этому клубу' }, { status: 403 });
  }
  const body = await request.json();
  const parse = createTestSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }
  const { name, type, unit, description } = parse.data;
  const [test] = await db.insert(fitnessTest).values({
    name,
    type,
    unit,
    description,
    clubId: token.clubId,
    createdBy: token.id,
  }).returning();
  return NextResponse.json(test);
} 