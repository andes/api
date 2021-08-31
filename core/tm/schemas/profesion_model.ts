import * as mongoose from 'mongoose';
import * as profesionSchema from './profesion';

// Virtuals

export const profesion = mongoose.model('profesion', profesionSchema, 'profesion');

