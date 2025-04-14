import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - получить все команды
export async function GET() {
  try {
    console.log('GET: Fetching teams for coaching');
    
    const teams = await prisma.team.findMany({
      orderBy: { name: 'asc' },
    });
    
    console.log(`GET: Found ${teams.length} teams for coaching`);
    return NextResponse.json(teams, { status: 200 });
  } catch (error) {
    console.error('Error fetching teams for coaching:', error);
    return NextResponse.json({ error: 'Ошибка получения списка команд' }, { status: 500 });
  }
} 