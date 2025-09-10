import { notFound } from 'next/navigation';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

interface GpsReport {
  id: string;
  name: string;
  fileName: string;
  gpsSystem: string;
  profileSnapshot: {
    columns: Array<{
      sourceHeader: string;
      canonicalKey: string;
      displayName: string;
      order: number;
      isVisible: boolean;
    }>;
  };
  processedData: {
    canonical: {
      rows: Array<Record<string, any>>;
      summary: Record<string, number>;
    };
  };
}

function asJson<T=any>(v: any): T | null {
  if (v == null) return null;
  if (typeof v === 'string') { 
    try { 
      return JSON.parse(v) as T; 
    } catch { 
      return null; 
    } 
  }
  return v as T;
}

async function getGpsReport(id: string): Promise<GpsReport | null> {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    const result = await pool.query(`
      SELECT 
        id, "name", "fileName", "gpsSystem", "profileSnapshot", "processedData"
      FROM public."GpsReport"
      WHERE id = $1::uuid
    `, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      fileName: row.fileName,
      gpsSystem: row.gpsSystem,
      profileSnapshot: asJson(row.profileSnapshot) || { columns: [] },
      processedData: asJson(row.processedData) || { canonical: { rows: [], summary: {} } }
    };
  } finally {
    await pool.end();
  }
}

export default async function DevGpsReportPage({ 
  params, 
  searchParams 
}: { 
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // Проверяем, что мы в dev режиме
  if (process.env.NODE_ENV === 'production' || searchParams.prod === '1') {
    notFound();
  }

  const report = await getGpsReport(params.id);
  
  if (!report) {
    notFound();
  }

  // Сортируем колонки по порядку и фильтруем видимые
  const snapshot = asJson(report.profileSnapshot) ?? report.profileSnapshot;
  const pdata = asJson(report.processedData) ?? report.processedData;
  const rows = pdata?.canonical?.rows ?? [];
  
  // Строго используем только snapshot.columns
  const columns = (snapshot?.columns ?? [])
    .filter((c: any) => c?.isVisible !== false)
    .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          {report.name}
        </h1>
        
        <p className="text-gray-600 mb-6">
          File: {report.fileName} · System: {report.gpsSystem} · Rows: {rows.length}
        </p>
        
        {/* Отладочная информация о колонках */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Profile Snapshot Columns</h2>
          <div className="space-y-2">
            {columns.map((col: any, index: number) => (
              <div key={index} className="flex items-center space-x-4 text-sm">
                <span className="w-8 text-gray-500">{col.order}</span>
                <span className="w-32 font-medium">{col.displayName}</span>
                <span className="w-48 text-gray-600">{col.canonicalKey}</span>
                <span className="w-32 text-gray-500">{col.sourceHeader}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Таблица данных */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <h2 className="text-xl font-semibold p-6 border-b">Report Data</h2>
          
          {columns.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <div className="text-lg font-semibold mb-2">Snapshot columns missing</div>
              <div className="text-sm text-gray-400">
                This report has no column configuration in profileSnapshot.<br/>
                Please re-import this report or contact support.
              </div>
            </div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <div>No data available</div>
              <div className="mt-4 text-xs text-gray-400">
                Diagnostic: Available fields: {Object.keys(report).join(', ')}<br/>
                profileSnapshot type: {typeof report.profileSnapshot}<br/>
                processedData type: {typeof report.processedData}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {columns.map((col: any, index: number) => (
                      <th
                        key={index}
                        data-testid={`col-${col.canonicalKey}`}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {col.displayName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rows.map((row: any, rowIndex: number) => (
                    <tr key={rowIndex} data-testid="report-row" className="hover:bg-gray-50">
                      {columns.map((col: any, colIndex: number) => (
                        <td
                          key={colIndex}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                        >
                          {row[col.canonicalKey] ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary информация */}
        {report.processedData?.canonical?.summary && Object.keys(report.processedData.canonical.summary).length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <h2 className="text-xl font-semibold mb-4">Summary</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {Object.entries(report.processedData.canonical.summary).map(([key, value]) => (
                <div key={key}>
                  <span className="font-medium">{key}:</span> {typeof value === 'number' ? value.toFixed(2) : value}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
