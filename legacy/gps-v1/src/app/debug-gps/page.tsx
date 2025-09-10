'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DebugGPSPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [fixing, setFixing] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/gps-reports/debug');
      if (response.ok) {
        const data = await response.json();
        setReports(data);
        console.log('📊 Загружено отчётов:', data.length);
      } else {
        console.error('Ошибка API:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Ошибка загрузки отчётов:', error);
    } finally {
      setLoading(false);
    }
  };

  const fixCanonical = async (reportId: string) => {
    setFixing(true);
    try {
      const response = await fetch('/api/gps-reports/fix-canonical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('🔧 Результат исправления:', result);
        alert(`Результат: ${result.message}`);
        
        // Обновляем список отчётов
        await fetchReports();
      } else {
        const error = await response.json();
        console.error('Ошибка исправления:', error);
        alert(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error('Ошибка исправления:', error);
      alert('Ошибка при исправлении отчёта');
    } finally {
      setFixing(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">🔍 GPS Debug - Диагностика отчётов</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Список отчётов */}
        <Card>
          <CardHeader>
            <CardTitle>Отчёты в базе ({reports.length})</CardTitle>
            <Button onClick={fetchReports} disabled={loading}>
              {loading ? 'Загрузка...' : 'Обновить'}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="p-3 border rounded cursor-pointer hover:bg-gray-50"
                  onClick={() => setSelectedReport(report)}
                >
                  <div className="font-medium">{report.name}</div>
                  <div className="text-sm text-gray-500">
                    {report.eventType} - {report.teamId}
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(report.createdAt).toLocaleString()}
                  </div>
                  <div className="text-xs mt-1">
                    {report.hasCanonical ? (
                      <span className="text-green-600">✅ Canonical: {report.canonicalRows} строк</span>
                    ) : (
                      <span className="text-red-600">❌ Нет canonical</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Детали отчёта */}
        <Card>
          <CardHeader>
            <CardTitle>Детали отчёта</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedReport ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>ID:</strong> {selectedReport.id}
                  </div>
                  <div>
                    <strong>Название:</strong> {selectedReport.name}
                  </div>
                  <div>
                    <strong>Команда:</strong> {selectedReport.teamId}
                  </div>
                  <div>
                    <strong>Событие:</strong> {selectedReport.eventType} - {selectedReport.eventId}
                  </div>
                  <div>
                    <strong>GPS система:</strong> {selectedReport.gpsSystem}
                  </div>
                  <div>
                    <strong>Профиль:</strong> {selectedReport.profileId}
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">📊 Статус данных:</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`p-3 rounded ${selectedReport.hasRawData ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      <div className="font-medium">Raw данные</div>
                      <div className="text-sm">
                        {selectedReport.hasRawData ? `✅ ${selectedReport.rawDataLength} строк` : '❌ Отсутствуют'}
                      </div>
                    </div>
                    
                    <div className={`p-3 rounded ${selectedReport.hasProcessedData ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      <div className="font-medium">Processed данные</div>
                      <div className="text-sm">
                        {selectedReport.hasProcessedData ? '✅ Есть' : '❌ Отсутствуют'}
                      </div>
                    </div>
                    
                    <div className={`p-3 rounded ${selectedReport.hasCanonical ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      <div className="font-medium">Canonical данные</div>
                      <div className="text-sm">
                        {selectedReport.hasCanonical ? `✅ ${selectedReport.canonicalRows} строк` : '❌ Отсутствуют'}
                      </div>
                    </div>
                    
                    <div className={`p-3 rounded ${selectedReport.warningsCount > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
                      <div className="font-medium">Warnings</div>
                      <div className="text-sm">
                        {selectedReport.warningsCount > 0 ? `⚠️ ${selectedReport.warningsCount}` : '✅ Нет'}
                      </div>
                    </div>
                  </div>
                </div>

                {selectedReport.hasCanonical && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">📈 Canonical детали:</h3>
                    <div className="space-y-2">
                      <div className="text-sm">
                        <strong>Версия:</strong> {selectedReport.canonicalVersion}
                      </div>
                      <div className="text-sm">
                        <strong>Строк:</strong> {selectedReport.canonicalRows}
                      </div>
                      {selectedReport.metaCounts && (
                        <div className="text-sm">
                          <strong>Counts:</strong> {JSON.stringify(selectedReport.metaCounts)}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!selectedReport.hasCanonical && (
                  <div className="border-t pt-4">
                    <div className="p-4 bg-red-50 border border-red-200 rounded">
                      <h3 className="font-semibold text-red-800 mb-2">❌ Проблема с canonical данными</h3>
                      <p className="text-sm text-red-700">
                        Этот отчёт не имеет canonical данных. Возможные причины:
                      </p>
                      <ul className="text-sm text-red-700 mt-2 list-disc list-inside">
                        <li>Отчёт загружен до внедрения канонизации</li>
                        <li>Ошибка при обработке файла</li>
                        <li>Неподходящий профиль</li>
                        <li>Отсутствие маппинга игроков</li>
                      </ul>
                      <div className="mt-4 flex gap-2">
                        <Button
                          onClick={() => fixCanonical(selectedReport.id)}
                          disabled={fixing}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {fixing ? 'Проверка...' : '🔧 Проверить и исправить'}
                        </Button>
                        <Button
                          onClick={() => window.open(`/dashboard/fitness/gps-reports?teamId=${selectedReport.teamId}&eventType=${selectedReport.eventType}&eventId=${selectedReport.eventId}`, '_blank')}
                          variant="outline"
                        >
                          📤 Перейти к загрузке
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500">Выберите отчёт для просмотра деталей</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
