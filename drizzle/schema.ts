import { pgTable, unique, pgEnum, uuid, varchar, text, timestamp, doublePrecision, index, jsonb, boolean, integer, uniqueIndex, foreignKey, numeric, bigint, time } from "drizzle-orm/pg-core"
  import { sql } from "drizzle-orm"

export const attendanceStatus = pgEnum("AttendanceStatus", ['OTHER', 'EDUCATION', 'SICK', 'REHAB', 'TRAINED'])
export const competitionType = pgEnum("CompetitionType", ['CUP', 'LEAGUE', 'FRIENDLY'])
export const documentType = pgEnum("DocumentType", ['OTHER', 'MEDICAL_INSURANCE', 'BIRTH_CERTIFICATE', 'PASSPORT'])
export const mediaType = pgEnum("MediaType", ['OTHER', 'DOCUMENT', 'VIDEO', 'IMAGE'])
export const role = pgEnum("Role", ['DIRECTOR', 'DOCTOR', 'SCOUT', 'MEMBER', 'COACH', 'ADMIN', 'SUPER_ADMIN'])
export const trainingStatus = pgEnum("TrainingStatus", ['CANCELED', 'COMPLETED', 'SCHEDULED'])
export const ingestStatus = pgEnum("ingest_status", ['processed', 'error', 'needs_profile', 'missing_file', 'ready', 'new'])


export const club = pgTable("Club", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	name: varchar("name", { length: 255 }).notNull(),
	subdomain: varchar("subdomain", { length: 255 }).notNull(),
	logoUrl: text("logoUrl"),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	broadcastTime: varchar("broadcastTime", { length: 10 }),
},
(table) => {
	return {
		clubSubdomainUnique: unique("Club_subdomain_unique").on(table.subdomain),
	}
});

export const exercise = pgTable("Exercise", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	title: varchar("title", { length: 255 }).notNull(),
	description: text("description").notNull(),
	authorId: uuid("authorId").notNull(),
	clubId: uuid("clubId").notNull(),
	categoryId: uuid("categoryId").notNull(),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	length: doublePrecision("length"),
	width: doublePrecision("width"),
});

export const exerciseCategory = pgTable("ExerciseCategory", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	name: varchar("name", { length: 255 }).notNull(),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	clubId: uuid("clubId").notNull(),
});

export const exerciseTag = pgTable("ExerciseTag", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	name: varchar("name", { length: 255 }).notNull(),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	clubId: uuid("clubId").notNull(),
	exerciseCategoryId: uuid("exerciseCategoryId").notNull(),
});

export const gpsCanonicalMetric = pgTable("GpsCanonicalMetric", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	code: varchar("code", { length: 100 }).notNull(),
	name: varchar("name", { length: 255 }).notNull(),
	description: text("description"),
	category: varchar("category", { length: 100 }),
	dimension: varchar("dimension", { length: 100 }).notNull(),
	canonicalUnit: varchar("canonicalUnit", { length: 50 }).notNull(),
	supportedUnits: jsonb("supportedUnits"),
	isDerived: boolean("isDerived").default(false).notNull(),
	formula: text("formula"),
	metadata: jsonb("metadata"),
	isActive: boolean("isActive").default(true).notNull(),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		categoryIdx: index("GpsCanonicalMetric_category_idx").on(table.category),
		dimensionIdx: index("GpsCanonicalMetric_dimension_idx").on(table.dimension),
		isActiveIdx: index("GpsCanonicalMetric_isActive_idx").on(table.isActive),
		gpsCanonicalMetricCodeUnique: unique("GpsCanonicalMetric_code_unique").on(table.code),
	}
});

export const gpsColumnMapping = pgTable("GpsColumnMapping", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	gpsProfileId: uuid("gpsProfileId").notNull(),
	sourceColumn: varchar("sourceColumn", { length: 255 }).notNull(),
	customName: varchar("customName", { length: 255 }).notNull(),
	canonicalMetric: varchar("canonicalMetric", { length: 100 }).notNull(),
	isVisible: boolean("isVisible").default(true).notNull(),
	displayOrder: integer("displayOrder").default(0).notNull(),
	description: text("description"),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	displayUnit: varchar("displayUnit", { length: 50 }),
	sourceUnit: varchar("sourceUnit", { length: 50 }),
	clubId: uuid("clubId").default(sql`'00000000-0000-0000-0000-000000000000'`).notNull(),
	teamId: uuid("teamId").default(sql`'00000000-0000-0000-0000-000000000000'`).notNull(),
},
(table) => {
	return {
		clubIdIdx: index("GpsColumnMapping_clubId_idx").on(table.clubId),
		teamIdIdx: index("GpsColumnMapping_teamId_idx").on(table.teamId),
	}
});

