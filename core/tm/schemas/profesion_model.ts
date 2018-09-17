import * as mongoose from 'mongoose';
import * as profesionSchema from './profesion';

// Virtuals

const profesion = mongoose.model('profesion', profesionSchema, 'profesion');

export = profesion;
