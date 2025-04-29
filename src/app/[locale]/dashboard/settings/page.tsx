import { unstable_setRequestLocale } from 'next-intl/server';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';

export default async function SettingsPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Cog6ToothIcon className="w-8 h-8 text-vista-accent" />
        <h1 className="text-3xl font-bold text-vista-light">Настройки</h1>
      </div>
      
      <div className="bg-vista-dark-secondary rounded-lg p-6">
        <div className="divide-y divide-vista-light/10">
          <div className="py-6 first:pt-0 last:pb-0">
            <h3 className="text-xl font-semibold text-vista-light mb-4">Профиль</h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-vista-light/70 mb-1">
                  Имя пользователя
                </label>
                <input 
                  type="text" 
                  className="w-full bg-vista-dark border border-vista-light/20 rounded p-2 text-vista-light"
                  placeholder="Ваше имя"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-vista-light/70 mb-1">
                  Email
                </label>
                <input 
                  type="email" 
                  className="w-full bg-vista-dark border border-vista-light/20 rounded p-2 text-vista-light"
                  placeholder="your@email.com"
                />
              </div>
            </div>
          </div>
          
          <div className="py-6 first:pt-0 last:pb-0">
            <h3 className="text-xl font-semibold text-vista-light mb-4">Уведомления</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-vista-light font-medium">Email уведомления</h4>
                  <p className="text-vista-light/60 text-sm">Получать уведомления на email</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" value="" className="sr-only peer" />
                  <div className="w-11 h-6 bg-vista-light/20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-vista-accent/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-vista-accent"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-vista-light font-medium">Уведомления о задачах</h4>
                  <p className="text-vista-light/60 text-sm">Уведомления о новых задачах</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" value="" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-vista-light/20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-vista-accent/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-vista-accent"></div>
                </label>
              </div>
            </div>
          </div>
          
          <div className="py-6 first:pt-0 last:pb-0">
            <h3 className="text-xl font-semibold text-vista-light mb-4">Безопасность</h3>
            <button 
              className="px-4 py-2 bg-vista-accent hover:bg-vista-accent/80 text-vista-dark font-medium rounded transition-colors"
            >
              Изменить пароль
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 