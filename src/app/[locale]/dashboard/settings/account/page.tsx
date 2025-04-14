import { unstable_setRequestLocale } from 'next-intl/server';
import { UserCircleIcon } from '@heroicons/react/24/outline';
import { getCurrentUser } from '@/lib/session';
import LogoutButton from '@/components/auth/LogoutButton';

export default async function AccountSettingsPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  
  const user = await getCurrentUser();
  
  if (!user) {
    return null;
  }
  
  const getRoleName = (role: string) => {
    switch(role) {
      case 'USER': return 'Пользователь';
      case 'MANAGER': return 'Менеджер';
      case 'ADMIN': return 'Администратор';
      case 'SUPERADMIN': return 'Супер-администратор';
      default: return role;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <UserCircleIcon className="w-8 h-8 text-vista-accent" />
        <h1 className="text-3xl font-bold text-vista-light">Аккаунт</h1>
      </div>
      
      <div className="bg-vista-dark-secondary rounded-lg p-6">
        <div className="space-y-6">
          <div className="flex items-center space-x-4 mb-6">
            {user.image ? (
              <img 
                src={user.image} 
                alt={user.name || 'Аватар пользователя'} 
                className="w-24 h-24 rounded-full object-cover border-2 border-vista-accent"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-vista-accent/10 flex items-center justify-center">
                <UserCircleIcon className="w-16 h-16 text-vista-accent" />
              </div>
            )}
            
            <div>
              <h2 className="text-2xl font-bold text-vista-light">{user.name || 'Пользователь'}</h2>
              <p className="text-vista-light/70">{user.email}</p>
              <div className="mt-1 px-2 py-1 bg-vista-accent/20 text-vista-accent rounded text-sm inline-block">
                {getRoleName(user.role)}
              </div>
            </div>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-xl font-semibold text-vista-light mb-4">Информация</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-vista-light/60 text-sm">Email</p>
                  <p className="text-vista-light">{user.email}</p>
                </div>
                <div>
                  <p className="text-vista-light/60 text-sm">Имя</p>
                  <p className="text-vista-light">{user.name || 'Не указано'}</p>
                </div>
                <div>
                  <p className="text-vista-light/60 text-sm">Дата регистрации</p>
                  <p className="text-vista-light">{user.createdAt.toLocaleDateString('ru-RU')}</p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-vista-light mb-4">Действия</h3>
              <div className="space-y-4">
                <LogoutButton className="w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 