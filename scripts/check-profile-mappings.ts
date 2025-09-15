import { db } from '../src/lib/db';
import { gpsColumnMapping } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function checkProfileMappings(profileId: string) {
  try {
    console.log(`🔍 Checking mappings for profile: ${profileId}`);
    
    const mappings = await db
      .select()
      .from(gpsColumnMapping)
      .where(eq(gpsColumnMapping.gpsProfileId, profileId));
    
    console.log(`📊 Found ${mappings.length} mappings:`);
    mappings.forEach((mapping, index) => {
      console.log(`  ${index + 1}. ${mapping.sourceColumn} → ${mapping.canonicalMetric} (visible: ${mapping.isVisible})`);
    });
    
    const athleteNameMapping = mappings.find(m => m.canonicalMetric === 'athlete_name');
    if (athleteNameMapping) {
      console.log(`✅ Found athlete_name mapping: ${athleteNameMapping.sourceColumn}`);
    } else {
      console.log(`❌ No athlete_name mapping found!`);
    }
    
    return mappings;
  } catch (error) {
    console.error('❌ Error checking profile mappings:', error);
    return null;
  }
}

// Run if called directly
const profileId = process.argv[2];
if (profileId) {
  checkProfileMappings(profileId).then(() => {
    process.exit(0);
  });
} else {
  console.error('Usage: npx tsx check-profile-mappings.ts <profileId>');
  process.exit(1);
}

export { checkProfileMappings };
