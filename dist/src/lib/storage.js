/**
 * Утилиты для работы с хранилищем файлов
 *
 * Структура хранилища:
 * - /storage
 *   - /clubs
 *     - /{clubId}
 *       - /exercises
 *         - /{exerciseId}
 *           - media.jpg/mp4
 *       - /events
 *         - /{eventId}
 *           - ...
 *       - /teams
 *         - ...
 *       - /other
 *         - ...
 *
 * Эта структура обеспечивает изоляцию медиафайлов разных клубов
 * и разделение файлов по типам объектов (упражнения, события и т.д.)
 */
import fs from 'fs';
import path from 'path';
import { uuidv4 } from './uuid-wrapper';
// Базовый путь к хранилищу файлов
const STORAGE_BASE_PATH = process.env.STORAGE_PATH || path.join(process.cwd(), 'storage');
// Создание директории, если она не существует
const ensureDirectoryExists = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};
// Инициализация хранилища (создание базовых директорий)
export const initializeStorage = () => {
    ensureDirectoryExists(STORAGE_BASE_PATH);
    ensureDirectoryExists(path.join(STORAGE_BASE_PATH, 'clubs'));
    console.log(`Хранилище инициализировано: ${STORAGE_BASE_PATH}`);
};
// Получение пути к директории клуба
export const getClubStoragePath = (clubId) => {
    const clubPath = path.join(STORAGE_BASE_PATH, 'clubs', clubId);
    ensureDirectoryExists(clubPath);
    return clubPath;
};
// Получение пути к директории для упражнений конкретного клуба
export const getExercisesStoragePath = (clubId) => {
    const exercisesPath = path.join(getClubStoragePath(clubId), 'exercises');
    ensureDirectoryExists(exercisesPath);
    return exercisesPath;
};
// Получение пути к директории для конкретного упражнения
export const getExerciseStoragePath = (clubId, exerciseId) => {
    const exercisePath = path.join(getExercisesStoragePath(clubId), exerciseId);
    ensureDirectoryExists(exercisePath);
    return exercisePath;
};
// Сохранение файла упражнения
export const saveExerciseFile = async (clubId, exerciseId, file, filename) => {
    try {
        // Создаем директорию для упражнения
        const exercisePath = getExerciseStoragePath(clubId, exerciseId);
        // Генерируем уникальное имя файла с сохранением расширения
        const fileExt = path.extname(filename);
        const baseFilename = path.basename(filename, fileExt);
        const uniqueFilename = `${baseFilename}-${uuidv4().slice(0, 8)}${fileExt}`;
        const filePath = path.join(exercisePath, uniqueFilename);
        // Сохраняем файл
        if (Buffer.isBuffer(file)) {
            fs.writeFileSync(filePath, file);
        }
        else {
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            fs.writeFileSync(filePath, buffer);
        }
        // Возвращаем относительный путь к файлу (для сохранения в БД)
        return path.relative(STORAGE_BASE_PATH, filePath);
    }
    catch (error) {
        console.error('Ошибка при сохранении файла упражнения:', error);
        throw new Error('Не удалось сохранить файл упражнения');
    }
};
// Получение полного пути к файлу по относительному пути
export const getFullFilePath = (relativePath) => {
    return path.join(STORAGE_BASE_PATH, relativePath);
};
// Удаление файла
export const deleteFile = (relativePath) => {
    try {
        const fullPath = getFullFilePath(relativePath);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            return true;
        }
        return false;
    }
    catch (error) {
        console.error('Ошибка при удалении файла:', error);
        return false;
    }
};
// Удаление директории упражнения и всех файлов в ней
export const deleteExerciseDirectory = (clubId, exerciseId) => {
    try {
        const exercisePath = getExerciseStoragePath(clubId, exerciseId);
        if (fs.existsSync(exercisePath)) {
            fs.rmSync(exercisePath, { recursive: true, force: true });
            return true;
        }
        return false;
    }
    catch (error) {
        console.error('Ошибка при удалении директории упражнения:', error);
        return false;
    }
};
// Получение URL для доступа к файлу
export const getFileUrl = (relativePath) => {
    // Заменяем обратные слэши на прямые для URL
    const normalizedPath = relativePath.split(path.sep).join('/');
    return `/api/files/${normalizedPath}`;
};
