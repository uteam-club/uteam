import Link from 'next/link';
import { getAllClubs } from '@/services/club.service';
export default async function AdminPage() {
    const clubs = await getAllClubs();
    return (<main className="flex min-h-screen flex-col items-center p-8">
      <div className="z-10 max-w-5xl w-full">
        <h1 className="text-4xl font-bold mb-2">Админ-панель</h1>
        <p className="text-gray-500 mb-8">Управление футбольными клубами</p>
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Клубы</h2>
          <Link href="/admin/clubs/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Создать клуб
          </Link>
        </div>
        
        <div className="border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Название
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Поддомен
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Создан
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clubs.length > 0 ? (clubs.map((club) => (<tr key={club.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {club.logoUrl ? (<img src={club.logoUrl} alt={club.name} className="w-10 h-10 rounded-full mr-3"/>) : (<div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                            <span className="text-lg font-semibold text-gray-500">
                              {club.name.charAt(0)}
                            </span>
                          </div>)}
                        <span className="font-medium">{club.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a href={`https://${club.subdomain}.uteam.club`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {club.subdomain}.uteam.club
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(club.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link href={`/admin/clubs/${club.id}`} className="text-blue-600 hover:text-blue-900 mr-4">
                        Просмотр
                      </Link>
                      <Link href={`/admin/clubs/${club.id}/edit`} className="text-gray-600 hover:text-gray-900">
                        Редактировать
                      </Link>
                    </td>
                  </tr>))) : (<tr>
                  <td colSpan={4} className="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                    Клубы не найдены. <Link href="/admin/clubs/new" className="text-blue-600 hover:underline">Создайте первый клуб</Link>.
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </main>);
}
