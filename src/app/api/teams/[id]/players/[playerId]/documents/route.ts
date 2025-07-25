import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from "next/server";
import { db } from '@/lib/db';
import { playerDocument } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { uploadFile, deleteFile, getFileUrl } from '@/lib/yandex-storage';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { uuidv4 } from '@/lib/uuid-wrapper';
import { getSubdomain } from '@/lib/utils';
import { getClubBySubdomain } from '@/services/user.service';
import { getToken } from 'next-auth/jwt';

export const dynamic = 'force-dynamic';


// Проверка clubId пользователя и клуба по subdomain
async function checkClubAccess(request: NextRequest, session: any) {
  const host = request.headers.get('host') || '';
  const subdomain = getSubdomain(host);
  if (!subdomain) return false;
  const club = await getClubBySubdomain(subdomain);
  if (!club) return false;
  return session.user.clubId === club.id;
}

export async function GET(req: NextRequest, { params }: { params: { id: string, playerId: string } }) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'documents.read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { playerId } = params;
  if (!playerId) {
    return new Response(JSON.stringify({ error: 'playerId is required' }), { status: 400 });
  }
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    const hasAccess = await checkClubAccess(req, session);
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: 'Нет доступа к этому клубу' }), { status: 403 });
    }
    const documents = await db.select().from(playerDocument).where(eq(playerDocument.playerId, playerId));
    return new Response(JSON.stringify(documents), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Failed to fetch documents', details: String(e) }), { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string, playerId: string } }) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'documents.update')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const teamId = params.id;
    const playerId = params.playerId;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    const clubId = session.user.clubId;
    const uploadedById = session.user.id;
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string | null;
    const name = formData.get('name') as string | null || (file ? file.name : '');
    if (!file || !type) {
      return new Response(JSON.stringify({ error: 'No file or type provided' }), { status: 400 });
    }
    const ext = file.name.split('.').pop() || 'dat';
    const fileName = `${Date.now()}-${name}`;
    const key = `${clubId}/${teamId}/${playerId}/documents/${fileName}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const url = await uploadFile(buffer, key, file.type);
    const publicUrl = getFileUrl(key);
    const size = file.size;
    const now = new Date();
    const id = uuidv4();
    const [doc] = await db.insert(playerDocument).values({
      id,
      name,
      type,
      url: key,
      publicUrl,
      size,
      createdAt: now,
      updatedAt: now,
      playerId,
      clubId,
      uploadedById,
    }).returning();
    return new Response(JSON.stringify(doc), { status: 201 });
  } catch (error) {
    console.error('Document upload error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: String(error) }), { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string, playerId: string } }) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'documents.update')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const { playerId } = params;
  const { documentId } = await req.json();
  if (!documentId) {
    return new Response(JSON.stringify({ error: 'No documentId provided' }), { status: 400 });
  }
  // Получаем документ
  const [doc] = await db.select().from(playerDocument).where(eq(playerDocument.id, documentId));
  if (!doc) {
    return new Response(JSON.stringify({ error: 'Document not found' }), { status: 404 });
  }
  // Удаляем файл из Object Storage
  await deleteFile(doc.url);
  // Удаляем запись из БД
  await db.delete(playerDocument).where(eq(playerDocument.id, documentId));
  return new Response(JSON.stringify({ success: true }), { status: 200 });
} 