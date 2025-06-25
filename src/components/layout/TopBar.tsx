'use client';

import { useState, memo, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useClub } from '@/providers/club-provider';
import { 
  ChevronDownIcon, 
  GlobeAltIcon,
} from '@heroicons/react/24/outline';

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
  const [itemWidths, setItemWidths] = useState<Record<string, number>>({});
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const setItemRef = useCallback((key: string, element: HTMLDivElement | null) => {
    if (element) {
      itemRefs.current[key] = element;
    }
  }, []);

  useEffect(() => {
    if (teamsDropdownOpen && teams.length === 0 && !teamsLoading) {
      fetchTeams();
    }
  }, [teamsDropdownOpen, teams.length, teamsLoading]);

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
          newWidths[key] = element.offsetWidth;
        }
      });
      setItemWidths(newWidths);
    };
    
    updateWidths();
    window.addEventListener('resize', updateWidths);
    
    return () => {
      window.removeEventListener('resize', updateWidths);
    };
  }, []);

  const closeAllMenus = () => {
    setActiveDropdown(null);
    setTeamsDropdownOpen(false);
  };

  const toggleDropdown = (key: string) => {
    if (key !== activeDropdown && teamsDropdownOpen) {
      setTeamsDropdownOpen(false);
    }
    setActiveDropdown(activeDropdown === key ? null : key);
  };

  const isDropdownActive = (key: string) => activeDropdown === key;

  const isActive = (item: NavItem) => {
    if (item.key === 'home') {
      return pathname === '/dashboard';
    }
    if (item.hasDropdown) {
      return pathname.startsWith(item.href);
    }
    return pathname === item.href;
  };

  const toggleTeamsDropdown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTeamsDropdownOpen(!teamsDropdownOpen);
  };

  const handleLinkClick = () => {
    closeAllMenus();
  };

  const navItems: NavItem[] = [
    { key: 'home', label: 'ГЛАВНАЯ', href: '/dashboard' },
    { 
      key: 'coaching', 
      label: 'ТРЕНЕРСКАЯ', 
      href: '/dashboard/coaching',
      hasDropdown: true,
      dropdownItems: [
        { 
          key: 'teams', 
          label: 'Команды', 
          href: '/dashboard/teams',
          hasSubItems: true
        },
        { key: 'exercises', label: 'Упражнения', href: '/dashboard/coaching/exercises' },
        { key: 'trainings', label: 'Тренировки', href: '/dashboard/coaching/trainings' },
        { key: 'matches', label: 'Матчи', href: '/dashboard/coaching/matches' },
      ]
    },
    { key: 'calendar', label: 'КАЛЕНДАРЬ', href: '/dashboard/calendar' },
    { 
      key: 'analytics', 
      label: 'АНАЛИТИКА', 
      href: '/dashboard/analytics',
      hasDropdown: true,
      dropdownItems: [
        { key: 'gps', label: 'GPS-трекинг', href: '/dashboard/analytics/gps' },
        { key: 'attendance', label: 'Посещаемость', href: '/dashboard/analytics/attendance' },
        { key: 'morning-survey', label: 'Утренний опросник', href: '/dashboard/analytics/morning-survey' },
        { key: 'fitness-tests', label: 'Фитнес тесты', href: '/dashboard/analytics/fitness-tests' },
      ]
    },
    { 
      key: 'documents', 
      label: 'ДОКУМЕНТЫ', 
      href: '/dashboard/documents'
    },
    { 
      key: 'settings', 
      label: 'НАСТРОЙКИ', 
      href: '/dashboard/settings',
      hasDropdown: true,
      dropdownItems: [
        { key: 'account', label: 'Аккаунт', href: '/dashboard/settings/account' },
        { key: 'admin', label: 'Админка', href: '/dashboard/settings/admin', adminOnly: true },
        { key: 'surveys', label: 'Опросники', href: '/dashboard/settings/admin/surveys', adminOnly: true },
      ]
    },
  ];

  return (
    <nav className="bg-vista-dark border-b-[2px] border-vista-secondary fixed top-0 right-0 left-0 z-[99999]" ref={dropdownRef}>
      <div className="container mx-auto px-4">
        <div className="h-16 flex items-center justify-between">
          <div className="flex-shrink-0">
            <Link href="/dashboard">
              {club && club.logoUrl && club.logoUrl !== 'null' && club.logoUrl !== 'undefined' && club.logoUrl.trim() !== '' ? (
                <img src={club.logoUrl} alt={club?.name || 'Логотип клуба'} className="h-8 w-auto" />
              ) : club?.subdomain === 'fdcvista' ? (
                <img src="/vista.png" alt="FDC Vista" className="h-8 w-auto" />
              ) : club?.subdomain === 'van' ? (
                <img src="/van.png" alt="FC VAN" className="h-8 w-auto" />
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
                        className={`px-4 py-2 mx-1 rounded-md text-sm font-medium transition-colors uppercase flex items-center ${
                          itemIsActive || isDropdownActive(item.key)
                            ? 'text-vista-primary' 
                            : 'text-vista-light/70 hover:text-vista-light hover:bg-vista-secondary/20'
                        }`}
                        aria-expanded={isDropdownActive(item.key)}
                      >
                        {item.label}
                        <ChevronDownIcon className={`ml-1 h-4 w-4 transition-transform ${isDropdownActive(item.key) ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {isDropdownActive(item.key) && (
                        <div 
                          className="absolute z-[99999] top-full mt-1 rounded-md shadow-lg bg-vista-dark border-2 border-vista-secondary/40"
                          style={{ width: `${itemWidths[item.key]}px` }}
                        >
                          <div className="py-1">
                            {item.dropdownItems?.map((dropdownItem) => (
                              (!dropdownItem.adminOnly || userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
                                <div 
                                  key={dropdownItem.key}
                                  className="relative"
                                >
                                  {dropdownItem.hasSubItems ? (
                                    <div 
                                      onClick={toggleTeamsDropdown}
                                      className="flex items-center justify-between px-4 py-2 text-sm text-vista-light/70 hover:bg-vista-secondary/20 hover:text-vista-primary transition-colors cursor-pointer"
                                    >
                                      <span>{dropdownItem.label}</span>
                                      <ChevronDownIcon className={`h-4 w-4 ml-1 transition-transform ${teamsDropdownOpen ? 'rotate-180' : ''}`} />
                                    </div>
                                  ) : (
                                    <Link
                                      href={dropdownItem.href}
                                      className="block px-4 py-2 text-sm text-vista-light/70 hover:bg-vista-secondary/20 hover:text-vista-primary transition-colors"
                                      onClick={handleLinkClick}
                                    >
                                      {dropdownItem.label}
                                    </Link>
                                  )}
                                  
                                  {dropdownItem.hasSubItems && teamsDropdownOpen && (
                                    <div className="ml-4 pl-2 border-l-2 border-vista-secondary/40">
                                      {teamsLoading ? (
                                        <div className="px-4 py-2 text-sm text-vista-light/50">
                                          Загрузка...
                                        </div>
                                      ) : teams.length > 0 ? (
                                        teams.map(team => (
                                          <Link 
                                            key={team.id}
                                            href={`/dashboard/teams/${team.id}`} 
                                            className="block px-4 py-2 text-sm text-vista-light/70 hover:bg-vista-secondary/20 hover:text-vista-primary transition-colors"
                                            onClick={handleLinkClick}
                                          >
                                            {team.name}
                                          </Link>
                                        ))
                                      ) : (
                                        <div className="px-4 py-2 text-sm text-vista-light/50">
                                          Нет команд
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
                      className={`px-4 py-2 mx-1 rounded-md text-sm font-medium transition-colors uppercase ${
                        itemIsActive ? 'text-vista-primary' : 'text-vista-light/70 hover:text-vista-light hover:bg-vista-secondary/20'
                      }`}
                      onClick={handleLinkClick}
                    >
                      {item.label}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="flex items-center">
            <button className="flex items-center px-3 py-2 text-sm font-medium text-vista-light bg-vista-secondary/20 rounded-md hover:bg-vista-secondary/40 transition-colors">
              <GlobeAltIcon className="w-4 h-4 mr-1" />
              RU
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
} 

export default memo(TopBar); 