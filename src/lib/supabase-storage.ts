// Заглушка: Supabase Storage больше не используется. Используйте yandex-storage.ts
export async function saveExerciseFile() { throw new Error('Supabase Storage отключён. Используйте Яндекс Object Storage.'); }
export function getFileUrl() { throw new Error('Supabase Storage отключён. Используйте Яндекс Object Storage.'); }
export async function deleteExerciseFiles() { throw new Error('Supabase Storage отключён. Используйте Яндекс Object Storage.'); }
export async function initializeStorage() { return false; } 