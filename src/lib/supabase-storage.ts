import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET = 'club-media';

export async function saveExerciseFile(file: File, path: string) {
  const { data, error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
    cacheControl: '3600',
  });
  if (error) throw error;
  return data;
}

export function getFileUrl(path: string) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl || null;
}

export async function deleteExerciseFiles(paths: string[]) {
  const { data, error } = await supabase.storage.from(BUCKET).remove(paths);
  if (error) throw error;
  return data;
}

export async function initializeStorage() {
  // Заглушка для совместимости
  return true;
} 