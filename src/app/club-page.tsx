import { Club } from '../generated/prisma/client';

export default function ClubPage({ club }: { club: Club }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-8">
      <div className="z-10 max-w-5xl w-full">
        <div className="flex items-center gap-6 mb-8">
          {club.logoUrl ? (
            <img 
              src={club.logoUrl} 
              alt={club.name} 
              className="w-24 h-24 rounded-full object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-3xl font-bold text-gray-500">
                {club.name.charAt(0)}
              </span>
            </div>
          )}
          <div>
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
    </main>
  );
} 