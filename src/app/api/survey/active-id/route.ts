import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { survey } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId');
  const type = searchParams.get('type') || 'morning';
  if (!tenantId) {
    return NextResponse.json({ error: 'No tenantId' }, { status: 400 });
  }
  // Ищем последний опросник типа type для tenantId (неважно, активен или нет)
  const [foundSurvey]: any = await db.select({ id: survey.id, isActive: survey.isActive })
    .from(survey)
    .where(and(eq(survey.tenantId, tenantId), eq(survey.type, type)))
    .orderBy(desc(survey.createdAt))
    .limit(1);
  if (!foundSurvey) {
    return NextResponse.json({ error: 'No survey found for tenant' }, { status: 404 });
  }
  return NextResponse.json({ surveyId: foundSurvey.id, isActive: foundSurvey.isActive });
}

export async function PATCH(req: NextRequest) {
  const { tenantId, isActive, type = 'morning' } = await req.json();
  if (!tenantId || typeof isActive !== 'boolean') {
    return NextResponse.json({ error: 'Missing tenantId or isActive' }, { status: 400 });
  }
  // Обновляем isActive для опросника типа type для tenantId
  const updated = await db.update(survey)
    .set({ isActive })
    .where(and(eq(survey.tenantId, tenantId), eq(survey.type, type)))
    .returning();
  if (!updated.length) {
    return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, survey: updated[0] });
}

export async function POST(req: NextRequest) {
  const { tenantId, type = 'morning' } = await req.json();
  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
  }
  // Проверяем, есть ли уже опросник типа type для tenantId
  const [existing]: any = await db.select().from(survey)
    .where(and(eq(survey.tenantId, tenantId), eq(survey.type, type)))
    .limit(1);
  if (existing) {
    return NextResponse.json({ survey: existing, alreadyExists: true });
  }
  // Создаём новый опросник
  const [created]: any = await db.insert(survey).values({
    id: uuidv4(),
    tenantId,
    type,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();
  return NextResponse.json({ survey: created, alreadyExists: false });
} 