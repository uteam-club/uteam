import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { getGpsColumnMappingsByProfileId, createGpsColumnMapping, getGpsReportCountByProfileId } from '@/services/gps.service';
import { z } from 'zod';
import { getAllowedUnitsForMetric } from '@/lib/canonical-metrics';

const CreateMappingSchema = z.object({
  sourceColumn: z.string().min(1),
  customName: z.string().min(1),
  canonicalMetric: z.string().min(1),
  displayUnit: z.string().min(1), // ОБЯЗАТЕЛЬНОЕ
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.clubId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const mappings = await getGpsColumnMappingsByProfileId(params.id, session.user.clubId);
    
    // dev-only server-side logging
    if (process.env.NODE_ENV !== 'production') {
      console.log('[dev][profile-mappings]', params.id, 'count=', mappings.length, 'hasAthleteName=', !!mappings.find(m => m.canonicalMetric==='athlete_name'));
    }
    
    return NextResponse.json(mappings);
  } catch (error) {
    console.error('Error fetching GPS column mappings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch GPS column mappings' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.clubId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if profile is in use (structure frozen)
    const usedCount = await getGpsReportCountByProfileId(params.id, session.user.clubId);
    if (usedCount > 0) {
      return NextResponse.json(
        { 
          error: 'PROFILE_STRUCTURE_FROZEN', 
          message: 'Profile has reports. Structural changes are blocked.' 
        },
        { status: 409 }
      );
    }

    const parsed = CreateMappingSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 });
    }

    const { sourceColumn, customName, canonicalMetric, displayUnit, description, isActive } = parsed.data;

    // проверка displayUnit ∈ allowed
    const allowed = getAllowedUnitsForMetric(canonicalMetric);
    if (!allowed.includes(displayUnit)) {
      return NextResponse.json(
        { error: 'INVALID_DISPLAY_UNIT', message: 'displayUnit must be one of allowed units for metric', allowedUnits: allowed },
        { status: 400 }
      );
    }

    const mapping = await createGpsColumnMapping({
      gpsProfileId: params.id,
      sourceColumn,
      customName,
      canonicalMetric,
      displayUnit: displayUnit, // передаем как есть (не null)
      description,
      isVisible: isActive ?? true,
    }, session.user.clubId);

    return NextResponse.json(mapping);
  } catch (error) {
    console.error('Error creating GPS column mapping:', error);
    return NextResponse.json(
      { error: 'Failed to create GPS column mapping' },
      { status: 500 }
    );
  }
}