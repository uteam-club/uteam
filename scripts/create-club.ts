import { db } from '../src/lib/db';
import { club } from '../src/db/schema/club';

async function main() {
  const newClub = await db.insert(club).values({
    name: 'FC Alashkert',
    subdomain: 'alashkert',
    logoUrl: '/alashkert.white.png',
    // broadcastTime: '09:00', // если нужно
  }).returning();
  console.log('Клуб создан:', newClub);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); }); 