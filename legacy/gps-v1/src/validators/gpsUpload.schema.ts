import { z } from "zod";

export const PlayerMappingSchema = z.object({
  sourceName: z.string().min(1),
  selectedPlayerId: z.string().uuid().optional(),   // допускаем create без id
  confidence: z.number().min(0).max(1).optional(),
  action: z.enum(['confirm', 'create']).optional(),
});

export const UploadMetaSchema = z.object({
  eventId: z.string().uuid(),
  teamId: z.string().uuid(),
  gpsSystem: z.string().min(1),
  profileId: z.string().uuid(),
  fileName: z.string().min(1),
  eventType: z.enum(['TRAINING', 'MATCH']),
  playerMappings: z.array(PlayerMappingSchema).optional().default([]),
});

export type UploadMeta = z.infer<typeof UploadMetaSchema>;
