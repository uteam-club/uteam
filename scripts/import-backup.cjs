const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = 'postgresql://postgres:Mell567234!@158.160.80.155:5432/postgres';

const client = new Client({
  connectionString: DATABASE_URL,
});

async function importTable(table, data, columns) {
  for (const row of data) {
    const values = columns.map(col => row[col]);
    const quotedColumns = columns.map(col => `"${col}"`).join(', ');
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const query = `INSERT INTO "${table}" (${quotedColumns}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING;`;
    await client.query(query, values);
  }
}

(async () => {
  await client.connect();
  // Clubs
  const clubs = JSON.parse(fs.readFileSync(path.join(__dirname, '../backup/clubs.json')));
  await importTable('Club', clubs, ['id', 'name', 'subdomain', 'logoUrl', 'createdAt', 'updatedAt']);
  // Teams
  const teams = JSON.parse(fs.readFileSync(path.join(__dirname, '../backup/teams.json')));
  await importTable('Team', teams, ['id', 'name', 'description', 'order', 'createdAt', 'updatedAt', 'clubId']);
  // Users
  const users = JSON.parse(fs.readFileSync(path.join(__dirname, '../backup/users.json')));
  await importTable('User', users, ['id', 'email', 'name', 'password', 'role', 'emailVerified', 'imageUrl', 'createdAt', 'updatedAt', 'clubId']);
  // Players
  const players = JSON.parse(fs.readFileSync(path.join(__dirname, '../backup/players.json')));
  await importTable('Player', players, [
    'id', 'firstName', 'lastName', 'middleName', 'number', 'position', 'strongFoot', 'dateOfBirth',
    'academyJoinDate', 'nationality', 'imageUrl', 'status', 'birthCertificateNumber', 'pinCode',
    'createdAt', 'updatedAt', 'teamId', 'telegramId', 'language'
  ].filter(col => players.some(p => p.hasOwnProperty(col))));
  await client.end();
  console.log('Импорт завершён!');
})(); 