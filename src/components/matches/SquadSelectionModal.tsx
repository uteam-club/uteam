import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { CheckCircle2, CircleAlert, CircleDashed, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export enum PlayerSquadStatus {
  STARTER = 'STARTER',
  SUBSTITUTE = 'SUBSTITUTE',
  RESERVE = 'RESERVE',
}

interface TeamPlayer {
  id: string;
  firstName: string;
  lastName: string;
  number?: number;
  position?: string;
  imageUrl?: string;
}

type SquadPlayers = Record<string, PlayerSquadStatus>;

interface SquadSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamPlayers: TeamPlayer[];
  squadPlayers: SquadPlayers;
  isLoadingPlayers: boolean;
  handlePlayerStatusChange: (playerId: string, status: PlayerSquadStatus) => void;
  savingSquad: boolean;
  onSave: () => void;
  onCancel: () => void;
}

const SquadSelectionModal: React.FC<SquadSelectionModalProps> = (props) => {
  const { t } = useTranslation();
  
  console.log('SquadSelectionModal render:', {
    open: props.open,
    teamPlayersCount: props.teamPlayers.length,
    isLoadingPlayers: props.isLoadingPlayers,
    squadPlayersCount: Object.keys(props.squadPlayers).length
  });
  
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="bg-vista-dark border-vista-secondary/50 text-vista-light max-w-3xl max-h-[80vh] overflow-y-auto focus:outline-none focus:ring-0 custom-scrollbar z-[99999]">
        <DialogHeader>
          <DialogTitle className="text-vista-light text-xl">{t('squadModal.title')}</DialogTitle>
          <DialogDescription className="text-vista-light/70">
            {t('squadModal.description')}
          </DialogDescription>
        </DialogHeader>
        {/* Summary panel */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <Card className="bg-vista-dark-lighter border-vista-secondary/30">
            <CardContent className="p-4 flex flex-col items-center">
              <div className="text-sm text-vista-light/60 mb-1">{t('squadModal.starter')}</div>
              <div className="flex items-center">
                <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" />
                <span className="text-xl font-bold text-vista-light">
                  {Object.values(props.squadPlayers).filter(status => status === PlayerSquadStatus.STARTER).length}
                </span>
                <span className="text-vista-light/60 ml-1">/11</span>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-vista-dark-lighter border-vista-secondary/30">
            <CardContent className="p-4 flex flex-col items-center">
              <div className="text-sm text-vista-light/60 mb-1">{t('squadModal.substitute')}</div>
              <div className="flex items-center">
                <CircleAlert className="w-4 h-4 text-yellow-500 mr-2" />
                <span className="text-xl font-bold text-vista-light">
                  {Object.values(props.squadPlayers).filter(status => status === PlayerSquadStatus.SUBSTITUTE).length}
                </span>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-vista-dark-lighter border-vista-secondary/30">
            <CardContent className="p-4 flex flex-col items-center">
              <div className="text-sm text-vista-light/60 mb-1">{t('squadModal.reserve')}</div>
              <div className="flex items-center">
                <CircleDashed className="w-4 h-4 text-vista-light/50 mr-2" />
                <span className="text-xl font-bold text-vista-light">
                  {Object.values(props.squadPlayers).filter(status => status === PlayerSquadStatus.RESERVE).length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Players list */}
        <div className="space-y-4">
          {props.isLoadingPlayers ? (
            <div className="text-center py-8 text-vista-light/60">
              {t('squadModal.loading_players')}
            </div>
          ) : props.teamPlayers.length === 0 ? (
            <div className="text-center py-8 text-vista-light/60">
              {t('squadModal.no_players')}
            </div>
          ) : (
            props.teamPlayers.map((player) => (
              <Card key={player.id} className="bg-vista-dark-lighter border-vista-secondary/30">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 mr-3">
                      {player.imageUrl ? (
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-t from-[rgba(52,64,84,0.5)] to-[rgba(230,247,255,0.65)]">
                          <img
                            src={player.imageUrl}
                            alt={`${player.firstName} ${player.lastName}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-t from-[rgba(52,64,84,0.5)] to-[rgba(230,247,255,0.65)] flex items-center justify-center">
                          <User className="w-5 h-5 text-slate-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-vista-light flex items-center">
                        {player.number && (
                          <span className="text-xs px-1.5 py-0.5 bg-vista-primary/20 text-vista-primary rounded mr-2">
                            #{player.number}
                          </span>
                        )}
                        {player.firstName} {player.lastName}
                      </div>
                      {player.position && (
                        <div className="text-xs text-vista-light/60">
                          {player.position}
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className={`border-green-500 ${
                          props.squadPlayers[player.id] === PlayerSquadStatus.STARTER 
                            ? 'bg-green-500/30 text-green-300 font-medium border-2' 
                            : 'bg-transparent text-green-500/20 hover:text-green-500/60 hover:bg-green-500/5 border-green-500/20'
                        }`}
                        onClick={() => props.handlePlayerStatusChange(player.id, PlayerSquadStatus.STARTER)}
                      >
                        {t('squadModal.starter_btn')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={`border-yellow-500 ${
                          props.squadPlayers[player.id] === PlayerSquadStatus.SUBSTITUTE 
                            ? 'bg-yellow-500/30 text-yellow-300 font-medium border-2' 
                            : 'bg-transparent text-yellow-500/20 hover:text-yellow-500/60 hover:bg-yellow-500/5 border-yellow-500/20'
                        }`}
                        onClick={() => props.handlePlayerStatusChange(player.id, PlayerSquadStatus.SUBSTITUTE)}
                      >
                        {t('squadModal.substitute_btn')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={`border-vista-light/30 ${
                          props.squadPlayers[player.id] === PlayerSquadStatus.RESERVE 
                            ? 'bg-vista-light/20 text-vista-light font-medium border-2' 
                            : 'bg-transparent text-vista-light/20 hover:text-vista-light/40 hover:bg-vista-light/5 border-vista-light/10'
                        }`}
                        onClick={() => props.handlePlayerStatusChange(player.id, PlayerSquadStatus.RESERVE)}
                      >
                        {t('squadModal.reserve_btn')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            className="border-vista-secondary/50 text-vista-light focus:outline-none focus:ring-0"
            onClick={props.onCancel}
          >
            {t('squadModal.cancel')}
          </Button>
          <Button 
            className="bg-vista-primary/90 hover:bg-vista-primary text-vista-dark focus:outline-none focus:ring-0"
            disabled={props.savingSquad}
            onClick={props.onSave}
          >
            {props.savingSquad ? t('squadModal.saving') : t('squadModal.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SquadSelectionModal; 