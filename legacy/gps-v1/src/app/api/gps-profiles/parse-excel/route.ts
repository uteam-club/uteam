import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 });
    }

    // Проверяем тип файла
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
      'application/csv'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Неподдерживаемый тип файла. Используйте Excel (.xlsx, .xls) или CSV файлы' 
      }, { status: 400 });
    }

    // Проверяем размер файла (максимум 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'Файл слишком большой. Максимальный размер: 10MB' 
      }, { status: 400 });
    }

    // Читаем файл
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'buffer' });

    // Получаем первый лист
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      return NextResponse.json({ 
        error: 'Не удалось прочитать данные из файла' 
      }, { status: 400 });
    }

    // Конвертируем в JSON для получения заголовков
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (!jsonData || jsonData.length === 0) {
      return NextResponse.json({ 
        error: 'Файл пуст или не содержит данных' 
      }, { status: 400 });
    }

    // Получаем заголовки (первая строка)
    const headers = jsonData[0] as string[];

    if (!headers || headers.length === 0) {
      return NextResponse.json({ 
        error: 'Не найдены заголовки в файле' 
      }, { status: 400 });
    }

    // Фильтруем пустые заголовки
    const validHeaders = headers
      .map(header => header?.toString().trim())
      .filter(header => header && header.length > 0);

    if (validHeaders.length === 0) {
      return NextResponse.json({ 
        error: 'Не найдено валидных заголовков в файле' 
      }, { status: 400 });
    }

    // Проверяем на дублирующиеся заголовки
    const uniqueHeaders = [...new Set(validHeaders)];
    if (uniqueHeaders.length !== validHeaders.length) {
      return NextResponse.json({ 
        error: 'Обнаружены дублирующиеся заголовки в файле' 
      }, { status: 400 });
    }

    // Анализируем данные для определения типов колонок
    const columnAnalysis = validHeaders.map((header, index) => {
      const columnData = jsonData.slice(1).map((row: any) => row[index]).filter(cell => cell !== undefined && cell !== null);
      
      // Определяем тип данных
      let dataType = 'string';
      let hasNumbers = false;
      let hasText = false;

      columnData.forEach(cell => {
        const cellStr = cell?.toString().trim();
        if (cellStr) {
          if (!isNaN(parseFloat(cellStr)) && cellStr !== '') {
            hasNumbers = true;
          } else {
            hasText = true;
          }
        }
      });

      if (hasNumbers && !hasText) {
        dataType = 'number';
      } else if (hasNumbers && hasText) {
        dataType = 'mixed';
      }

      return {
        header,
        dataType,
        sampleValues: columnData.slice(0, 3).map(cell => cell?.toString().trim()).filter(Boolean)
      };
    });

    return NextResponse.json({
      headers: validHeaders,
      analysis: columnAnalysis,
      totalRows: jsonData.length - 1, // Исключаем заголовки
      message: `Успешно прочитано ${validHeaders.length} колонок и ${jsonData.length - 1} строк данных`
    });

  } catch (error) {
    console.error('Ошибка при парсинге Excel файла:', error);
    return NextResponse.json({ 
      error: 'Ошибка при обработке файла. Убедитесь, что файл не поврежден.' 
    }, { status: 500 });
  }
} 