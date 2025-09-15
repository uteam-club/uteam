import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { gpsProfile } from "@/db/schema/gpsProfile";
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

// Профиль принадлежит клубу?
export async function ensureProfileOwned(profileId: string, clubId: string) {
  const row = await db.select().from(gpsProfile)
    .where(and(eq(gpsProfile.id, profileId), eq(gpsProfile.clubId, clubId)))
    .limit(1);
  if (!row.length) throw new OwnershipError("Profile not found in this club");
  return row[0];
}

// Отчёт принадлежит клубу?
export async function ensureReportOwned(reportId: string, clubId: string) {
  const row = await db.select().from(gpsReport)
    .where(and(eq(gpsReport.id, reportId), eq(gpsReport.clubId, clubId)))
    .limit(1);
  if (!row.length) throw new OwnershipError("Report not found in this club");
  return row[0];
}

// Маппинг -> профиль -> клуб
export async function ensureMappingOwned(mappingId: string, clubId: string) {
  const rows = await db.select({
    id: gpsColumnMapping.id,
    gpsProfileId: gpsColumnMapping.gpsProfileId,
  }).from(gpsColumnMapping)
    .where(eq(gpsColumnMapping.id, mappingId))
    .limit(1);
  if (!rows.length) throw new OwnershipError("Mapping not found");
  await ensureProfileOwned(rows[0].gpsProfileId, clubId);
  return rows[0];
}

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
