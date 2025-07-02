import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { player, playerDocument, playerMatchStat, playerAttendance, morningSurveyResponse, team, fitnessTestResult } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { deleteFile as deleteYandexFile } from "@/lib/yandex-storage";
import { getSubdomain } from '@/lib/utils';
import { getClubBySubdomain } from '@/services/user.service';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/auth-options';
import { getToken } from 'next-auth/jwt';

const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'COACH', 'DIRECTOR'];

// Проверка clubId пользователя и клуба по subdomain
async function checkClubAccess(request: NextRequest, session: any) {
  // Если пользователь SUPER_ADMIN — разрешаем доступ ко всем клубам
  if (session.user.role === 'SUPER_ADMIN') return true;
  const host = request.headers.get('host') || '';
  const subdomain = getSubdomain(host);
  if (!subdomain) return false;
  const club = await getClubBySubdomain(subdomain);
  if (!club) return false;
  return session.user.clubId === club.id;
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const token = await getToken({ req: request });
  if (!token || !allowedRoles.includes(token.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // Если SUPER_ADMIN — разрешаем доступ без сессии и проверки клуба
  if (token.role === 'SUPER_ADMIN') {
    const teamId = params.id;
    if (!teamId) {
      return new Response(JSON.stringify({ error: "No teamId" }), { status: 400 });
    }
    const players = await db
      .select({
        id: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        middleName: player.middleName,
        number: player.number,
        position: player.position,
        strongFoot: player.strongFoot,
        dateOfBirth: player.dateOfBirth,
        academyJoinDate: player.academyJoinDate,
        nationality: player.nationality,
        imageUrl: player.imageUrl,
        status: player.status,
        birthCertificateNumber: player.birthCertificateNumber,
        pinCode: player.pinCode,
        telegramId: player.telegramId,
        language: player.language,
        createdAt: player.createdAt,
        updatedAt: player.updatedAt,
        teamId: player.teamId,
        clubId: team.clubId // alias
      })
      .from(player)
      .leftJoin(team, eq(player.teamId, team.id))
      .where(eq(player.teamId, teamId));
    return new Response(JSON.stringify(players), { status: 200 });
  }
  // Для остальных — старая логика
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const hasAccess = await checkClubAccess(request, session);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Нет доступа к этому клубу' }, { status: 403 });
  }
  const teamId = params.id;
  if (!teamId) {
    return new Response(JSON.stringify({ error: "No teamId" }), { status: 400 });
  }
  // Получаем игроков с clubId через join и alias
  const players = await db
    .select({
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      middleName: player.middleName,
      number: player.number,
      position: player.position,
      strongFoot: player.strongFoot,
      dateOfBirth: player.dateOfBirth,
      academyJoinDate: player.academyJoinDate,
      nationality: player.nationality,
      imageUrl: player.imageUrl,
      status: player.status,
      birthCertificateNumber: player.birthCertificateNumber,
      pinCode: player.pinCode,
      telegramId: player.telegramId,
      language: player.language,
      createdAt: player.createdAt,
      updatedAt: player.updatedAt,
      teamId: player.teamId,
      clubId: team.clubId // alias
    })
    .from(player)
    .leftJoin(team, eq(player.teamId, team.id))
    .where(eq(player.teamId, teamId));

  return new Response(JSON.stringify(players), { status: 200 });
}

function generateRandomPinCode(length = 6) {
  return Math.random().toString().slice(2, 2 + length);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const token = await getToken({ req });
  if (!token || !allowedRoles.includes(token.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const teamId = params.id;
  if (!teamId) {
    return new Response(JSON.stringify({ error: "No teamId" }), { status: 400 });
  }
  let data;
  try {
    data = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }
  // Проверяем обязательные поля
  const required = ["firstName", "lastName"];
  for (const field of required) {
    if (!data[field]) {
      return new Response(JSON.stringify({ error: `Missing required field: ${field}` }), { status: 400 });
    }
  }
  const id = crypto.randomUUID();
  const now = new Date();
  const pinCode = data.pinCode || generateRandomPinCode();
  const playerData = {
    ...data,
    id,
    teamId,
    pinCode,
    status: data.status ?? 'ready',
    createdAt: now,
    updatedAt: now,
  };
  try {
    await db.insert(player).values(playerData);
    return new Response(JSON.stringify({ player: playerData }), { status: 201 });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Failed to create player', details: String(e) }), { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const token = await getToken({ req });
  if (!token || !allowedRoles.includes(token.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const teamId = params.id;
  if (!teamId) {
    return new Response(JSON.stringify({ error: "No teamId" }), { status: 400 });
  }
  let data;
  try {
    data = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }
  const playerIds = Array.isArray(data.playerIds) ? data.playerIds : [];
  if (!playerIds.length) {
    return new Response(JSON.stringify({ error: "No playerIds provided" }), { status: 400 });
  }
  try {
    // Получаем все документы, чтобы удалить их из Object Storage
    const docs = await db.select().from(playerDocument).where(
      playerIds.length === 1 ? eq(playerDocument.playerId, playerIds[0]) : inArray(playerDocument.playerId, playerIds)
    );
    for (const doc of docs) {
      if (doc.url) {
        // url хранит ключ (путь) в бакете
        try {
          await deleteYandexFile(doc.url);
        } catch (e) {
          console.error('Ошибка при удалении файла из Object Storage:', doc.url, e);
        }
      }
    }
    // Удаляем аватары игроков из бакета, если есть imageUrl
    const playersToDelete = await db.select().from(player).where(
      playerIds.length === 1 ? eq(player.id, playerIds[0]) : inArray(player.id, playerIds)
    );
    for (const p of playersToDelete) {
      if (p.imageUrl) {
        try {
          // Преобразуем imageUrl в ключ бакета, если это ссылка на Yandex
          const bucketPrefix = 'https://storage.yandexcloud.net/' + process.env.YANDEX_STORAGE_BUCKET + '/';
          if (p.imageUrl.startsWith(bucketPrefix)) {
            const key = p.imageUrl.replace(bucketPrefix, '');
            await deleteYandexFile(key);
          }
        } catch (e) {
          console.error('Ошибка при удалении аватара игрока из Object Storage:', p.imageUrl, e);
        }
      }
    }
    // Каскадное удаление связанных записей
    await db.delete(morningSurveyResponse).where(
      playerIds.length === 1 ? eq(morningSurveyResponse.playerId, playerIds[0]) : inArray(morningSurveyResponse.playerId, playerIds)
    );
    await db.delete(playerDocument).where(
      playerIds.length === 1 ? eq(playerDocument.playerId, playerIds[0]) : inArray(playerDocument.playerId, playerIds)
    );
    await db.delete(playerMatchStat).where(
      playerIds.length === 1 ? eq(playerMatchStat.playerId, playerIds[0]) : inArray(playerMatchStat.playerId, playerIds)
    );
    await db.delete(playerAttendance).where(
      playerIds.length === 1 ? eq(playerAttendance.playerId, playerIds[0]) : inArray(playerAttendance.playerId, playerIds)
    );
    // Удаляем результаты фитнес-тестов игрока
    await db.delete(fitnessTestResult).where(
      playerIds.length === 1 ? eq(fitnessTestResult.playerId, playerIds[0]) : inArray(fitnessTestResult.playerId, playerIds)
    );
    // Удаляем самих игроков
    await db.delete(player).where(
      playerIds.length === 1 ? eq(player.id, playerIds[0]) : inArray(player.id, playerIds)
    );
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Failed to delete player(s)', details: String(e) }), { status: 500 });
  }
} 