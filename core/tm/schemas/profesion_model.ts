import * as mongoose from 'mongoose';
import * as profesionSchema from './profesion';

// Virtuals

export let profesion = mongoose.model('profesion', profesionSchema, 'profesion');

