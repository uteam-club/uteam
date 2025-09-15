'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Settings, Trash2, Edit, Archive, ArchiveRestore } from 'lucide-react';
import { GpsProfile } from '@/types/gps';
import { fetchGpsProfiles } from '@/lib/gps-api';
import { useClub } from '@/providers/club-provider';
import ConfigureGpsProfileModal from './ConfigureGpsProfileModal';
import EditGpsProfileModal from './EditGpsProfileModal';
import GpsProfileDetailsModal from './GpsProfileDetailsModal';

interface GpsProfileWithCount extends GpsProfile {
  usedReportsCount: number;
}

export default function GpsProfilesTab() {
  const { club } = useClub();
  const [profiles, setProfiles] = useState<GpsProfileWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfigureModal, setShowConfigureModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<GpsProfile | null>(null);

  const loadProfiles = async () => {
    if (!club?.id) return;
    
    setLoading(true);
    try {
      const data = await fetchGpsProfiles(club.id);
      console.debug('[profiles]', data.slice(0,3));
      // Use usedReportsCount from API, fallback to 0 if not present
      const profilesWithCount = data.map(profile => ({
        ...profile,
        usedReportsCount: (profile as any).usedReportsCount ?? 0
      }));
      setProfiles(profilesWithCount);
    } catch (error) {
      console.error('Error loading GPS profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, [club?.id]);

  const handleCreateProfile = () => {
    setSelectedProfile(null);
    setShowConfigureModal(true);
  };

  const handleEditProfile = (profile: GpsProfile) => {
    setSelectedProfile(profile);
    setShowEditModal(true);
  };

  const handleViewDetails = (profile: GpsProfile) => {
    setSelectedProfile(profile);
    setShowDetailsModal(true);
  };

  const handleDeleteProfile = async (profile: GpsProfileWithCount) => {
    if (profile.usedReportsCount > 0) {
      // Show toast instead of confirmation
      alert('Профиль используется в отчетах и не может быть удалён. Архивируйте профиль вместо удаления.');
      return;
    }

    if (!confirm(`Вы уверены, что хотите удалить профиль "${profile.name}"?`)) {
      return;
    }

    try {
      // TODO: Implement delete API call
      console.log('Delete profile:', profile.id);
      await loadProfiles();
    } catch (error) {
      console.error('Error deleting profile:', error);
    }
  };

  const handleArchiveProfile = async (profile: GpsProfileWithCount) => {
    try {
      const response = await fetch(`/api/gps/profiles/${profile.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: false }),
      });

      if (!response.ok) {
        throw new Error('Failed to archive profile');
      }

      await loadProfiles();
    } catch (error) {
      console.error('Error archiving profile:', error);
    }
  };

  const handleUnarchiveProfile = async (profile: GpsProfileWithCount) => {
    try {
      const response = await fetch(`/api/gps/profiles/${profile.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to unarchive profile');
      }

      await loadProfiles();
    } catch (error) {
      console.error('Error unarchiving profile:', error);
    }
  };

  const handleProfileCreated = () => {
    setShowConfigureModal(false);
    loadProfiles();
  };

  const handleProfileUpdated = () => {
    setShowEditModal(false);
    loadProfiles();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-vista-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button 
          variant="outline"
          onClick={handleCreateProfile} 
          className="w-full sm:w-[200px] bg-transparent border-vista-primary/40 text-vista-primary hover:bg-vista-primary/15 h-9 px-2 font-normal text-sm"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Создать профиль
        </Button>
      </div>

      {profiles.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-vista-secondary/50 shadow-md rounded-md">
          <Settings className="h-12 w-12 text-vista-light/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-vista-light">Нет GPS профилей</h3>
          <p className="text-vista-light/60 text-center">
            Создайте первый GPS профиль для настройки системы
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <div 
              key={profile.id} 
              className="rounded-lg border border-vista-secondary/50 bg-vista-dark/70 hover:bg-vista-dark/90 transition-all overflow-hidden flex flex-col shadow-md hover:shadow-xl"
            >
              <div className="p-5 flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-vista-light">{profile.name}</h3>
                    <p className="text-sm text-vista-light/70">
                      {profile.gpsSystem}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Badge className="bg-vista-secondary/20 text-vista-light border border-vista-secondary/50 shadow-md font-normal text-xs">
                      {profile.gpsSystem}
                    </Badge>
                    {profile.usedReportsCount > 0 && (
                      <Badge className="bg-vista-primary/20 text-vista-primary border border-vista-primary/30 font-normal text-xs">
                        В использовании ({profile.usedReportsCount})
                      </Badge>
                    )}
                    <Badge className={`${profile.isActive ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-orange-500/20 text-orange-400 border-orange-500/30'} border font-normal text-xs`}>
                      {profile.isActive ? "Активен" : "Архив"}
                    </Badge>
                  </div>
                </div>
                
                {profile.description && (
                  <p className="text-sm text-vista-light/60 mb-4">
                    {profile.description}
                  </p>
                )}
              </div>
              
              <div className="p-5 pt-0">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetails(profile)}
                    className="flex-1 bg-vista-dark/30 backdrop-blur-sm border-vista-light/20 text-vista-light/70 hover:bg-vista-light/10 hover:border-vista-light/40 hover:text-vista-light focus:border-vista-light/50 focus:ring-1 focus:ring-vista-light/30 h-8 px-3 font-normal text-xs shadow-lg"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Настроить
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditProfile(profile)}
                    className="bg-vista-dark/30 backdrop-blur-sm border-vista-light/20 text-vista-light/70 hover:bg-vista-light/10 hover:border-vista-light/40 hover:text-vista-light focus:border-vista-light/50 focus:ring-1 focus:ring-vista-light/30 h-8 px-3 font-normal text-xs shadow-lg"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {profile.isActive ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleArchiveProfile(profile)}
                      className="bg-vista-dark/30 backdrop-blur-sm border-orange-500/30 text-orange-400 hover:bg-orange-500/20 hover:border-orange-500/40 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30 h-8 px-3 font-normal text-xs shadow-lg"
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnarchiveProfile(profile)}
                      className="bg-vista-dark/30 backdrop-blur-sm border-green-500/30 text-green-400 hover:bg-green-500/20 hover:border-green-500/40 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 h-8 px-3 font-normal text-xs shadow-lg"
                    >
                      <ArchiveRestore className="h-4 w-4" />
                    </Button>
                  )}
                  {profile.usedReportsCount === 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteProfile(profile)}
                      className="bg-vista-dark/30 backdrop-blur-sm border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-500/40 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 h-8 px-3 font-normal text-xs shadow-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showConfigureModal && (
        <ConfigureGpsProfileModal
          open={showConfigureModal}
          onOpenChange={setShowConfigureModal}
          onProfileCreated={handleProfileCreated}
        />
      )}

      {showEditModal && selectedProfile && (
        <EditGpsProfileModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          profile={selectedProfile}
          onProfileUpdated={handleProfileUpdated}
        />
      )}

      {showDetailsModal && selectedProfile && (
        <GpsProfileDetailsModal
          open={showDetailsModal}
          onOpenChange={setShowDetailsModal}
          profile={selectedProfile}
        />
      )}
    </div>
  );
}
