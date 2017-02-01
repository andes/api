import * as mongoose from 'mongoose';
import * as prestacionSchema from './prestacion'

var prestacion = mongoose.model('prestacion', prestacionSchema, 'prestacion');

export = prestacion;