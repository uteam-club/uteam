import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, Activity, Tag, Trophy, Users } from 'lucide-react';

interface EventInfoCardsProps {
  eventType: 'training' | 'match';
  eventData: {
    // Для тренировки
    title?: string;
    date?: string;
    time?: string | null;
    type?: string | null; // 'TRAINING' | 'GYM'
    categoryName?: string;
    category?: string; // альтернативное поле для названия категории
    
    // Для матча
    competitionType?: string;
    isHome?: boolean;
    opponentName?: string;
    teamGoals?: number;
    opponentGoals?: number;
    homeTeamName?: string;
  };
}

export default function EventInfoCards({ eventType, eventData }: EventInfoCardsProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Не указано';
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (timeString?: string | null) => {
    if (!timeString) return 'Не указано';
    return timeString;
  };

  const getEventTypeLabel = () => {
    if (eventType === 'match') return 'Матч';
    if (eventData.type === 'GYM') return 'Тренажерный зал';
    return 'Тренировка';
  };

  const getEventTypeIcon = () => {
    if (eventType === 'match') return <Trophy className="h-4 w-4" />;
    if (eventData.type === 'GYM') return <Activity className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  const getTagOrStatusLabel = () => {
    if (eventType === 'match') {
      // Статус матча
      const statusMap: Record<string, string> = {
        'FRIENDLY': 'Товарищеский',
        'CUP': 'Кубок',
        'LEAGUE': 'Лига',
        'CHAMPIONSHIP': 'Чемпионат'
      };
      return statusMap[eventData.competitionType || ''] || eventData.competitionType || 'Не указано';
    } else {
      // Тег тренировки - проверяем оба поля
      return eventData.categoryName || eventData.category || 'Без категории';
    }
  };

  const getTitleLabel = () => {
    if (eventType === 'match') {
      // Название матча: Домашняя команда - Счет - Гостевая команда
      const homeTeam = eventData.isHome ? 'Наша команда' : eventData.homeTeamName || 'Наша команда';
      const awayTeam = eventData.isHome ? eventData.opponentName : 'Наша команда';
      const score = `${eventData.teamGoals || 0} - ${eventData.opponentGoals || 0}`;
      return `${homeTeam} ${score} ${awayTeam}`;
    } else {
      // Название тренировки
      return eventData.title || 'Без названия';
    }
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Плитка 1: Дата и время */}
      <Card className="bg-vista-dark/30 border-vista-secondary/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-vista-light/60 text-xs font-medium mb-2">
            <Calendar className="h-4 w-4" />
            <span>Дата и время</span>
          </div>
          <div className="text-vista-light text-sm font-medium">
            {formatDate(eventData.date)} {formatTime(eventData.time)}
          </div>
        </CardContent>
      </Card>

      {/* Плитка 2: Тип события */}
      <Card className="bg-vista-dark/30 border-vista-secondary/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-vista-light/60 text-xs font-medium mb-2">
            {getEventTypeIcon()}
            <span>Тип события</span>
          </div>
          <div className="text-vista-light text-sm font-medium">
            {getEventTypeLabel()}
          </div>
        </CardContent>
      </Card>

      {/* Плитка 3: Тег/Статус */}
      <Card className="bg-vista-dark/30 border-vista-secondary/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-vista-light/60 text-xs font-medium mb-2">
            <Tag className="h-4 w-4" />
            <span>{eventType === 'match' ? 'Статус матча' : 'Тег тренировки'}</span>
          </div>
          <div className="text-vista-light text-sm font-medium">
            {getTagOrStatusLabel()}
          </div>
        </CardContent>
      </Card>

      {/* Плитка 4: Название/Титульная информация */}
      <Card className="bg-vista-dark/30 border-vista-secondary/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-vista-light/60 text-xs font-medium mb-2">
            <Users className="h-4 w-4" />
            <span>{eventType === 'match' ? 'Матч' : 'Название'}</span>
          </div>
          <div className="text-vista-light text-sm font-medium">
            {getTitleLabel()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
