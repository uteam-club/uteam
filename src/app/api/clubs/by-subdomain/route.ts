import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';
import { getClubBySubdomain } from '@/services/user.service';
import { getToken } from 'next-auth/jwt';


export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'clubs.read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
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