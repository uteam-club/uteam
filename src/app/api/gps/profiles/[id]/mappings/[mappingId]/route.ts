import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  getGpsProfileById,
  updateGpsColumnMapping,
  deleteGpsColumnMapping,
  getGpsReportCountByProfileId,
  getGpsColumnMappingById
} from '@/services/gps.service';
import { z } from 'zod';
import { getAllowedUnitsForMetric } from '@/lib/canonical-metrics';

const UpdateMappingSchema = z.object({
  // только неструктурные поля; структурные заблокированы «freeze»
  customName: z.string().min(1).optional(),
  description: z.string().optional(),
  displayOrder: z.number().int().optional(),
  displayUnit: z.string().min(1).optional(), // РАЗРЕШЕНО менять даже при used>0
  isVisible: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; mappingId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.clubId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if profile exists and belongs to user's club
    const profile = await getGpsProfileById(params.id, session.user.clubId);
    if (!profile) {
      return NextResponse.json({ error: 'GPS profile not found' }, { status: 404 });
    }

    // Check if profile is in use (structure frozen)
    const usedCount = await getGpsReportCountByProfileId(params.id, session.user.clubId);
    
    const parsed = UpdateMappingSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 });
    }
    const body = parsed.data;

    // If profile is in use, only allow non-structural changes
    if (usedCount > 0) {
      const currentMapping = await getGpsColumnMappingById(params.mappingId, session.user.clubId);
      if (!currentMapping) {
        return NextResponse.json({ error: 'Mapping not found' }, { status: 404 });
      }

      // Define structural and non-structural fields
      const structuralFields = ['canonicalMetric', 'sourceColumn', 'sourceHeader', 'sourceIndex', 'isVisible'];
      const nonStructuralFields = ['customName', 'displayName', 'displayOrder', 'displayUnit', 'description'];
      
      // Check for structural field changes
      const blockedFields: string[] = [];
      // canonicalMetric не может быть изменен в frozen профилях (не в схеме)
      if (body.isVisible !== undefined && body.isVisible !== currentMapping.isVisible) {
        blockedFields.push('isVisible');
      }
      // Add other structural field checks if they exist in the model
      
      if (blockedFields.length > 0) {
        return NextResponse.json(
          { 
            error: 'PROFILE_STRUCTURE_FROZEN', 
            message: 'Profile has reports. Structural fields cannot be changed.',
            blockedFields 
          },
          { status: 409 }
        );
      }

      // Если в body.displayUnit пришло значение — провалидируй
      if (body.displayUnit) {
        const allowed = getAllowedUnitsForMetric(currentMapping.canonicalMetric);
        if (!allowed.includes(body.displayUnit)) {
          return NextResponse.json(
            { error: 'INVALID_DISPLAY_UNIT', message: 'displayUnit must be one of allowed units for metric', allowedUnits: allowed },
            { status: 400 }
          );
        }
      }

      // Only update non-structural fields
      const updateData: any = {};
      if (body.customName !== undefined) updateData.customName = body.customName;
      if (body.displayUnit !== undefined) updateData.displayUnit = body.displayUnit;
      if (body.displayOrder !== undefined) updateData.displayOrder = body.displayOrder;
      if (body.description !== undefined) updateData.description = body.description;

      const updatedMapping = await updateGpsColumnMapping(params.mappingId, session.user.clubId, updateData);
      
      if (!updatedMapping) {
        return NextResponse.json(
          { error: 'Failed to update GPS column mapping' },
          { status: 500 }
        );
      }

      return NextResponse.json(updatedMapping);
    }

    // If profile is not in use, allow all changes
    // Валидация displayUnit для не-frozen профилей
    if (body.displayUnit) {
      const currentMapping = await getGpsColumnMappingById(params.mappingId, session.user.clubId);
      if (currentMapping) {
        const allowed = getAllowedUnitsForMetric(currentMapping.canonicalMetric);
        if (!allowed.includes(body.displayUnit)) {
          return NextResponse.json(
            { error: 'INVALID_DISPLAY_UNIT', message: 'displayUnit must be one of allowed units for metric', allowedUnits: allowed },
            { status: 400 }
          );
        }
      }
    }

    const updatedMapping = await updateGpsColumnMapping(params.mappingId, session.user.clubId, {
      customName: body.customName,
      displayUnit: body.displayUnit,
      isVisible: body.isVisible,
      displayOrder: body.displayOrder,
      description: body.description,
    });

    if (!updatedMapping) {
      return NextResponse.json(
        { error: 'Failed to update GPS column mapping' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedMapping);
  } catch (error) {
    console.error('Error updating GPS column mapping:', error);
    return NextResponse.json(
      { error: 'Failed to update GPS column mapping' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; mappingId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.clubId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if profile exists and belongs to user's club
    const profile = await getGpsProfileById(params.id, session.user.clubId);
    if (!profile) {
      return NextResponse.json({ error: 'GPS profile not found' }, { status: 404 });
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

    const success = await deleteGpsColumnMapping(params.mappingId, session.user.clubId);
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete GPS column mapping' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting GPS column mapping:', error);
    return NextResponse.json(
      { error: 'Failed to delete GPS column mapping' },
      { status: 500 }
    );
  }
}
