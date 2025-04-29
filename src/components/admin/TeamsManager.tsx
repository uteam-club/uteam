'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

type Team = {
  id: string;
  name: string;
  description?: string | null;
};

export function TeamsManager() {
  const t = useTranslations('admin');
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState('');
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentTeamToDelete, setCurrentTeamToDelete] = useState<string | null>(null);

  useEffect(() => {
    // Загрузка данных с сервера через API
    const fetchTeams = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/teams');
        
        if (!response.ok) {
          throw new Error('Ошибка загрузки команд: ' + response.statusText);
        }
        
        const data = await response.json();
        setTeams(data);
      } catch (error) {
        console.error('Ошибка загрузки команд:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  const handleAddTeam = async () => {
    if (!teamName.trim()) {
      setErrorMessage(t('nameRequired'));
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/admin/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: teamName.trim(),
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка создания команды');
      }
      
      const newTeam = await response.json();
      setTeams(prev => [...prev, newTeam]);
      setTeamName('');
      setIsDialogOpen(false);
      setErrorMessage('');
    } catch (error) {
      console.error('Ошибка добавления команды:', error);
      setErrorMessage(error instanceof Error ? error.message : t('errorAddingTeam'));
    } finally {
      setLoading(false);
    }
  };

  const handleEditTeam = async () => {
    if (!editingTeam || !teamName.trim()) {
      setErrorMessage(t('nameRequired'));
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/admin/teams', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingTeam.id,
          name: teamName.trim(),
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка обновления команды');
      }
      
      const updatedTeam = await response.json();
      
      setTeams(prev => 
        prev.map(team => 
          team.id === editingTeam.id ? updatedTeam : team
        )
      );
      
      setTeamName('');
      setEditingTeam(null);
      setIsDialogOpen(false);
      setErrorMessage('');
    } catch (error) {
      console.error('Ошибка редактирования команды:', error);
      setErrorMessage(error instanceof Error ? error.message : t('errorEditingTeam'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = async (id: string) => {
    setLoading(true);
    
    try {
      const response = await fetch(`/api/admin/teams?id=${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка удаления команды');
      }
      
      setTeams(prev => prev.filter(team => team.id !== id));
      setIsDeleteDialogOpen(false);
      setCurrentTeamToDelete(null);
    } catch (error) {
      console.error('Ошибка удаления команды:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (team: Team) => {
    setEditingTeam(team);
    setTeamName(team.name);
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (teamId: string) => {
    setCurrentTeamToDelete(teamId);
    setIsDeleteDialogOpen(true);
  };

  if (loading && teams.length === 0) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="w-8 h-8 animate-spin text-vista-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-vista-light">
          {t('teamsManagement')}
        </h2>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => {
                setEditingTeam(null);
                setTeamName('');
                setErrorMessage('');
              }}
              className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark">
              <Plus className="w-4 h-4 mr-2" />
              {t('addTeam')}
            </Button>
          </DialogTrigger>
          
          <DialogContent className="bg-vista-dark-secondary border border-vista-secondary/30">
            <DialogHeader>
              <DialogTitle className="text-vista-light">
                {editingTeam ? t('editTeam') : t('addTeam')}
              </DialogTitle>
            </DialogHeader>
            
            <div className="py-4">
              <Input
                value={teamName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTeamName(e.target.value)}
                placeholder={t('teamName')}
                className="bg-vista-dark border-vista-secondary/50 text-vista-light"
              />
              {errorMessage && (
                <p className="text-vista-error text-sm mt-2">{errorMessage}</p>
              )}
            </div>
            
            <DialogFooter>
              <DialogClose asChild>
                <Button 
                  variant="outline" 
                  className="border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20">
                  {t('cancel')}
                </Button>
              </DialogClose>
              <Button 
                onClick={editingTeam ? handleEditTeam : handleAddTeam}
                disabled={loading}
                className="bg-vista-primary hover:bg-vista-primary/90 text-vista-dark">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingTeam ? t('save') : t('add')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {teams.length === 0 ? (
        <div className="text-center py-10 text-vista-light/70">
          {t('noTeams')}
        </div>
      ) : (
        <div className="rounded-md border border-vista-secondary/30 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-vista-dark-secondary">
                <th className="text-left p-3 text-vista-light font-medium">{t('name')}</th>
                <th className="text-right p-3 w-24">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <tr 
                  key={team.id} 
                  className="border-t border-vista-secondary/30 hover:bg-vista-dark-secondary">
                  <td className="p-3 text-vista-light">{team.name}</td>
                  <td className="p-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(team)}
                      className="h-8 w-8 mr-1 text-vista-light/70 hover:text-vista-primary hover:bg-vista-secondary/20"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDeleteDialog(team.id)}
                      className="h-8 w-8 text-vista-light/70 hover:text-vista-error hover:bg-vista-secondary/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-vista-dark-secondary border border-vista-secondary/30">
          <DialogHeader>
            <DialogTitle className="text-vista-light">
              {t('confirmDeletion')}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-vista-light">
            {currentTeamToDelete && (
              t('teamDeleteConfirmation', { 
                name: teams.find(t => t.id === currentTeamToDelete)?.name || ''
              })
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button 
                variant="outline" 
                className="border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/20">
                {t('cancel')}
              </Button>
            </DialogClose>
            <Button 
              variant="destructive" 
              onClick={() => currentTeamToDelete && handleDeleteTeam(currentTeamToDelete)}
              disabled={loading}
              className="bg-vista-error hover:bg-vista-error/90 text-white">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 