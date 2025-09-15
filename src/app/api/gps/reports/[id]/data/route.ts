import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getGpsReportById } from '@/services/gps.service';
import { readFile } from 'fs/promises';
import { join } from 'path';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.clubId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if report exists and belongs to user's club
    const report = await getGpsReportById(params.id, session.user.clubId);
    if (!report) {
      return NextResponse.json({ error: 'GPS report not found' }, { status: 404 });
    }

    const hasPath = !!report.filePath;
    if (!hasPath) {
      console.warn('[dev][report-data]', params.id, 'no filePath on report');
      return NextResponse.json({ columns: [], rawData: [], dataKeys: [] });
    }

    // Read and parse file as in /api/gps/process-file
    try {
      const fileBuffer = await readFile(report.filePath as string);
      let rawData: any[] = [];

      // Process file based on extension
      const fileExtension = report.fileName?.split('.').pop()?.toLowerCase();
      
      if (fileExtension === 'csv') {
        // Process CSV file
        const csvText = fileBuffer.toString('utf-8');
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
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (rawData.length > 0) {
          const headers = rawData[0] as string[];
          const rows = rawData.slice(1);
          rawData = rows.map((row: any[]) => {
            const obj: any = {};
            headers.forEach((header, index) => {
              obj[header] = row[index];
            });
            return obj;
          });
        }
      } else {
        return NextResponse.json(
          { error: 'Unsupported file format' },
          { status: 400 }
        );
      }

      const columns = Array.isArray(rawData) && rawData.length > 0
        ? Object.keys(rawData[0])
        : [];
      const dataKeys = columns;

      // dev-only server-side logging
      if (process.env.NODE_ENV !== 'production') {
        console.log('[dev][report-data]', params.id, 'columns=', columns.length, 'rows=', rawData.length, 'dataKeys=', dataKeys.length);
        
        // Debug time columns
        if (rawData.length > 0) {
          const sampleRow = rawData[0];
          const timeColumns = Object.keys(sampleRow).filter(key => 
            typeof sampleRow[key] === 'string' && sampleRow[key].includes(':')
          );
          if (timeColumns.length > 0) {
            console.log('[dev][report-data] time columns found:', timeColumns);
            timeColumns.forEach(col => {
              console.log(`[dev][report-data] sample time value in ${col}:`, sampleRow[col]);
            });
          }
        }
      }

      return NextResponse.json({ columns, rawData, dataKeys });
    } catch (fileError) {
      console.error('Error reading file:', fileError);
      return NextResponse.json(
        { error: 'Failed to read file' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error fetching GPS report data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch GPS report data' },
      { status: 500 }
    );
  }
}
