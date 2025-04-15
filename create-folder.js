const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function createFolder() {
  console.log('Создание папки player-documents в бакете vista-media...');
  
  try {
    // Создаём пустой файл с именем .gitkeep чтобы обозначить папку
    const { data, error } = await supabase.storage
      .from('vista-media')
      .upload('player-documents/.gitkeep', new Uint8Array(0));
    
    if (error) {
      console.error('Ошибка при создании папки:', error);
    } else {
      console.log('Папка player-documents успешно создана!');
    }
  } catch (err) {
    console.error('Непредвиденная ошибка:', err);
  }
}

createFolder(); 