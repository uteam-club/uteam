import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSubdomain } from '@/lib/utils';

export default async function ClubPage({ params }: { params: { subdomain: string } }) {
  const headersList = headers();
  const host = headersList.get('host') || '';
  const subdomain = getSubdomain(host);
  
  if (!subdomain) {
    redirect('/');
  }
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Клуб не найден</h1>
        <p className="text-gray-600 mb-8">
          Клуб с поддоменом <span className="font-semibold">{subdomain}</span> не найден.
        </p>
        <a 
          href="https://uteam.club" 
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Вернуться на главную
        </a>
      </div>
    </main>
  );
} 