export const gpsDataChangeLog = pgTable("GpsDataChangeLog", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	reportDataId: uuid("reportDataId").notNull(),
	reportId: uuid("reportId").notNull(),
	playerId: uuid("playerId").notNull(),
	clubId: uuid("clubId").notNull(),
	fieldName: varchar("fieldName", { length: 100 }).notNull(),
	fieldLabel: varchar("fieldLabel", { length: 255 }).notNull(),
	oldValue: jsonb("oldValue"),
	newValue: jsonb("newValue").notNull(),
	changedById: uuid("changedById").notNull(),
	changedByName: varchar("changedByName", { length: 255 }).notNull(),
	changedAt: timestamp("changedAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	changeReason: text("changeReason"),
	changeType: varchar("changeType", { length: 50 }).default('manual').notNull(),
});

export const gpsDataPermissions = pgTable("GpsDataPermissions", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	userId: uuid("userId").notNull(),
	clubId: uuid("clubId").notNull(),
	teamId: uuid("teamId"),
	canView: boolean("canView").default(false).notNull(),
	canEdit: boolean("canEdit").default(false).notNull(),
	canDelete: boolean("canDelete").default(false).notNull(),
	canExport: boolean("canExport").default(false).notNull(),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const gpsPlayerMapping = pgTable("GpsPlayerMapping", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	gpsReportId: uuid("gpsReportId").notNull(),
	playerId: uuid("playerId"),
	rowIndex: integer("rowIndex").notNull(),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	isManual: boolean("isManual").default(false).notNull(),
	similarity: integer("similarity"),
},
(table) => {
	return {
		gpsPlayerMappingReportRowUnique: uniqueIndex("gps_player_mapping_report_row_unique").on(table.gpsReportId, table.rowIndex),
	}
});

export const gpsProfile = pgTable("GpsProfile", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	name: varchar("name", { length: 255 }).notNull(),
	description: text("description"),
	gpsSystem: varchar("gpsSystem", { length: 100 }).notNull(),
	isActive: boolean("isActive").default(true).notNull(),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	clubId: uuid("clubId").notNull(),
});

export const gpsProfileColumn = pgTable("GpsProfileColumn", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	profileId: uuid("profileId").notNull().references(() => gpsVisualizationProfile.id, { onDelete: "cascade" } ),
	canonicalMetricId: uuid("canonicalMetricId").notNull().references(() => gpsCanonicalMetric.id, { onDelete: "cascade" } ),
	displayName: varchar("displayName", { length: 255 }).notNull(),
	displayUnit: varchar("displayUnit", { length: 50 }).notNull(),
	displayOrder: integer("displayOrder").notNull(),
	isVisible: boolean("isVisible").default(true).notNull(),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const gpsProfileTeam = pgTable("GpsProfileTeam", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	profileId: uuid("profileId").notNull(),
	teamId: uuid("teamId").notNull(),
	clubId: uuid("clubId").notNull(),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const gpsReport = pgTable("GpsReport", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	name: varchar("name", { length: 255 }).notNull(),
	fileName: varchar("fileName", { length: 255 }).notNull(),
	fileUrl: text("fileUrl").notNull(),
	gpsSystem: varchar("gpsSystem", { length: 100 }).notNull(),
	eventType: varchar("eventType", { length: 50 }).notNull(),
	eventId: uuid("eventId").notNull(),
	profileId: uuid("profileId"),
	rawData: jsonb("rawData"),
	processedData: jsonb("processedData"),
	metadata: jsonb("metadata"),
	isProcessed: boolean("isProcessed").default(false).notNull(),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	clubId: uuid("clubId").notNull(),
	uploadedById: uuid("uploadedById").notNull(),
	teamId: uuid("teamId").notNull(),
	ingestStatus: varchar("ingestStatus", { length: 50 }).default('pending').notNull(),
	ingestError: text("ingestError"),
	filePath: text("filePath"),
	profileSnapshot: jsonb("profileSnapshot"),
	canonVersion: text("canonVersion"),
	importMeta: jsonb("importMeta"),
	fileSize: integer("fileSize"),
	gpsProfileId: uuid("gpsProfileId"),
	trainingId: uuid("trainingId"),
	matchId: uuid("matchId"),
	status: varchar("status", { length: 50 }).default('uploaded').notNull(),
	processedAt: timestamp("processedAt", { withTimezone: true, mode: 'string' }),
	errorMessage: text("errorMessage"),
	playersCount: integer("playersCount").default(0),
	hasEdits: boolean("hasEdits").default(false),
});

export const gpsReportData = pgTable("GpsReportData", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	gpsReportId: uuid("gpsReportId").notNull(),
	playerId: uuid("playerId").notNull(),
	canonicalMetric: varchar("canonicalMetric", { length: 100 }).notNull(),
	value: text("value").notNull(),
	unit: varchar("unit", { length: 50 }).notNull(),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const gpsUnit = pgTable("GpsUnit", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	code: varchar("code", { length: 50 }).notNull(),
	name: varchar("name", { length: 100 }).notNull(),
	dimension: varchar("dimension", { length: 100 }).notNull(),
	conversionFactor: numeric("conversionFactor", { precision: 10, scale:  6 }).notNull(),
	isCanonical: boolean("isCanonical").default(false).notNull(),
	isActive: boolean("isActive").default(true).notNull(),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		dimensionIdx: index("GpsUnit_dimension_idx").on(table.dimension),
		isActiveIdx: index("GpsUnit_isActive_idx").on(table.isActive),
		gpsUnitCodeUnique: unique("GpsUnit_code_unique").on(table.code),
	}
});

