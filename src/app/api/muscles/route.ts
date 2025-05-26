import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
export const revalidate = 0;



export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get('view') as 'front' | 'back';

  if (!view || (view !== 'front' && view !== 'back')) {
    return NextResponse.json(
      { error: 'Invalid view parameter' },
      { status: 400 }
    );
  }

  try {
    const muscles = await prisma.muscleArea.findMany({
      where: { view },
      select: { number: true, name: true }
    });

    return NextResponse.json(muscles);
  } catch (error) {
    console.error('Error fetching muscles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch muscles' },
      { status: 500 }
    );
  }
} 