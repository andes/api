import * as mongoose from 'mongoose';
import * as provinciaSchema from './provincia';

var provincia = mongoose.model('provincia', provinciaSchema, 'provincia');

export = provincia;