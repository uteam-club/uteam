import Link from 'next/link';

export default async function AdminPage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="z-10 max-w-5xl w-full">
        <h1 className="text-4xl font-bold mb-2">Админ-панель</h1>
        <p className="text-gray-500 mb-8">Управление футбольными клубами</p>
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Клубы</h2>
          <Link 
            href="/admin/clubs/new" 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
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
              {/* ... existing code ... */}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
} 