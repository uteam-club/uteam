import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isMainDomain(host: string): boolean {
  // Пример: для 'club.site.com' вернёт false, для 'site.com' или 'localhost' — true
  if (!host) return false;
  // localhost и 127.0.0.1 считаем основным доменом
  if (host === 'localhost' || host === '127.0.0.1') return true;
  // Если host содержит ровно один точку — это основной домен (site.com)
  // Если больше одной точки — это поддомен (club.site.com)
  return host.split('.').length <= 2;
}

export function formatResult(value: string) {
  if (!value) return '—';
  if (value.includes('.')) return value.replace(/\.0+$/, '').replace(/(\.\d*?[1-9])0+$/, '$1');
  return value;
}

// Заглушка для formatDateTime
export function formatDateTime(date: Date | string): string {
  // Форматирование только времени ЧЧ:ММ
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// Заглушка для getSubdomain
export function getSubdomain(host: string): string | null {
  if (!host) return null;
  // Убираем порт, если есть
  const hostWithoutPort = host.split(':')[0];
  const parts = hostWithoutPort.split('.');
  // Для fdcvista.localhost → ['fdcvista', 'localhost']
  if (parts.length === 2 && parts[1] === 'localhost') {
    return parts[0];
  }
  // Для боевого домена типа club.site.com
  if (parts.length >= 3) {
    return parts[0];
  }
  return null;
}

// Заглушка для generateRandomPassword
export function generateRandomPassword(length: number = 10): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
