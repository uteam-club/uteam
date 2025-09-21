import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { gpsReport } from "@/db/schema/gpsReport";
import { gpsColumnMapping } from "@/db/schema/gpsColumnMapping";
import { team } from "@/db/schema/team";
import { training } from "@/db/schema/training";
import { match } from "@/db/schema/match";

export class OwnershipError extends Error {
  code = "FORBIDDEN_OR_NOT_FOUND";
  status = 404;
  constructor(message = "Not found or not owned by this club") { super(message); }
}

// TODO: Profile ownership check will be implemented later

// Отчёт принадлежит клубу?
export async function ensureReportOwned(reportId: string, clubId: string) {
  const row = await db.select().from(gpsReport)
    .where(and(eq(gpsReport.id, reportId), eq(gpsReport.clubId, clubId)))
    .limit(1);
  if (!row.length) throw new OwnershipError("Report not found in this club");
  return row[0];
}

// TODO: Mapping ownership check will be implemented later

export async function ensureTeamOwned(teamId: string, clubId: string) {
  const rows = await db.select({ id: team.id }).from(team)
    .where(and(eq(team.id, teamId), eq(team.clubId, clubId)))
    .limit(1);
  if (!rows.length) throw new OwnershipError("Team not found in this club");
  return rows[0];
}

export async function ensureTrainingOwned(trainingId: string, clubId: string) {
  const rows = await db.select({ id: training.id }).from(training)
    .where(and(eq(training.id, trainingId), eq(training.clubId, clubId)))
    .limit(1);
  if (!rows.length) throw new OwnershipError("Training not found in this club");
  return rows[0];
}

export async function ensureMatchOwned(matchId: string, clubId: string) {
  const rows = await db.select({ id: match.id }).from(match)
    .where(and(eq(match.id, matchId), eq(match.clubId, clubId)))
    .limit(1);
  if (!rows.length) throw new OwnershipError("Match not found in this club");
  return rows[0];
}
