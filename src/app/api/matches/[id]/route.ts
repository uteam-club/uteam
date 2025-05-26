import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const revalidate = 0;



export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
    }

    const matchId = params.id;
    
    // Получаем детали матча с информацией о команде
    const match = await prisma.match.findFirst({
      where: {
        id: matchId,
        clubId: session.user.clubId,
      },
      include: {
        team: true,
        playerStats: {
          include: {
            player: true,
          },
          orderBy: {
            isStarter: 'desc', // Сначала основной состав, потом запасные
          },
        },
      },
    });

    if (!match) {
      return NextResponse.json({ error: 'Матч не найден' }, { status: 404 });
    }

    return NextResponse.json(match);
  } catch (error) {
    console.error('Ошибка при получении деталей матча:', error);
    return NextResponse.json({ error: 'Ошибка при получении деталей матча' }, { status: 500 });
  }
}

// PATCH запрос для обновления данных матча
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
    }

    const matchId = params.id;
    const body = await request.json();
    
    console.log('Получен запрос на обновление матча:', matchId);
    console.log('Данные для обновления (поля):', Object.keys(body));

    // Проверяем, существует ли матч и принадлежит ли он клубу пользователя
    const existingMatch = await prisma.match.findFirst({
      where: {
        id: matchId,
        clubId: session.user.clubId,
      },
    });

    if (!existingMatch) {
      return NextResponse.json({ error: 'Матч не найден' }, { status: 404 });
    }

    // Подготавливаем данные для обновления
    const updateData: any = {
        date: body.date ? new Date(body.date) : undefined,
        time: body.time,
        competitionType: body.competitionType,
        isHome: body.isHome,
        teamGoals: body.teamGoals,
        opponentGoals: body.opponentGoals,
        opponentName: body.opponentName,
        gameFormat: body.gameFormat,
        formation: body.formation,
        markerColor: body.markerColor,
        notes: body.notes,
    };
    
    try {
      // Отдельно обрабатываем поле playerPositions как JSON
      if (body.playerPositions) {
        console.log('Обновление playerPositions, элементов:', body.playerPositions.length);
        console.log('Структура playerPositions:', JSON.stringify(body.playerPositions));
        
        // Очищаем объекты от возможных циклических ссылок и undefined значений
        const cleanedPositions = body.playerPositions.map((pos: any) => ({
          x: pos.x,
          y: pos.y,
          isGoalkeeper: pos.isGoalkeeper || false,
          playerId: pos.playerId || null,
          playerNumber: pos.playerNumber || null,
          playerName: pos.playerName || null
        }));
        
        console.log('Очищенные позиции:', JSON.stringify(cleanedPositions));
        
        // Напрямую присваиваем в updateData, Prisma сама конвертирует в JSON
        updateData.playerPositions = cleanedPositions;
      }

      // Добавляем сохранение привязок игроков к позициям
      if (body.positionAssignments) {
        console.log('Обновление positionAssignments, привязок:', Object.keys(body.positionAssignments).length);
        console.log('Структура positionAssignments:', JSON.stringify(body.positionAssignments));
        
        // Создаем чистый объект без возможных проблемных значений
        const cleanedAssignments: Record<string, number> = {};
        Object.entries(body.positionAssignments).forEach(([key, value]) => {
          if (key && value !== undefined && value !== null) {
            cleanedAssignments[key] = Number(value);
          }
        });
        
        console.log('Очищенные привязки:', JSON.stringify(cleanedAssignments));
        
        // Напрямую присваиваем в updateData, Prisma сама конвертирует в JSON
        updateData.positionAssignments = cleanedAssignments;
      }
    } catch (jsonError) {
      console.error('Ошибка при обработке JSON данных:', jsonError);
      return NextResponse.json({ 
        error: 'Ошибка при обработке данных', 
        details: (jsonError as Error).message 
      }, { status: 400 });
    }

    // Обновляем данные матча
    try {
      console.log('Отправка updateData в БД:', JSON.stringify(updateData));
      const updatedMatch = await prisma.match.update({
        where: {
          id: matchId,
        },
        data: updateData,
      });

      console.log('Матч успешно обновлен:', matchId);
      return NextResponse.json(updatedMatch);
    } catch (prismaError) {
      console.error('Ошибка при обновлении в базе данных:', prismaError);
      console.error('Подробности ошибки:', prismaError);
      return NextResponse.json({ 
        error: 'Ошибка при сохранении в базу данных', 
        details: (prismaError as Error).message 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Ошибка при обновлении матча:', error);
    return NextResponse.json({ 
      error: 'Ошибка при обновлении матча',
      details: (error as Error).message
    }, { status: 500 });
  }
} 