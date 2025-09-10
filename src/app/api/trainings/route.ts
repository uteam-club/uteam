import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { training, team, trainingCategory } from '@/db/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { getToken } from 'next-auth/jwt';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getSubdomain } from '@/lib/utils';
import { getClubBySubdomain } from '@/services/user.service';
import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
dayjs.extend(utc);
dayjs.extend(timezone);
export const dynamic = 'force-dynamic';
export const revalidate = 0;


// Добавляю тип Token
type Token = { clubId: string; [key: string]: any };

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

// Проверка clubId пользователя и клуба по subdomain
async function checkClubAccess(request: NextRequest, token: any) {
  const host = request.headers.get('host') || '';
  const subdomain = getSubdomain(host);
  if (!subdomain) return false;
  const club = await getClubBySubdomain(subdomain);
  if (!club) return false;
  return token.clubId === club.id;
}

/**
 * GET /api/trainings
 * Получение списка тренировок клуба
 */
export async function GET(request: NextRequest) {
  const token = (await getTokenFromRequest(request) as unknown) as Token | null;
  if (!token || typeof token.clubId !== 'string') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'trainings.read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const hasAccess = await checkClubAccess(request, token);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Нет доступа к этому клубу' }, { status: 403 });
  }
  const clubId = token.clubId as string;
  const searchParams = request.nextUrl.searchParams;
  const teamId = searchParams.get('teamId');
  const fromDate = searchParams.get('fromDate');
  const toDate = searchParams.get('toDate');
  const forUpload = searchParams.get('forUpload') === 'true'; // Новый параметр для модалки загрузки
  
  // Формируем where через массив условий (raw SQL)
  const whereArr = [sql`t."clubId" = ${clubId}::uuid`];
  if (teamId) {
    whereArr.push(sql`t."teamId" = ${teamId}::uuid`);
  }
  if (fromDate) {
    whereArr.push(sql`t."date" >= ${fromDate}`);
  }
  if (toDate) {
    const endDate = new Date(toDate);
    endDate.setHours(23, 59, 59, 999);
    whereArr.push(sql`t."date" <= ${endDate.toISOString()}`);
  }
  
  console.log('🔍 SQL условия:', whereArr.map(w => w.toString()));
  console.log('📤 Для загрузки:', forUpload);
  
  let result;
  
  if (forUpload) {
    // Для модалки загрузки - показываем тренировки БЕЗ отчетов
    result = await db.execute(sql`
      SELECT 
        t."id", t."title", t."teamId", t."date", t."time", t."categoryId", t."status", t."type", t."createdAt", t."updatedAt",
        tm."name" as "teamName",
        c."name" as "categoryName",
        NULL as "reportId",
        NULL as "reportName"
      FROM "Training" t
      LEFT JOIN "Team" tm ON t."teamId" = tm."id"
      LEFT JOIN "TrainingCategory" c ON t."categoryId" = c."id"
      WHERE ${sql.join(whereArr, sql` AND `)}
      ORDER BY t."date" DESC
    `);
  } else {
    // Для просмотра - показываем ВСЕ тренировки
    const query = sql`
      SELECT 
        t."id", t."title", t."teamId", t."date", t."time", t."categoryId", t."status", t."type", t."createdAt", t."updatedAt",
        tm."name" as "teamName",
        c."name" as "categoryName",
        NULL as "reportId",
        NULL as "reportName"
      FROM "Training" t
      LEFT JOIN "Team" tm ON t."teamId" = tm."id"
      LEFT JOIN "TrainingCategory" c ON t."categoryId" = c."id"
      WHERE ${sql.join(whereArr, sql` AND `)}
      ORDER BY t."date" DESC
    `;
    
    try {
      result = await db.execute(query);
    } catch (error) {
      console.error('❌ Ошибка при выполнении SQL запроса:', error);
      throw error;
    }
  }
  
  const rows = (result as any).rows || [];
  
  // Форматируем ответ
  const formatted = rows.map((row: any) => {
    const formattedRow = {
      id: row.id,
      name: row.title,
      teamId: row.teamid,
      team: row.teamName,
      date: row.date,
      time: row.time,
      categoryId: row.categoryid,
      category: row.categoryName,
      status: row.status || 'SCHEDULED',
      type: row.type || 'TRAINING',
      createdAt: row.createdat,
      updatedAt: row.updatedat,
      reportId: row.reportid || row.reportId,
      reportName: row.reportname || row.reportName
    };
    
    return formattedRow;
  });
  return NextResponse.json(formatted);
}

/**
 * POST /api/trainings
 * Создание новой тренировки
 */
export async function POST(request: NextRequest) {
  const token = (await getTokenFromRequest(request) as unknown) as Token | null;
  if (!token || typeof token.clubId !== 'string') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'trainings.update')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const hasAccess = await checkClubAccess(request, token);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Нет доступа к этому клубу' }, { status: 403 });
  }
  let debug = {};
  try {
    debug = { ...debug, token };
    const role = token.role as string;
    const clubId = token.clubId as string;
    const userId = token.id as string;
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
    const trainingData = {
      id: uuidv4(),
      title: data.title.trim(),
      description: data.description || null,
      teamId: data.teamId,
      date: data.date,
      time: data.time,
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
    const formattedTraining = {
      id: created.id,
      title: created.title,
      teamId: created.teamId,
      team: teamRow?.name || '',
      date: created.date,
      time: created.time,
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
    const permissions = await getUserPermissions(token.id);
    if (!hasPermission(permissions, 'trainings.update')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const role = token.role as string;
    const clubId = token.clubId as string;
    const userId = token.id as string;
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
    const trainingData = {
      id: data.id,
      title: data.title.trim(),
      description: data.description || null,
      teamId: data.teamId,
      date: data.date,
      time: data.time,
      location: data.location || null,
      notes: data.notes || null,
      categoryId: data.categoryId,
      clubId: clubId,
      createdById: userId,
      status: data.status || 'SCHEDULED',
      type: data.type || 'TRAINING',
      updatedAt: new Date(),
    };
    debug = { ...debug, trainingData };
    const [updated] = await db.update(training)
      .set(trainingData)
      .where(eq(training.id, data.id))
      .returning();
    // Получаем team и category для ответа
    const [teamRow] = await db.select({ name: team.name }).from(team).where(eq(team.id, updated.teamId));
    const [catRow] = await db.select({ name: trainingCategory.name }).from(trainingCategory).where(eq(trainingCategory.id, updated.categoryId));
    // Форматируем данные для ответа клиенту
    const formattedTraining = {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      teamId: updated.teamId,
      team: teamRow?.name || '',
      date: updated.date,
      time: updated.time,
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