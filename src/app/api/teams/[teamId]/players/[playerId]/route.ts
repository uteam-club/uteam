import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';

// GET /api/teams/[teamId]/players/[playerId] - получить информацию об игроке
export async function GET(
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
    
    // Проверяем существование команды
    const team = await prisma.team.findUnique({
      where: {
        id: teamId
      }
    });
    
    if (!team) {
      return NextResponse.json(
        { error: 'Команда не найдена' }, 
        { status: 404 }
      );
    }
    
    // Получаем игрока
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
    
    return NextResponse.json(player);
  } catch (error) {
    console.error('Ошибка при получении информации об игроке:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' }, 
      { status: 500 }
    );
  }
}

// PUT /api/teams/[teamId]/players/[playerId] - обновить информацию об игроке
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
    
    // Обновляем информацию об игроке
    const updatedPlayer = await prisma.player.update({
      where: {
        id: playerId
      },
      data: {
        firstName: data.firstName || player.firstName,
        lastName: data.lastName || player.lastName,
        number: data.number !== undefined ? data.number : player.number,
        position: data.position !== undefined ? data.position : player.position,
        photoUrl: data.photoUrl !== undefined ? data.photoUrl : player.photoUrl,
        bio: data.bio !== undefined ? data.bio : player.bio,
        status: data.status !== undefined ? data.status : player.status
      }
    });
    
    return NextResponse.json(updatedPlayer);
  } catch (error) {
    console.error('Ошибка при обновлении информации об игроке:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' }, 
      { status: 500 }
    );
  }
}

// DELETE /api/teams/[teamId]/players/[playerId] - удалить игрока
export async function DELETE(
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
    
    // Удаляем игрока
    await prisma.player.delete({
      where: {
        id: playerId
      }
    });
    
    return NextResponse.json({ message: 'Игрок успешно удален' });
  } catch (error) {
    console.error('Ошибка при удалении игрока:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' }, 
      { status: 500 }
    );
  }
} 