import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - получить список всех тренеров
export async function GET() {
  try {
    const coaches = await prisma.user.findMany({
      where: {
        role: 'MANAGER',
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
    
    return NextResponse.json(coaches, { status: 200 });
  } catch (error) {
    console.error('Ошибка при получении списка тренеров:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
} 