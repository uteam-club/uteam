import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'COACH'];

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Проверяем авторизацию
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Проверяем, имеет ли пользователь необходимые права
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    // Получаем данные из запроса
    const data = await request.json();
    
    // Проверяем наличие обязательных полей
    if (!data.status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }
    
    // Проверяем, существует ли тренировка
    const training = await prisma.training.findUnique({
      where: { id: params.id },
      include: {
        team: true,
      },
    });
    
    if (!training) {
      return NextResponse.json(
        { error: 'Training not found' },
        { status: 404 }
      );
    }
    
    // Проверяем, принадлежит ли тренировка клубу пользователя
    if (training.clubId !== session.user.clubId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    // Обновляем статус тренировки
    const updatedTraining = await prisma.training.update({
      where: { id: params.id },
      data: { 
        status: data.status,
      },
      include: {
        team: true,
        category: true,
      },
    });
    
    // Форматируем данные для ответа клиенту
    const formattedTraining = {
      id: updatedTraining.id,
      title: updatedTraining.title,
      teamId: updatedTraining.teamId,
      team: updatedTraining.team.name,
      date: updatedTraining.date.toISOString().split('T')[0],
      time: updatedTraining.time,
      categoryId: updatedTraining.categoryId,
      category: updatedTraining.category.name,
      status: updatedTraining.status,
      createdAt: updatedTraining.createdAt,
      updatedAt: updatedTraining.updatedAt
    };
    
    return NextResponse.json(formattedTraining);
  } catch (error) {
    console.error('Error updating training status:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 