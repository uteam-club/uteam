import { buildProfileSnapshot } from '../profileSnapshot.service';

describe('Profile Snapshot Service', () => {
  it('should build snapshot from profile with column mapping', () => {
    const profile = {
      id: 'profile-1',
      gpsSystem: 'Polar',
      sport: 'football',
      version: 1,
      columnMapping: [
        {
          type: 'column' as const,
          name: 'Player Name',
          sourceHeader: 'Player',
          canonicalKey: 'athlete_name',
          displayName: 'Игрок',
          isVisible: true,
          order: 1,
          unit: 'string',
          transform: undefined,
        },
        {
          type: 'column' as const,
          name: 'Total Distance',
          sourceHeader: 'Total distance (km)',
          canonicalKey: 'total_distance_m',
          displayName: 'TD',
          isVisible: true,
          order: 2,
          unit: 'km',
          transform: 'parseFloat',
        },
        {
          type: 'formula' as const,
          name: 'Calculated Field',
          formula: 'distance * 2',
        },
      ],
      createdAt: '2024-01-01T00:00:00Z',
    };

    const snapshot = buildProfileSnapshot(profile);

    expect(snapshot.profileId).toBe('profile-1');
    expect(snapshot.gpsSystem).toBe('Polar');
    expect(snapshot.sport).toBe('football');
    expect(snapshot.profileVersion).toBe(1);
    expect(snapshot.createdAtISO).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

    expect(snapshot.columns).toHaveLength(2); // Only column types
    expect(snapshot.columns[0]).toEqual({
      sourceHeader: 'Player',
      canonicalKey: 'athlete_name',
      displayName: 'Игрок',
      order: 1,
      isVisible: true,
      unit: 'string',
      transform: null,
    });

    expect(snapshot.columns[1]).toEqual({
      sourceHeader: 'Total distance (km)',
      canonicalKey: 'total_distance_m',
      displayName: 'TD',
      order: 2,
      isVisible: true,
      unit: 'km',
      transform: 'parseFloat',
    });
  });

  it('should sort columns by order', () => {
    const profile = {
      id: 'profile-1',
      gpsSystem: 'Test',
      columnMapping: [
        {
          name: 'Third',
          sourceHeader: 'C',
          canonicalKey: 'third',
          order: 3,
        },
        {
          name: 'First',
          sourceHeader: 'A',
          canonicalKey: 'first',
          order: 1,
        },
        {
          name: 'Second',
          sourceHeader: 'B',
          canonicalKey: 'second',
          order: 2,
        },
      ],
      createdAt: '2024-01-01T00:00:00Z',
    };

    const snapshot = buildProfileSnapshot(profile);
    
    expect(snapshot.columns[0].canonicalKey).toBe('first');
    expect(snapshot.columns[1].canonicalKey).toBe('second');
    expect(snapshot.columns[2].canonicalKey).toBe('third');
  });

  it('should filter invisible columns', () => {
    const profile = {
      id: 'profile-1',
      gpsSystem: 'Test',
      columnMapping: [
        {
          name: 'Visible',
          sourceHeader: 'A',
          canonicalKey: 'visible',
          isVisible: true,
        },
        {
          name: 'Hidden',
          sourceHeader: 'B',
          canonicalKey: 'hidden',
          isVisible: false,
        },
        {
          name: 'Default',
          sourceHeader: 'C',
          canonicalKey: 'default',
        },
      ],
      createdAt: '2024-01-01T00:00:00Z',
    };

    const snapshot = buildProfileSnapshot(profile);
    
    expect(snapshot.columns).toHaveLength(2);
    expect(snapshot.columns.map(c => c.canonicalKey)).toEqual(['visible', 'default']);
  });

  it('should handle missing displayName and unit', () => {
    const profile = {
      id: 'profile-1',
      gpsSystem: 'Test',
      columnMapping: [
        {
          name: 'Test Column',
          sourceHeader: 'test',
          canonicalKey: 'test_key',
        },
      ],
      createdAt: '2024-01-01T00:00:00Z',
    };

    const snapshot = buildProfileSnapshot(profile);
    
    expect(snapshot.columns[0]).toEqual({
      sourceHeader: 'test',
      canonicalKey: 'test_key',
      displayName: 'Test Column',
      order: 0,
      isVisible: true,
      unit: null,
      transform: null,
    });
  });

  it('should filter out non-column types', () => {
    const profile = {
      id: 'profile-1',
      gpsSystem: 'Test',
      columnMapping: [
        {
          type: 'formula' as const,
          name: 'Calculated Field',
          formula: 'distance * 2',
        },
        {
          type: 'column' as const,
          name: 'Player Name',
          mappedColumn: 'Name',
          canonicalKey: 'athlete_name',
          isVisible: true,
          order: 0,
        },
      ],
      createdAt: '2024-01-01T00:00:00Z',
    };

    const snapshot = buildProfileSnapshot(profile);

    expect(snapshot.columns).toHaveLength(1);
    expect(snapshot.columns[0].canonicalKey).toBe('athlete_name');
  });

  it('should handle missing columnMapping', () => {
    const profile = {
      id: 'profile-1',
      gpsSystem: 'Test',
      columnMapping: [],
      createdAt: '2024-01-01T00:00:00Z',
    };

    const snapshot = buildProfileSnapshot(profile);

    expect(snapshot.columns).toEqual([]);
  });

  it('should sort columns by order', () => {
    const profile = {
      id: 'profile-1',
      gpsSystem: 'Test',
      columnMapping: [
        {
          type: 'column' as const,
          name: 'Third',
          mappedColumn: 'C',
          canonicalKey: 'third_field',
          order: 3,
        },
        {
          type: 'column' as const,
          name: 'First',
          mappedColumn: 'A',
          canonicalKey: 'first_field',
          order: 1,
        },
        {
          type: 'column' as const,
          name: 'Second',
          mappedColumn: 'B',
          canonicalKey: 'second_field',
          order: 2,
        },
      ],
      createdAt: '2024-01-01T00:00:00Z',
    };

    const snapshot = buildProfileSnapshot(profile);

    expect(snapshot.columns[0].canonicalKey).toBe('first_field');
    expect(snapshot.columns[1].canonicalKey).toBe('second_field');
    expect(snapshot.columns[2].canonicalKey).toBe('third_field');
  });

  it('should use default values for missing fields', () => {
    const profile = {
      id: 'profile-1',
      gpsSystem: 'Test',
      columnMapping: [
        {
          type: 'column' as const,
          name: 'Player Name',
          mappedColumn: 'Name',
          canonicalKey: 'athlete_name',
          // Missing isVisible, order, unit, transform
        },
      ],
      createdAt: '2024-01-01T00:00:00Z',
    };

    const snapshot = buildProfileSnapshot(profile);

    expect(snapshot.columns[0]).toEqual({
      sourceHeader: 'Name',
      canonicalKey: 'athlete_name',
      displayName: 'Player Name',
      order: 0, // Default
      isVisible: true, // Default
      unit: null, // Default
      transform: null, // Default
    });
  });
});
