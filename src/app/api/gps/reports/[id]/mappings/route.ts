import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { z } from 'zod';
import { 
  getGpsPlayerMappingsByReportId, 
  createGpsPlayerMapping, 
  deleteGpsPlayerMappingsByReportId,
  bulkCreateGpsPlayerMappings
} from '@/services/gps.service';

// Валидация для батч-создания маппингов
const CreateMappingItemSchema = z.object({
  rowIndex: z.number().int().min(0),
  playerId: z.string().uuid().nullable(),
  similarity: z.number().int().min(0).max(100).nullable().optional(),
  isManual: z.boolean().default(false)
});

const CreateMappingBatchSchema = z.object({
  items: z.array(CreateMappingItemSchema).max(5000)
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

    const mappings = await getGpsPlayerMappingsByReportId(params.id, session.user.clubId);
    return NextResponse.json(mappings);
  } catch (error) {
    console.error('Error fetching GPS player mappings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch GPS player mappings' },
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

    const body = await request.json();
    const { playerId, rowIndex, isManual, similarity } = body;

    if (rowIndex === undefined) {
      return NextResponse.json(
        { error: 'Row index is required' },
        { status: 400 }
      );
    }

    const mapping = await createGpsPlayerMapping({
      gpsReportId: params.id,
      playerId,
      rowIndex: parseInt(rowIndex),
      isManual,
      similarity,
    });

    return NextResponse.json(mapping, { status: 201 });
  } catch (error) {
    console.error('Error creating GPS player mapping:', error);
    return NextResponse.json(
      { error: 'Failed to create GPS player mapping' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.clubId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Валидация с zod
    const validationResult = CreateMappingBatchSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { items } = validationResult.data;

    // Обработка пустого массива
    if (items.length === 0) {
      return NextResponse.json({ created: 0 });
    }

    const created = await bulkCreateGpsPlayerMappings(params.id, session.user.clubId, items);
    return NextResponse.json({ created });
  } catch (error) {
    console.error('Error bulk creating GPS player mappings:', error);
    return NextResponse.json(
      { error: 'Failed to create GPS player mappings' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.clubId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await deleteGpsPlayerMappingsByReportId(params.id, session.user.clubId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting GPS player mappings:', error);
    return NextResponse.json(
      { error: 'Failed to delete GPS player mappings' },
      { status: 500 }
    );
  }
}