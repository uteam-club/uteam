// Типы для базы данных Supabase
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          image: string | null;
          password: string | null;
          role: 'USER' | 'MANAGER' | 'ADMIN' | 'SUPERADMIN';
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id?: string;
          email: string;
          name?: string | null;
          image?: string | null;
          password?: string | null;
          role?: 'USER' | 'MANAGER' | 'ADMIN' | 'SUPERADMIN';
          createdAt?: string;
          updatedAt?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          image?: string | null;
          password?: string | null;
          role?: 'USER' | 'MANAGER' | 'ADMIN' | 'SUPERADMIN';
          createdAt?: string;
          updatedAt?: string;
        };
      };
      // Другие таблицы можно добавить здесь по мере необходимости
    };
    Views: {
      // Представления из базы данных
    };
    Functions: {
      // Функции из базы данных
    };
  };
}; 