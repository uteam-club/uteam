// GPS API utilities for client-side components
import { GpsProfile, GpsReport, GpsColumnMapping, GpsPlayerMapping, GpsReportData } from '@/types/gps';

const API_BASE = '/api/gps';

// GPS Profiles API
export async function fetchGpsProfiles(clubId: string): Promise<GpsProfile[]> {
  const response = await fetch(`${API_BASE}/profiles?clubId=${clubId}`);
  if (!response.ok) throw new Error('Failed to fetch GPS profiles');
  return response.json();
}

export async function createGpsProfile(data: {
  name: string;
  gpsSystem: string;
  clubId: string;
}): Promise<GpsProfile> {
  const response = await fetch(`${API_BASE}/profiles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create GPS profile');
  return response.json();
}

export async function updateGpsProfile(id: string, data: {
  name?: string;
  description?: string;
  isActive?: boolean;
}): Promise<GpsProfile> {
  const response = await fetch(`${API_BASE}/profiles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update GPS profile');
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

export async function getGpsProfileById(id: string): Promise<GpsProfile | null> {
  const response = await fetch(`${API_BASE}/profiles/${id}`);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error('Failed to fetch GPS profile');
  }
  return response.json();
}

export async function getGpsColumnMappingsByProfileId(profileId: string): Promise<GpsColumnMapping[]> {
  const response = await fetch(`${API_BASE}/profiles/${profileId}/mappings`);
  if (!response.ok) throw new Error('Failed to fetch GPS column mappings');
  return response.json();
}

export async function deleteGpsProfile(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/profiles/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete GPS profile');
}

// GPS Reports API
export async function fetchGpsReports(clubId: string): Promise<GpsReport[]> {
  const response = await fetch(`${API_BASE}/reports?clubId=${clubId}`);
  if (!response.ok) throw new Error('Failed to fetch GPS reports');
  return response.json();
}

export async function createGpsReport(data: {
  name: string;
  fileName: string;
  fileUrl: string;
  filePath?: string;
  fileSize?: number;
  gpsSystem: string;
  eventType: 'training' | 'match';
  eventId: string;
  profileId?: string;
  gpsProfileId?: string;
  trainingId?: string;
  matchId?: string;
  clubId: string;
  uploadedById: string;
  teamId: string;
}): Promise<GpsReport> {
  const response = await fetch(`${API_BASE}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw errorData;
  }
  return response.json();
}

export async function createGpsReportWithFile(file: File, meta: {
  eventId: string;
  teamId: string;
  gpsSystem: string;
  profileId: string;
  fileName: string;
  eventType: 'TRAINING' | 'MATCH';
  playerMappings?: any[];
}): Promise<GpsReport> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('meta', JSON.stringify(meta));

  const response = await fetch(`${API_BASE}/reports`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw errorData;
  }
  
  return response.json();
}

export async function updateGpsReport(id: string, data: {
  name?: string;
  trainingId?: string;
  matchId?: string;
}): Promise<GpsReport> {
  const response = await fetch(`${API_BASE}/reports/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update GPS report');
  return response.json();
}

export async function deleteGpsReport(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/reports/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete GPS report');
}

// GPS Column Mappings API
export async function fetchGpsColumnMappings(profileId: string): Promise<GpsColumnMapping[]> {
  const response = await fetch(`${API_BASE}/profiles/${profileId}/mappings`);
  if (!response.ok) throw new Error('Failed to fetch GPS column mappings');
  return response.json();
}

export async function createGpsColumnMapping(data: {
  gpsProfileId: string;
  sourceColumn: string;
  customName: string;
  canonicalMetric: string;
  displayUnit?: string | null;
  isVisible?: boolean;
  displayOrder?: number;
  description?: string;
}): Promise<GpsColumnMapping> {
  const response = await fetch(`${API_BASE}/profiles/${data.gpsProfileId}/mappings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sourceColumn: data.sourceColumn,
      customName: data.customName,
      canonicalMetric: data.canonicalMetric,
      displayUnit: data.displayUnit,
      isActive: data.isVisible ?? true,
    }),
  });
  if (!response.ok) throw new Error('Failed to create GPS column mapping');
  return response.json();
}

export async function updateGpsColumnMapping(mappingId: string, data: {
  gpsProfileId: string;
  sourceColumn?: string;
  customName?: string;
  canonicalMetric?: string;
  displayUnit?: string | null;
  isVisible?: boolean;
  displayOrder?: number;
  description?: string;
}): Promise<GpsColumnMapping> {
  const response = await fetch(`${API_BASE}/profiles/${data.gpsProfileId}/mappings/${mappingId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update GPS column mapping');
  return response.json();
}

export async function deleteGpsColumnMapping(mappingId: string, profileId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/profiles/${profileId}/mappings/${mappingId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete GPS column mapping');
}


// GPS Report Data API
export async function fetchGpsReportData(reportId: string): Promise<GpsReportData[]> {
  const response = await fetch(`${API_BASE}/reports/${reportId}/data`);
  if (!response.ok) throw new Error('Failed to fetch GPS report data');
  return response.json();
}

// File Upload API
export async function uploadGpsReportFile(file: File, clubId: string): Promise<{
  fileName: string;
  filePath: string;
  fileSize: number;
}> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('clubId', clubId);

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) throw new Error('Failed to upload GPS report file');
  return response.json();
}

// File Processing API
export async function processGpsFile(filePath: string, fileName: string): Promise<{
  rawData: any[];
  rowCount: number;
  columns: string[];
}> {
  const response = await fetch(`${API_BASE}/process-file`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filePath, fileName }),
  });
  if (!response.ok) throw new Error('Failed to process GPS file');
  return response.json();
}

// GPS Reports by Event API
export async function getGpsReportsByEventId(eventId: string, eventType: 'training' | 'match'): Promise<GpsReport[]> {
  const response = await fetch(`${API_BASE}/reports?eventId=${eventId}&eventType=${eventType}`);
  if (!response.ok) throw new Error('Failed to fetch GPS reports by event');
  return response.json();
}

// GPS Reports by Team API
export async function getGpsReportsByTeamId(teamId: string, eventType: 'training' | 'match'): Promise<GpsReport[]> {
  const response = await fetch(`${API_BASE}/reports?teamId=${teamId}&eventType=${eventType}`);
  if (!response.ok) throw new Error('Failed to fetch GPS reports by team');
  return response.json();
}

// Canonical Metrics API
export async function fetchCanonicalMetrics(): Promise<any> {
  const response = await fetch(`${API_BASE}/canonical-metrics`);
  if (!response.ok) throw new Error('Failed to fetch canonical metrics');
  return response.json();
}

// GPS Player Mappings API
export async function fetchGpsPlayerMappings(reportId: string): Promise<GpsPlayerMapping[]> {
  const response = await fetch(`${API_BASE}/reports/${reportId}/mappings`);
  if (!response.ok) throw new Error('Failed to fetch GPS player mappings');
  return response.json();
}

export async function createGpsPlayerMapping(data: {
  gpsReportId: string;
  playerId: string;
  rowIndex: number;
}): Promise<GpsPlayerMapping> {
  const response = await fetch(`${API_BASE}/reports/${data.gpsReportId}/mappings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playerId: data.playerId,
      rowIndex: data.rowIndex
    }),
  });
  if (!response.ok) throw new Error('Failed to create GPS player mapping');
  return response.json();
}

export async function deleteGpsPlayerMappings(reportId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/reports/${reportId}/mappings`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete GPS player mappings');
}

export async function deleteGpsPlayerMapping(reportId: string, mappingId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/reports/${reportId}/mappings/${mappingId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete GPS player mapping');
}
