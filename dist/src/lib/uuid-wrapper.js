// Обертка для uuid с CommonJS импортом, чтобы избежать проблем с ESM в Next.js
import { v4 } from 'uuid';
export const uuidv4 = v4;
