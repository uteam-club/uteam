import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { db } from '@/lib/db';
import { surveySchedule } from '@/db/schema';

// Тестовый endpoint для проверки работы с получателями
export async function GET(req: NextRequest) {
  try {
    // Просто проверяем, что можем подключиться к базе и получить схему
    const result = await db.select().from(surveySchedule).limit(1);
    
    return NextResponse.json({ 
      message: 'Database connection successful',
      schema: 'surveySchedule exists',
      sampleData: result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Test endpoint error:', error);
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
