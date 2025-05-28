import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId');
  if (!tenantId) {
    return NextResponse.json({ error: 'No tenantId' }, { status: 400 });
  }
  // Получаем последний surveyId по MorningSurveyResponse для tenantId
  const lastSurvey = await prisma.morningSurveyResponse.findFirst({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    select: { surveyId: true },
  });
  if (!lastSurvey) {
    return NextResponse.json({ error: 'No survey found for tenant' }, { status: 404 });
  }
  return NextResponse.json({ surveyId: lastSurvey.surveyId });
} 