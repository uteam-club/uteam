const { db } = require('../src/lib/db');
const { gpsColumnMapping } = require('../src/db/schema');
const { eq } = require('drizzle-orm');

async function checkProfileMappings(profileId) {
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
if (require.main === module) {
  const profileId = process.argv[2];
  if (!profileId) {
    console.error('Usage: node check-profile-mappings.js <profileId>');
    process.exit(1);
  }
  
  checkProfileMappings(profileId).then(() => {
    process.exit(0);
  });
}

module.exports = { checkProfileMappings };
