import { pgTable, uuid } from 'drizzle-orm/pg-core';
import { exercise } from './exercise';
import { exerciseTag } from './exerciseTag';

export const exerciseTagToExercise = pgTable('exercise_tag_to_exercise', {
  exerciseId: uuid('exerciseId').notNull().references(() => exercise.id),
  exerciseTagId: uuid('exerciseTagId').notNull().references(() => exerciseTag.id),
}); 