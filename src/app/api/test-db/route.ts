import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const users = await prisma.user.findMany({
      take: 5
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'База данных работает',
      users: users.map(u => ({ id: u.id, email: u.email, role: u.role })) 
    });
  } catch (error) {
    console.error('Ошибка при подключении к БД:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Неизвестная ошибка' 
    }, { status: 500 });
  }
} 