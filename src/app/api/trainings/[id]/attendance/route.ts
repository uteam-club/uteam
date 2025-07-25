import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getToken } from 'next-auth/jwt';
import * as jwt from 'jsonwebtoken';
import {
  training,
  player,
  playerAttendance,
  team,
} from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
export const dynamic = 'force-dynamic';
export const revalidate = 0;


// Функция для получения токена
async function getTokenFromRequest(request: NextRequest) {
  const token = await getToken({ req: request });
  if (token) return token;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const bearerToken = authHeader.replace('Bearer ', '');
    const decodedToken = jwt.verify(
      bearerToken,
      process.env.NEXTAUTH_SECRET || 'fdcvista-default-secret-key-change-me'
    ) as any;
    return {
      id: decodedToken.id,
      email: decodedToken.email,
      name: decodedToken.name,
      role: decodedToken.role,
      clubId: decodedToken.clubId,
    };
  } catch (error) {
    console.error('Ошибка при декодировании токена:', error);
    return null;
  }
}

/**
 * GET /api/trainings/[id]/attendance
 * Получение данных посещаемости для тренировки
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const permissions = await getUserPermissions(token.id);
    if (!hasPermission(permissions, 'trainings.read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const clubId = token.clubId as string;
    const trainingId = params.id;
    // Получаем тренировку
    const [trainingRow] = await db
      .select()
      .from(training)
      .where(eq(training.id, trainingId));
    if (!trainingRow) {
      return NextResponse.json({ error: 'Training not found' }, { status: 404 });
    }
    if (trainingRow.clubId !== clubId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    // Получаем всех игроков команды
    const players = await db
      .select()
      .from(player)
      .where(eq(player.teamId, trainingRow.teamId))
      .orderBy(asc(player.lastName), asc(player.firstName));
    // Получаем посещаемость
    const attendance = await db
      .select()
      .from(playerAttendance)
      .where(eq(playerAttendance.trainingId, trainingId));
    // Формируем результат
    const result = players.map((p) => {
      const playerAttendanceRow = attendance.find((a) => a.playerId === p.id);
      return {
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        number: p.number || '',
        positionInTeam: p.position || '',
        imageUrl: p.imageUrl || null,
        attendance: playerAttendanceRow
          ? {
              id: playerAttendanceRow.id,
              status: playerAttendanceRow.status,
              comment: playerAttendanceRow.comment || '',
            }
          : { status: 'TRAINED', comment: '' },
      };
    });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Ошибка при получении данных посещаемости:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch attendance data',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/trainings/[id]/attendance
 * Сохранение данных посещаемости для тренировки
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const permissions = await getUserPermissions(token.id);
    if (!hasPermission(permissions, 'attendance.update')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const clubId = token.clubId as string;
    const trainingId = params.id;
    // Получаем тренировку
    const [trainingRow] = await db
      .select()
      .from(training)
      .where(eq(training.id, trainingId));
    if (!trainingRow) {
      return NextResponse.json({ error: 'Training not found' }, { status: 404 });
    }
    if (trainingRow.clubId !== clubId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const data = await request.json();
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }
    const results = [];
    for (const item of data) {
      if (!item.playerId || !item.status) {
        continue;
      }
      // Проверяем, существует ли уже запись о посещаемости
      const [existingAttendance] = await db
        .select()
        .from(playerAttendance)
        .where(
          and(
            eq(playerAttendance.playerId, item.playerId),
            eq(playerAttendance.trainingId, trainingId)
          )
        );
      let result;
      if (existingAttendance) {
        // Обновляем существующую запись
        await db
          .update(playerAttendance)
          .set({
            status: item.status,
            comment: item.comment || null,
            updatedAt: new Date(),
          })
          .where(eq(playerAttendance.id, existingAttendance.id));
        result = { ...existingAttendance, status: item.status, comment: item.comment || null };
      } else {
        // Создаем новую запись
        const [created] = await db
          .insert(playerAttendance)
          .values({
            id: uuidv4(),
            playerId: item.playerId,
            trainingId,
            status: item.status,
            comment: item.comment || null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
        result = created;
      }
      results.push(result);
    }
    return NextResponse.json({
      success: true,
      message: 'Attendance data saved successfully',
      results,
    });
  } catch (error: any) {
    console.error('Ошибка при сохранении данных посещаемости:', error);
    return NextResponse.json(
      {
        error: 'Failed to save attendance data',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
} 