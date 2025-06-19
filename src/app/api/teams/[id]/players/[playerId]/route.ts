import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { player } from "@/db/schema";
import { eq, and } from "drizzle-orm";

function toDateOrNull(val: any) {
  if (val === null || val === undefined) return null;
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
    return null;
  }
  return null;
}

function toIntOrNull(val: any) {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

export async function GET(req: NextRequest, { params }: { params: { id: string, playerId: string } }) {
  const teamId = params.id;
  const playerId = params.playerId;
  if (!teamId || !playerId) {
    return new Response(JSON.stringify({ error: "teamId и playerId обязательны" }), { status: 400 });
  }
  const result = await db.select().from(player).where(and(eq(player.id, playerId), eq(player.teamId, teamId)));
  if (!result.length) {
    return new Response(JSON.stringify({ error: "Игрок не найден" }), { status: 404 });
  }
  return new Response(JSON.stringify({ player: result[0], teams: [] }), { status: 200 });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string, playerId: string } }) {
  try {
    const teamId = params.id;
    const playerId = params.playerId;
    if (!teamId || !playerId) {
      return new Response(JSON.stringify({ error: "teamId и playerId обязательны" }), { status: 400 });
    }
    const body = await req.json();
    // Список разрешённых к обновлению полей
    const allowedFields = [
      "firstName", "lastName", "middleName", "number", "position", "strongFoot", "dateOfBirth", "academyJoinDate", "nationality", "imageUrl", "status", "birthCertificateNumber", "pinCode", "telegramId", "language"
    ];
    const updateData: Record<string, any> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updateData[key] = body[key];
      }
    }
    // Преобразуем даты к типу Date, если они есть и это строка
    updateData.dateOfBirth = toDateOrNull(updateData.dateOfBirth);
    updateData.academyJoinDate = toDateOrNull(updateData.academyJoinDate);
    updateData.number = toIntOrNull(updateData.number);
    updateData.updatedAt = new Date();
    const result = await db.update(player)
      .set(updateData)
      .where(and(eq(player.id, playerId), eq(player.teamId, teamId)))
      .returning();
    if (!result.length) {
      return new Response(JSON.stringify({ error: "Игрок не найден" }), { status: 404 });
    }
    return new Response(JSON.stringify({ player: result[0] }), { status: 200 });
  } catch (error) {
    console.error('Player update error:', error);
    return new Response(JSON.stringify({ error: "Ошибка при обновлении игрока", details: String(error) }), { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string, playerId: string } }) {
  try {
    const teamId = params.id;
    const playerId = params.playerId;
    if (!teamId || !playerId) {
      return new Response(JSON.stringify({ error: "teamId и playerId обязательны" }), { status: 400 });
    }
    const body = await req.json();
    if (!body.status) {
      return new Response(JSON.stringify({ error: "Поле status обязательно" }), { status: 400 });
    }
    const result = await db.update(player)
      .set({ status: body.status, updatedAt: new Date() })
      .where(and(eq(player.id, playerId), eq(player.teamId, teamId)))
      .returning();
    if (!result.length) {
      return new Response(JSON.stringify({ error: "Игрок не найден" }), { status: 404 });
    }
    return new Response(JSON.stringify({ player: result[0] }), { status: 200 });
  } catch (error) {
    console.error('Player status PATCH error:', error);
    return new Response(JSON.stringify({ error: "Ошибка при обновлении статуса игрока", details: String(error) }), { status: 500 });
  }
} 