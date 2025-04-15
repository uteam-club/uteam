import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';

// PUT /api/teams/[teamId]/players/[playerId]/status - обновить статус игрока
export async function PUT(
  request: Request,
  { params }: { params: { teamId: string; playerId: string } }
) {
  try {
    // Проверка авторизации
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Требуется авторизация' }, 
        { status: 401 }
      );
    }
    
    const { teamId, playerId } = params;
    
    // Проверяем существование игрока
    const player = await prisma.player.findUnique({
      where: {
        id: playerId
      }
    });
    
    if (!player) {
      return NextResponse.json(
        { error: 'Игрок не найден' }, 
        { status: 404 }
      );
    }
    
    // Проверяем, что игрок принадлежит к указанной команде
    if (player.teamId !== teamId) {
      return NextResponse.json(
        { error: 'Игрок не принадлежит к указанной команде' }, 
        { status: 400 }
      );
    }
    
    // Получаем данные из запроса
    const data = await request.json();
    
    // Проверяем наличие статуса
    if (!data.status) {
      return NextResponse.json(
        { error: 'Необходимо указать статус' },
        { status: 400 }
      );
    }
    
    // Обновляем статус игрока
    const updatedPlayer = await prisma.player.update({
      where: {
        id: playerId
      },
      data: {
        status: data.status
      }
    });
    
    return NextResponse.json(updatedPlayer);
  } catch (error) {
    console.error('Ошибка при обновлении статуса игрока:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' }, 
      { status: 500 }
    );
  }
} 