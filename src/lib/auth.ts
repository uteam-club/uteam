import bcrypt from 'bcrypt';
import { prisma } from './prisma';
import { PrismaClient, UserRole as PrismaUserRole } from '@prisma/client';

type User = {
  id: string;
  email: string;
  name: string | null;
  password: string | null;
  role: string;
  [key: string]: any;
};

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function comparePasswords(plainTextPassword: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(plainTextPassword, hashedPassword);
}

export async function createUser(email: string, password: string, name: string | null = null, role: string = 'USER'): Promise<User> {
  const hashedPassword = await hashPassword(password);
  
  return await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: role as PrismaUserRole,
    }
  });
}

export async function findUserByEmail(email: string): Promise<User | null> {
  return await prisma.user.findUnique({
    where: { email }
  });
}

export async function findUserById(id: string): Promise<User | null> {
  return await prisma.user.findUnique({
    where: { id }
  });
}

export async function validateCredentials(email: string, password: string): Promise<User | null> {
  console.log('Проверка учетных данных для:', email);
  
  try {
    const user = await findUserByEmail(email);
    
    if (!user || !user.password) {
      console.log('Пользователь не найден или у него нет пароля');
      return null;
    }
    
    console.log('Пользователь найден, проверяем пароль');
    
    const isPasswordValid = await comparePasswords(password, user.password);
    
    if (!isPasswordValid) {
      console.log('Пароль не верен');
      return null;
    }
    
    console.log('Аутентификация успешна для пользователя:', user.id);
    return user;
  } catch (error) {
    console.error('Ошибка при проверке учетных данных:', error);
    return null;
  }
} 