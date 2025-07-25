import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';
import { db } from "@/lib/db";
import { player } from "@/db/schema";
import { eq } from "drizzle-orm";
import { uploadFile, deleteFile, getFileUrl } from '@/lib/yandex-storage';
import { getToken } from 'next-auth/jwt';


export async function POST(req: NextRequest, { params }: { params: { id: string, playerId: string } }) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'teams.update')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const teamId = params.id;
  const playerId = params.playerId;
  const clubId = req.nextUrl.searchParams.get('clubId');
  if (!teamId || !playerId || !clubId) {
    return new Response(JSON.stringify({ error: "teamId, playerId, clubId required" }), { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) {
    return new Response(JSON.stringify({ error: "No file uploaded" }), { status: 400 });
  }

  // Получаем текущий imageUrl игрока
  const [existing] = await db.select().from(player).where(eq(player.id, playerId));
  if (existing?.imageUrl) {
    // Удаляем старый аватар
    const oldKey = existing.imageUrl.replace('https://storage.yandexcloud.net/' + process.env.YANDEX_STORAGE_BUCKET + '/', '');
    await deleteFile(oldKey);
  }

  // Сохраняем новый аватар
  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `${Date.now()}.${ext}`;
  const key = `${clubId}/${teamId}/${playerId}/avatar/${fileName}`;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const url = await uploadFile(buffer, key, file.type);

  // Обновляем imageUrl игрока
  await db.update(player).set({ imageUrl: url }).where(eq(player.id, playerId));

  return new Response(JSON.stringify({ imageUrl: url }), { status: 200 });
} 