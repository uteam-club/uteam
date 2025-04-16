import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const testFileName = `test-${Date.now()}.txt`;
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('exercises')
      .upload(testFileName, new Blob(['test']), {
        contentType: 'text/plain',
        upsert: true
      });
    
    if (uploadError) {
      return NextResponse.json({ success: false, error: uploadError.message });
    }
    
    // Удаляем тестовый файл
    await supabaseAdmin.storage
      .from('exercises')
      .remove([testFileName]);
    
    return NextResponse.json({ success: true, path: uploadData.path });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ success: false, error: error.message });
    }
    return NextResponse.json({ success: false, error: 'Unknown error occurred' });
  }
} 