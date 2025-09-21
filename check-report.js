const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const { eq } = require('drizzle-orm');

// Создаем подключение к базе данных
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/uteam'
});

const db = drizzle(pool);

// Импортируем схему
const { gpsReport } = require('./src/db/schema.ts');

async function checkReport() {
  try {
    console.log('Checking report with ID: de56d91e-9a59-4938-b653-b86f04e01e0c');
    
    const reports = await db.select().from(gpsReport).where(eq(gpsReport.id, 'de56d91e-9a59-4938-b653-b86f04e01e0c'));
    
    if (reports.length === 0) {
      console.log('Report not found in database');
    } else {
      console.log('Report found:');
      console.log(JSON.stringify(reports[0], null, 2));
      
      const report = reports[0];
      if (report.filePath) {
        console.log('File path:', report.filePath);
        const fs = require('fs');
        const path = require('path');
        
        try {
          const fullPath = path.resolve(report.filePath);
          console.log('Full file path:', fullPath);
          console.log('File exists:', fs.existsSync(fullPath));
          
          if (fs.existsSync(fullPath)) {
            const stats = fs.statSync(fullPath);
            console.log('File size:', stats.size, 'bytes');
          }
        } catch (fileError) {
          console.error('Error checking file:', fileError.message);
        }
      } else {
        console.log('No file path in report');
      }
    }
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await pool.end();
  }
}

checkReport();
