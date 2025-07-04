import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { player, team } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const pinCode = req.nextUrl.searchParams.get('pinCode');
  const tenantId = req.nextUrl.searchParams.get('tenantId');
  if (!pinCode || !tenantId) {
    return NextResponse.json({ error: 'Missing pinCode or tenantId' }, { status: 400 });
  }
  const [foundPlayer]: any = await db.select({
    id: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    teamId: player.teamId,
    language: player.language,
  })
    .from(player)
    .leftJoin(team, eq(player.teamId, team.id))
    .where(and(eq(player.pinCode, pinCode), eq(team.clubId, tenantId)))
    .limit(1);
  if (!foundPlayer) {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 });
  }
  return NextResponse.json({ player: foundPlayer });
} 