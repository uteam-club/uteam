'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { GlobeAltIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useState, useRef, useEffect } from 'react';
import { Locale } from '@/i18n';

// Тип для структуры команды
type Team = {
  id: string;
  name: string;
  description?: string | null;
};

type NavItemDropdown = {
  key: string;
  label: string;
  href: string;
  hasSubItems?: boolean;
  adminOnly?: boolean;
}

type NavItem = {
  key: string;
  label: string;
  href: string;
  hasDropdown?: boolean;
  dropdownItems?: NavItemDropdown[];
}

export default function Navbar() {
  const t = useTranslations('navigation');
  const pathname = usePathname();
  const locale = pathname.split('/')[1];
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoaded, setTeamsLoaded] = useState(false);
  const [teamsDropdownOpen, setTeamsDropdownOpen] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  const navItems: NavItem[] = [
    { key: 'home', label: t('home'), href: `/${locale}/dashboard` },
    { 
      key: 'coaching', 
      label: t('coaching'), 
      href: `/${locale}/dashboard/coaching`,
      hasDropdown: true,
      dropdownItems: [
        { 
          key: 'teams', 
          label: t('teams'), 
          href: `/${locale}/dashboard/coaching/teams`,
          hasSubItems: true
        },
        { key: 'exercises', label: t('exercises'), href: `/${locale}/dashboard/coaching/exercises` },
        { key: 'trainings', label: t('trainings'), href: `/${locale}/dashboard/coaching/trainings` },
        { key: 'matches', label: t('matches'), href: `/${locale}/dashboard/coaching/matches` },
      ]
    },
    { key: 'calendar', label: t('calendar'), href: `/${locale}/dashboard/calendar` },
    { key: 'scouting', label: t('scouting'), href: `/${locale}/dashboard/scouting` },
    { 
      key: 'analytics', 
      label: t('analytics'), 
      href: `/${locale}/dashboard/analytics`,
      hasDropdown: true,
      dropdownItems: [
        { key: 'gps', label: t('gps'), href: `/${locale}/dashboard/analytics/gps` },
        { key: 'attendance', label: t('attendance'), href: `/${locale}/dashboard/analytics/attendance` },
      ]
    },
    { 
      key: 'settings', 
      label: t('settings'), 
      href: `/${locale}/dashboard/settings`,
      hasDropdown: true,
      dropdownItems: [
        { key: 'account', label: t('account'), href: `/${locale}/dashboard/settings/account` },
        { key: 'admin', label: t('admin'), href: `/${locale}/dashboard/settings/admin`, adminOnly: true },
      ]
    },
  ];

  // Загрузка списка команд
  useEffect(() => {
    // Загружаем команды только если пользователь открыл выпадающее меню Coaching или нажал на Teams
    if ((activeDropdown === 'coaching' || teamsDropdownOpen) && !teamsLoaded) {
      const fetchTeams = async () => {
        try {
          const response = await fetch('/api/admin/teams');
          
          if (!response.ok) {
            throw new Error('Ошибка загрузки команд');
          }
          
          const data = await response.json();
          setTeams(data);
          setTeamsLoaded(true);
        } catch (error) {
          console.error('Ошибка загрузки команд:', error);
        }
      };

      fetchTeams();
    }
  }, [activeDropdown, teamsLoaded, teamsDropdownOpen]);

  // Закрываем выпадающие меню при клике вне компонента
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleLangMenu = () => {
    setLangMenuOpen(!langMenuOpen);
    setActiveDropdown(null);
  };

  const toggleDropdown = (key: string) => {
    // Если открывается новый дропдаун, закрываем раскрытый список команд
    if (key !== activeDropdown && teamsDropdownOpen) {
      setTeamsDropdownOpen(false);
    }
    
    setActiveDropdown(activeDropdown === key ? null : key);
    setLangMenuOpen(false);
  };

  const isDropdownActive = (key: string) => activeDropdown === key;

  const isActive = (item: typeof navItems[0]) => {
    // Точное соответствие для домашней страницы
    if (item.key === 'home') {
      return pathname === `/${locale}/dashboard` || pathname === `/${locale}`;
    }
    
    // Для пунктов с выпадающими меню проверяем, начинается ли путь с href этого пункта
    // и заканчивается ли он на слеш или присутствует в пути
    if (item.hasDropdown) {
      const pathWithoutLocale = pathname.replace(`/${locale}`, '');
      const itemPathWithoutLocale = item.href.replace(`/${locale}`, '');
      return pathWithoutLocale.startsWith(itemPathWithoutLocale);
    }
    
    // Для простых пунктов сравниваем с текущим путем
    return pathname === item.href;
  };

  const toggleTeamsDropdown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTeamsDropdownOpen(!teamsDropdownOpen);
    
    // Загружаем команды при первом клике, если еще не загружены
    if (!teamsLoaded) {
      const fetchTeams = async () => {
        try {
          const response = await fetch('/api/admin/teams');
          
          if (!response.ok) {
            throw new Error('Ошибка загрузки команд');
          }
          
          const data = await response.json();
          setTeams(data);
          setTeamsLoaded(true);
        } catch (error) {
          console.error('Ошибка загрузки команд:', error);
        }
      };

      fetchTeams();
    }
  };

  return (
    <nav className="bg-vista-dark border-b-[2px] border-vista-secondary">
      <div className="container-app h-16 flex items-center justify-between" ref={dropdownRef}>
        {/* Логотип слева */}
        <div className="flex-shrink-0 flex items-center">
          <Link href={`/${locale}/dashboard`} className="flex items-center">
            <div className="h-10 w-auto relative">
              <Image 
                src="/images/vista.png" 
                alt="VISTA UTEAM Logo" 
                width={80} 
                height={32}
                priority={true}
                style={{ height: 'auto', maxHeight: '32px', width: 'auto' }}
                className="object-contain"
              />
            </div>
          </Link>
        </div>

        {/* Основные разделы */}
        <div className="hidden md:flex flex-1 justify-center h-full">
          <div className="flex h-full">
            {navItems.map((item, index) => {
              const itemIsActive = isActive(item);
              
              return (
                <div key={item.key} className="relative h-full flex items-center">
                  {index > 0 && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-px bg-vista-secondary/40"></div>
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
                        <div className="absolute z-10 top-full mt-1 w-48 rounded-md shadow-lg bg-vista-dark/50 backdrop-blur-md border-2 border-vista-secondary/40">
                          <div className="py-1">
                            {item.dropdownItems?.map((dropdownItem) => (
                              (!dropdownItem.adminOnly || true) && ( // Здесь будет проверка прав пользователя
                                <div 
                                  key={dropdownItem.key}
                                  className="relative"
                                >
                                  {dropdownItem.hasSubItems ? (
                                    <div 
                                      onClick={toggleTeamsDropdown}
                                      className="flex items-center justify-between px-4 py-2 text-sm text-vista-light/90 hover:bg-vista-secondary/20 hover:text-vista-primary transition-colors cursor-pointer"
                                    >
                                      <span>{dropdownItem.label}</span>
                                      <ChevronDownIcon className={`h-4 w-4 ml-1 transition-transform ${teamsDropdownOpen ? 'rotate-180' : ''}`} />
                                    </div>
                                  ) : (
                                    <Link
                                      href={dropdownItem.href}
                                      className="block px-4 py-2 text-sm text-vista-light/90 hover:bg-vista-secondary/20 hover:text-vista-primary transition-colors"
                                      onClick={() => {
                                        setActiveDropdown(null);
                                        setTeamsDropdownOpen(false);
                                      }}
                                    >
                                      {dropdownItem.label}
                                    </Link>
                                  )}
                                  
                                  {/* Показываем список команд прямо в этом меню, а не в дополнительном слое */}
                                  {dropdownItem.hasSubItems && teamsDropdownOpen && (
                                    <div className="border-t border-vista-secondary/30 mt-1 pt-1">
                                      {teamsLoaded ? (
                                        teams.length > 0 ? (
                                          teams.map(team => (
                                            <Link
                                              key={team.id}
                                              href={`/${locale}/dashboard/coaching/teams/${team.id}`}
                                              className="block pl-6 pr-4 py-2 text-sm text-vista-light/80 hover:bg-vista-secondary/20 hover:text-vista-primary transition-colors"
                                              onClick={() => {
                                                setActiveDropdown(null);
                                                setTeamsDropdownOpen(false);
                                              }}
                                            >
                                              <span className="inline-flex items-center">
                                                <span className="text-vista-primary mr-2">→</span>
                                                {team.name}
                                              </span>
                                            </Link>
                                          ))
                                        ) : (
                                          <div className="px-4 py-2 text-sm text-vista-light/70">
                                            Нет доступных команд
                                          </div>
                                        )
                                      ) : (
                                        <div className="px-4 py-2 text-sm text-vista-light/70">
                                          Загрузка...
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
                      className={`px-4 py-2 mx-1 rounded-md text-sm font-medium transition-colors uppercase flex items-center ${
                        itemIsActive 
                          ? 'text-vista-primary' 
                          : 'text-vista-light/70 hover:text-vista-light hover:bg-vista-secondary/20'
                      }`}
                    >
                      {item.label}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Переключатель языка */}
        <div className="relative ml-2 h-full flex items-center">
          <button
            onClick={toggleLangMenu}
            className="flex items-center text-vista-light/70 hover:text-vista-light px-3 py-2 rounded-md"
            aria-expanded={langMenuOpen}
          >
            <GlobeAltIcon className="h-5 w-5 mr-1" />
            <span className="uppercase text-sm font-medium">{locale}</span>
          </button>

          {langMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-vista-dark/50 backdrop-blur-md rounded-md shadow-lg z-50 py-1 border-2 border-vista-secondary/40">
              <Link
                href={pathname.replace(/^\/[^/]+/, '/en')}
                className="block px-4 py-2 text-sm text-vista-light hover:bg-vista-secondary/20 hover:text-vista-primary transition-colors"
                onClick={() => setLangMenuOpen(false)}
              >
                English
              </Link>
              <Link
                href={pathname.replace(/^\/[^/]+/, '/ru')}
                className="block px-4 py-2 text-sm text-vista-light hover:bg-vista-secondary/20 hover:text-vista-primary transition-colors"
                onClick={() => setLangMenuOpen(false)}
              >
                Русский
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
} 