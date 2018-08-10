import * as mongoose from 'mongoose';
import * as profesionSchema from './profesion';

// Virtuals

let profesion = mongoose.model('profesion', profesionSchema, 'profesion');

export = profesion;
