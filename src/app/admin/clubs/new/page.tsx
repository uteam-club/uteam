import Link from 'next/link';

export default function NewClubPage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="z-10 max-w-2xl w-full">
        <div className="flex items-center mb-8">
          <Link
            href="/admin"
            className="text-gray-500 hover:text-gray-700 mr-4"
          >
            ← Назад
          </Link>
          <h1 className="text-3xl font-bold">Создание нового клуба</h1>
        </div>
        
        <form action="/api/clubs" method="POST" className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Название клуба
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Название клуба"
            />
          </div>
          
          <div>
            <label htmlFor="subdomain" className="block text-sm font-medium text-gray-700 mb-1">
              Поддомен
            </label>
            <div className="flex">
              <input
                type="text"
                id="subdomain"
                name="subdomain"
                required
                className="w-full px-4 py-2 border rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="club-name"
              />
              <span className="inline-flex items-center px-3 py-2 border border-l-0 rounded-r-lg bg-gray-100 text-gray-500">
                .uteam.club
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Поддомен может содержать только латинские буквы, цифры и дефисы.
            </p>
          </div>
          
          <div>
            <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700 mb-1">
              Логотип (URL)
            </label>
            <input
              type="url"
              id="logoUrl"
              name="logoUrl"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://example.com/logo.png"
            />
            <p className="text-sm text-gray-500 mt-1">
              Необязательно. Укажите URL-адрес изображения.
            </p>
          </div>
          
          <div className="pt-4">
            <button
              type="submit"
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Создать клуб
            </button>
          </div>
        </form>
      </div>
    </main>
  );
} 