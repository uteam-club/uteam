import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { painArea } from '@/db/schema';
import { v4 as uuidv4 } from 'uuid';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export async function POST(request) {
    try {
        const body = await request.json();
        const { surveyId, areaName, painLevel } = body;
        if (!surveyId || !areaName || !painLevel) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        const [created] = await db.insert(painArea).values({
            id: uuidv4(),
            surveyId,
            areaName,
            painLevel,
            createdAt: new Date(),
        }).returning();
        return NextResponse.json(created);
    }
    catch (error) {
        console.error('Error saving pain area:', error);
        return NextResponse.json({ error: 'Failed to save pain area' }, { status: 500 });
    }
}
