import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';
import { db } from "@/lib/db";
import { team } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getToken } from 'next-auth/jwt';


export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const token = await getToken({ req: request });
  if (!token) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'teams.read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const teamId = params.id;
  if (!teamId) {
    return new Response(JSON.stringify({ error: "No teamId" }), { status: 400 });
  }
  const result = await db.select().from(team).where(eq(team.id, teamId));
  if (!result.length) {
    return new Response(JSON.stringify({ error: "Team not found" }), { status: 404 });
  }
  return new Response(JSON.stringify(result[0]), { status: 200 });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const token = await getToken({ req: request });
  if (!token) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'teams.update')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const teamId = params.id;
  if (!teamId) {
    return new Response(JSON.stringify({ error: "No teamId" }), { status: 400 });
  }
  const body = await request.json();
  const { timezone } = body;
  if (!timezone || typeof timezone !== 'string') {
    return new Response(JSON.stringify({ error: "No timezone provided" }), { status: 400 });
  }
  const [updated] = await db.update(team)
    .set({ timezone })
    .where(eq(team.id, teamId))
    .returning();
  if (!updated) {
    return new Response(JSON.stringify({ error: "Team not found" }), { status: 404 });
  }
  return new Response(JSON.stringify(updated), { status: 200 });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const token = await getToken({ req: request });
  if (!token) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'teams.delete')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const teamId = params.id;
  if (!teamId) {
    return new Response(JSON.stringify({ error: "No teamId" }), { status: 400 });
  }
  // Можно добавить проверку, что команда принадлежит клубу пользователя
  await db.delete(team).where(eq(team.id, teamId));
  return new Response(JSON.stringify({ success: true }), { status: 200 });
} 