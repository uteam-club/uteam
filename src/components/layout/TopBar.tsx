'use client';

import { useState, memo, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import OptimizedImage from '@/components/ui/OptimizedImage';
import { usePathname } from 'next/navigation';
import { useClub } from '@/providers/club-provider';
import { 
  ChevronDownIcon, 
  GlobeAltIcon,
  HomeIcon,
  UserIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { Dumbbell, CalendarDays, ListChecks } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import type { SupportedLang } from '@/types/i18n';

interface TopBarProps {
  userName: string;
  userRole: string;
}

interface NavItemDropdown {
  key: string;
  label: string;
  href: string;
  hasSubItems?: boolean;
  adminOnly?: boolean;
}

interface NavItem {
  key: string;
  label: string;
  href: string;
  hasDropdown?: boolean;
  dropdownItems?: NavItemDropdown[];
  icon?: React.ReactNode;
}

interface Team {
  id: string;
  name: string;
  order: number;
}

function TopBar({ userName, userRole }: TopBarProps) {
  const pathname = usePathname();
  const { club } = useClub();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [teamsDropdownOpen, setTeamsDropdownOpen] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [itemWidths, setItemWidths] = useState<Record<string, number>>({
    home: 140,
    coaching: 140,
    fitness: 140,
    calendar: 140,
    analytics: 140,
    documents: 140,
    settings: 140
  });
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { t } = useTranslation();
  const [isMounted, setIsMounted] = useState(false);
  const [lang, setLang] = useState<SupportedLang>(i18n.language === 'en' ? 'en' : 'ru');
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const langButtonRef = useRef<HTMLButtonElement>(null);

  const setItemRef = useCallback((key: string, element: HTMLDivElement | null) => {
    if (element) {
      itemRefs.current[key] = element;
    }
  }, []);

  const fetchTeams = async () => {
    try {
      setTeamsLoading(true);
      const response = await fetch('/api/teams');
      if (response.ok) {
        const data = await response.json();
        setTeams(data);
      }
    } catch (error) {
      console.error('Ошибка при получении команд:', error);
    } finally {
      setTeamsLoading(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (teams.length === 0 && !teamsLoading) {
      fetchTeams();
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
        setTeamsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  useEffect(() => {
    const updateWidths = () => {
      const newWidths: Record<string, number> = {};
      Object.keys(itemRefs.current).forEach(key => {
        const element = itemRefs.current[key];
        if (element) {
          // Используем фиксированную ширину 140px для всех элементов
          newWidths[key] = 140;
        }
      });
      setItemWidths(newWidths);
    };
    
    // Добавляем небольшую задержку для корректного измерения после рендера
    const timeoutId = setTimeout(updateWidths, 100);
    window.addEventListener('resize', updateWidths);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateWidths);
    };
  }, [teams, teamsLoading]); // Добавляем зависимости для обновления при изменении команд

  useEffect(() => {
    const storedLang = localStorage.getItem('lang');
    if (storedLang && storedLang !== lang) {
      const safeLang: SupportedLang = storedLang === 'en' ? 'en' : 'ru';
      i18n.changeLanguage(safeLang);
      setLang(safeLang);
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setLangDropdownOpen(false);
      }
    }
    if (langDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [langDropdownOpen]);

  if (!isMounted) return null;

  const closeAllMenus = () => {
    setActiveDropdown(null);
    setTeamsDropdownOpen(false);
  };

  const toggleDropdown = (key: string) => {
    if (key !== activeDropdown && teamsDropdownOpen) {
      setTeamsDropdownOpen(false);
    }
    
    // Устанавливаем фиксированную ширину 140px для всех элементов
    if (activeDropdown !== key) {
      setItemWidths(prev => ({
        ...prev,
        [key]: 140
      }));
    }
    
    setActiveDropdown(activeDropdown === key ? null : key);
  };

  const isDropdownActive = (key: string) => activeDropdown === key;

  const isActive = (item: NavItem) => {
    if (item.key === 'home') {
      return pathname === '/dashboard';
    }
    if (item.hasDropdown) {
      // Для раздела "ТРЕНЕРСКАЯ" проверяем также страницы тренировок, команд, упражнений и посещаемости
      if (item.key === 'coaching') {
        return pathname.startsWith(item.href) || 
               pathname.startsWith('/dashboard/training') ||
               pathname.startsWith('/dashboard/teams') ||
               pathname.startsWith('/dashboard/exercises') ||
               pathname.startsWith('/dashboard/analytics/attendance');
      }
      // Для раздела "ФИТНЕС" проверяем также страницы аналитики фитнеса
      if (item.key === 'fitness') {
        return pathname.startsWith(item.href) || 
               pathname.startsWith('/dashboard/analytics/fitness-tests');
      }
      // Для раздела "АНАЛИТИКА" проверяем также страницы опросов (но не посещаемости и не фитнеса)
      if (item.key === 'analytics') {
        return (pathname.startsWith(item.href) || 
               pathname.startsWith('/dashboard/survey') ||
               pathname.startsWith('/dashboard/morning-survey') ||
               pathname.startsWith('/dashboard/rpe-survey')) &&
               !pathname.startsWith('/dashboard/analytics/attendance') &&
               !pathname.startsWith('/dashboard/analytics/fitness-tests');
      }
      return pathname.startsWith(item.href);
    }
    return pathname === item.href;
  };

  // Функция для определения активного элемента в выпадающем списке
  const isDropdownItemActive = (dropdownItem: NavItemDropdown) => {
    if (dropdownItem.hasSubItems) {
      return pathname.startsWith('/dashboard/teams');
    }
    // Для упражнений проверяем только страницу упражнений
    if (dropdownItem.href === '/dashboard/coaching/exercises') {
      return pathname === dropdownItem.href || pathname.startsWith('/dashboard/training/exercises');
    }
    // Для тренировок проверяем только страницы тренировок (но не упражнений)
    if (dropdownItem.href === '/dashboard/coaching/trainings') {
      return (pathname === dropdownItem.href || pathname.startsWith('/dashboard/training')) && 
             !pathname.startsWith('/dashboard/training/exercises');
    }
    // Для матчей проверяем только страницу матчей
    if (dropdownItem.href === '/dashboard/coaching/matches') {
      return pathname === dropdownItem.href || pathname.startsWith('/dashboard/coaching/matches');
    }
    // Для посещаемости проверяем только страницу посещаемости
    if (dropdownItem.href === '/dashboard/analytics/attendance') {
      return pathname === dropdownItem.href || pathname.startsWith('/dashboard/analytics/attendance');
    }
    // Для фитнес-тестов проверяем только страницу фитнес-тестов
    if (dropdownItem.href === '/dashboard/analytics/fitness-tests') {
      return pathname === dropdownItem.href || pathname.startsWith('/dashboard/analytics/fitness-tests');
    }
    return pathname === dropdownItem.href;
  };

  const toggleTeamsDropdown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTeamsDropdownOpen(!teamsDropdownOpen);
  };

  const handleLinkClick = () => {
    closeAllMenus();
  };

  // --- Language Switcher Dropdown ---
  const languages = [
    { code: 'ru', label: 'Русский' },
    { code: 'en', label: 'English' },
  ];

  const handleLangButtonClick = () => {
    setLangDropdownOpen((open) => !open);
  };
  const handleLangSelect = (code: SupportedLang) => {
    i18n.changeLanguage(code);
    localStorage.setItem('lang', code);
    setLang(code);
    setLangDropdownOpen(false);
  };

  const navItems: NavItem[] = [
    { key: 'home', label: t('topbar.home'), href: '/dashboard', icon: <HomeIcon className="w-4 h-4 text-vista-primary flex-shrink-0" /> },
    { 
      key: 'coaching', 
      label: t('topbar.coaching'), 
      href: '/dashboard/coaching',
      icon: <UserIcon className="w-4 h-4 text-vista-primary flex-shrink-0" />,
      hasDropdown: true,
      dropdownItems: [
        ...(teams.length === 0
          ? [{ key: 'teams', label: t('dropdown.no_teams'), href: '/dashboard/teams', hasSubItems: true }]
          : teams.length === 1
            ? [{ key: 'team-single', label: teams[0].name, href: `/dashboard/teams/${teams[0].id}` }]
            : [{ key: 'teams', label: t('dropdown.teams'), href: '/dashboard/teams', hasSubItems: true }]),
        { key: 'exercises', label: t('dropdown.exercises'), href: '/dashboard/coaching/exercises' },
        { key: 'trainings', label: t('dropdown.trainings'), href: '/dashboard/coaching/trainings' },
        { key: 'matches', label: t('dropdown.matches'), href: '/dashboard/coaching/matches' },
        { key: 'attendance', label: t('dropdown.attendance'), href: '/dashboard/analytics/attendance' },
      ]
    },
    { key: 'fitness', label: t('topbar.fitness'), href: '/dashboard/fitness', icon: <Dumbbell className="w-4 h-4 text-vista-primary flex-shrink-0" />, hasDropdown: true, dropdownItems: [
      { key: 'fitness-tests', label: t('dropdown.fitness_tests'), href: '/dashboard/analytics/fitness-tests' },
    ] },
    { key: 'calendar', label: t('topbar.calendar'), href: '/dashboard/calendar', icon: <CalendarDays className="w-4 h-4 text-vista-primary flex-shrink-0" /> },
    { 
      key: 'analytics', 
      label: t('topbar.analytics'), 
      href: '/dashboard/analytics',
      icon: <ListChecks className="w-4 h-4 text-vista-primary flex-shrink-0" />,
      hasDropdown: true,
      dropdownItems: [
        { key: 'morning-survey', label: t('dropdown.morning_survey'), href: '/dashboard/analytics/morning-survey' },
        { key: 'rpe-survey', label: t('dropdown.rpe_survey'), href: '/dashboard/analytics/rpe-survey' },
        { key: 'test-admin', label: t('dropdown.test_admin'), href: '/dashboard/settings/admin/surveys', adminOnly: true },
      ]
    },
    { 
      key: 'documents', 
      label: t('topbar.documents'), 
      href: '/dashboard/documents',
      icon: <DocumentTextIcon className="w-4 h-4 text-vista-primary flex-shrink-0" />
    },
    { 
      key: 'settings', 
      label: t('topbar.settings'), 
      href: '/dashboard/settings',
      icon: <Cog6ToothIcon className="w-4 h-4 text-vista-primary flex-shrink-0" />,
      hasDropdown: true,
      dropdownItems: [
        { key: 'account', label: t('dropdown.account'), href: '/dashboard/settings/account' },
        { key: 'admin', label: t('dropdown.admin'), href: '/dashboard/settings/admin', adminOnly: true },
      ]
    },
  ];

  return (
    <nav className="bg-vista-dark border-b-[2px] border-vista-secondary fixed top-0 right-0 left-0 z-[99999]" ref={dropdownRef}>
      <div className="container mx-auto px-4">
                <div className="h-16 flex items-center justify-between">
          {/* Логотип клуба */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/dashboard" className="flex items-center">
              {club && club.logoUrl && club.logoUrl !== 'null' && club.logoUrl !== 'undefined' && club.logoUrl.trim() !== '' ? (
                <div className="h-12 w-12 flex items-center justify-center overflow-hidden">
                  <OptimizedImage 
                    src={club.logoUrl} 
                    alt={club?.name || 'Логотип клуба'} 
                    height={48} 
                    width={48} 
                    objectFit="contain" 
                    showSkeleton={false} 
                  />
                </div>
              ) : club?.subdomain === 'fdcvista' ? (
                <div className="h-12 w-12 flex items-center justify-center overflow-hidden">
                  <OptimizedImage 
                    src="/vista.png" 
                    alt="FDC Vista" 
                    height={48} 
                    width={48} 
                    objectFit="contain" 
                    showSkeleton={false} 
                  />
                </div>
              ) : club?.subdomain === 'van' ? (
                <div className="h-12 w-12 flex items-center justify-center overflow-hidden">
                  <OptimizedImage 
                    src="/van.png" 
                    alt="FC VAN" 
                    height={48} 
                    width={48} 
                    objectFit="contain" 
                    showSkeleton={false} 
                  />
                </div>
              ) : null}
            </Link>
          </div>

          <div className="hidden md:flex h-full">
            {navItems.map((item, index) => {
              const itemIsActive = isActive(item);
              
              return (
                <div 
                  key={item.key} 
                  className="relative h-full flex items-center"
                  ref={(el) => setItemRef(item.key, el)}
                >
                  {index > 0 && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-px bg-vista-secondary/40" />
                  )}
                  
                  {item.hasDropdown ? (
                    <div className="relative h-full flex items-center">
                      <button
                        onClick={() => toggleDropdown(item.key)}
                        className={`px-4 py-2 mx-1 rounded-md text-sm font-medium transition-all duration-200 uppercase flex items-center justify-center w-[140px] relative ${
                          itemIsActive || isDropdownActive(item.key)
                            ? 'text-vista-primary bg-vista-primary/20 nav-item-active' 
                            : 'text-vista-light/70 hover:text-vista-light hover:bg-vista-secondary/20'
                        }`}
                        aria-expanded={isDropdownActive(item.key)}
                      >
                        <div className="flex items-center justify-center flex-1">
                          {item.icon}
                          <span className="ml-2">{item.label}</span>
                        </div>
                        <ChevronDownIcon className={`ml-1 h-3 w-3 flex-shrink-0 transition-transform ${isDropdownActive(item.key) ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {isDropdownActive(item.key) && (
                        <div 
                          className="absolute z-[99999] top-full mt-0 rounded-md shadow-lg bg-vista-dark border-2 border-vista-secondary/40 left-1/2 -translate-x-1/2"
                          style={{ 
                            width: '140px'
                          }}
                        >
                          <div className="py-1">
                            {item.dropdownItems?.map((dropdownItem) => (
                              (!dropdownItem.adminOnly || userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'COACH') && (
                                <div 
                                  key={dropdownItem.key}
                                  className="relative"
                                >
                                  {dropdownItem.hasSubItems ? (
                                    <div 
                                      onClick={toggleTeamsDropdown}
                                      className={`flex items-center justify-between px-2 py-2 text-sm transition-colors cursor-pointer ${
                                        pathname.startsWith('/dashboard/teams')
                                          ? 'text-vista-primary team-item-active'
                                          : 'text-vista-light/70 hover:bg-vista-secondary/20 hover:text-vista-primary'
                                      }`}
                                    >
                                                                              <span>{dropdownItem.label}</span>
                                        <div className="flex items-center">
                                          {pathname.startsWith('/dashboard/teams') && (
                                            <div className="w-2 h-2 bg-vista-primary rounded-full mr-2 animate-pulse"></div>
                                          )}
                                          <ChevronDownIcon className={`ml-1 h-3 w-3 flex-shrink-0 transition-transform ${teamsDropdownOpen ? 'rotate-180' : ''}`} />
                                        </div>
                                    </div>
                                  ) : (
                                    <Link
                                      href={dropdownItem.href}
                                      className={`block px-2 py-2 text-sm transition-colors ${
                                        isDropdownItemActive(dropdownItem)
                                          ? 'text-vista-primary dropdown-item-active'
                                          : 'text-vista-light/70 hover:bg-vista-secondary/20 hover:text-vista-primary'
                                      }`}
                                      onClick={handleLinkClick}
                                    >
                                      {dropdownItem.label}
                                    </Link>
                                  )}
                                  
                                                                    {dropdownItem.hasSubItems && teamsDropdownOpen && (
                                    <div className="mt-1 border-t border-vista-secondary/30 border-b border-vista-secondary/30 pt-2 pb-2 bg-vista-secondary/30 rounded-md">
                                      {teamsLoading ? (
                                        <div className="px-2 py-1 text-sm text-vista-light/50">
                                          {t('dropdown.loading')}
                                        </div>
                                      ) : teams.length > 0 ? (
                                        teams.map((team, index) => (
                                          <Link 
                                            key={team.id}
                                            href={`/dashboard/teams/${team.id}`} 
                                            className={`block px-2 py-2 text-sm transition-colors ${
                                              pathname === `/dashboard/teams/${team.id}`
                                                ? 'text-vista-primary team-item-active'
                                                : 'text-vista-light/70 hover:bg-vista-secondary/20 hover:text-vista-primary'
                                            } ${index === 0 ? 'pt-1' : ''} ${index === teams.length - 1 ? 'pb-1' : ''}`}
                                            onClick={handleLinkClick}
                                          >
                                            {team.name}
                                          </Link>
                                        ))
                                      ) : (
                                        <div className="px-2 py-1 text-sm text-vista-light/50">
                                          {t('dropdown.no_teams')}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Link
                      href={item.href}
                      className={`px-4 py-2 mx-1 rounded-md text-sm font-medium transition-all duration-200 uppercase flex items-center justify-center w-[140px] relative ${
                        itemIsActive ? 'text-vista-primary bg-vista-primary/20 nav-item-active' : 'text-vista-light/70 hover:text-vista-light hover:bg-vista-secondary/20'
                      }`}
                      onClick={handleLinkClick}
                    >
                      <div className="flex items-center justify-center flex-1">
                        {item.icon}
                        <span className="ml-2">{item.label}</span>
                      </div>
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="flex items-center" ref={langDropdownRef}>
            <button
              ref={langButtonRef}
              className="flex items-center px-3 py-2 text-sm font-medium text-vista-light bg-vista-secondary/20 rounded-md hover:bg-vista-secondary/40 transition-colors relative"
              onClick={handleLangButtonClick}
              type="button"
            >
              <GlobeAltIcon className="w-4 h-4 flex-shrink-0 mr-1 text-vista-primary" />
              {languages.find(l => l.code === lang)?.code.toUpperCase() || lang.toUpperCase()}
              <ChevronDownIcon className="ml-1 h-3 w-3 flex-shrink-0 transition-transform" />
            </button>
            {langDropdownOpen && (
              <div
                className="absolute z-[99999] top-full mt-1 rounded-md shadow-lg bg-vista-dark border-2 border-vista-secondary/40"
                style={{ 
                  width: langButtonRef.current ? `${langButtonRef.current.offsetWidth}px` : 'auto',
                  minWidth: langButtonRef.current ? `${langButtonRef.current.offsetWidth}px` : '8rem'
                }}
              >
                {languages.map((l) => (
                  <button
                    key={l.code}
                    className={`block w-full text-left px-2 py-2 text-sm transition-colors hover:bg-vista-secondary/20 hover:text-vista-primary
                      ${lang === l.code ? 'text-vista-primary' : 'text-vista-light/70'}`}
                    onClick={() => handleLangSelect(l.code as SupportedLang)}
                    type="button"
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
} 

export default memo(TopBar); 