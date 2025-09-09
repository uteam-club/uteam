import { NextRequest } from 'next/server';
import { DELETE } from '../[id]/route';

// Mock database
const mockDb = {
  select: jest.fn(),
  delete: jest.fn(),
};

jest.mock('@/lib/db', () => ({
  db: mockDb,
}));

// Mock auth
jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn(),
}));

jest.mock('@/services/user.service', () => ({
  getUserPermissions: jest.fn(),
  getClubBySubdomain: jest.fn(),
}));

jest.mock('@/lib/permissions', () => ({
  hasPermission: jest.fn(),
}));

jest.mock('@/lib/utils', () => ({
  getSubdomain: jest.fn(),
}));

describe('GPS Profile Delete Guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock auth
    const { getToken } = require('next-auth/jwt');
    getToken.mockResolvedValue({ id: 'user-1', clubId: 'club-1' });
    
    // Mock permissions
    const { getUserPermissions } = require('@/services/user.service');
    const { hasPermission } = require('@/lib/permissions');
    getUserPermissions.mockResolvedValue(['gpsProfiles.delete']);
    hasPermission.mockReturnValue(true);
    
    // Mock club access
    const { getClubBySubdomain } = require('@/services/user.service');
    const { getSubdomain } = require('@/lib/utils');
    getSubdomain.mockReturnValue('test-club');
    getClubBySubdomain.mockResolvedValue({ id: 'club-1' });
  });

  it('should allow deletion of unused profile', async () => {
    // Mock profile exists
    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{ id: 'profile-1', clubId: 'club-1' }])
      })
    });

    // Mock no usage
    mockDb.select.mockReturnValueOnce({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{ count: 0 }])
      })
    });

    // Mock deletion
    mockDb.delete.mockReturnValue({
      where: jest.fn().mockResolvedValue(undefined)
    });

    const request = new NextRequest('http://localhost/api/gps-profiles/profile-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: { id: 'profile-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should prevent deletion of used profile', async () => {
    // Mock profile exists
    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{ id: 'profile-1', clubId: 'club-1' }])
      })
    });

    // Mock usage count
    mockDb.select.mockReturnValueOnce({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{ count: 3 }])
      })
    });

    const request = new NextRequest('http://localhost/api/gps-profiles/profile-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: { id: 'profile-1' } });
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe('PROFILE_IN_USE');
    expect(data.usageCount).toBe(3);
    expect(data.message).toContain('3 отчётах');
  });

  it('should return 404 for non-existent profile', async () => {
    // Mock profile not found
    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([])
      })
    });

    const request = new NextRequest('http://localhost/api/gps-profiles/non-existent', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: { id: 'non-existent' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Profile not found');
  });
});
