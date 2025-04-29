import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Define the valid attendance status values directly as they appear in the database
type ValidAttendanceStatus = 'TRAINED' | 'REHABILITATION' | 'SICK' | 'STUDY' | 'OTHER';

/**
 * Validate attendance status to ensure it's a valid enum value
 */
function validateAttendanceStatus(status: string | null | undefined): ValidAttendanceStatus {
  if (!status) return 'TRAINED';
  
  switch (status) {
    case 'TRAINED':
      return 'TRAINED';
    case 'REHABILITATION':
      return 'REHABILITATION';
    case 'SICK':
      return 'SICK';
    case 'STUDY':
      return 'STUDY';
    case 'OTHER':
      return 'OTHER';
    default:
      return 'TRAINED';
  }
}

/**
 * GET /api/trainings/[trainingId]/participants
 * Получение списка участников конкретной тренировки
 */
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
    console.log(`GET: Получение участников для тренировки ${trainingId}`);
    
    // Получаем всех участников тренировки с использованием raw SQL
    const participants = await prisma.$queryRaw`
      SELECT tp.*, p.id as "playerId", p."firstName", p."lastName", p."photoUrl", p."position", p."number"
      FROM "training_participants" tp
      JOIN "players" p ON tp."playerId" = p.id
      WHERE tp."trainingId" = ${trainingId}
    `;
    
    // Форматируем данные для фронтенда
    const formattedParticipants = Array.isArray(participants) 
      ? participants.map(p => ({
          id: p.id,
          trainingId: p.trainingId,
          playerId: p.playerId,
          attended: p.attended,
          attendanceStatus: p.attendanceStatus,
          notes: p.notes,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          players: {
            id: p.playerId,
            firstName: p.firstName,
            lastName: p.lastName,
            photoUrl: p.photoUrl,
            position: p.position,
            number: p.number
          }
        }))
      : [];
    
    console.log(`GET: Найдено ${formattedParticipants.length} участников`);
    
    return NextResponse.json(formattedParticipants);
  } catch (error) {
    console.error('GET: Ошибка при получении участников тренировки:', error);
    return NextResponse.json(
      { error: 'Не удалось получить участников тренировки' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/trainings/[trainingId]/participants
 * Обновление или создание участников тренировки
 */
export async function PUT(
  request: Request,
  { params }: { params: { trainingId: string } }
) {
  try {
    const trainingId = params.trainingId;
    
    if (!trainingId) {
      return NextResponse.json(
        { error: 'Не указан ID тренировки' },
        { status: 400 }
      );
    }
    
    const data = await request.json();
    const { participants = [] } = data;
    
    if (!Array.isArray(participants) || participants.length === 0) {
      return NextResponse.json(
        { error: 'Не предоставлены данные об участниках' },
        { status: 400 }
      );
    }
    
    console.log(`PUT: Получено ${participants.length} участников для обновления`);
    
    const results = [];
    
    for (const participant of participants) {
      try {
        const { id, playerId, attended = false, attendanceStatus, notes } = participant;
        
        if (!playerId) {
          console.log('Ошибка - не указан ID игрока для участника');
          results.push({
            success: false,
            error: 'Не указан ID игрока',
            participant
          });
          continue;
        }
        
        // Преобразуем строковый статус в enum
        const validStatus = validateAttendanceStatus(attendanceStatus);
        
        let updatedParticipant;
        
        if (id) {
          // Обновляем существующего участника
          console.log(`PUT: Обновление участника с ID ${id}`);
          
          await prisma.$executeRaw`
            UPDATE "training_participants" 
            SET 
              "attended" = ${attended === true},
              "attendanceStatus" = ${validStatus}::"AttendanceStatus",
              "notes" = ${notes || null},
              "updatedAt" = NOW()
            WHERE "id" = ${id}
          `;
          
          const updatedData = await prisma.$queryRaw`
            SELECT tp.*, p."firstName", p."lastName", p."photoUrl", p."position", p."number"
            FROM "training_participants" tp
            JOIN "players" p ON tp."playerId" = p.id
            WHERE tp.id = ${id}
          `;
          
          updatedParticipant = Array.isArray(updatedData) && updatedData.length > 0 ? {
            ...updatedData[0],
            players: {
              id: updatedData[0].playerId,
              firstName: updatedData[0].firstName,
              lastName: updatedData[0].lastName,
              photoUrl: updatedData[0].photoUrl,
              position: updatedData[0].position,
              number: updatedData[0].number
            }
          } : null;
        } else {
          // Ищем существующего участника или создаем нового
          console.log(`PUT: Поиск или создание участника для игрока ${playerId}`);
          
          const existingParticipant = await prisma.$queryRaw`
            SELECT * FROM "training_participants"
            WHERE "trainingId" = ${trainingId} AND "playerId" = ${playerId}
          `;
          
          if (Array.isArray(existingParticipant) && existingParticipant.length > 0) {
            // Обновляем существующего участника
            const participantId = existingParticipant[0].id;
            console.log(`PUT: Найден существующий участник ${participantId}, обновляем`);
            
            await prisma.$executeRaw`
              UPDATE "training_participants"
              SET 
                "attended" = ${attended === true},
                "attendanceStatus" = ${validStatus}::"AttendanceStatus",
                "notes" = ${notes || null},
                "updatedAt" = NOW()
              WHERE "id" = ${participantId}
            `;
            
            const updatedData = await prisma.$queryRaw`
              SELECT tp.*, p."firstName", p."lastName", p."photoUrl", p."position", p."number"
              FROM "training_participants" tp
              JOIN "players" p ON tp."playerId" = p.id
              WHERE tp.id = ${participantId}
            `;
            
            updatedParticipant = Array.isArray(updatedData) && updatedData.length > 0 ? {
              ...updatedData[0],
              players: {
                id: updatedData[0].playerId,
                firstName: updatedData[0].firstName,
                lastName: updatedData[0].lastName,
                photoUrl: updatedData[0].photoUrl,
                position: updatedData[0].position,
                number: updatedData[0].number
              }
            } : null;
          } else {
            // Создаем нового участника
            console.log(`PUT: Создание нового участника для игрока ${playerId}`);
            
            const newId = crypto.randomUUID();
            
            await prisma.$executeRaw`
              INSERT INTO "training_participants" 
              ("id", "trainingId", "playerId", "attended", "attendanceStatus", "notes", "createdAt", "updatedAt")
              VALUES (
                ${newId}, 
                ${trainingId}, 
                ${playerId}, 
                ${attended === true}, 
                ${validStatus}::"AttendanceStatus", 
                ${notes || null}, 
                NOW(), 
                NOW()
              )
            `;
            
            const newData = await prisma.$queryRaw`
              SELECT tp.*, p."firstName", p."lastName", p."photoUrl", p."position", p."number"
              FROM "training_participants" tp
              JOIN "players" p ON tp."playerId" = p.id
              WHERE tp.id = ${newId}
            `;
            
            updatedParticipant = Array.isArray(newData) && newData.length > 0 ? {
              ...newData[0],
              players: {
                id: newData[0].playerId,
                firstName: newData[0].firstName,
                lastName: newData[0].lastName,
                photoUrl: newData[0].photoUrl,
                position: newData[0].position,
                number: newData[0].number
              }
            } : null;
          }
        }
        
        if (updatedParticipant) {
          results.push({
            success: true,
            participant: updatedParticipant
          });
        } else {
          results.push({
            success: false,
            error: 'Не удалось получить обновленные данные участника',
            participant
          });
        }
      } catch (error) {
        console.error('PUT: Ошибка при обработке участника:', error);
        results.push({
          success: false,
          error: 'Не удалось обработать участника',
          participant
        });
      }
    }
    
    console.log(`PUT: Обработка завершена. Успешно: ${results.filter(r => r.success).length}, Ошибок: ${results.filter(r => !r.success).length}`);
    
    return NextResponse.json({ results });
  } catch (error) {
    console.error('PUT: Глобальная ошибка при обработке запроса:', error);
    return NextResponse.json(
      { error: 'Не удалось обработать запрос' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/trainings/[trainingId]/participants
 * Удаление участника тренировки
 */
export async function DELETE(
  request: Request,
  { params }: { params: { trainingId: string } }
) {
  try {
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
      // Получаем данные участника перед удалением
      const participantData = await prisma.$queryRaw`
        SELECT * FROM "training_participants" WHERE "id" = ${participantId}
      `;
      
      if (Array.isArray(participantData) && participantData.length > 0) {
        deletedParticipant = participantData[0];
        
        // Удаляем участника
        await prisma.$executeRaw`
          DELETE FROM "training_participants" WHERE "id" = ${participantId}
        `;
      } else {
        return NextResponse.json(
          { error: 'Участник не найден' },
          { status: 404 }
        );
      }
    } else if (playerId) {
      // Ищем участника по ID игрока и тренировки
      const participantData = await prisma.$queryRaw`
        SELECT * FROM "training_participants" 
        WHERE "trainingId" = ${trainingId} AND "playerId" = ${playerId}
      `;
      
      if (Array.isArray(participantData) && participantData.length > 0) {
        deletedParticipant = participantData[0];
        
        // Удаляем участника
        await prisma.$executeRaw`
          DELETE FROM "training_participants" 
          WHERE "id" = ${deletedParticipant.id}
        `;
      } else {
        return NextResponse.json(
          { error: 'Участник не найден' },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json({ success: true, deletedParticipant });
  } catch (error) {
    console.error('DELETE: Ошибка при удалении участника тренировки:', error);
    return NextResponse.json(
      { error: 'Не удалось удалить участника тренировки' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/trainings/[trainingId]/participants
 * Создание нового участника тренировки
 */
export async function POST(
  request: Request,
  { params }: { params: { trainingId: string } }
) {
  // Используем тот же обработчик, что и для PUT, так как логика одинаковая
  return PUT(request, { params });
} 