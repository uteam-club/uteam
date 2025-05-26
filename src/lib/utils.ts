import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Объединение классов с помощью clsx и tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Получение поддомена из хоста
 */
export function getSubdomain(host: string): string {
  // Убираем localhost из проверки - на localhost будем просто возвращать параметр из URL
  if (host.includes('localhost')) {
    return '';
  }
  
  const hostParts = host.split('.');
  
  // Проверяем, что у нас есть хотя бы 3 части (поддомен.домен.зона)
  if (hostParts.length >= 3) {
    return hostParts[0];
  }
  
  return '';
}

/**
 * Проверка, является ли хост основным доменом (без поддомена)
 */
export function isMainDomain(host: string): boolean {
  // Для localhost всегда считаем как основной домен
  if (host.includes('localhost')) {
    return true;
  }
  
  // Основной домен - это домен вида example.com, без поддоменов
  const hostParts = host.split('.');
  
  // Если есть поддомен, то частей будет минимум 3 (поддомен.домен.зона)
  return hostParts.length < 3;
}

/**
 * Форматирование даты
 */
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Форматирование времени
 */
export function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Форматирование даты с временем
 */
export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)} ${formatTime(date)}`;
}

/**
 * Генерация случайного шестизначного пароля
 */
export function generateRandomPassword(): string {
  // Генерируем случайное шестизначное число
  const randomNumber = Math.floor(100000 + Math.random() * 900000);
  return randomNumber.toString();
} 