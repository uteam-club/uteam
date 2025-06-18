var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { NextResponse } from "next/server";
import { db } from '@/lib/db';
import { morningSurveyResponse, player } from '@/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
export const dynamic = 'force-dynamic';
export const revalidate = 0;
// GET /api/surveys/morning
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const whereArr = [];
        if (startDate)
            whereArr.push(gte(morningSurveyResponse.createdAt, new Date(startDate)));
        if (endDate)
            whereArr.push(lte(morningSurveyResponse.createdAt, new Date(endDate)));
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
    }
    catch (error) {
        console.error("Error fetching survey responses:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
// POST /api/surveys/morning
export async function POST(request) {
    try {
        const body = await request.json();
        const { playerId } = body, surveyData = __rest(body, ["playerId"]);
        const [response] = await db.insert(morningSurveyResponse).values(Object.assign({ playerId }, surveyData)).returning();
        return NextResponse.json(response);
    }
    catch (error) {
        console.error("Error creating survey response:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
