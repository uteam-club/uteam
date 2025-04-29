import { unstable_setRequestLocale } from 'next-intl/server';

export default async function DashboardPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-vista-light">Панель управления</h1>
      
      <div className="bg-vista-dark-secondary rounded-lg p-6">
        <p className="text-vista-light">
          Добро пожаловать в панель управления VISTA UTEAM. Используйте навигацию выше для доступа к различным разделам.
        </p>
      </div>
    </div>
  );
} 