export const gpsVisualizationProfile = pgTable("GpsVisualizationProfile", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	name: varchar("name", { length: 255 }).notNull(),
	description: text("description"),
	clubId: uuid("clubId").notNull(),
	createdById: uuid("createdById").notNull(),
	isActive: boolean("isActive").default(true).notNull(),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const match = pgTable("Match", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	competitionType: varchar("competitionType", { length: 50 }).notNull(),
	date: varchar("date", { length: 10 }).notNull(),
	time: varchar("time", { length: 5 }).notNull(),
	isHome: boolean("isHome").notNull(),
	teamId: uuid("teamId").notNull(),
	opponentName: varchar("opponentName", { length: 255 }).notNull(),
	teamGoals: integer("teamGoals").default(0),
	opponentGoals: integer("opponentGoals").default(0),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	clubId: uuid("clubId").notNull(),
	formation: varchar("formation", { length: 255 }),
	gameFormat: varchar("gameFormat", { length: 255 }),
	markerColor: varchar("markerColor", { length: 255 }),
	notes: text("notes"),
	playerPositions: text("playerPositions"),
	positionAssignments: text("positionAssignments"),
	status: varchar("status", { length: 20 }).default('SCHEDULED').notNull(),
});

export const mediaItem = pgTable("MediaItem", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	name: varchar("name", { length: 255 }).notNull(),
	type: varchar("type", { length: 50 }).notNull(),
	url: text("url").notNull(),
	size: integer("size").notNull(),
	description: text("description"),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	clubId: uuid("clubId").notNull(),
	eventId: uuid("eventId"),
	uploadedById: uuid("uploadedById").notNull(),
	exerciseId: uuid("exerciseId"),
	publicUrl: text("publicUrl"),
	thumbnailUrl: text("thumbnailUrl"),
	previewUrl: text("previewUrl"),
});

export const morningSurveyResponse = pgTable("MorningSurveyResponse", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	playerId: uuid("playerId").notNull(),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	readAt: timestamp("readAt", { withTimezone: true, mode: 'string' }),
	completedAt: timestamp("completedAt", { withTimezone: true, mode: 'string' }),
	mood: integer("mood").notNull(),
	muscleCondition: integer("muscleCondition").notNull(),
	recovery: integer("recovery").notNull(),
	sleepDuration: doublePrecision("sleepDuration").notNull(),
	sleepQuality: integer("sleepQuality").notNull(),
	surveyId: uuid("surveyId").notNull(),
	tenantId: uuid("tenantId").notNull(),
});

export const muscleArea = pgTable("MuscleArea", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	number: integer("number").notNull(),
	name: varchar("name", { length: 255 }).notNull(),
	view: varchar("view", { length: 50 }).notNull(),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const painArea = pgTable("PainArea", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	surveyId: uuid("surveyId").notNull(),
	areaName: varchar("areaName", { length: 255 }).notNull(),
	painLevel: integer("painLevel").notNull(),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const permission = pgTable("Permission", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	code: varchar("code", { length: 64 }).notNull(),
	description: text("description"),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		permissionCodeUnique: unique("Permission_code_unique").on(table.code),
	}
});

