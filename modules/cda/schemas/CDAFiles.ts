import { Connections } from '../../../connections';
import * as mongoose from 'mongoose';
let  gridfs = require('mongoose-gridfs');

/**
 * No podemos inicializar directamente el schema por un defecto del paquete mongoose-gridfs
 */

export function makeFs() {
  var CDAFilesSchema = gridfs({
      collection: 'CDAFiles',
      model: 'CDAFiles',
      mongooseConnection: mongoose.connection
  });

    // obtain a model
  return CDAFilesSchema.model;

}
