// services/gps/__tests__/bsight-integration.test.ts
import { buildProfileSnapshot } from '../profileSnapshot.service';
import { filterCanonicalData } from '../dataFilter.service';
import { fromCanonical, formatDisplayValue } from '../../units';

describe('B-SIGHT Integration Tests', () => {
  const mockBSightProfile = {
    id: 'bsight-profile-1',
    gpsSystem: 'B-SIGHT',
    sport: 'football',
    version: 1,
    columnMapping: [
      {
        type: 'column' as const,
        name: 'Player',
        sourceHeader: 'Игрок',
        canonicalKey: 'athlete_name',
        displayName: 'Игрок',
        isVisible: true,
        order: 1
      },
      {
        type: 'column' as const,
        name: 'Time',
        sourceHeader: 'Индивидуальное время',
        canonicalKey: 'minutes_played',
        displayName: 'Время',
        isVisible: true,
        order: 2
      },
      {
        type: 'column' as const,
        name: 'TD',
        sourceHeader: 'Дистанция общая, м',
        canonicalKey: 'total_distance_m',
        displayName: 'Дистанция',
        isVisible: true,
        order: 3
      },
      {
        type: 'column' as const,
        name: 'HSR%',
        sourceHeader: 'ВиБ, %',
        canonicalKey: 'hsr_ratio',
        displayName: 'HSR%',
        isVisible: true,
        order: 4
      },
      {
        type: 'column' as const,
        name: 'Max speed',
        sourceHeader: 'Макс. скорость, км/ч',
        canonicalKey: 'max_speed_kmh',
        displayName: 'Max speed',
        isVisible: true,
        order: 5
      }
    ],
    createdAt: '2024-01-01T00:00:00Z'
  };

  const mockCanonicalData = [
    { athlete_name: 'John Doe', minutes_played: 90, total_distance_m: 5000, hsr_ratio: 0.15, max_speed_kmh: 25.5 },
    { athlete_name: 'Jane Smith', minutes_played: 85, total_distance_m: 4800, hsr_ratio: 0.12, max_speed_kmh: 23.8 },
    { athlete_name: 'Bob Johnson', minutes_played: 95, total_distance_m: 5200, hsr_ratio: 0.18, max_speed_kmh: 27.2 },
    { athlete_name: '', minutes_played: 0, total_distance_m: 0, hsr_ratio: 0, max_speed_kmh: 0 }, // Empty row
    { athlete_name: 'Итог', minutes_played: 270, total_distance_m: 15000, hsr_ratio: 0.45, max_speed_kmh: 76.5 }, // Summary row
    { athlete_name: 'Player 4', minutes_played: 400, total_distance_m: 5000, hsr_ratio: 0.15, max_speed_kmh: 25.5 } // Extreme values
  ];

  it('should build profile snapshot with correct display units', () => {
    const snapshot = buildProfileSnapshot(mockBSightProfile);
    
    expect(snapshot.columns).toHaveLength(5);
    
    // Check HSR column has % display unit
    const hsrColumn = snapshot.columns.find(col => col.canonicalKey === 'hsr_ratio');
    expect(hsrColumn?.displayUnit).toBe('%');
    
    // Check max speed column has km/h display unit
    const maxSpeedColumn = snapshot.columns.find(col => col.canonicalKey === 'max_speed_kmh');
    expect(maxSpeedColumn?.displayUnit).toBe('km/h');
    
    // Check other columns have canonical units or determined display units
    const timeColumn = snapshot.columns.find(col => col.canonicalKey === 'minutes_played');
    expect(timeColumn?.displayUnit).toBe('s'); // Determined from canonical unit
    
    const distanceColumn = snapshot.columns.find(col => col.canonicalKey === 'total_distance_m');
    expect(distanceColumn?.displayUnit).toBe('m'); // Determined from canonical unit
  });

  it('should filter data correctly', () => {
    const snapshot = buildProfileSnapshot(mockBSightProfile);
    const result = filterCanonicalData(mockCanonicalData, snapshot.columns);
    
    // Should filter out empty row, summary row, and extreme values row
    expect(result.filteredRows).toHaveLength(3);
    expect(result.filteredCount).toBe(3);
    expect(result.warnings).toHaveLength(1); // One warning for extreme values
    
    // Check that only valid players remain
    const playerNames = result.filteredRows.map(row => row.athlete_name);
    expect(playerNames).toEqual(['John Doe', 'Jane Smith', 'Bob Johnson']);
  });

  it('should convert units correctly for display', () => {
    const snapshot = buildProfileSnapshot(mockBSightProfile);
    const hsrColumn = snapshot.columns.find(col => col.canonicalKey === 'hsr_ratio')!;
    const maxSpeedColumn = snapshot.columns.find(col => col.canonicalKey === 'max_speed_kmh')!;
    
    // Test HSR conversion (ratio to percentage)
    const hsrValue = 0.15;
    const convertedHsr = fromCanonical(hsrValue, 'hsr_ratio', hsrColumn.displayUnit!);
    expect(convertedHsr).toBeCloseTo(15, 1);
    
    const formattedHsr = formatDisplayValue(convertedHsr!, hsrColumn.displayUnit!);
    expect(formattedHsr).toBe('15.0%');
    
    // Test max speed conversion (assuming canonical is m/s, display is km/h)
    const maxSpeedValue = 7.08; // 25.5 km/h in m/s
    const convertedMaxSpeed = fromCanonical(maxSpeedValue, 'max_speed_ms', maxSpeedColumn.displayUnit!);
    expect(convertedMaxSpeed).toBeCloseTo(25.5, 1);
    
    const formattedMaxSpeed = formatDisplayValue(convertedMaxSpeed!, maxSpeedColumn.displayUnit!);
    expect(formattedMaxSpeed).toBe('25.5 км/ч');
  });

  it('should handle athlete names correctly', () => {
    const snapshot = buildProfileSnapshot(mockBSightProfile);
    const nameColumn = snapshot.columns.find(col => col.canonicalKey === 'athlete_name')!;
    
    // Check that sourceHeader is used correctly
    expect(nameColumn.sourceHeader).toBe('Игрок');
    expect(nameColumn.displayName).toBe('Игрок');
    
    // Test name extraction
    const testRow = { athlete_name: 'Test Player', minutes_played: 90 };
    const extractedName = testRow[nameColumn.canonicalKey];
    expect(extractedName).toBe('Test Player');
  });

  it('should not include empty or summary rows in final data', () => {
    const snapshot = buildProfileSnapshot(mockBSightProfile);
    const result = filterCanonicalData(mockCanonicalData, snapshot.columns);
    
    // Verify no empty names
    const hasEmptyNames = result.filteredRows.some(row => 
      !row.athlete_name || 
      row.athlete_name.trim() === '' || 
      row.athlete_name === '-' || 
      row.athlete_name === 'n/a'
    );
    expect(hasEmptyNames).toBe(false);
    
    // Verify no summary rows
    const hasSummaryRows = result.filteredRows.some(row => 
      row.athlete_name.toLowerCase().includes('итог') ||
      row.athlete_name.toLowerCase().includes('total') ||
      row.athlete_name.toLowerCase().includes('summary')
    );
    expect(hasSummaryRows).toBe(false);
    
    // Verify no extreme values
    const hasExtremeValues = result.filteredRows.some(row => 
      row.minutes_played > 300 || 
      row.total_distance_m > 50000
    );
    expect(hasExtremeValues).toBe(false);
  });
});
