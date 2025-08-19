import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { UserIcon } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  number?: number;
  position?: string;
  imageUrl?: string;
}

interface DeletePlayersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  players: Player[];
  selectedPlayerIds: string[];
  isDeleting: boolean;
  deleteError: string;
  onPlayerSelect: (playerId: string, checked: boolean) => void;
  onDelete: () => void;
}

export function DeletePlayersModal({
  open,
  onOpenChange,
  players,
  selectedPlayerIds,
  isDeleting,
  deleteError,
  onPlayerSelect,
  onDelete,
}: DeletePlayersModalProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-vista-dark/95 border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-md overflow-hidden backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-vista-light text-xl">{t('teamPage.delete_players_modal_title')}</DialogTitle>
          <DialogDescription className="text-vista-light/70">
            {t('teamPage.delete_players_modal_desc')}
          </DialogDescription>
        </DialogHeader>
        {deleteError && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-500">
            {deleteError}
          </div>
        )}
        <div className="py-4 max-h-[300px] overflow-y-auto custom-scrollbar">
          {players.length > 0 ? (
            <div className="space-y-2">
              {players.map(player => (
                <div key={player.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-vista-dark/70">
                  <Checkbox
                    id={`player-${player.id}`}
                    checked={selectedPlayerIds.includes(player.id)}
                    onCheckedChange={(checked) => onPlayerSelect(player.id, checked === true)}
                    className="border-vista-secondary/50 focus:outline-none focus:ring-0"
                  />
                  <Label htmlFor={`player-${player.id}`} className="cursor-pointer flex-1 flex items-center">
                    <div className="flex items-center w-full">
                      {player.imageUrl ? (
                        <div className="w-10 h-10 rounded-full overflow-hidden mr-3 relative bg-gradient-to-t from-[rgba(52,64,84,0.5)] to-[rgba(230,247,255,0.65)]">
                          <img
                            src={player.imageUrl}
                            alt={`${player.firstName} ${player.lastName}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full mr-3 flex items-center justify-center bg-gradient-to-t from-[rgba(52,64,84,0.5)] to-[rgba(230,247,255,0.65)]">
                          <UserIcon className="w-5 h-5 text-slate-300" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-vista-light font-medium">{player.lastName} {player.firstName}</p>
                        {player.position && <p className="text-xs text-vista-light/70">{player.position}</p>}
                      </div>
                      {player.number && (
                        <div className="ml-auto bg-vista-primary/20 rounded-full w-6 h-6 flex items-center justify-center">
                          <span className="text-xs font-medium text-vista-primary">{player.number}</span>
                        </div>
                      )}
                    </div>
                  </Label>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-vista-light/70">{t('teamPage.no_players')}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="border-vista-secondary/30 text-vista-light hover:bg-vista-secondary/20 focus:outline-none focus:ring-0"
          >
            {t('teamPage.cancel')}
          </Button>
          <Button
            type="button"
            onClick={onDelete}
            disabled={isDeleting || selectedPlayerIds.length === 0}
            className="bg-red-500/80 hover:bg-red-500 text-white focus:outline-none focus:ring-0"
          >
            {isDeleting ? (
              <>
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                {t('teamPage.deleting')}
              </>
            ) : (
              `${t('teamPage.delete')} ${selectedPlayerIds.length ? `(${selectedPlayerIds.length})` : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 