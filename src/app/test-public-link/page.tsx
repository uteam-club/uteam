'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Share2, ExternalLink } from 'lucide-react';

export default function TestPublicLinkPage() {
  const [reportId, setReportId] = useState('56450bd9-411d-4490-9680-d3179bf1bb45'); // ID из вашего отчета
  const [publicUrl, setPublicUrl] = useState('');

  const generatePublicUrl = () => {
    const url = `${window.location.origin}/public/gps-report/${reportId}`;
    setPublicUrl(url);
  };

  const copyToClipboard = async () => {
    if (!publicUrl) return;
    
    try {
      await navigator.clipboard.writeText(publicUrl);
      alert('Ссылка скопирована в буфер обмена!');
    } catch (error) {
      console.error('Ошибка при копировании:', error);
      alert('Ошибка при копировании ссылки');
    }
  };

  const openInNewTab = () => {
    if (!publicUrl) return;
    window.open(publicUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-vista-dark p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="bg-vista-dark/50 border-vista-secondary/50">
          <CardHeader>
            <CardTitle className="text-vista-light">Тест публичной ссылки GPS отчета</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-vista-light/70 mb-2 block">
                ID отчета
              </label>
              <Input
                value={reportId}
                onChange={(e) => setReportId(e.target.value)}
                placeholder="Введите ID отчета"
                className="bg-vista-dark border-vista-secondary/50 text-vista-light"
              />
            </div>
            
            <Button 
              onClick={generatePublicUrl}
              className="w-full bg-vista-primary hover:bg-vista-primary/90 text-vista-dark"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Сгенерировать публичную ссылку
            </Button>
            
            {publicUrl && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-vista-light/70 mb-2 block">
                    Публичная ссылка
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={publicUrl}
                      readOnly
                      className="bg-vista-dark border-vista-secondary/50 text-vista-light"
                    />
                    <Button
                      variant="outline"
                      onClick={copyToClipboard}
                      className="border-vista-primary/50 text-vista-primary hover:bg-vista-primary/10"
                    >
                      Копировать
                    </Button>
                    <Button
                      variant="outline"
                      onClick={openInNewTab}
                      className="border-vista-secondary/50 text-vista-light hover:bg-vista-secondary/10"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="text-sm text-vista-light/70">
                  <p>Эта ссылка доступна всем без авторизации.</p>
                  <p>Любой, кто перейдет по ссылке, увидит визуализацию отчета.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 