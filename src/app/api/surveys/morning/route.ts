import { NextResponse } from "next/server";
import { db } from '@/lib/db';
import { morningSurveyResponse, player } from '@/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/surveys/morning
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const whereArr = [];
    if (startDate) whereArr.push(gte(morningSurveyResponse.createdAt, new Date(startDate)));
    if (endDate) whereArr.push(lte(morningSurveyResponse.createdAt, new Date(endDate)));
    const responses = await db.select({
      id: morningSurveyResponse.id,
      createdAt: morningSurveyResponse.createdAt,
      playerId: morningSurveyResponse.playerId,
      player: {
        id: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
      }
    })
      .from(morningSurveyResponse)
      .leftJoin(player, eq(morningSurveyResponse.playerId, player.id))
      .where(whereArr.length ? and(...whereArr) : undefined)
      .orderBy(desc(morningSurveyResponse.createdAt));
    return NextResponse.json(responses);
  } catch (error) {
    console.error("Error fetching survey responses:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/surveys/morning
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { playerId, ...surveyData } = body;
    const [response] = await db.insert(morningSurveyResponse).values({
      playerId,
      ...surveyData,
    }).returning();
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error creating survey response:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 