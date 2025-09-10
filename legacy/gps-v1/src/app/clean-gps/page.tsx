'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function CleanGPSPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const cleanGPSData = async () => {
    if (!confirm('⚠️ ВНИМАНИЕ! Это удалит ВСЕ GPS данные:\n\n• Все GPS отчёты\n• Все GPS профили\n• Все маппинги игроков\n\nЭто действие НЕОБРАТИМО! Продолжить?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/clean-gps-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
        console.log('✅ Очистка завершена:', data);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка при очистке');
      }
    } catch (error) {
      console.error('❌ Ошибка:', error);
      alert(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6 text-center">🧹 Очистка GPS данных</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-red-600">⚠️ Опасная операция</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <AlertDescription>
              <strong>ВНИМАНИЕ!</strong> Эта операция удалит ВСЕ GPS данные из системы:
              <ul className="mt-2 list-disc list-inside space-y-1">
                <li>Все GPS отчёты</li>
                <li>Все GPS профили</li>
                <li>Все маппинги игроков</li>
              </ul>
              <strong className="text-red-600">Это действие НЕОБРАТИМО!</strong>
            </AlertDescription>
          </Alert>
          
          <Button
            onClick={cleanGPSData}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? 'Очистка...' : '🗑️ Удалить ВСЕ GPS данные'}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">✅ Очистка завершена</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Отчётов удалено:</strong> {result.deleted.reports}</p>
              <p><strong>Маппингов удалено:</strong> {result.deleted.mappings}</p>
              <p><strong>Профилей удалено:</strong> {result.deleted.profiles}</p>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold mb-2">📝 Что делать дальше:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Создайте новый GPS профиль</li>
                <li>Загрузите файл через профиль</li>
                <li>Сопоставьте игроков в модалке</li>
                <li>Сохраните отчёт</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
