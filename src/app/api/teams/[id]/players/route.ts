import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import * as jwt from 'jsonwebtoken';
import { db } from '@/lib/db';
import { player, team } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { uuidv4 } from '@/lib/uuid-wrapper';
import { playerDocument } from '@/db/schema/playerDocument';
import { playerAttendance } from '@/db/schema/playerAttendance';
import { playerMatchStat } from '@/db/schema/playerMatchStat';
import { morningSurveyResponse } from '@/db/schema/morningSurveyResponse';
import { deletePlayerFile, getServiceSupabase } from '@/lib/supabase';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Функция для чтения токена из заголовка Authorization
async function getTokenFromRequest(request: NextRequest) {
  try {
    const token = await getToken({ req: request });
    if (token) return token;
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;
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
  } catch {
    return null;
  }
}

/**
 * POST /api/teams/[id]/players
 * Создание нового игрока в команде
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
    const clubId = token.clubId as string;
    const teamId = params.id;
    // Проверяем, что команда принадлежит клубу пользователя
    const [foundTeam]: any = await db.select().from(team)
      .where(and(eq(team.id, teamId), eq(team.clubId, clubId)))
      .limit(1);
    if (!foundTeam) {
      return NextResponse.json({ error: 'Team not found or access denied' }, { status: 404 });
    }
    const data = await request.json();
    // Генерируем шестизначный числовой pinCode
    const pinCode = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date();
    const newPlayer = {
      id: uuidv4(),
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.middleName || null,
      number: data.number ? parseInt(data.number) : null,
      position: data.position || null,
      strongFoot: data.strongFoot || null,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      academyJoinDate: data.academyJoinDate ? new Date(data.academyJoinDate) : null,
      nationality: data.nationality || null,
      imageUrl: data.imageUrl || null,
      status: data.status || null,
      birthCertificateNumber: data.birthCertificateNumber || null,
      pinCode,
      telegramId: data.telegramId || null,
      teamId,
      createdAt: now,
      updatedAt: now,
    };
    const [created] = await db.insert(player).values(newPlayer).returning();
    return NextResponse.json({ player: created }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create player:', error);
    return NextResponse.json({ error: 'Failed to create player', details: error.message || 'Unknown error' }, { status: 500 });
  }
}

/**
 * GET /api/teams/[id]/players
 * Получение списка игроков команды
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
    const clubId = token.clubId as string;
    const teamId = params.id;
    // Проверяем, что команда принадлежит клубу пользователя
    const [foundTeam]: any = await db.select().from(team)
      .where(and(eq(team.id, teamId), eq(team.clubId, clubId)))
      .limit(1);
    if (!foundTeam) {
      return NextResponse.json({ error: 'Team not found or access denied' }, { status: 404 });
    }
    // Получаем всех игроков команды
    const playersList = await db.select().from(player)
      .where(eq(player.teamId, teamId));
    return NextResponse.json(playersList, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch players', details: error.message || 'Unknown error' }, { status: 500 });
  }
}

/**
 * DELETE /api/teams/[id]/players
 * Удаление игроков из команды
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const clubId = token.clubId as string;
    const teamId = params.id;
    // Проверяем, что команда принадлежит клубу пользователя
    const [foundTeam]: any = await db.select().from(team)
      .where(and(eq(team.id, teamId), eq(team.clubId, clubId)))
      .limit(1);
    if (!foundTeam) {
      return NextResponse.json({ error: 'Team not found or access denied' }, { status: 404 });
    }
    const data = await request.json();
    const playerIds = Array.isArray(data.playerIds) ? data.playerIds : [];
    if (!playerIds.length) {
      return NextResponse.json({ error: 'No playerIds provided' }, { status: 400 });
    }
    // КАСКАДНОЕ УДАЛЕНИЕ ВСЕХ ДАННЫХ ИГРОКА
    for (const pid of playerIds) {
      // 1. Удаляем все документы игрока и их файлы
      const docs = await db.select().from(playerDocument).where(eq(playerDocument.playerId, pid));
      for (const doc of docs) {
        if (doc.url) {
          try { await deletePlayerFile(doc.url); } catch (e) { console.error('Ошибка удаления файла документа:', doc.url, e); }
        }
      }
      await db.delete(playerDocument).where(eq(playerDocument.playerId, pid));
      // 2. Удаляем аватар игрока из Supabase Storage
      const playerRow = await db.select().from(player).where(eq(player.id, pid)).limit(1);
      if (playerRow[0]?.imageUrl) {
        try {
          const url = new URL(playerRow[0].imageUrl);
          const path = decodeURIComponent(url.pathname.replace('/storage/v1/object/public/club-media/', ''));
          await deletePlayerFile(path);
        } catch (e) { console.error('Ошибка удаления аватара:', e); }
      }
      // 3. Удаляем посещаемость
      await db.delete(playerAttendance).where(eq(playerAttendance.playerId, pid));
      // 4. Удаляем статистику матчей
      await db.delete(playerMatchStat).where(eq(playerMatchStat.playerId, pid));
      // 5. Удаляем ответы на опросы
      await db.delete(morningSurveyResponse).where(eq(morningSurveyResponse.playerId, pid));
      // 6. Удаляем все файлы из папки игрока в Supabase Storage (аватары, документы)
      try {
        const supabase = getServiceSupabase();
        const { data: list, error: listError } = await supabase.storage.from('club-media').list(`clubs/${teamId}/players/${pid}`);
        if (!listError && list?.length) {
          for (const folder of list) {
            if (folder.name) {
              const { data: files } = await supabase.storage.from('club-media').list(`clubs/${teamId}/players/${pid}/${folder.name}`);
              if (files?.length) {
                await supabase.storage.from('club-media').remove(files.map(f => `clubs/${teamId}/players/${pid}/${folder.name}/${f.name}`));
              }
            }
          }
        }
      } catch (e) { console.error('Ошибка каскадного удаления файлов игрока:', e); }
    }
    // После каскадного удаления — удаляем самих игроков
    const result = await db.delete(player)
      .where(and(eq(player.teamId, teamId), inArray(player.id, playerIds)))
      .returning();
    return NextResponse.json({ deleted: result.length }, { status: 200 });
  } catch (error: any) {
    console.error('Failed to delete players:', error);
    return NextResponse.json({ error: 'Failed to delete players', details: error.message || 'Unknown error' }, { status: 500 });
  }
} 