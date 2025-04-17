import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';

// DELETE /api/teams/[teamId]/coaches/[coachId] - удалить тренера из команды
export async function DELETE(
  request: Request,
  { params }: { params: { teamId: string; coachId: string } }
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
    
    const { teamId, coachId } = params;
    
    // Проверяем существование команды
    const team = await prisma.team.findUnique({
      where: { id: teamId }
    });
    
    if (!team) {
      return NextResponse.json(
        { error: 'Команда не найдена' },
        { status: 404 }
      );
    }
    
    // Проверяем существование пользователя
    const user = await prisma.user.findUnique({
      where: { id: coachId }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      );
    }
    
    // Проверяем, есть ли связь между пользователем и командой
    const existingMembership = await prisma.$queryRaw`
      SELECT * FROM "_TeamMembers" 
      WHERE "A" = ${teamId} AND "B" = ${coachId}
      LIMIT 1
    `;
    
    if (!Array.isArray(existingMembership) || existingMembership.length === 0) {
      return NextResponse.json(
        { error: 'Пользователь не является членом этой команды' },
        { status: 400 }
      );
    }
    
    // Удаляем связь пользователя с командой
    await prisma.$executeRaw`
      DELETE FROM "_TeamMembers"
      WHERE "A" = ${teamId} AND "B" = ${coachId}
    `;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка при удалении пользователя из команды:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
} 