export const player = pgTable("Player", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	firstName: varchar("firstName", { length: 255 }).notNull(),
	lastName: varchar("lastName", { length: 255 }).notNull(),
	middleName: varchar("middleName", { length: 255 }),
	number: integer("number"),
	position: varchar("position", { length: 255 }),
	strongFoot: varchar("strongFoot", { length: 255 }),
	dateOfBirth: timestamp("dateOfBirth", { withTimezone: true, mode: 'string' }),
	academyJoinDate: timestamp("academyJoinDate", { withTimezone: true, mode: 'string' }),
	nationality: varchar("nationality", { length: 255 }),
	imageUrl: text("imageUrl"),
	status: varchar("status", { length: 255 }),
	birthCertificateNumber: varchar("birthCertificateNumber", { length: 255 }),
	pinCode: varchar("pinCode", { length: 255 }).notNull(),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	teamId: uuid("teamId").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	telegramId: bigint("telegramId", { mode: "number" }),
	language: varchar("language", { length: 10 }),
	format1: varchar("format1", { length: 32 }),
	formation1: varchar("formation1", { length: 32 }),
	positionIndex1: integer("positionIndex1"),
	format2: varchar("format2", { length: 32 }),
	formation2: varchar("formation2", { length: 32 }),
	positionIndex2: integer("positionIndex2"),
	contractStartDate: timestamp("contractStartDate", { withTimezone: true, mode: 'string' }),
	contractEndDate: timestamp("contractEndDate", { withTimezone: true, mode: 'string' }),
	passportData: varchar("passportData", { length: 255 }),
	insuranceNumber: varchar("insuranceNumber", { length: 255 }),
	visaExpiryDate: timestamp("visaExpiryDate", { withTimezone: true, mode: 'string' }),
},
(table) => {
	return {
		playerTelegramIdUnique: unique("Player_telegramId_unique").on(table.telegramId),
	}
});

export const playerAttendance = pgTable("PlayerAttendance", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	playerId: uuid("playerId").notNull(),
	trainingId: uuid("trainingId").notNull(),
	status: varchar("status", { length: 20 }).default('TRAINED').notNull(),
	comment: text("comment"),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const playerDocument = pgTable("PlayerDocument", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	name: varchar("name", { length: 255 }).notNull(),
	type: varchar("type", { length: 50 }).notNull(),
	url: text("url").notNull(),
	publicUrl: text("publicUrl"),
	size: integer("size").notNull(),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	playerId: uuid("playerId").notNull(),
	clubId: uuid("clubId").notNull(),
	uploadedById: uuid("uploadedById").notNull(),
});

export const playerMatchStat = pgTable("PlayerMatchStat", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	matchId: uuid("matchId").notNull(),
	playerId: uuid("playerId").notNull(),
	isStarter: boolean("isStarter").default(false).notNull(),
	minutesPlayed: integer("minutesPlayed").default(0).notNull(),
	goals: integer("goals").default(0).notNull(),
	assists: integer("assists").default(0).notNull(),
	yellowCards: integer("yellowCards").default(0).notNull(),
	redCards: integer("redCards").default(0).notNull(),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const rpeSchedule = pgTable("RPESchedule", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	trainingId: uuid("trainingId").notNull(),
	teamId: uuid("teamId").notNull(),
	scheduledTime: time("scheduledTime").notNull(),
	status: varchar("status", { length: 20 }).default('scheduled').notNull(),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	sentAt: timestamp("sentAt", { withTimezone: true, mode: 'string' }),
	createdById: uuid("createdById").notNull(),
	recipientsConfig: text("recipientsConfig"),
});

export const rpeSurveyResponse = pgTable("RPESurveyResponse", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	playerId: uuid("playerId").notNull(),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	readAt: timestamp("readAt", { withTimezone: true, mode: 'string' }),
	completedAt: timestamp("completedAt", { withTimezone: true, mode: 'string' }),
	rpeScore: integer("rpeScore").notNull(),
	surveyId: uuid("surveyId").notNull(),
	tenantId: uuid("tenantId").notNull(),
	durationMinutes: integer("durationMinutes"),
	trainingId: uuid("trainingId"),
});

