import * as mongoose from 'mongoose';
import * as provinciaSchema from './provincia';

let provincia = mongoose.model('provincia', provinciaSchema, 'provincia');

export = provincia;
