import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { survey } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId');
  if (!tenantId) {
    return NextResponse.json({ error: 'No tenantId' }, { status: 400 });
  }
  // Ищем активный опросник типа 'morning' для tenantId
  const [foundSurvey]: any = await db.select({ id: survey.id })
    .from(survey)
    .where(and(eq(survey.tenantId, tenantId), eq(survey.type, 'morning'), eq(survey.isActive, true)))
    .orderBy(desc(survey.createdAt))
    .limit(1);
  if (!foundSurvey) {
    return NextResponse.json({ error: 'No active survey found for tenant' }, { status: 404 });
  }
  return NextResponse.json({ surveyId: foundSurvey.id });
} 