import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseISO, format } from 'date-fns';
import { Prisma } from '@prisma/client';

// Define the valid attendance status values directly as they appear in the database
type ValidAttendanceStatus = 'TRAINED' | 'REHABILITATION' | 'SICK' | 'STUDY' | 'OTHER';

// Определение типа для записи посещаемости
type AttendanceRecord = {
  id: string;
  playerId: string;
  trainingId: string;
  attendanceStatus: ValidAttendanceStatus | null;
};

// GET /api/trainings/attendance - получение данных о посещаемости
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // Проверка обязательных параметров
    if (!teamId) {
      return NextResponse.json(
        { error: 'Не указан ID команды' },
        { status: 400 }
      );
    }
    
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Не указан период для выборки данных' },
        { status: 400 }
      );
    }
    
    // Преобразуем строки в объекты Date
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    
    // Получаем всех игроков команды
    const players = await prisma.player.findMany({
      where: { teamId },
      select: { 
        id: true,
        firstName: true,
        lastName: true
      }
    });
    
    if (players.length === 0) {
      console.log('В команде нет игроков.');
      return NextResponse.json([]);
    }
    
    console.log(`Найдено ${players.length} игроков в команде`);
    
    const playerIds = players.map(player => player.id);
    
    // Получаем все тренировки команды в указанном периоде
    const trainings = await prisma.training.findMany({
      where: {
        teamId,
        startTime: {
          gte: start,
          lte: end
        }
      },
      select: {
        id: true,
        startTime: true
      }
    });
    
    const trainingIds = trainings.map(t => t.id);
    
    if (trainingIds.length === 0) {
      console.log('В выбранном периоде нет тренировок.');
      return NextResponse.json([]);
    }
    
    console.log(`Найдены тренировки в выбранном периоде: ${trainingIds.length} тренировок`);
    
    // Собираем данные о посещаемости для всех найденных тренировок
    let attendanceData: any[] = [];
    
    // Для каждой тренировки запрашиваем данные о посещаемости отдельно
    for (const trainingId of trainingIds) {
      // Используем raw SQL запрос с простым условием для одной тренировки
      const sql = Prisma.sql`
        SELECT tp.*, t."startTime"
        FROM "training_participants" tp
        JOIN "trainings" t ON tp."trainingId" = t.id
        WHERE tp."trainingId" = ${trainingId}
      `;
      
      const trainingAttendance = await prisma.$queryRaw(sql);
      
      if (Array.isArray(trainingAttendance)) {
        attendanceData = [...attendanceData, ...trainingAttendance];
      }
    }
    
    console.log(`Найдено ${attendanceData.length} существующих записей о посещаемости`);
    
    // Создаем Map для быстрого доступа к записям посещаемости
    const attendanceMap = new Map();
    
    // Форматируем существующие данные и добавляем их в Map
    if (Array.isArray(attendanceData)) {
      attendanceData.forEach((record: any) => {
        // Уникальный ключ в формате "playerId_trainingDate"
        const trainingDate = format(new Date(record.startTime), 'yyyy-MM-dd');
        const key = `${record.playerId}_${trainingDate}`;
        
        // Преобразуем статус из БД в формат для фронтенда
        let status = record.attendanceStatus;
        
        attendanceMap.set(key, {
          id: record.id,
          playerId: record.playerId,
          trainingId: record.trainingId,
          date: trainingDate,
          status: status
        });
      });
    }
    
    // Создаем полный список записей для всех игроков и тренировок
    const formattedAttendance = [];
    
    // Перебираем всех игроков и все тренировки
    for (const player of players) {
      for (const training of trainings) {
        const trainingDate = format(training.startTime, 'yyyy-MM-dd');
        const key = `${player.id}_${trainingDate}`;
        
        // Проверяем, есть ли уже запись посещаемости для этого игрока и тренировки
        if (attendanceMap.has(key)) {
          // Если запись существует, добавляем ее в результат
          formattedAttendance.push(attendanceMap.get(key));
        } else {
          // Если записи нет, создаем новую с пустым статусом
          formattedAttendance.push({
            id: `temp_${key}`, // Временный ID для фронтенда
            playerId: player.id,
            trainingId: training.id,
            date: trainingDate,
            status: null // Игрок не отмечен
          });
        }
      }
    }
    
    console.log(`Сформированы данные посещаемости: ${formattedAttendance.length} записей`);
    
    return NextResponse.json(formattedAttendance);
  } catch (error) {
    console.error('Ошибка при получении данных о посещаемости:', error);
    return NextResponse.json(
      { error: 'Не удалось получить данные о посещаемости' },
      { status: 500 }
    );
  }
}

