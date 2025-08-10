import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserIcon } from 'lucide-react';
import React from 'react';
import OptimizedImage from '@/components/ui/OptimizedImage';

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  number?: number;
  position?: string;
  imageUrl?: string;
  status?: string;
}

interface PlayersByStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  players: Player[];
  statusTitle: string;
  selectedStatus: string | null;
}

export function PlayersByStatusModal({
  open,
  onOpenChange,
  players,
  statusTitle,
  selectedStatus,
}: PlayersByStatusModalProps) {
  const filteredPlayers = players.filter(p =>
    selectedStatus === 'ready'
      ? p && (p.status === 'ready' || !p.status)
      : p && p.status === selectedStatus
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-vista-dark/95 border border-vista-secondary/30 text-vista-light shadow-xl rounded-xl max-w-md overflow-hidden backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-vista-light text-xl">
            Игроки со статусом &quot;{statusTitle}&quot;
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 max-h-[350px] overflow-y-auto">
          {filteredPlayers.length > 0 ? (
            <div className="space-y-2">
              {filteredPlayers.map(player => (
                <div key={player.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-vista-dark/70">
                  {player.imageUrl ? (
                    <div className="w-10 h-10 rounded-full overflow-hidden mr-3 relative bg-gradient-to-t from-[rgba(52,64,84,0.5)] to-[rgba(230,247,255,0.65)]">
                      <OptimizedImage
                        src={player.imageUrl}
                        alt={`${player.firstName} ${player.lastName}`}
                        width={40}
                        height={40}
                        objectFit="cover"
                        showSkeleton={false}
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
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-vista-light/70">Нет игроков с этим статусом</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 