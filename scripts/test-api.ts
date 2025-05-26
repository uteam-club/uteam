import fetch from 'node-fetch';
import { getUserByEmail, verifyPassword } from '../src/services/user.service';
import { prisma } from '../src/lib/prisma';
import * as jwt from 'jsonwebtoken';

async function getAuthToken(email: string, password: string): Promise<string | null> {
  try {
    // Получаем пользователя из базы данных
    const user = await getUserByEmail(email);
    
    if (!user) {
      console.error('Пользователь не найден');
      return null;
    }
    
    // Проверяем пароль
    const isValid = await verifyPassword(user, password);
    
    if (!isValid) {
      console.error('Неверный пароль');
      return null;
    }
    
    // Создаем JWT токен вручную
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        clubId: user.clubId,
      },
      process.env.NEXTAUTH_SECRET || 'fdcvista-default-secret-key-change-me',
      { expiresIn: '1h' }
    );
    
    return token;
  } catch (error) {
    console.error('Ошибка при получении токена:', error);
    return null;
  }
}

async function testCreateUser() {
  console.log('Тестирование API создания пользователя...');
  
  // Получаем токен авторизации для админа
  const token = await getAuthToken('admin@example.com', 'admin123');
  
  if (!token) {
    console.error('Не удалось получить токен авторизации');
    return;
  }
  
  console.log('Получен токен авторизации');
  
  // Получаем номер порта из окружения или используем порт по умолчанию
  const APP_PORT = process.env.PORT || process.env.NEXT_PUBLIC_PORT || 3000;
  
  // Данные нового пользователя
  const userData = {
    email: 'api_user@example.com',
    firstName: 'API',
    lastName: 'User',
    role: 'MEMBER'
  };
  
  try {
    // Определяем все возможные порты для тестирования
    const ports = [3000, 3001, 3002, 3003, 3004];
    let success = false;
    
    // Пробуем все порты по очереди
    for (const port of ports) {
      try {
        console.log(`Пробуем порт ${port}...`);
        const apiUrl = `http://localhost:${port}/api/users`;
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(userData)
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Пользователь успешно создан через API:');
          console.log(data);
          success = true;
          break;
        } else {
          const errorText = await response.text();
          console.log(`Ошибка на порту ${port}: ${response.status} ${response.statusText}`);
          console.log('Текст ошибки:', errorText);
        }
      } catch (error) {
        console.log(`Ошибка подключения к порту ${port}:`, error instanceof Error ? error.message : String(error));
      }
    }
    
    if (!success) {
      console.log('Не удалось создать пользователя через API на всех портах.');
      console.log('Создаем пользователя напрямую через Prisma...');
      
      // Получаем ID первого клуба
      const firstClub = await prisma.club.findFirst();
      
      if (!firstClub) {
        throw new Error('Клуб не найден в базе данных!');
      }
      
      // Проверяем, существует ли уже пользователь с таким email
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });
      
      if (existingUser) {
        console.log(`Пользователь с email ${userData.email} уже существует!`);
        return;
      }
      
      // Генерируем случайный пароль
      const password = Math.random().toString(36).slice(-8);
      
      // Создаем пользователя напрямую через Prisma
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          name: `${userData.firstName} ${userData.lastName}`,
          password: await require('bcryptjs').hash(password, 10),
          role: userData.role as any,
          clubId: firstClub.id
        }
      });
      
      console.log('Пользователь успешно создан напрямую через Prisma:');
      console.log({
        ...user,
        password // Только для отображения при создании!
      });
    }
  } catch (error) {
    console.error('Ошибка при тестировании:', error);
  }
}

testCreateUser(); 