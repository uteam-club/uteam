import { suggestCanonical } from '../suggest';

describe('suggestCanonical', () => {
  test('should suggest total_distance_m for TD variations', () => {
    expect(suggestCanonical('TD')).toBe('total_distance_m');
    expect(suggestCanonical('Total Distance')).toBe('total_distance_m');
    expect(suggestCanonical('distance_total')).toBe('total_distance_m');
  });

  test('should suggest max_speed_ms for Max Speed variations', () => {
    expect(suggestCanonical('Max Speed')).toBe('max_speed_ms');
    expect(suggestCanonical('maxspeedkmh')).toBe('max_speed_ms');
    expect(suggestCanonical('max_speed')).toBe('max_speed_ms');
  });

  test('should suggest hsr_ratio for HSR% variations', () => {
    expect(suggestCanonical('HSR%')).toBe('hsr_ratio');
    expect(suggestCanonical('HSR %')).toBe('hsr_ratio');
    expect(suggestCanonical('hsr_ratio')).toBe('hsr_ratio');
  });

  test('should suggest hsr_distance_m for HSR distance variations', () => {
    expect(suggestCanonical('HSR')).toBe('hsr_distance_m');
    expect(suggestCanonical('High Speed Running')).toBe('hsr_distance_m');
    expect(suggestCanonical('highspeedrunning')).toBe('hsr_distance_m');
  });

  test('should suggest zone metrics for zone variations', () => {
    expect(suggestCanonical('Z-3')).toBe('distance_zone3_m');
    expect(suggestCanonical('Z 4')).toBe('distance_zone4_m');
    expect(suggestCanonical('Z5')).toBe('distance_zone5_m');
    expect(suggestCanonical('tempo')).toBe('distance_zone3_m');
    expect(suggestCanonical('HIR')).toBe('distance_zone4_m');
    expect(suggestCanonical('sprint')).toBe('distance_zone5_m');
  });

  test('should suggest acc_count for accelerations', () => {
    expect(suggestCanonical('Acc')).toBe('acc_count');
    expect(suggestCanonical('accelerations')).toBe('acc_count');
    expect(suggestCanonical('acceleration')).toBe('acc_count');
  });

  test('should suggest dec_count for decelerations', () => {
    expect(suggestCanonical('Dec')).toBe('dec_count');
    expect(suggestCanonical('decelerations')).toBe('dec_count');
    expect(suggestCanonical('deceleration')).toBe('dec_count');
  });

  test('should suggest duration_s for time variations', () => {
    expect(suggestCanonical('Time')).toBe('duration_s');
    expect(suggestCanonical('duration')).toBe('duration_s');
    expect(suggestCanonical('minutesplayed')).toBe('duration_s');
    expect(suggestCanonical('minplayed')).toBe('duration_s');
  });

  test('should suggest sprint_count for sprints', () => {
    expect(suggestCanonical('Sprints')).toBe('sprint_count');
    expect(suggestCanonical('sprint')).toBe('distance_zone5_m'); // zone takes precedence
  });

  test('should suggest avg_speed_ms for speed variations', () => {
    expect(suggestCanonical('m/min')).toBe('avg_speed_ms');
    expect(suggestCanonical('mmin')).toBe('avg_speed_ms');
    expect(suggestCanonical('avg')).toBe('avg_speed_ms');
    expect(suggestCanonical('average')).toBe('avg_speed_ms');
  });

  test('should handle cyrillic characters', () => {
    expect(suggestCanonical('ТД')).toBe('total_distance_m');
    expect(suggestCanonical('Время')).toBe('duration_s');
  });

  test('should handle special characters and spaces', () => {
    expect(suggestCanonical('  TD  ')).toBe('total_distance_m');
    expect(suggestCanonical('Max-Speed')).toBe('max_speed_ms');
    expect(suggestCanonical('HSR_%')).toBe('hsr_ratio');
    expect(suggestCanonical('Z - 3')).toBe('distance_zone3_m');
  });

  test('should return null for unknown headers', () => {
    expect(suggestCanonical('Unknown Header')).toBeNull();
    expect(suggestCanonical('Random Text')).toBeNull();
    expect(suggestCanonical('')).toBeNull();
  });

  test('should handle null and undefined inputs', () => {
    expect(suggestCanonical(null as any)).toBeNull();
    expect(suggestCanonical(undefined as any)).toBeNull();
  });

  test('should be case insensitive', () => {
    expect(suggestCanonical('td')).toBe('total_distance_m');
    expect(suggestCanonical('MAX SPEED')).toBe('max_speed_ms');
    expect(suggestCanonical('hsr%')).toBe('hsr_ratio');
  });
});
