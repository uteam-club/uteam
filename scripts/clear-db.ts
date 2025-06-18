import { db } from '../src/lib/db';
import {
  user, player, team, club, event as eventTable, exercise, exerciseCategory, exerciseTag, match, mediaItem,
  morningSurveyResponse, muscleArea, painArea, playerAttendance, playerDocument, playerMatchStat,
  schedule, scheduleEvent, survey, surveySchedule, teamCoach, training, trainingCategory, trainingExercise,
  exerciseTagToExercise
} from '../src/db/schema';

// Очистка всех таблиц (порядок важен из-за связей)
async function clearDb() {
  await db.delete(exerciseTagToExercise);
  await db.delete(mediaItem);
  await db.delete(playerDocument);
  await db.delete(playerAttendance);
  await db.delete(playerMatchStat);
  await db.delete(morningSurveyResponse);
  await db.delete(scheduleEvent);
  await db.delete(schedule);
  await db.delete(trainingExercise);
  await db.delete(training);
  await db.delete(teamCoach);
  await db.delete(match);
  await db.delete(player);
  await db.delete(eventTable);
  await db.delete(exercise);
  await db.delete(exerciseTag);
  await db.delete(exerciseCategory);
  await db.delete(team);
  await db.delete(surveySchedule);
  await db.delete(survey);
  await db.delete(muscleArea);
  await db.delete(painArea);
  await db.delete(club);
  await db.delete(user);
  console.log('База данных очищена!');
}

clearDb().then(() => process.exit(0)); 