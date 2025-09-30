'use client';

import { useEffect, useState } from 'react';
import GpsReportVisualization from '@/components/gps/GpsReportVisualization';

export default function PublicGpsSharePage({ params }: { params: { shareId: string } }) {
  const { shareId } = params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/gps/public/reports/${shareId}`, { cache: 'no-store' });
        if (!res.ok) {
          if (res.status === 410) {
            setError('Ссылка недействительна или истек срок действия');
          } else if (res.status === 404) {
            setError('Ссылка не найдена');
          } else {
            setError('Не удалось загрузить публичный отчет');
          }
          return;
        }
        const data = await res.json();
        setPayload(data);
      } catch (e) {
        setError('Ошибка загрузки');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [shareId]);

  if (loading) {
    return <div className="p-6">Загрузка...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-400">{error}</div>;
  }

  if (!payload?.report || !payload?.profile) {
    return <div className="p-6">Данные отчета не найдены</div>;
  }

  // Реюз визуала: компонент сам подгружает по teamId/eventId/profileId
  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-[1400px] mx-auto">
      <GpsReportVisualization
        teamId={payload.report.teamId}
        eventId={payload.report.eventId}
        eventType={payload.report.eventType}
        profileId={payload.profile.id}
        shareId={shareId}
      />
    </div>
  );
}