export const rolePermission = pgTable("RolePermission", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	role: role("role").notNull(),
	permissionId: uuid("permissionId").notNull().references(() => permission.id),
	allowed: boolean("allowed").default(true).notNull(),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const survey = pgTable("Survey", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenantId").notNull(),
	type: varchar("type", { length: 50 }).notNull(),
	isActive: boolean("isActive").default(true).notNull(),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const surveySchedule = pgTable("SurveySchedule", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	teamId: uuid("teamId").notNull(),
	enabled: boolean("enabled").default(true).notNull(),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).defaultNow(),
	sendTime: varchar("sendTime", { length: 8 }).default('08:00').notNull(),
	surveyType: varchar("surveyType", { length: 32 }).default('morning').notNull(),
	recipientsConfig: text("recipientsConfig"),
});

export const team = pgTable("Team", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	name: varchar("name", { length: 255 }).notNull(),
	description: text("description"),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	clubId: uuid("clubId").notNull(),
	order: integer("order").default(999).notNull(),
	teamType: varchar("teamType", { length: 16 }).default('academy').notNull(),
	timezone: varchar("timezone", { length: 64 }).default('Europe/Moscow').notNull(),
});

export const teamCoach = pgTable("TeamCoach", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	teamId: uuid("teamId").notNull(),
	userId: uuid("userId").notNull(),
	role: varchar("role", { length: 255 }),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const training = pgTable("Training", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	title: varchar("title", { length: 255 }).notNull(),
	description: text("description"),
	date: varchar("date", { length: 10 }).notNull(),
	location: varchar("location", { length: 255 }),
	notes: text("notes"),
	status: varchar("status", { length: 20 }).default('SCHEDULED').notNull(),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	clubId: uuid("clubId").notNull(),
	teamId: uuid("teamId").notNull(),
	categoryId: uuid("categoryId").notNull(),
	createdById: uuid("createdById").notNull(),
	type: varchar("type", { length: 20 }).default('TRAINING').notNull(),
	time: varchar("time", { length: 5 }).notNull(),
});

export const trainingCategory = pgTable("TrainingCategory", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	name: varchar("name", { length: 255 }).notNull(),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	clubId: uuid("clubId").notNull(),
});

export const trainingExercise = pgTable("TrainingExercise", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	position: integer("position").notNull(),
	trainingId: uuid("trainingId").notNull(),
	exerciseId: uuid("exerciseId").notNull(),
	notes: text("notes"),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	series: integer("series"),
	repetitions: integer("repetitions"),
	repetitionTime: integer("repetitionTime"),
	pauseBetweenRepetitions: integer("pauseBetweenRepetitions"),
	pauseBetweenSeries: integer("pauseBetweenSeries"),
});

export const user = pgTable("User", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	email: varchar("email", { length: 255 }).notNull(),
	name: varchar("name", { length: 255 }),
	password: varchar("password", { length: 255 }).notNull(),
	role: role("role").default('MEMBER').notNull(),
	emailVerified: timestamp("emailVerified", { withTimezone: true, mode: 'string' }),
	imageUrl: text("imageUrl"),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	clubId: uuid("clubId").notNull(),
},
(table) => {
	return {
		userEmailUnique: unique("User_email_unique").on(table.email),
	}
});

export const userPermission = pgTable("UserPermission", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	userId: uuid("userId").notNull().references(() => user.id),
	permissionId: uuid("permissionId").notNull().references(() => permission.id),
	allowed: boolean("allowed").notNull(),
	createdAt: timestamp("createdAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const exerciseTagToExercise = pgTable("exercise_tag_to_exercise", {
	exerciseId: uuid("exerciseId").notNull().references(() => exercise.id),
	exerciseTagId: uuid("exerciseTagId").notNull().references(() => exerciseTag.id),
});

export const fitnessTest = pgTable("fitness_test", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	clubId: uuid("club_id").notNull().references(() => club.id),
	name: varchar("name", { length: 128 }).notNull(),
	type: varchar("type", { length: 64 }).notNull(),
	unit: varchar("unit", { length: 32 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	createdBy: uuid("created_by").notNull().references(() => user.id),
	description: varchar("description", { length: 512 }),
});

export const fitnessTestResult = pgTable("fitness_test_result", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	testId: uuid("test_id").notNull().references(() => fitnessTest.id),
	playerId: uuid("player_id").notNull().references(() => player.id),
	teamId: uuid("team_id").notNull().references(() => team.id),
	value: numeric("value", { precision: 10, scale:  2 }).notNull(),
	date: timestamp("date", { mode: 'string' }).defaultNow().notNull(),
	createdBy: uuid("created_by").notNull().references(() => user.id),
});