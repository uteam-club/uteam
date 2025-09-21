// GPS API client
import { 
  GpsReport, 
  GpsReportData, 
  GpsCanonicalMetric, 
  GpsUnit,
  CreateGpsReportRequest,
  // GpsFileUploadResponse,
  UpdateGpsReportDataRequest
} from '@/types/gps';

const API_BASE = '/api/gps';

// GPS Reports API
export async function fetchGpsReports(clubId: string, filters?: {
  eventId?: string;
  eventType?: string;
  teamId?: string;
}): Promise<GpsReport[]> {
  const params = new URLSearchParams();
  if (filters?.eventId) params.append('eventId', filters.eventId);
  if (filters?.eventType) params.append('eventType', filters.eventType);
  if (filters?.teamId) params.append('teamId', filters.teamId);
  
  const response = await fetch(`${API_BASE}/reports?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch GPS reports');
  return response.json();
}

export async function createGpsReport(data: CreateGpsReportRequest): Promise<GpsReport> {
  const response = await fetch(`${API_BASE}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create GPS report');
  return response.json();
}

export async function getGpsReportById(id: string): Promise<GpsReport | null> {
  const response = await fetch(`${API_BASE}/reports/${id}`);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error('Failed to fetch GPS report');
  }
  return response.json();
}

// GPS Report Data API
export async function fetchGpsReportData(reportId: string): Promise<{
  report: GpsReport;
  playerData: GpsReportData[];
}> {
  const response = await fetch(`${API_BASE}/reports/${reportId}/data`);
  if (!response.ok) throw new Error('Failed to fetch GPS report data');
  return response.json();
}

export async function updateGpsReportData(reportId: string, data: UpdateGpsReportDataRequest): Promise<void> {
  const response = await fetch(`${API_BASE}/reports/${reportId}/data`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update GPS report data');
}

export async function fetchGpsReportHistory(reportId: string): Promise<any[]> {
  const response = await fetch(`${API_BASE}/reports/${reportId}/history`);
  if (!response.ok) throw new Error('Failed to fetch GPS report history');
  return response.json();
}

// TODO: File Upload API will be implemented later

// Canonical Metrics API
export async function fetchCanonicalMetrics(category?: string): Promise<{
  metrics: GpsCanonicalMetric[];
  groupedMetrics: Record<string, GpsCanonicalMetric[]>;
}> {
  const params = new URLSearchParams();
  if (category) params.append('category', category);
  
  const response = await fetch(`${API_BASE}/canonical-metrics?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch canonical metrics');
  return response.json();
}

export async function fetchUnits(dimension?: string): Promise<{
  units: GpsUnit[];
  groupedUnits: Record<string, GpsUnit[]>;
}> {
  const params = new URLSearchParams();
  if (dimension) params.append('dimension', dimension);
  
  const response = await fetch(`${API_BASE}/units?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch units');
  return response.json();
}

// TODO: GPS Profiles API will be implemented later

// GPS Permissions API
export async function fetchGpsPermissions(): Promise<{
  permissions: any[];
  groupedPermissions: Record<string, any[]>;
}> {
  const response = await fetch(`${API_BASE}/permissions`);
  if (!response.ok) throw new Error('Failed to fetch GPS permissions');
  return response.json();
}

export async function fetchRolePermissions(role: string): Promise<any[]> {
  const response = await fetch(`${API_BASE}/roles/${role}/permissions`);
  if (!response.ok) throw new Error('Failed to fetch role permissions');
  return response.json();
}

export async function updateRolePermissions(role: string, permissions: any[]): Promise<void> {
  const response = await fetch(`${API_BASE}/roles/${role}/permissions`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ permissions }),
  });
  if (!response.ok) throw new Error('Failed to update role permissions');
}
