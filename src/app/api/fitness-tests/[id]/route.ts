import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { fitnessTest } from '@/db/schema/fitnessTest';
import { getToken } from 'next-auth/jwt';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { fitnessTestResult } from '@/db/schema/fitnessTestResult';
import { getSubdomain } from '@/lib/utils';
import { getClubBySubdomain } from '@/services/user.service';

const updateDescriptionSchema = z.object({
  description: z.string().max(512)
});


// Проверка clubId пользователя и клуба по subdomain
async function checkClubAccess(request: NextRequest, token: any) {
  const host = request.headers.get('host') || '';
  const subdomain = getSubdomain(host);
  if (!subdomain) return false;
  const club = await getClubBySubdomain(subdomain);
  if (!club) return false;
  return token.clubId === club.id;
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const token = await getToken({ req: request });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'fitnessTests.update')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = params;
  const body = await request.json();
  const parse = updateDescriptionSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }
  const { description } = parse.data;
  const { name } = body;
  const [updated] = await db.update(fitnessTest)
    .set({
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
    })
    .where(eq(fitnessTest.id, id))
    .returning();
  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const token = await getToken({ req: request });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'fitnessTests.delete')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = params;
  // Удаляем все результаты, связанные с этим тестом
  await db.delete(fitnessTestResult).where(eq(fitnessTestResult.testId, id));
  // Удаляем сам тест
  await db.delete(fitnessTest).where(eq(fitnessTest.id, id));
  return NextResponse.json({ success: true });
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const token = await getToken({ req: request });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'fitnessTests.read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = params;
  const body = await request.json();
  const parse = updateDescriptionSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }
  const { description } = parse.data;
  const { name } = body;
  const [updated] = await db.update(fitnessTest)
    .set({
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
    })
    .where(eq(fitnessTest.id, id))
    .returning();
  return NextResponse.json(updated);
} 