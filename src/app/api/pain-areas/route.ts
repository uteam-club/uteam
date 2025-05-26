import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
export const revalidate = 0;



export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { surveyId, areaName, painLevel } = body;

    if (!surveyId || !areaName || !painLevel) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const painArea = await prisma.painArea.create({
      data: {
        surveyId,
        areaName,
        painLevel
      }
    });

    return NextResponse.json(painArea);
  } catch (error) {
    console.error('Error saving pain area:', error);
    return NextResponse.json(
      { error: 'Failed to save pain area' },
      { status: 500 }
    );
  }
} 