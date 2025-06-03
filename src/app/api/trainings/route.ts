import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { training, team, trainingCategory } from '@/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { getToken } from 'next-auth/jwt';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'COACH'];

// Функция для чтения токена из заголовка Authorization
async function getTokenFromRequest(request: NextRequest) {
  const token = await getToken({ req: request });
  if (token) return token;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const bearerToken = authHeader.replace('Bearer ', '');
    const decodedToken = jwt.verify(
      bearerToken,
      (() => {
        if (!process.env.NEXTAUTH_SECRET) throw new Error('NEXTAUTH_SECRET не задан в .env');
        return process.env.NEXTAUTH_SECRET;
      })()
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
 * GET /api/trainings
 * Получение списка тренировок клуба
 */
export async function GET(request: NextRequest) {
  try {
    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const clubId = token.clubId as string;
    const searchParams = request.nextUrl.searchParams;
    const teamId = searchParams.get('teamId');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    // Формируем where через массив условий
    const whereArr = [eq(training.clubId, clubId)];
    if (teamId) {
      whereArr.push(eq(training.teamId, teamId));
    }
    if (fromDate) {
      whereArr.push(gte(training.date, new Date(fromDate)));
    }
    if (toDate) {
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);
      whereArr.push(lte(training.date, endDate));
    }
    // JOIN с team и trainingCategory
    const rows = await db.select({
      id: training.id,
      title: training.title,
      teamId: training.teamId,
      date: training.date,
      categoryId: training.categoryId,
      status: training.status,
      type: training.type,
      createdAt: training.createdAt,
      updatedAt: training.updatedAt,
      teamName: team.name,
      categoryName: trainingCategory.name,
    })
      .from(training)
      .leftJoin(team, eq(training.teamId, team.id))
      .leftJoin(trainingCategory, eq(training.categoryId, trainingCategory.id))
      .where(and(...whereArr))
      .orderBy(desc(training.date));
    // Форматируем ответ
    const formatted = rows.map(row => {
      const dateObj = row.date;
      const dateOnly = dateObj?.toISOString().split('T')[0];
      const timeOnly = dateObj?.toISOString().split('T')[1].slice(0,5);
      return {
        id: row.id,
        title: row.title,
        teamId: row.teamId,
        team: row.teamName,
        date: row.date?.toISOString(),
        dateOnly,
        time: timeOnly,
        categoryId: row.categoryId,
        category: row.categoryName,
        status: row.status || 'SCHEDULED',
        type: row.type || 'TRAINING',
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      };
    });
    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error('Error fetching trainings:', error);
    return NextResponse.json({
      error: 'Failed to fetch trainings',
      details: error.message || 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/trainings
 * Создание новой тренировки
 */
export async function POST(request: NextRequest) {
  let debug = {};
  try {
    const token = await getTokenFromRequest(request);
    debug = { ...debug, token };
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized', debug }, { status: 401 });
    }
    const role = token.role as string;
    const clubId = token.clubId as string;
    const userId = token.id as string;
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Forbidden', debug }, { status: 403 });
    }
    const data = await request.json();
    debug = { ...debug, incomingData: data };
    if (!data.title || !data.title.trim()) {
      return NextResponse.json({ error: 'Missing required field: title', debug }, { status: 400 });
    }
    if (!data.teamId) {
      return NextResponse.json({ error: 'Missing required field: teamId', debug }, { status: 400 });
    }
    if (!data.date) {
      return NextResponse.json({ error: 'Missing required field: date', debug }, { status: 400 });
    }
    if (!data.time) {
      return NextResponse.json({ error: 'Missing required field: time', debug }, { status: 400 });
    }
    if (!data.categoryId) {
      return NextResponse.json({ error: 'Missing required field: categoryId', debug }, { status: 400 });
    }
    // Объединяем дату и время в один timestamp (UTC)
    // Формируем ISO-строку с Z (UTC)
    const dateTimeString = `${data.date}T${data.time}:00Z`;
    const trainingData = {
      id: uuidv4(),
      title: data.title.trim(),
      description: data.description || null,
      teamId: data.teamId,
      date: new Date(dateTimeString), // всегда UTC
      location: data.location || null,
      notes: data.notes || null,
      categoryId: data.categoryId,
      clubId: clubId,
      createdById: userId,
      status: data.status || 'SCHEDULED',
      type: data.type || 'TRAINING',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    debug = { ...debug, trainingData };
    const [created] = await db.insert(training).values(trainingData).returning();
    // Получаем team и category для ответа
    const [teamRow] = await db.select({ name: team.name }).from(team).where(eq(team.id, created.teamId));
    const [catRow] = await db.select({ name: trainingCategory.name }).from(trainingCategory).where(eq(trainingCategory.id, created.categoryId));
    // Формируем ответ
    const dateObj = created.date;
    const dateOnly = dateObj.toISOString().split('T')[0];
    const timeOnly = dateObj.toISOString().split('T')[1].slice(0,5);
    const formattedTraining = {
      id: created.id,
      title: created.title,
      teamId: created.teamId,
      team: teamRow?.name || '',
      date: created.date.toISOString(), // полная дата-время
      dateOnly,
      time: timeOnly,
      categoryId: created.categoryId,
      category: catRow?.name || '',
      status: created.status || 'SCHEDULED',
      type: created.type || 'TRAINING',
      createdAt: created.createdAt,
      updatedAt: created.updatedAt
    };
    return NextResponse.json(formattedTraining);
  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to create training',
      details: error.message || 'Unknown error',
      stack: error.stack || null,
      debug
    }, { status: 500 });
  }
}

// Вспомогательная функция для получения названия команды
async function fetchTeamName(teamIdValue: string): Promise<string> {
  try {
    const teamRow = await db.select({ name: team.name }).from(team).where(eq(team.id, teamIdValue));
    return teamRow[0]?.name || 'Неизвестная команда';
  } catch (error) {
    console.error('Ошибка при получении имени команды:', error);
    return 'Неизвестная команда';
  }
}

// Вспомогательная функция для получения названия категории
async function fetchCategoryName(categoryIdValue: string): Promise<string> {
  try {
    const catRow = await db.select({ name: trainingCategory.name }).from(trainingCategory).where(eq(trainingCategory.id, categoryIdValue));
    return catRow[0]?.name || 'Неизвестная категория';
  } catch (error) {
    console.error('Ошибка при получении имени категории:', error);
    return 'Неизвестная категория';
  }
}

/**
 * PUT /api/trainings
 * Редактирование тренировки
 */
export async function PUT(request: NextRequest) {
  let debug = {};
  try {
    const token = await getTokenFromRequest(request);
    debug = { ...debug, token };
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized', debug }, { status: 401 });
    }
    const role = token.role as string;
    const clubId = token.clubId as string;
    const userId = token.id as string;
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Forbidden', debug }, { status: 403 });
    }
    const data = await request.json();
    debug = { ...debug, incomingData: data };
    if (!data.id) {
      return NextResponse.json({ error: 'Missing required field: id', debug }, { status: 400 });
    }
    if (!data.title || !data.title.trim()) {
      return NextResponse.json({ error: 'Missing required field: title', debug }, { status: 400 });
    }
    if (!data.teamId) {
      return NextResponse.json({ error: 'Missing required field: teamId', debug }, { status: 400 });
    }
    if (!data.date) {
      return NextResponse.json({ error: 'Missing required field: date', debug }, { status: 400 });
    }
    if (!data.categoryId) {
      return NextResponse.json({ error: 'Missing required field: categoryId', debug }, { status: 400 });
    }
    // Объединяем дату и время в один timestamp
    const dateTimeString = `${data.date}T${data.time}:00`;
    const trainingData = {
      id: data.id,
      title: data.title.trim(),
      description: data.description || null,
      teamId: data.teamId,
      date: new Date(dateTimeString), // теперь и дата, и время
      location: data.location || null,
      notes: data.notes || null,
      categoryId: data.categoryId,
      clubId: clubId,
      createdById: userId,
      status: data.status || 'SCHEDULED',
      type: data.type || 'TRAINING',
      updatedAt: new Date(),
    };
    if ('date' in data && 'time' in data && data.date && data.time) {
      // Формируем ISO-строку с Z (UTC)
      const dateTimeString = `${data.date}T${data.time}:00Z`;
      trainingData.date = new Date(dateTimeString); // всегда UTC
    } else if ('date' in data && data.date) {
      trainingData.date = new Date(data.date);
    }
    debug = { ...debug, trainingData };
    const [updated] = await db.update(training)
      .set(trainingData)
      .where(eq(training.id, data.id))
      .returning();
    // Получаем team и category для ответа
    const [teamRow] = await db.select({ name: team.name }).from(team).where(eq(team.id, updated.teamId));
    const [catRow] = await db.select({ name: trainingCategory.name }).from(trainingCategory).where(eq(trainingCategory.id, updated.categoryId));
    // Форматируем данные для ответа клиенту
    const dateObj = updated.date;
    const dateOnly = dateObj?.toISOString().split('T')[0];
    const timeOnly = dateObj?.toISOString().split('T')[1].slice(0,5);
    const formattedTraining = {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      teamId: updated.teamId,
      team: teamRow?.name || '',
      date: updated.date?.toISOString(),
      dateOnly,
      time: timeOnly,
      location: updated.location,
      notes: updated.notes,
      categoryId: updated.categoryId,
      category: catRow?.name || '',
      status: updated.status || 'SCHEDULED',
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt
    };
    return NextResponse.json(formattedTraining);
  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to update training',
      details: error.message || 'Unknown error',
      stack: error.stack || null,
      debug
    }, { status: 500 });
  }
} 