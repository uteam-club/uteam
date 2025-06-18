'use client';
import { useSession } from 'next-auth/react';
export default function ProfilePage() {
    var _a;
    const { data: session } = useSession();
    const user = session === null || session === void 0 ? void 0 : session.user;
    return (<div className="space-y-6">
      <h1 className="text-3xl font-bold text-vista-light">Профиль пользователя</h1>
      
      <div className="card p-6">
        <div className="flex flex-col space-y-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-vista-primary/20 flex items-center justify-center text-vista-primary">
              {((_a = user === null || user === void 0 ? void 0 : user.name) === null || _a === void 0 ? void 0 : _a.charAt(0)) || 'U'}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-vista-light">{(user === null || user === void 0 ? void 0 : user.name) || 'Пользователь'}</h2>
              <p className="text-vista-light/70">{(user === null || user === void 0 ? void 0 : user.email) || 'Почта не указана'}</p>
              <p className="text-vista-light/70">Роль: {(user === null || user === void 0 ? void 0 : user.role) || 'Не указана'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>);
}
