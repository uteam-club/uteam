import { NextResponse } from 'next/server';
import { getClubBySubdomain } from '@/services/club.service';
export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const subdomain = searchParams.get('subdomain');
    if (!subdomain) {
        return NextResponse.json({ error: 'subdomain required' }, { status: 400 });
    }
    const club = await getClubBySubdomain(subdomain);
    if (!club) {
        return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    return NextResponse.json(club);
}
