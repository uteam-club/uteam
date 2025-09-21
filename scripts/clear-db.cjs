const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const schema = require('../dist/src/db/schema');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

// Очистка всех таблиц (порядок важен из-за связей)
async function clearDb() {
  await db.delete(schema.exerciseTagToExercise);
  await db.delete(schema.mediaItem);
  await db.delete(schema.playerDocument);
  await db.delete(schema.playerAttendance);
  await db.delete(schema.playerMatchStat);
  await db.delete(schema.morningSurveyResponse);
  await db.delete(schema.scheduleEvent);
  await db.delete(schema.schedule);
  await db.delete(schema.trainingExercise);
  await db.delete(schema.training);
  await db.delete(schema.teamCoach);
  await db.delete(schema.match);
  await db.delete(schema.player);
  await db.delete(schema.event);
  await db.delete(schema.exercise);
  await db.delete(schema.exerciseTag);
  await db.delete(schema.exerciseCategory);
  await db.delete(schema.team);
  await db.delete(schema.surveySchedule);
  await db.delete(schema.survey);
  await db.delete(schema.muscleArea);
  await db.delete(schema.painArea);
  await db.delete(schema.club);
  await db.delete(schema.user);
  console.log('База данных очищена!');
}

clearDb().then(() => process.exit(0)); 