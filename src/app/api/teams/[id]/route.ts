import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getTeamById, updateTeam, deleteTeam } from '@/services/team.service';


export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const token = await getToken({ req: request });
  if (!token || !token.clubId) {
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
  const result = await getTeamById(teamId, token.clubId);
  if (!result) {
    return new Response(JSON.stringify({ error: "Team not found" }), { status: 404 });
  }
  return new Response(JSON.stringify(result), { status: 200 });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const token = await getToken({ req: request });
  if (!token || !token.clubId) {
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
  const updated = await updateTeam(teamId, token.clubId, { timezone });
  if (!updated) {
    return new Response(JSON.stringify({ error: "Team not found" }), { status: 404 });
  }
  return new Response(JSON.stringify(updated), { status: 200 });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const token = await getToken({ req: request });
  if (!token || !token.clubId) {
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
  
  try {
    const body = await request.json();
    console.log('PUT /api/teams/[id] - Request body:', body);
    
    const { order } = body;
    if (order === undefined || typeof order !== 'number') {
      console.log('PUT /api/teams/[id] - Invalid order:', { order, type: typeof order });
      return new Response(JSON.stringify({ error: "No order provided or invalid order type" }), { status: 400 });
    }
    
    console.log('PUT /api/teams/[id] - Updating team order:', { teamId, order });
    const updated = await updateTeam(teamId, token.clubId, { order });
    if (!updated) {
      console.log('PUT /api/teams/[id] - Team not found:', teamId);
      return new Response(JSON.stringify({ error: "Team not found" }), { status: 404 });
    }
    
    console.log('PUT /api/teams/[id] - Team updated successfully:', updated);
    return new Response(JSON.stringify(updated), { status: 200 });
  } catch (error) {
    console.error('PUT /api/teams/[id] - Error:', error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const token = await getToken({ req: request });
  if (!token || !token.clubId) {
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
  const success = await deleteTeam(teamId, token.clubId);
  if (!success) {
    return new Response(JSON.stringify({ error: "Team not found" }), { status: 404 });
  }
  return new Response(JSON.stringify({ success: true }), { status: 200 });
} 