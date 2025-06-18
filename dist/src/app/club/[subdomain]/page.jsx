import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSubdomain } from '@/lib/utils';
import { getClubBySubdomain } from '@/services/club.service';
export default async function ClubPage({ params }) {
    const headersList = headers();
    const host = headersList.get('host') || '';
    const subdomain = getSubdomain(host);
    if (!subdomain) {
        redirect('/');
    }
    const club = await getClubBySubdomain(subdomain);
    if (!club) {
        return (<main className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Клуб не найден</h1>
          <p className="text-gray-600 mb-8">
            Клуб с поддоменом <span className="font-semibold">{subdomain}</span> не найден.
          </p>
          <a href="https://uteam.club" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
            Вернуться на главную
          </a>
        </div>
      </main>);
    }
    return (<main className="flex min-h-screen flex-col items-center justify-between p-8">
      <div className="z-10 max-w-5xl w-full">
        <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
          {club.logoUrl ? (<img src={club.logoUrl} alt={club.name} className="w-24 h-24 rounded-full object-cover"/>) : (<div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-3xl font-bold text-gray-500">
                {club.name.charAt(0)}
              </span>
            </div>)}
          <div className="text-center md:text-left">
            <h1 className="text-4xl font-bold">{club.name}</h1>
            <p className="text-gray-500">{club.subdomain}.uteam.club</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="p-6 border rounded-lg">
            <h2 className="text-xl font-semibold mb-4">О клубе</h2>
            <p className="text-gray-700">
              Информация о клубе будет добавлена администратором.
            </p>
          </div>
          
          <div className="p-6 border rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Контакты</h2>
            <p className="text-gray-700">
              Контактная информация будет добавлена администратором.
            </p>
          </div>
        </div>
        
        <div className="p-6 border rounded-lg mb-12">
          <h2 className="text-xl font-semibold mb-4">Предстоящие события</h2>
          <div className="text-gray-700">
            <p>Пока нет запланированных событий.</p>
          </div>
        </div>
        
        <div className="p-6 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Команды</h2>
          <div className="text-gray-700">
            <p>Информация о командах клуба будет добавлена.</p>
          </div>
        </div>
      </div>
    </main>);
}
