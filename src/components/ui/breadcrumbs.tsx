'use client';

import Link from 'next/link';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';

type BreadcrumbItem = {
  label: string;
  href: string;
  isClickable?: boolean;
};

export interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  showHome?: boolean;
}

export function Breadcrumbs({ items = [], showHome = true }: BreadcrumbsProps) {
  const t = useTranslations('navigation');
  const pathname = usePathname();
  const locale = pathname.split('/')[1];
  
  // Добавляем состояние для хранения имен сущностей
  const [entityNames, setEntityNames] = useState<Record<string, string>>({});
  
  // Эффект для загрузки имен сущностей, если в пути есть ID
  useEffect(() => {
    const loadEntityNames = async () => {
      const asPathNestedRoutes = pathname.split('/').filter(v => v.length > 0);
      
      // Проверяем все сегменты пути на наличие ID
      for (let i = 0; i < asPathNestedRoutes.length; i++) {
        const segment = asPathNestedRoutes[i];
        const prevSegment = i > 0 ? asPathNestedRoutes[i-1] : '';
        
        // Если это ID и предыдущий сегмент - teams, загружаем имя команды
        if (/^[a-z0-9]{20,}$/i.test(segment) && prevSegment === 'teams') {
          try {
            const response = await fetch(`/api/teams/${segment}`);
            if (response.ok) {
              const team = await response.json();
              setEntityNames(prev => ({ ...prev, [segment]: team.name }));
            }
          } catch (error) {
            console.error('Ошибка загрузки имени команды:', error);
          }
        }
        
        // Если это ID и предыдущий сегмент - players, загружаем имя игрока и его команду
        if (/^[a-z0-9]{20,}$/i.test(segment) && prevSegment === 'players') {
          try {
            const response = await fetch(`/api/players/${segment}`);
            if (response.ok) {
              const player = await response.json();
              setEntityNames(prev => ({ 
                ...prev, 
                [segment]: `${player.firstName} ${player.lastName}`,
                [`team_${player.teamId}`]: player.team.name,
                [`player_team_${segment}`]: player.teamId
              }));
            }
          } catch (error) {
            console.error('Ошибка загрузки данных игрока:', error);
          }
        }
      }
    };
    
    loadEntityNames();
  }, [pathname]);
  
  const breadcrumbs = useMemo(() => {
    // Если переданы конкретные элементы, используем их
    if (items.length > 0) {
      return items;
    }
    
    // Иначе генерируем на основе текущего пути
    const asPathWithoutQuery = pathname.split('?')[0];
    const asPathNestedRoutes = asPathWithoutQuery.split('/').filter(v => v.length > 0);
    
    // Убираем локаль из пути
    const filteredPaths = asPathNestedRoutes.filter(path => path !== locale);
    
    // Проверяем, находимся ли мы на странице игрока
    const isPlayerPage = filteredPaths.includes('players') && filteredPaths.length > 3;
    const playerIdIndex = filteredPaths.indexOf('players') + 1;
    const playerId = isPlayerPage && playerIdIndex < filteredPaths.length ? filteredPaths[playerIdIndex] : null;
    
    // Изменяем пути для страницы игрока, чтобы включить команду
    let modifiedPaths = [...filteredPaths];
    if (isPlayerPage && playerId && entityNames[`player_team_${playerId}`]) {
      const teamId = entityNames[`player_team_${playerId}`];
      modifiedPaths = [
        ...filteredPaths.slice(0, filteredPaths.indexOf('players') - 1),
        'teams',
        teamId,
        playerId
      ];
    }
    
    // В фильтрованных путях первый элемент - это "dashboard", который мы обрабатываем особым образом
    const crumbList = modifiedPaths.map((subpath, idx) => {
      // Базовый href без изменений
      const baseHref = `/${locale}/${filteredPaths.slice(0, idx + 1).join('/')}`;
      // Для игрока формируем специальный href, который ведет на актуальную страницу
      const href = isPlayerPage && idx === modifiedPaths.length - 1 
        ? `/${locale}/dashboard/coaching/players/${playerId}`
        : baseHref;
      
      // Для dashboard используем ключ "home" вместо попытки перевести "dashboard"
      let label = '';
      if (subpath === 'dashboard') {
        label = t('home');
      } 
      // Если это ID (содержит буквы и цифры в длинной строке), используем имя сущности если доступно
      else if (/^[a-z0-9]{20,}$/i.test(subpath)) {
        // Если это ID команды и у нас есть информация о странице игрока
        if (isPlayerPage && idx === modifiedPaths.length - 2 && entityNames[`team_${subpath}`]) {
          label = entityNames[`team_${subpath}`];
        }
        // Если у нас есть имя для этого ID, используем его
        else if (entityNames[subpath]) {
          label = entityNames[subpath];
        } else {
          // Иначе определяем контекст по предыдущему сегменту пути
          const prevSegment = idx > 0 ? modifiedPaths[idx - 1] : '';
          
          if (prevSegment === 'players') {
            label = t('player');
          } else if (prevSegment === 'teams') {
            label = t('team');
          } else {
            // Для других типов ID просто используем общее название
            label = t('details', { defaultMessage: 'Детали' });
          }
        }
      } else {
        // Для остальных пытаемся найти перевод по ключу
        label = t(subpath, { defaultMessage: subpath });
      }
      
      // Определяем, должен ли элемент быть кликабельным
      const isClickable = 
        !(subpath === 'coaching' || subpath === 'teams' || 
          (isPlayerPage && idx === modifiedPaths.length - 2)); // не делаем кликабельным ID команды на странице игрока
      
      return { 
        href, 
        label,
        isClickable
      };
    });
    
    return crumbList;
  }, [items, pathname, locale, t, entityNames]);
  
  // Не показываем хлебные крошки если их нет
  if (breadcrumbs.length <= 1) {
    return null;
  }

  // Фильтруем хлебные крошки, удаляя первый элемент "dashboard" для отображения
  const visibleCrumbs = breadcrumbs.filter((crumb, idx) => {
    return !(idx === 0 && crumb.label === t('home'));
  });

  return (
    <nav className="flex py-3 bg-vista-dark-lighter">
      <ol className="container-app flex items-center flex-wrap text-sm">
        {visibleCrumbs.map((crumb, idx) => {
          return (
            <li key={idx} className="flex items-center">
              {idx > 0 && <ChevronRightIcon className="h-4 w-4 mx-2 text-vista-light/50" />}
              {idx === visibleCrumbs.length - 1 || !crumb.isClickable ? (
                <span className={`${idx === visibleCrumbs.length - 1 ? 'text-vista-primary font-medium' : 'text-vista-light/70'}`}>
                  {crumb.label}
                </span>
              ) : (
                <Link 
                  href={crumb.href}
                  className="text-vista-light/70 hover:text-vista-primary transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
} 