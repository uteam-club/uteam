import { buildProfileSnapshot } from '../profileSnapshot.service';

describe('Profile Snapshot Service', () => {
  it('should build snapshot from profile with column mapping', () => {
    const profile = {
      id: 'profile-1',
      gpsSystem: 'B-SIGHT',
      columnMapping: [
        {
          type: 'column' as const,
          name: 'Player Name',
          mappedColumn: 'Name',
          canonicalKey: 'athlete_name',
          isVisible: true,
          order: 0,
          unit: 'string',
          transform: undefined,
        },
        {
          type: 'column' as const,
          name: 'Total Distance',
          mappedColumn: 'Distance',
          canonicalKey: 'total_distance_m',
          isVisible: true,
          order: 1,
          unit: 'm',
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
    expect(snapshot.gpsSystem).toBe('B-SIGHT');
    expect(snapshot.sport).toBeNull();
    expect(snapshot.profileVersion).toBeNull();
    expect(snapshot.createdAtISO).toBe('2024-01-01T00:00:00Z');

    expect(snapshot.columns).toHaveLength(2); // Only column types
    expect(snapshot.columns[0]).toEqual({
      sourceHeader: 'Name',
      canonicalKey: 'athlete_name',
      displayName: 'Player Name',
      order: 0,
      isVisible: true,
      unit: 'string',
      transform: null,
    });

    expect(snapshot.columns[1]).toEqual({
      sourceHeader: 'Distance',
      canonicalKey: 'total_distance_m',
      displayName: 'Total Distance',
      order: 1,
      isVisible: true,
      unit: 'm',
      transform: 'parseFloat',
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
