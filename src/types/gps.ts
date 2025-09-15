// GPS Profile types
export interface GpsProfile {
  id: string;
  name: string;
  gpsSystem: string;
  description: string | null;
  clubId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateGpsProfileRequest {
  name: string;
  gpsSystem: string;
  description?: string;
}

export interface UpdateGpsProfileRequest {
  name?: string;
  gpsSystem?: string;
  description?: string;
  isActive?: boolean;
}

// GPS Report types
export interface GpsReport {
  id: string;
  name: string;
  fileName: string;
  fileUrl: string;
  filePath?: string | null; // дополнительное поле для совместимости
  fileSize: number | null;
  gpsSystem: string;
  eventType: 'training' | 'match';
  eventId: string;
  profileId: string | null;
  gpsProfileId?: string | null; // дополнительное поле для совместимости
  trainingId?: string | null; // дополнительное поле для совместимости
  matchId?: string | null; // дополнительное поле для совместимости
  rawData?: any;
  processedData?: any;
  metadata?: any;
  isProcessed: boolean;
  status: 'uploaded' | 'processed' | 'error';
  processedAt: Date | null;
  errorMessage: string | null;
  ingestStatus: 'pending' | 'processing' | 'completed' | 'failed';
  ingestError: string | null;
  profileSnapshot?: any | null;
  canonVersion?: string | null;
  importMeta?: any | null;
  clubId: string;
  uploadedById: string;
  teamId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateGpsReportRequest {
  name: string;
  fileName: string;
  fileUrl: string;
  filePath?: string | null; // дополнительное поле для совместимости
  fileSize?: number;
  gpsSystem: string;
  eventType: 'training' | 'match';
  eventId: string;
  profileId?: string;
  gpsProfileId?: string | null; // дополнительное поле для совместимости
  trainingId?: string; // дополнительное поле для совместимости
  matchId?: string; // дополнительное поле для совместимости
  clubId: string;
  uploadedById: string;
  teamId: string;
}

// GPS Column Mapping types
export interface GpsColumnMapping {
  id: string;
  gpsProfileId: string;
  sourceColumn: string;
  customName: string;
  canonicalMetric: string;
  displayUnit?: string | null;
  isVisible: boolean;
  displayOrder: number;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateGpsColumnMappingRequest {
  sourceColumn: string;
  customName: string;
  canonicalMetric: string;
  displayUnit?: string | null;
  isVisible?: boolean;
  displayOrder?: number;
  description?: string;
}

export interface UpdateGpsColumnMappingRequest {
  customName?: string;
  canonicalMetric?: string;
  displayUnit?: string | null;
  isVisible?: boolean;
  displayOrder?: number;
  description?: string;
}

// GPS Player Mapping types
export interface GpsPlayerMapping {
  id: string;
  gpsReportId: string;
  playerId: string | null; // nullable для "Без привязки"
  rowIndex: number;
  isManual: boolean;
  similarity?: number | null; // nullable, процент сходства
  createdAt: Date;
}

export interface CreateGpsPlayerMappingRequest {
  playerId: string | null;
  rowIndex: number;
  isManual?: boolean;
  similarity?: number | null;
}

export interface CreateGpsPlayerMappingBatchRequest {
  items: CreateGpsPlayerMappingRequest[];
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

// Canonical Metrics types
export interface CanonicalMetric {
  key: string;
  labels: {
    ru: string;
    en: string;
  };
  description: string;
  unit: string;
  dimension: string;
  agg: 'sum' | 'avg' | 'max' | 'min' | 'none';
  scaling: 'per_time' | 'peak' | 'ratio' | 'none';
  category: string;
  plausibleMin?: number;
  plausibleMax?: number;
  isDerived: boolean;
  formula_expr?: string;
}

export interface CanonicalMetricsGroup {
  key: string;
  labels: {
    ru: string;
    en: string;
  };
  description: string;
  metrics: string[];
}

export interface CanonicalMetricsData {
  __meta: {
    version: string;
    generated_at: string;
    notes: string;
  };
  dimensions: Record<string, {
    canonical_unit: string;
    allowed_units: string[];
    conversions?: Record<string, number>;
    notes?: string;
  }>;
  metrics: CanonicalMetric[];
  groups: CanonicalMetricsGroup[];
}

// GPS Analysis types
export interface GpsAnalysisData {
  playerId: string;
  playerName: string;
  position?: string;
  metrics: Record<string, {
    value: number;
    unit: string;
    customName: string;
    canonicalMetric: string;
  }>;
}

export interface GpsAnalysisRequest {
  gpsReportId: string;
  playerIds?: string[];
  metrics?: string[];
  groupBy?: 'player' | 'position' | 'team';
}

// File upload types
export interface GpsFileUpload {
  file: File;
  gpsProfileId: string;
  trainingId?: string;
  matchId?: string;
}

export interface GpsFileParseResult {
  columns: string[];
  data: Record<string, any>[];
  rowCount: number;
  errors: string[];
}
