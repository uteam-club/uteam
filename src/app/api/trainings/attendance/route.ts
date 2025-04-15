import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseISO, format } from 'date-fns';

// Определение типа для записи посещаемости
type AttendanceRecord = {
  id: string;
  playerId: string;
  trainingId: string;
  attendanceStatus: string;
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
      select: { id: true }
    });
    
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
    
    // Получаем данные о посещаемости для найденных тренировок
    // @ts-ignore
    const attendanceData = await prisma.trainingParticipant.findMany({
      where: {
        trainingId: { in: trainingIds },
        playerId: { in: playerIds }
      },
      include: {
        training: {
          select: {
            startTime: true
          }
        }
      }
    });
    
    // Форматируем данные для ответа API, используя startTime из тренировки
    const formattedAttendance = attendanceData.map((record: {
      id: string;
      playerId: string;
      attendanceStatus: string;
      training: {
        startTime: Date;
      };
    }) => {
      return {
        id: record.id,
        playerId: record.playerId,
        date: format(record.training.startTime, 'yyyy-MM-dd'),
        status: record.attendanceStatus
      };
    });
    
    console.log(`Найдены данные посещаемости: ${formattedAttendance.length} записей`);
    
    return NextResponse.json(formattedAttendance);
  } catch (error) {
    console.error('Ошибка при получении данных о посещаемости:', error);
    return NextResponse.json(
      { error: 'Не удалось получить данные о посещаемости' },
      { status: 500 }
    );
  }
} 