// POST /api/trainings/attendance - обновление посещаемости
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { records } = data;
    
    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { error: 'Не предоставлены записи для обновления' },
        { status: 400 }
      );
    }
    
    console.log(`Получено ${records.length} записей для обновления`);
    
    const results = [];
    
    for (const record of records) {
      const { id, playerId, trainingId, status } = record;
      
      if (!playerId || !trainingId) {
        console.log('Ошибка: отсутствует playerId или trainingId');
        results.push({ 
          success: false, 
          message: 'Отсутствует playerId или trainingId', 
          record 
        });
        continue;
      }
      
      try {
        // Если id начинается с 'temp_', это новая запись
        if (id && id.startsWith('temp_')) {
          // Создаем новую запись
          const newRecord = await prisma.$executeRaw`
            INSERT INTO "training_participants" ("id", "playerId", "trainingId", "attendanceStatus", "attended", "createdAt", "updatedAt")
            VALUES (${crypto.randomUUID()}, ${playerId}, ${trainingId}, ${status || 'TRAINED'}::"AttendanceStatus", ${status === 'TRAINED'}, NOW(), NOW())
            RETURNING *
          `;
          
          const insertedRecord = await prisma.$queryRaw`
            SELECT * FROM "training_participants" 
            WHERE "playerId" = ${playerId} AND "trainingId" = ${trainingId}
            ORDER BY "createdAt" DESC
            LIMIT 1
          `;
          
          const recordData = Array.isArray(insertedRecord) && insertedRecord.length > 0 
            ? insertedRecord[0] 
            : { id: id, playerId, trainingId, attendanceStatus: status || 'TRAINED' };
          
          results.push({ 
            success: true, 
            record: { 
              ...recordData, 
              date: record.date, 
              status: recordData.attendanceStatus 
            } 
          });
        } else if (id) {
          // Обновляем существующую запись
          await prisma.$executeRaw`
            UPDATE "training_participants"
            SET 
              "attendanceStatus" = ${status || 'TRAINED'}::"AttendanceStatus",
              "attended" = ${status === 'TRAINED'},
              "updatedAt" = NOW()
            WHERE "id" = ${id}
          `;
          
          const updatedRecord = await prisma.$queryRaw`
            SELECT * FROM "training_participants" 
            WHERE "id" = ${id}
          `;
          
          const recordData = Array.isArray(updatedRecord) && updatedRecord.length > 0 
            ? updatedRecord[0] 
            : { id, playerId, trainingId, attendanceStatus: status || 'TRAINED' };
          
          results.push({ 
            success: true, 
            record: { 
              ...recordData, 
              date: record.date, 
              status: recordData.attendanceStatus 
            } 
          });
        } else {
          // Проверяем, существует ли уже запись для этой комбинации player/training
          const existingRecord = await prisma.$queryRaw`
            SELECT * FROM "training_participants" 
            WHERE "playerId" = ${playerId} AND "trainingId" = ${trainingId}
          `;
          
          if (Array.isArray(existingRecord) && existingRecord.length > 0) {
            // Обновляем существующую запись
            const recordId = existingRecord[0].id;
            
            await prisma.$executeRaw`
              UPDATE "training_participants"
              SET 
                "attendanceStatus" = ${status || 'TRAINED'}::"AttendanceStatus",
                "attended" = ${status === 'TRAINED'},
                "updatedAt" = NOW()
              WHERE "id" = ${recordId}
            `;
            
            const updatedRecord = await prisma.$queryRaw`
              SELECT * FROM "training_participants" 
              WHERE "id" = ${recordId}
            `;
            
            const recordData = Array.isArray(updatedRecord) && updatedRecord.length > 0 
              ? updatedRecord[0] 
              : { id: recordId, playerId, trainingId, attendanceStatus: status || 'TRAINED' };
            
            results.push({ 
              success: true, 
              record: { 
                ...recordData, 
                date: record.date, 
                status: recordData.attendanceStatus 
              } 
            });
          } else {
            // Создаем новую запись
            const newId = crypto.randomUUID();
            
            await prisma.$executeRaw`
              INSERT INTO "training_participants" ("id", "playerId", "trainingId", "attendanceStatus", "attended", "createdAt", "updatedAt")
              VALUES (${newId}, ${playerId}, ${trainingId}, ${status || 'TRAINED'}::"AttendanceStatus", ${status === 'TRAINED'}, NOW(), NOW())
            `;
            
            const insertedRecord = await prisma.$queryRaw`
              SELECT * FROM "training_participants" 
              WHERE "id" = ${newId}
            `;
            
            const recordData = Array.isArray(insertedRecord) && insertedRecord.length > 0 
              ? insertedRecord[0] 
              : { id: newId, playerId, trainingId, attendanceStatus: status || 'TRAINED' };
            
            results.push({ 
              success: true, 
              record: { 
                ...recordData, 
                date: record.date, 
                status: recordData.attendanceStatus 
              } 
            });
          }
        }
      } catch (error) {
        console.error('Ошибка при обработке записи:', error);
        results.push({ 
          success: false, 
          message: 'Ошибка при обработке записи', 
          record,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Ошибка при обновлении данных о посещаемости:', error);
    return NextResponse.json(
      { error: 'Не удалось обновить данные о посещаемости' },
      { status: 500 }
    );
  }
} 