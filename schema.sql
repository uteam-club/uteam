-- Создаем таблицы, если они не существуют
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  image TEXT,
  password TEXT,
  role TEXT NOT NULL DEFAULT 'USER',
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Создание администратора (пароль: Admin123!)
-- Хеш пароля создан с помощью bcrypt с солью 10
INSERT INTO users (id, email, name, password, role, "createdAt", "updatedAt")
VALUES (
  'clj4b63k90000jxm68ht2z9d3', 
  'admin@vista.club', 
  'Администратор', 
  '$2b$10$zYl5eOEK4c3QYuQbKYW6ku3gFGVtTzTVUgQqVQbLty3Rk2Oi4GN5y', 
  'SUPERADMIN', 
  NOW(), 
  NOW()
) ON CONFLICT (email) DO NOTHING; 