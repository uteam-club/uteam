import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as club from '../db/schema/club.ts';
import * as user from '../db/schema/user.ts';
import * as team from '../db/schema/team.ts';
import * as training from '../db/schema/training.ts';
import * as player from '../db/schema/player.ts';
import * as mediaItem from '../db/schema/mediaItem.ts';
import * as trainingCategory from '../db/schema/trainingCategory.ts';
import * as exercise from '../db/schema/exercise.ts';
import * as exerciseCategory from '../db/schema/exerciseCategory.ts';
import * as exerciseTag from '../db/schema/exerciseTag.ts';
import * as trainingExercise from '../db/schema/trainingExercise.ts';
import * as playerDocument from '../db/schema/playerDocument.ts';
import * as teamCoach from '../db/schema/teamCoach.ts';
import * as playerAttendance from '../db/schema/playerAttendance.ts';
import * as match from '../db/schema/match.ts';
import * as playerMatchStat from '../db/schema/playerMatchStat.ts';
import * as morningSurveyResponse from '../db/schema/morningSurveyResponse.ts';
import * as rpeSurveyResponse from '../db/schema/rpeSurveyResponse.ts';
import * as painArea from '../db/schema/painArea.ts';
import * as muscleArea from '../db/schema/muscleArea.ts';
import * as survey from '../db/schema/survey.ts';
import * as exerciseTagToExercise from '../db/schema/exerciseTagToExercise.ts';
import * as surveySchedule from '../db/schema/surveySchedule.ts';
import * as fitnessTest from '../db/schema/fitnessTest.ts';
import * as fitnessTestResult from '../db/schema/fitnessTestResult.ts';
import * as permission from '../db/schema/permission.ts';
import * as rolePermission from '../db/schema/rolePermission.ts';
import * as userPermission from '../db/schema/userPermission.ts';

import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const schema = {
  ...club,
  ...user,
  ...team,
  ...training,
  ...player,
  ...mediaItem,
  ...trainingCategory,
  ...exercise,
  ...exerciseCategory,
  ...exerciseTag,
  ...trainingExercise,
  ...playerDocument,
  ...teamCoach,
  ...playerAttendance,
  ...match,
  ...playerMatchStat,
  ...morningSurveyResponse,
  ...rpeSurveyResponse,
  ...painArea,
  ...muscleArea,
  ...survey,
  ...exerciseTagToExercise,
  ...surveySchedule,
  ...fitnessTest,
  ...fitnessTestResult,
  ...permission,
  ...rolePermission,
  ...userPermission,
};

export const db = drizzle(pool, { schema }); 