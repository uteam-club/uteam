import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getGpsReportsByClubId, getGpsReportsByEventId, getGpsReportsByTeamId, createGpsReport, getGpsProfileById, updateGpsReport } from '@/services/gps.service';
import { z } from 'zod';

// Zod schema for meta validation
const metaSchema = z.object({
  eventId: z.string().uuid('Invalid eventId format'),
  teamId: z.string().uuid('Invalid teamId format'),
  gpsSystem: z.string().min(1, 'GPS system is required'),
  profileId: z.string().uuid('Invalid profileId format'),
  fileName: z.string().min(1, 'File name is required'),
  eventType: z.enum(['TRAINING', 'MATCH'], {
    errorMap: () => ({ message: 'Event type must be TRAINING or MATCH' })
  }),
  playerMappings: z.array(z.any()).optional().default([])
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.clubId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const eventType = searchParams.get('eventType');
    const teamId = searchParams.get('teamId');

    let reports;
    if (eventId && eventType) {
      // Фильтрация по конкретному событию
      reports = await getGpsReportsByEventId(eventId, eventType as 'training' | 'match', session.user.clubId);
    } else if (teamId && eventType) {
      // Фильтрация по команде и типу события
      reports = await getGpsReportsByTeamId(teamId, eventType as 'training' | 'match', session.user.clubId);
    } else {
      // Все отчеты клуба
      reports = await getGpsReportsByClubId(session.user.clubId);
    }

    return NextResponse.json(reports);
  } catch (error) {
    console.error('Error fetching GPS reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch GPS reports' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.clubId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse FormData
    const formData = await request.formData();
    const file = formData.get('file') as Blob;
    const metaString = formData.get('meta') as string;

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { error: 'FILE_REQUIRED' },
        { status: 400 }
      );
    }

    if (!metaString) {
      return NextResponse.json(
        { error: 'META_REQUIRED' },
        { status: 400 }
      );
    }

    // Parse and validate meta
    let meta;
    try {
      meta = JSON.parse(metaString);
    } catch (parseError) {
      return NextResponse.json(
        { error: 'META_PARSE_ERROR' },
        { status: 400 }
      );
    }

    // Validate meta with zod schema
    const validationResult = metaSchema.safeParse(meta);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'VALIDATION_ERROR', 
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }

    const validatedMeta = validationResult.data;

    // Find and validate profile
    const profile = await getGpsProfileById(validatedMeta.profileId, session.user.clubId);
    if (!profile) {
      return NextResponse.json(
        { error: 'PROFILE_NOT_FOUND' },
        { status: 404 }
      );
    }

    if (!profile.isActive) {
      return NextResponse.json(
        { error: 'PROFILE_ARCHIVED' },
        { status: 400 }
      );
    }

    // Optional: Check GPS system mismatch
    if (profile.gpsSystem !== validatedMeta.gpsSystem) {
      return NextResponse.json(
        { error: 'PROFILE_GPS_MISMATCH' },
        { status: 400 }
      );
    }

    // 1) Create report record first
    const report = await createGpsReport({
      name: validatedMeta.fileName,
      fileName: validatedMeta.fileName,
      fileUrl: '', // Will be set after file save
      filePath: '', // Will be set after file save
      fileSize: file.size,
      gpsSystem: validatedMeta.gpsSystem,
      eventType: validatedMeta.eventType.toLowerCase() as 'training' | 'match',
      eventId: validatedMeta.eventId,
      profileId: validatedMeta.profileId,
      gpsProfileId: validatedMeta.profileId, // Always link to profile
      trainingId: validatedMeta.eventType === 'TRAINING' ? validatedMeta.eventId : undefined,
      matchId: validatedMeta.eventType === 'MATCH' ? validatedMeta.eventId : undefined,
      clubId: session.user.clubId,
      uploadedById: session.user.id,
      teamId: validatedMeta.teamId,
      rawData: {
        playerMappings: validatedMeta.playerMappings || [],
      },
    });

    if (!report) {
      return NextResponse.json(
        { error: 'UNEXPECTED' },
        { status: 500 }
      );
    }

    // 2) Save file physically
    try {
      const arrayBuf = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      const { join } = await import('path');
      const { promises: fs } = await import('fs');
      const uploadsDir = join(process.cwd(), 'uploads', 'gps', report.id);
      await fs.mkdir(uploadsDir, { recursive: true });
      const diskPath = join(uploadsDir, validatedMeta.fileName);
      await fs.writeFile(diskPath, buffer);

      // 3) Generate file URL
      const publicUrlBase = process.env.PUBLIC_BASE_URL || '';
      const fileUrl = publicUrlBase
        ? `${publicUrlBase}/uploads/gps/${report.id}/${encodeURIComponent(validatedMeta.fileName)}`
        : `/uploads/gps/${report.id}/${encodeURIComponent(validatedMeta.fileName)}`;

      // 4) Update report with file paths
      await updateGpsReport(report.id, session.user.clubId, {
        filePath: diskPath,
        fileUrl,
      });

      // 5) Create player mappings if provided
      let createdMappings = 0;
      if (validatedMeta.playerMappings && validatedMeta.playerMappings.length > 0) {
        try {
          const { createGpsPlayerMappings } = await import('@/services/gps.service');
          createdMappings = await createGpsPlayerMappings(report.id, validatedMeta.playerMappings);
          console.log(`Created ${createdMappings} player mappings for report ${report.id}`);
        } catch (mappingError) {
          console.error('Error creating player mappings:', mappingError);
          // Don't fail the entire request if mappings fail
        }
      }

      // 6) Return updated report
      const updatedReport = {
        ...report,
        filePath: diskPath,
        fileUrl,
        createdMappings,
      };

      return NextResponse.json(updatedReport, { status: 201 });
    } catch (fileError) {
      console.error('Error saving file:', fileError);
      // Report was created but file save failed
      return NextResponse.json(
        { error: 'FILE_SAVE_FAILED', reportId: report.id },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error creating GPS report:', error);
    return NextResponse.json(
      { error: 'UNEXPECTED' },
      { status: 500 }
    );
  }
}
