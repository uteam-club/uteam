'use client';

import { useState, memo, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useClub } from '@/providers/club-provider';
import { 
  ChevronDownIcon, 
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
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
  const [itemWidths, setItemWidths] = useState<Record<string, number>>({});
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
    { key: 'home', label: t('topbar.home'), href: '/dashboard' },
    { 
      key: 'coaching', 
      label: t('topbar.coaching'), 
      href: '/dashboard/coaching',
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
    { key: 'fitness', label: t('topbar.fitness'), href: '/dashboard/fitness', hasDropdown: true, dropdownItems: [
      { key: 'fitness-tests', label: t('dropdown.fitness_tests'), href: '/dashboard/analytics/fitness-tests' },
    ] },
    { key: 'calendar', label: t('topbar.calendar'), href: '/dashboard/calendar' },
    { 
      key: 'analytics', 
      label: t('topbar.analytics'), 
      href: '/dashboard/analytics',
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
      href: '/dashboard/documents'
    },
    { 
      key: 'settings', 
      label: t('topbar.settings'), 
      href: '/dashboard/settings',
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
                              (!dropdownItem.adminOnly || userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'COACH') && (
                                <div 
                                  key={dropdownItem.key}
                                  className="relative"
                                >
                                  {dropdownItem.hasSubItems ? (
                                    <div 
                                      onClick={toggleTeamsDropdown}
                                      className="flex items-center justify-between px-2 py-2 text-sm text-vista-light/70 hover:bg-vista-secondary/20 hover:text-vista-primary transition-colors cursor-pointer"
                                    >
                                      <span>{dropdownItem.label}</span>
                                      <ChevronDownIcon className={`h-4 w-4 ml-1 transition-transform ${teamsDropdownOpen ? 'rotate-180' : ''}`} />
                                    </div>
                                  ) : (
                                    <Link
                                      href={dropdownItem.href}
                                      className="block px-2 py-2 text-sm text-vista-light/70 hover:bg-vista-secondary/20 hover:text-vista-primary transition-colors"
                                      onClick={handleLinkClick}
                                    >
                                      {dropdownItem.label}
                                    </Link>
                                  )}
                                  
                                  {dropdownItem.hasSubItems && teamsDropdownOpen && (
                                    <div className="ml-4 pl-2 border-l-2 border-vista-secondary/40">
                                      {teamsLoading ? (
                                        <div className="px-4 py-2 text-sm text-vista-light/50">
                                          {t('dropdown.loading')}
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
          
          <div className="flex items-center" ref={langDropdownRef}>
            <button
              ref={langButtonRef}
              className="flex items-center px-3 py-2 text-sm font-medium text-vista-light bg-vista-secondary/20 rounded-md hover:bg-vista-secondary/40 transition-colors relative"
              onClick={handleLangButtonClick}
              type="button"
            >
              <GlobeAltIcon className="w-4 h-4 mr-1" />
              {languages.find(l => l.code === lang)?.code.toUpperCase() || lang.toUpperCase()}
              <ChevronDownIcon className="ml-1 h-4 w-4 transition-transform" />
            </button>
            {langDropdownOpen && (
              <div
                className="absolute z-[99999] top-full mt-1 rounded-md shadow-lg bg-vista-dark border-2 border-vista-secondary/40"
                style={{ width: langButtonRef.current ? `${langButtonRef.current.offsetWidth}px` : '8rem' }}
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