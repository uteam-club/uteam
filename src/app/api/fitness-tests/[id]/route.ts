import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { fitnessTest } from '@/db/schema/fitnessTest';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { fitnessTestResult } from '@/db/schema/fitnessTestResult';

const updateDescriptionSchema = z.object({
  description: z.string().max(512)
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.clubId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = params;
  const body = await req.json();
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

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.clubId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = params;
  // Удаляем все результаты, связанные с этим тестом
  await db.delete(fitnessTestResult).where(eq(fitnessTestResult.testId, id));
  // Удаляем сам тест
  await db.delete(fitnessTest).where(eq(fitnessTest.id, id));
  return NextResponse.json({ success: true });
} 