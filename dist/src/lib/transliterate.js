/**
 * Функция для транслитерации кириллических символов в латинские
 * Используется для преобразования имен файлов с кириллицей в латиницу
 */
export function transliterate(str) {
    const cyrillicToLatin = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd',
        'е': 'e', 'ё': 'yo', 'ж': 'zh', 'з': 'z', 'и': 'i',
        'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
        'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't',
        'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch',
        'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '',
        'э': 'e', 'ю': 'yu', 'я': 'ya',
        'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D',
        'Е': 'E', 'Ё': 'Yo', 'Ж': 'Zh', 'З': 'Z', 'И': 'I',
        'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N',
        'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T',
        'У': 'U', 'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch',
        'Ш': 'Sh', 'Щ': 'Sch', 'Ъ': '', 'Ы': 'Y', 'Ь': '',
        'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
    };
    return str
        .split('')
        .map(char => cyrillicToLatin[char] || char)
        .join('')
        // Заменяем пробелы и специальные символы на дефис
        .replace(/[^a-zA-Z0-9]/g, '-')
        // Убираем последовательные дефисы
        .replace(/-+/g, '-')
        // Убираем дефисы в начале и конце
        .replace(/^-|-$/g, '');
}
/**
 * Функция для создания безопасного имени файла
 * Транслитерирует кириллицу и добавляет случайный суффикс
 */
export function createSafeFileName(originalName) {
    const extension = originalName.split('.').pop() || '';
    const nameWithoutExtension = originalName.substring(0, originalName.lastIndexOf('.'));
    const transliteratedName = transliterate(nameWithoutExtension);
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `${transliteratedName}-${randomSuffix}.${extension}`;
}
