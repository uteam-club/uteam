import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';

// GET /api/trainings/[trainingId]/participants - получить всех участников тренировки
export async function GET(
  request: Request,
  { params }: { params: { trainingId: string } }
) {
  const trainingId = params.trainingId;
  
  if (!trainingId) {
    return NextResponse.json(
      { error: 'Не указан ID тренировки' },
      { status: 400 }
    );
  }
  
  try {
    // Проверяем существование тренировки
    const training = await prisma.training.findUnique({
      where: { id: trainingId }
    });
    
    if (!training) {
      return NextResponse.json(
        { error: 'Тренировка не найдена' },
        { status: 404 }
      );
    }
    
    // Получаем всех участников тренировки
    const participants = await prisma.trainingParticipant.findMany({
      where: {
        trainingId: trainingId
      },
      include: {
        player: true
      }
    });
    
    return NextResponse.json({ participants });
  } catch (error) {
    console.error('Ошибка при получении участников тренировки:', error);
    return NextResponse.json(
      { error: 'Не удалось получить участников тренировки' },
      { status: 500 }
    );
  }
}

// PUT /api/trainings/[trainingId]/participants - обновить участников тренировки
export async function PUT(
  request: Request,
  { params }: { params: { trainingId: string } }
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
    
    const trainingId = params.trainingId;
    if (!trainingId) {
      return NextResponse.json(
        { error: 'Не указан ID тренировки' },
        { status: 400 }
      );
    }
    
    // Проверяем существование тренировки
    const training = await prisma.training.findUnique({
      where: { id: trainingId }
    });
    
    if (!training) {
      return NextResponse.json(
        { error: 'Тренировка не найдена' },
        { status: 404 }
      );
    }
    
    const data = await request.json();
    const { participants } = data;
    
    if (!participants || !Array.isArray(participants)) {
      return NextResponse.json(
        { error: 'Необходимо предоставить массив участников' },
        { status: 400 }
      );
    }
    
    // Массив для результатов обработки участников
    const results = [];
    
    // Обрабатываем каждого участника
    for (const participant of participants) {
      const { id, playerId, attended, attendanceStatus, notes } = participant;
      
      if (!playerId) {
        results.push({
          success: false,
          error: 'Не указан ID игрока',
          participant
        });
        continue;
      }
      
      try {
        if (id) {
          // Обновляем существующего участника
          const updatedParticipant = await prisma.trainingParticipant.update({
            where: { id },
            data: {
              attended: attended !== undefined ? attended : false,
              attendanceStatus: attendanceStatus || 'READY',
              notes: notes || null
            },
            include: { player: true }
          });
          
          results.push({
            success: true,
            participant: updatedParticipant
          });
        } else {
          // Проверяем, существует ли уже запись для этого игрока и тренировки
          const existingParticipant = await prisma.trainingParticipant.findUnique({
            where: {
              trainingId_playerId: {
                trainingId,
                playerId
              }
            }
          });
          
          if (existingParticipant) {
            // Обновляем существующую запись
            const updatedParticipant = await prisma.trainingParticipant.update({
              where: { id: existingParticipant.id },
              data: {
                attended: attended !== undefined ? attended : false,
                attendanceStatus: attendanceStatus || 'READY',
                notes: notes || null
              },
              include: { player: true }
            });
            
            results.push({
              success: true,
              participant: updatedParticipant
            });
          } else {
            // Создаем нового участника
            const newParticipant = await prisma.trainingParticipant.create({
              data: {
                trainingId,
                playerId,
                attended: attended !== undefined ? attended : false,
                attendanceStatus: attendanceStatus || 'READY',
                notes: notes || null
              },
              include: { player: true }
            });
            
            results.push({
              success: true,
              participant: newParticipant
            });
          }
        }
      } catch (error) {
        console.error('Ошибка при обработке участника:', error);
        results.push({
          success: false,
          error: 'Не удалось обработать участника',
          participant
        });
      }
    }
    
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Ошибка при обновлении участников тренировки:', error);
    return NextResponse.json(
      { error: 'Не удалось обновить участников тренировки' },
      { status: 500 }
    );
  }
}

// DELETE /api/trainings/[trainingId]/participants - удалить участников тренировки
export async function DELETE(
  request: Request,
  { params }: { params: { trainingId: string } }
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
    
    const trainingId = params.trainingId;
    if (!trainingId) {
      return NextResponse.json(
        { error: 'Не указан ID тренировки' },
        { status: 400 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const participantId = searchParams.get('participantId');
    const playerId = searchParams.get('playerId');
    
    if (!participantId && !playerId) {
      return NextResponse.json(
        { error: 'Необходимо указать ID участника или ID игрока' },
        { status: 400 }
      );
    }
    
    let deletedParticipant;
    
    if (participantId) {
      // Удаляем по ID участника
      deletedParticipant = await prisma.trainingParticipant.delete({
        where: { id: participantId }
      });
    } else if (playerId) {
      // Удаляем по комбинации trainingId и playerId
      deletedParticipant = await prisma.trainingParticipant.delete({
        where: {
          trainingId_playerId: {
            trainingId,
            playerId
          }
        }
      });
    }
    
    return NextResponse.json({ success: true, deletedParticipant });
  } catch (error) {
    console.error('Ошибка при удалении участника тренировки:', error);
    return NextResponse.json(
      { error: 'Не удалось удалить участника тренировки' },
      { status: 500 }
    );
  }
} 