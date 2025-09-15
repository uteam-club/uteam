import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.clubId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    let rawData: any[] = [];

    // Process file based on extension
    const fileName = file.name;
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'csv') {
      // Process CSV file
      const csvText = await file.text();
      const result = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
      });
      
      if (result.errors.length > 0) {
        console.warn('CSV parsing errors:', result.errors);
      }
      
      rawData = result.data as any[];
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      // Process Excel file
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
      });
      
      if (jsonData.length > 0) {
        // First row as headers
        const headers = jsonData[0] as string[];
        const rows = jsonData.slice(1) as any[][];
        
        // Convert to array of objects
        rawData = rows.map(row => {
          const obj: any = {};
          headers.forEach((header, index) => {
            obj[header] = row[index] || '';
          });
          return obj;
        });
      }
    } else {
      return NextResponse.json(
        { error: 'Unsupported file type' },
        { status: 400 }
      );
    }

    // Clean up data - remove empty rows
    rawData = rawData.filter(row => {
      const values = Object.values(row);
      return values.some(value => value && value.toString().trim() !== '');
    });

    console.log(`📊 Processed ${rawData.length} rows from ${fileName}`);
    console.log('📋 Sample data:', rawData.slice(0, 2));

    return NextResponse.json({
      rawData,
      rowCount: rawData.length,
      columns: rawData.length > 0 ? Object.keys(rawData[0]) : [],
    });
  } catch (error) {
    console.error('Error processing GPS file:', error);
    return NextResponse.json(
      { error: 'Failed to process file' },
      { status: 500 }
    );
  }
}
