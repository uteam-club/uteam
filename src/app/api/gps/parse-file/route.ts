import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    let data: any[][] = [];
    let columns: string[] = [];

    try {
      if (fileExtension === 'csv') {
        // Парсинг CSV файла
        const csvText = new TextDecoder('utf-8').decode(buffer);
        const result = Papa.parse(csvText, {
          header: false,
          skipEmptyLines: true,
        });
        
        data = result.data as any[][];
        if (data.length > 0) {
          columns = data[0].map((col, index) => col?.toString() || `Column ${index + 1}`);
          data = data.slice(1); // Убираем заголовки
        }
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        // Парсинг Excel файла
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Конвертируем в JSON с заголовками
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length > 0) {
          columns = (jsonData[0] as any[]).map((col, index) => col?.toString() || `Column ${index + 1}`);
          data = jsonData.slice(1) as any[][]; // Убираем заголовки
        }
      } else {
        return NextResponse.json({ error: 'Неподдерживаемый формат файла' }, { status: 400 });
      }

      // Очищаем данные от пустых строк
      data = data.filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''));

      return NextResponse.json({
        columns,
        data,
        rowCount: data.length,
        columnCount: columns.length
      });

    } catch (parseError) {
      console.error('Error parsing file:', parseError);
      return NextResponse.json({ 
        error: 'Ошибка при парсинге файла. Проверьте формат файла.' 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Error processing file:', error);
    return NextResponse.json({ 
      error: 'Ошибка при обработке файла' 
    }, { status: 500 });
  }
}
