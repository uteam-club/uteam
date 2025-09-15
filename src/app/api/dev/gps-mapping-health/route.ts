import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not Found', { status: 404 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const profileId = searchParams.get('profileId') || '';
    const reportId = searchParams.get('reportId') || '';
    if (!profileId) {
      return NextResponse.json({ error: 'profileId is required' }, { status: 400 });
    }
    const base = req.nextUrl.origin;

    // 1) Профиль → маппинги колонок
    const profRes = await fetch(`${base}/api/gps/profiles/${profileId}/mappings`, { cache: 'no-store' });
    const profJson = profRes.ok ? await profRes.json() : { error: profRes.status };
    const athleteFromApi = Array.isArray(profJson) ? profJson.find((m: any) => m?.canonicalMetric === 'athlete_name') : null;

    // 2) Данные отчёта (структура файла)
    let reportJson: any = null;
    if (reportId) {
      const repRes = await fetch(`${base}/api/gps/reports/${reportId}/data`, { cache: 'no-store' });
      reportJson = repRes.ok ? await repRes.json() : { error: repRes.status };
    }
    const columns: string[] = Array.isArray(reportJson?.columns) ? reportJson.columns : [];
    const rowsLen = Array.isArray(reportJson?.rawData) ? reportJson.rawData.length : 0;
    const dataKeysLen = Array.isArray(reportJson?.dataKeys) ? reportJson.dataKeys.length : 0;

    // 3) Прямая проверка БД пропущена (проблемы с импортом в dev-эндпоинте)
    let dbRecord: any = null;

    const summary = {
      input: { profileId, reportId },
      db: { hasAthleteName: !!dbRecord, record: dbRecord },
      profileApi: {
        ok: Array.isArray(profJson),
        total: Array.isArray(profJson) ? profJson.length : 0,
        athleteName: athleteFromApi ? {
          canonicalMetric: athleteFromApi.canonicalMetric,
          sourceColumn: athleteFromApi.sourceColumn ?? null,
          isVisible: athleteFromApi.isVisible ?? null,
        } : null,
      },
      reportDataApi: {
        ok: !reportJson?.error,
        columnsLen: columns.length,
        rowsLen,
        dataKeysLen,
        sampleColumns: columns.slice(0, 10),
      },
      conclusions: {
        mapping: athleteFromApi
          ? (athleteFromApi?.sourceColumn ? 'athlete_name найден в API профиля, sourceColumn задан' : 'athlete_name найден, НО sourceColumn пуст')
          : 'В API профиля нет маппинга athlete_name',
        data: (columns.length > 0 || dataKeysLen > 0)
          ? 'Структура файла есть (columns/dataKeys присутствуют)'
          : 'Структура файла пустая (нет columns/dataKeys)',
      },
    };
    return NextResponse.json(summary);
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}