import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  // Проверяем подключение к Supabase
  try {
    const { data, error } = await supabaseAdmin.storage.getBucket('exercises');
    
    return NextResponse.json({
      success: !error,
      error: error?.message,
      hasServiceKey: !!supabaseServiceKey,
      serviceKeyLength: supabaseServiceKey.length,
      supabaseUrl: supabaseUrl.slice(0, 15) + '...',
      bucketExists: !!data
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        hasServiceKey: !!supabaseServiceKey,
        serviceKeyLength: supabaseServiceKey.length,
        supabaseUrl: supabaseUrl.slice(0, 15) + '...'
      });
    }
    return NextResponse.json({
      success: false,
      error: 'Unknown error occurred',
      hasServiceKey: !!supabaseServiceKey,
      serviceKeyLength: supabaseServiceKey.length,
      supabaseUrl: supabaseUrl.slice(0, 15) + '...'
    });
  }
} 