// GPS Report types
export interface GpsReport {
  id: string;
  name: string;
  fileName: string;
  fileUrl: string;
  gpsSystem: string;
  eventType: 'training' | 'match';
  eventId: string;
  profileId: string | null;
  rawData: any;
  processedData: any;
  metadata: any;
  isProcessed: boolean;
  createdAt: Date;
  updatedAt: Date;
  clubId: string;
  uploadedById: string;
  teamId: string;
  ingestStatus: string;
  ingestError: string | null;
  filePath: string | null;
  profileSnapshot: any;
  canonVersion: string | null;
  importMeta: any;
  fileSize: number | null;
  gpsProfileId: string | null;
  trainingId: string | null;
  matchId: string | null;
  status: string;
  processedAt: Date | null;
  errorMessage: string | null;
  playersCount: number;
  hasEdits: boolean;
}

// GPS Report Data types
export interface GpsReportData {
  id: string;
  gpsReportId: string;
  playerId: string;
  canonicalMetric: string;
  value: string;
  unit: string;
  createdAt: Date;
}

// GPS Data Change Log types
export interface GpsDataChangeLog {
  id: string;
  reportDataId: string;
  reportId: string;
  playerId: string;
  clubId: string;
  fieldName: string;
  fieldLabel: string;
  oldValue: any;
  newValue: any;
  changedById: string;
  changedByName: string;
  changedAt: Date;
  changeReason: string | null;
  changeType: string;
}

// GPS Canonical Metric types
export interface GpsCanonicalMetric {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  dimension: string;
  canonicalUnit: string;
  supportedUnits: any;
  isDerived: boolean;
  formula: string | null;
  metadata: any;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// GPS Unit types
export interface GpsUnit {
  id: string;
  code: string;
  name: string;
  dimension: string;
  conversionFactor: number;
  isCanonical: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// GPS Column Mapping types
export interface GpsColumnMapping {
  id: string;
  gpsProfileId: string;
  sourceColumn: string;
  customName: string;
  canonicalMetric: string;
  isVisible: boolean;
  displayOrder: number;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  displayUnit: string | null;
  sourceUnit: string | null;
}

// GPS Visualization Profile types
export interface GpsVisualizationProfile {
  id: string;
  name: string;
  description: string | null;
  clubId: string;
  createdById: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// GPS Profile Column types
export interface GpsProfileColumn {
  id: string;
  profileId: string;
  canonicalMetricId: string;
  displayName: string;
  displayUnit: string;
  displayOrder: number;
  isVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// GPS Profile Team types
export interface GpsProfileTeam {
  id: string;
  profileId: string;
  teamId: string;
  clubId: string;
  createdAt: Date;
}

// GPS Permission types
export interface GpsPermission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  createdAt: Date;
  updatedAt: Date;
}

// GPS User Permission types
export interface GpsUserPermission {
  id: string;
  userId: string;
  permissionId: string;
  resourceId: string | null;
  grantedAt: Date;
  grantedBy: string;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Request types
export interface CreateGpsReportRequest {
  name: string;
  fileName: string;
  fileSize: number;
  eventType: 'training' | 'match';
  eventId: string;
  teamId: string;
  profileId?: string;
  columnMappings: Array<{
    originalColumn: string;
    canonicalMetric: string;
    sourceUnit: string;
    isActive: boolean;
  }>;
  playerMappings: Array<{
    filePlayerName: string;
    playerId: string | null;
    similarity: 'high' | 'medium' | 'low' | 'not_found';
  }>;
  parsedData: {
    rows: Array<Record<string, any>>;
  };
}

export interface UpdateGpsReportDataRequest {
  dataId: string;
  fieldName: string;
  fieldLabel: string;
  newValue: {
    value: number;
    unit: string;
  };
  changeReason?: string;
}
