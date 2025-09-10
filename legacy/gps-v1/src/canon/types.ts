// canon/types.ts
export type AggType = 'sum' | 'avg' | 'min' | 'max' | 'none';
export type Scaling = 'none' | 'per_time';

export interface LocalizedLabel {
  ru: string;
  en: string;
}

export interface CanonicalMetric {
  key: string;                 // e.g., "total_distance_m"
  labels: LocalizedLabel;
  description?: string;
  unit: string;                // canonical or reported unit string (e.g., "m","km/h","string","ratio")
  dimension: string;           // e.g., "distance","time","speed"
  agg: AggType;
  scaling?: Scaling;
  category?: string;
  plausibleMin?: number;
  plausibleMax?: number;
  isDerived?: boolean;
}

export interface CanonicalGroup {
  key: string;
  labels: LocalizedLabel;
  description?: string;
  metrics: string[]; // array of CanonicalMetric.key
}

export interface CanonicalDimension {
  canonical_unit: string;
  allowed_units: string[];
  conversions?: Record<string, number>; // map like "km/h->m/s": 0.2777...
  notes?: string;
}

export interface CanonicalRegistry {
  __meta: {
    version: string;
    generated_at?: string;
    notes?: string;
  };
  dimensions: Record<string, CanonicalDimension>;
  metrics: CanonicalMetric[];
  groups: CanonicalGroup[];
}

export type DimensionKey = keyof CanonicalRegistry['dimensions'];
