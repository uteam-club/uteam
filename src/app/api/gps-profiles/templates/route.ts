import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Стандартные шаблоны для разных GPS систем
  const templates = {
    'B-SIGHT': {
      name: 'B-SIGHT Стандартный',
      description: 'Стандартный профиль для системы B-SIGHT',
      gpsSystem: 'B-SIGHT',
      columns: [
        {
          name: 'Player',
          type: 'column',
          order: 1,
          mappedColumn: 'Player',
          displayName: 'Игрок',
          dataType: 'string',
          isVisible: true
        },
        {
          name: 'Position',
          type: 'column',
          order: 2,
          mappedColumn: 'Position',
          displayName: 'Позиция',
          dataType: 'string',
          isVisible: true
        },
        {
          name: 'Time',
          type: 'column',
          order: 3,
          mappedColumn: 'Time',
          displayName: 'Время',
          dataType: 'string',
          isVisible: true
        },
        {
          name: 'Total distance',
          type: 'column',
          order: 4,
          mappedColumn: 'TD',
          displayName: 'Общая дистанция',
          dataType: 'number',
          isVisible: true
        },
        {
          name: 'Zone 3',
          type: 'column',
          order: 5,
          mappedColumn: 'Z-3 Tempo',
          displayName: 'Зона 3',
          dataType: 'number',
          isVisible: true
        },
        {
          name: 'Zone 4',
          type: 'column',
          order: 6,
          mappedColumn: 'Z-4 HIR',
          displayName: 'Зона 4',
          dataType: 'number',
          isVisible: true
        },
        {
          name: 'Zone 5',
          type: 'column',
          order: 7,
          mappedColumn: 'Z-5 Sprint',
          displayName: 'Зона 5',
          dataType: 'number',
          isVisible: true
        },
        {
          name: 'HSR',
          type: 'column',
          order: 8,
          mappedColumn: 'HSR',
          displayName: 'Высокоинтенсивный бег',
          dataType: 'number',
          isVisible: true
        },
        {
          name: 'HSR%',
          type: 'column',
          order: 9,
          mappedColumn: 'HSR%',
          displayName: 'HSR %',
          dataType: 'number',
          isVisible: true
        },
        {
          name: 'Sprints',
          type: 'column',
          order: 10,
          mappedColumn: 'Sprints',
          displayName: 'Спринты',
          dataType: 'number',
          isVisible: true
        },
        {
          name: 'm/min',
          type: 'column',
          order: 11,
          mappedColumn: 'm/min',
          displayName: 'М/мин',
          dataType: 'number',
          isVisible: true
        },
        {
          name: 'Acc',
          type: 'column',
          order: 12,
          mappedColumn: 'Acc',
          displayName: 'Ускорения',
          dataType: 'number',
          isVisible: true
        },
        {
          name: 'Dec',
          type: 'column',
          order: 13,
          mappedColumn: 'Dec',
          displayName: 'Торможения',
          dataType: 'number',
          isVisible: true
        },
        {
          name: 'Max speed',
          type: 'column',
          order: 14,
          mappedColumn: 'Max Speed',
          displayName: 'Максимальная скорость',
          dataType: 'number',
          isVisible: true
        }
      ]
    },
    'Polar': {
      name: 'Polar Стандартный',
      description: 'Стандартный профиль для системы Polar',
      gpsSystem: 'Polar',
      columns: [
        {
          name: 'Player',
          type: 'column',
          order: 1,
          mappedColumn: 'Player',
          displayName: 'Игрок',
          dataType: 'string',
          isVisible: true
        },
        {
          name: 'Time',
          type: 'column',
          order: 2,
          mappedColumn: 'Time',
          displayName: 'Время',
          dataType: 'string',
          isVisible: true
        },
        {
          name: 'Total distance',
          type: 'column',
          order: 3,
          mappedColumn: 'Total Distance',
          displayName: 'Общая дистанция',
          dataType: 'number',
          isVisible: true
        },
        {
          name: 'Average speed',
          type: 'column',
          order: 4,
          mappedColumn: 'Average Speed',
          displayName: 'Средняя скорость',
          dataType: 'number',
          isVisible: true
        },
        {
          name: 'Max speed',
          type: 'column',
          order: 5,
          mappedColumn: 'Max Speed',
          displayName: 'Максимальная скорость',
          dataType: 'number',
          isVisible: true
        },
        {
          name: 'Sprints',
          type: 'column',
          order: 6,
          mappedColumn: 'Sprints',
          displayName: 'Спринты',
          dataType: 'number',
          isVisible: true
        }
      ]
    },
    'Catapult': {
      name: 'Catapult Стандартный',
      description: 'Стандартный профиль для системы Catapult',
      gpsSystem: 'Catapult',
      columns: [
        {
          name: 'Player',
          type: 'column',
          order: 1,
          mappedColumn: 'Player',
          displayName: 'Игрок',
          dataType: 'string',
          isVisible: true
        },
        {
          name: 'Time',
          type: 'column',
          order: 2,
          mappedColumn: 'Time',
          displayName: 'Время',
          dataType: 'string',
          isVisible: true
        },
        {
          name: 'Total distance',
          type: 'column',
          order: 3,
          mappedColumn: 'Total Distance',
          displayName: 'Общая дистанция',
          dataType: 'number',
          isVisible: true
        },
        {
          name: 'High speed distance',
          type: 'column',
          order: 4,
          mappedColumn: 'High Speed Distance',
          displayName: 'Дистанция на высокой скорости',
          dataType: 'number',
          isVisible: true
        },
        {
          name: 'Sprint distance',
          type: 'column',
          order: 5,
          mappedColumn: 'Sprint Distance',
          displayName: 'Дистанция спринта',
          dataType: 'number',
          isVisible: true
        },
        {
          name: 'Accelerations',
          type: 'column',
          order: 6,
          mappedColumn: 'Accelerations',
          displayName: 'Ускорения',
          dataType: 'number',
          isVisible: true
        },
        {
          name: 'Decelerations',
          type: 'column',
          order: 7,
          mappedColumn: 'Decelerations',
          displayName: 'Торможения',
          dataType: 'number',
          isVisible: true
        }
      ]
    }
  };

  return NextResponse.json(templates);
} 