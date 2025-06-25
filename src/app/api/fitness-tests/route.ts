import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { fitnessTest } from '@/db/schema/fitnessTest';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

const createTestSchema = z.object({
  name: z.string().min(2).max(128),
  type: z.string().min(2).max(64),
  unit: z.string().min(1).max(32),
  description: z.string().max(512).optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.clubId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const tests = await db.select().from(fitnessTest).where(eq(fitnessTest.clubId, session.user.clubId));
  return NextResponse.json(tests);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.clubId || !session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json();
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
    clubId: session.user.clubId,
    createdBy: session.user.id,
  }).returning();
  return NextResponse.json(test);
} 