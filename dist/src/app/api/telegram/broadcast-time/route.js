import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { club } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
// GET: получить время рассылки для клуба
export async function GET(req) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const clubId = session.user.clubId;
    if (!clubId) {
        return NextResponse.json({ error: 'No clubId' }, { status: 400 });
    }
    const [clubRow] = await db.select().from(club).where(eq(club.id, clubId));
    return NextResponse.json({ time: (clubRow === null || clubRow === void 0 ? void 0 : clubRow.broadcastTime) || '08:00' });
}
// POST: сохранить время рассылки для клуба
export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const clubId = session.user.clubId;
        if (!clubId) {
            return NextResponse.json({ error: 'No clubId in session', session }, { status: 400 });
        }
        const { time } = await req.json();
        if (!time || typeof time !== 'string') {
            return NextResponse.json({ error: 'Invalid time value', time }, { status: 400 });
        }
        const [updated] = await db.update(club).set({ broadcastTime: time }).where(eq(club.id, clubId)).returning();
        return NextResponse.json({ message: 'Время рассылки сохранено!', updated });
    }
    catch (e) {
        return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
    }
}
