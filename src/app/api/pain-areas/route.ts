import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { painArea } from '@/db/schema';
import { v4 as uuidv4 } from 'uuid';
import { getToken } from 'next-auth/jwt';

const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'COACH', 'DIRECTOR'];

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !allowedRoles.includes(token.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const { surveyId, areaName, painLevel } = body;
    if (!surveyId || !areaName || !painLevel) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    const [created] = await db.insert(painArea).values({
      id: uuidv4(),
      surveyId,
      areaName,
      painLevel,
      createdAt: new Date(),
    }).returning();
    return NextResponse.json(created);
  } catch (error) {
    console.error('Error saving pain area:', error);
    return NextResponse.json(
      { error: 'Failed to save pain area' },
      { status: 500 }
    );
  }
} 