import * as mongoose from 'mongoose';
import * as organizacion from '../../core/tm/schemas/organizacion';

export let model = mongoose.model('organizacion', organizacion.schema, 'authOrganizaciones');
