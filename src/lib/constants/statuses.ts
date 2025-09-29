/**
 * Единые стандарты статусов для системы
 * 
 * Разделение на два типа:
 * 1. PlayerStatus - статусы игроков в команде (общее состояние)
 * 2. AttendanceStatus - статусы посещаемости конкретных тренировок
 */

// Статусы игроков в команде (общее состояние)
export type PlayerStatus = 
  | 'ready' 
  | 'rehabilitation' 
  | 'sick' 
  | 'education' 
  | 'injury' 
  | 'national_team' 
  | 'other_team' 
  | 'other';

// Статусы посещаемости тренировок
export type AttendanceStatus = 
  | 'TRAINED' 
  | 'REHABILITATION' 
  | 'SICK' 
  | 'EDUCATION' 
  | 'INJURY' 
  | 'NATIONAL_TEAM' 
  | 'OTHER_TEAM' 
  | 'OTHER' 
  | 'NOT_SET';

// Конфигурация статусов игроков
export const PLAYER_STATUS_CONFIG = {
  ready: {
    label: 'ready',
    color: 'bg-green-500',
    textColor: 'text-green-300',
    badgeColor: 'bg-green-500/20 text-green-300 border-green-500/30'
  },
  rehabilitation: {
    label: 'rehabilitation',
    color: 'bg-blue-500',
    textColor: 'text-blue-300',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
  },
  sick: {
    label: 'sick',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-300',
    badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
  },
  education: {
    label: 'education',
    color: 'bg-purple-500',
    textColor: 'text-purple-300',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
  },
  injury: {
    label: 'injury',
    color: 'bg-red-500',
    textColor: 'text-red-300',
    badgeColor: 'bg-red-500/20 text-red-300 border-red-500/30'
  },
  national_team: {
    label: 'national_team',
    color: 'bg-indigo-500',
    textColor: 'text-indigo-300',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
  },
  other_team: {
    label: 'other_team',
    color: 'bg-orange-500',
    textColor: 'text-orange-300',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30'
  },
  other: {
    label: 'other',
    color: 'bg-gray-500',
    textColor: 'text-gray-300',
    badgeColor: 'bg-gray-500/20 text-gray-300 border-gray-500/30'
  }
} as const;

// Конфигурация статусов посещаемости
export const ATTENDANCE_STATUS_CONFIG = {
  TRAINED: {
    label: 'TRAINED',
    color: 'bg-green-500',
    textColor: 'text-green-300',
    badgeColor: 'bg-green-500/20 text-green-300 border-green-500/30',
    buttonColor: 'bg-green-600 hover:bg-green-700'
  },
  REHABILITATION: {
    label: 'REHABILITATION',
    color: 'bg-blue-500',
    textColor: 'text-blue-300',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    buttonColor: 'bg-blue-600 hover:bg-blue-700'
  },
  SICK: {
    label: 'SICK',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-300',
    badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    buttonColor: 'bg-yellow-600 hover:bg-yellow-700'
  },
  EDUCATION: {
    label: 'EDUCATION',
    color: 'bg-purple-500',
    textColor: 'text-purple-300',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    buttonColor: 'bg-purple-600 hover:bg-purple-700'
  },
  INJURY: {
    label: 'INJURY',
    color: 'bg-red-500',
    textColor: 'text-red-300',
    badgeColor: 'bg-red-500/20 text-red-300 border-red-500/30',
    buttonColor: 'bg-red-600 hover:bg-red-700'
  },
  NATIONAL_TEAM: {
    label: 'NATIONAL_TEAM',
    color: 'bg-indigo-500',
    textColor: 'text-indigo-300',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    buttonColor: 'bg-indigo-600 hover:bg-indigo-700'
  },
  OTHER_TEAM: {
    label: 'OTHER_TEAM',
    color: 'bg-orange-500',
    textColor: 'text-orange-300',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    buttonColor: 'bg-orange-600 hover:bg-orange-700'
  },
  OTHER: {
    label: 'OTHER',
    color: 'bg-gray-500',
    textColor: 'text-gray-300',
    badgeColor: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    buttonColor: 'bg-gray-600 hover:bg-gray-700'
  },
  NOT_SET: {
    label: 'NOT_SET',
    color: 'bg-slate-500',
    textColor: 'text-slate-300',
    badgeColor: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    buttonColor: 'bg-slate-500 hover:bg-slate-600'
  }
} as const;

// Маппинг между статусами игроков и посещаемости
export const PLAYER_TO_ATTENDANCE_STATUS_MAP: Record<PlayerStatus, AttendanceStatus> = {
  ready: 'TRAINED',
  rehabilitation: 'REHABILITATION',
  sick: 'SICK',
  education: 'EDUCATION',
  injury: 'INJURY',
  national_team: 'NATIONAL_TEAM',
  other_team: 'OTHER_TEAM',
  other: 'OTHER'
};

// Обратный маппинг (для случаев, когда нужно получить статус игрока из статуса посещаемости)
export const ATTENDANCE_TO_PLAYER_STATUS_MAP: Partial<Record<AttendanceStatus, PlayerStatus>> = {
  TRAINED: 'ready',
  REHABILITATION: 'rehabilitation',
  SICK: 'sick',
  EDUCATION: 'education',
  INJURY: 'injury',
  NATIONAL_TEAM: 'national_team',
  OTHER_TEAM: 'other_team',
  OTHER: 'other'
  // NOT_SET не имеет соответствующего статуса игрока
};

// Вспомогательные функции
export const getPlayerStatusConfig = (status: PlayerStatus) => PLAYER_STATUS_CONFIG[status];
export const getAttendanceStatusConfig = (status: AttendanceStatus) => ATTENDANCE_STATUS_CONFIG[status];

export const getAttendanceStatusFromPlayerStatus = (playerStatus: PlayerStatus): AttendanceStatus => {
  return PLAYER_TO_ATTENDANCE_STATUS_MAP[playerStatus];
};

export const getPlayerStatusFromAttendanceStatus = (attendanceStatus: AttendanceStatus): PlayerStatus | null => {
  return ATTENDANCE_TO_PLAYER_STATUS_MAP[attendanceStatus] || null;
};
