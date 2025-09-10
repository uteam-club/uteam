export type CanonicalColumnKey = string;

export interface ProfileSnapshotColumn {
  sourceHeader: string;
  canonicalKey: CanonicalColumnKey;
  displayName: string;
  order: number;
  isVisible: boolean;
  unit?: string | null;
  transform?: string | null;
  displayUnit?: 'km/h' | 'm/s' | '%' | 'ratio' | 'm' | 's' | 'min' | string;
  sourceIndex?: number;
}

export interface ProfileSnapshot {
  profileId: string;
  gpsSystem?: string | null;
  sport?: string | null;
  columns: ProfileSnapshotColumn[];
  profileVersion?: number | null;
  createdAtISO: string;
}

export interface ImportMeta {
  fileSize?: number;
  rowCount?: number;
  warnings?: string[];
  processingTimeMs?: number;
}
