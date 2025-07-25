import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { player } from "@/db/schema";
import { team } from "@/db/schema/team";
import { eq, and } from "drizzle-orm";
import { getToken } from 'next-auth/jwt';


function toDateOrNull(val: any) {
  if (val === null || val === undefined || val === '') return null;
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
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'teams.read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const teamId = params.id;
  const playerId = params.playerId;
  if (!teamId || !playerId) {
    return new Response(JSON.stringify({ error: "teamId и playerId обязательны" }), { status: 400 });
  }
  const result = await db.select().from(player).where(and(eq(player.id, playerId), eq(player.teamId, teamId)));
  if (!result.length) {
    return new Response(JSON.stringify({ error: "Игрок не найден" }), { status: 404 });
  }
  // Получаем название команды
  const teamResult = await db.select().from(team).where(eq(team.id, result[0].teamId));
  const teamName = teamResult.length ? teamResult[0].name : null;
  return new Response(JSON.stringify({ player: result[0], teamName }), { status: 200 });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string, playerId: string } }) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'teams.update')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const teamId = params.id;
    const playerId = params.playerId;
    if (!teamId || !playerId) {
      return new Response(JSON.stringify({ error: "teamId и playerId обязательны" }), { status: 400 });
    }
    const body = await req.json();
    // Список разрешённых к обновлению полей
    const allowedFields = [
      "firstName", "lastName", "middleName", "number", "position", "strongFoot", "dateOfBirth", "academyJoinDate", "nationality", "imageUrl", "status", "birthCertificateNumber", "pinCode", "telegramId", "language", "teamId",
      "passportData", "insuranceNumber", "visaExpiryDate",
      "format1", "formation1", "positionIndex1", "format2", "formation2", "positionIndex2"
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
    updateData.visaExpiryDate = toDateOrNull(updateData.visaExpiryDate);
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
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'teams.update')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const teamId = params.id;
    const playerId = params.playerId;
    if (!teamId || !playerId) {
      return new Response(JSON.stringify({ error: "teamId и playerId обязательны" }), { status: 400 });
    }
    const body = await req.json();
    // Список разрешённых к обновлению полей
    const allowedFields = [
      "firstName", "lastName", "middleName", "number", "position", "strongFoot", "dateOfBirth", "academyJoinDate", "nationality", "imageUrl", "status", "birthCertificateNumber", "pinCode", "telegramId", "language", "teamId",
      "passportData", "insuranceNumber", "visaExpiryDate",
      "format1", "formation1", "positionIndex1", "format2", "formation2", "positionIndex2"
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
    updateData.visaExpiryDate = toDateOrNull(updateData.visaExpiryDate);
    updateData.number = toIntOrNull(updateData.number);
    updateData.updatedAt = new Date();
    // Удаляем из updateData все поля, которые равны undefined, null или ''
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined || updateData[key] === null || updateData[key] === '') {
        delete updateData[key];
      }
    });
    const result = await db.update(player)
      .set(updateData)
      .where(and(eq(player.id, playerId), eq(player.teamId, teamId)))
      .returning();
    if (!result.length) {
      return new Response(JSON.stringify({ error: "Игрок не найден" }), { status: 404 });
    }
    return new Response(JSON.stringify({ player: result[0] }), { status: 200 });
  } catch (error) {
    console.error('Player PATCH error:', error);
    return new Response(JSON.stringify({ error: "Ошибка при обновлении игрока", details: String(error) }), { status: 500 });
  }
} 