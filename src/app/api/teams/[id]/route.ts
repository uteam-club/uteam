import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { team } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
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