import * as mongoose from 'mongoose';
import * as provinciaSchema from './provincia';

const provincia = mongoose.model('provincia', provinciaSchema, 'provincia');

export = provincia;
