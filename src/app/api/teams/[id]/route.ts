import { NextRequest, NextResponse } from 'next/server';
import { db } from "@/lib/db";
import { team } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getToken } from 'next-auth/jwt';

const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'COACH', 'DIRECTOR'];

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const token = await getToken({ req: request });
  if (!token || !allowedRoles.includes(token.role as string)) {
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
  if (!token || !allowedRoles.includes(token.role as string)) {
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