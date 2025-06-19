import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { player, playerDocument, playerMatchStat, playerAttendance } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { deleteFile as deleteYandexFile } from "@/lib/yandex-storage";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const teamId = params.id;
  if (!teamId) {
    return new Response(JSON.stringify({ error: "No teamId" }), { status: 400 });
  }
  const players = await db.select().from(player).where(eq(player.teamId, teamId));
  return new Response(JSON.stringify(players), { status: 200 });
}

function generateRandomPinCode(length = 6) {
  return Math.random().toString().slice(2, 2 + length);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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
    // Каскадное удаление связанных записей
    await db.delete(playerDocument).where(
      playerIds.length === 1 ? eq(playerDocument.playerId, playerIds[0]) : inArray(playerDocument.playerId, playerIds)
    );
    await db.delete(playerMatchStat).where(
      playerIds.length === 1 ? eq(playerMatchStat.playerId, playerIds[0]) : inArray(playerMatchStat.playerId, playerIds)
    );
    await db.delete(playerAttendance).where(
      playerIds.length === 1 ? eq(playerAttendance.playerId, playerIds[0]) : inArray(playerAttendance.playerId, playerIds)
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