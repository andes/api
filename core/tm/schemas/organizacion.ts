import * as camas from './camas';
import * as mongoose from 'mongoose';
import * as edificioSchema from './edificio';
import * as direccionSchema from './direccion';
import * as contactoSchema from './contacto';
import * as tipoEstablecimientoSchema from './tipoEstablecimiento';
import { SnomedConcept } from '../../../modules/rup/schemas/snomed-concept';

let codigoSchema = new mongoose.Schema({
    sisa: {
        type: String,
        required: true
    },
    cuie: String,
    remediar: String
});

let _schema = new mongoose.Schema({
    codigo: { type: codigoSchema },
    nombre: String,
    tipoEstablecimiento: { type: tipoEstablecimientoSchema },
    contacto: [contactoSchema],
    direccion: { type: direccionSchema },
    edificio: [edificioSchema],
    nivelComplejidad: Number,
    activo: {
        type: Boolean,
        required: true,
        default: true
    },
    fechaAlta: Date,
    fechaBaja: Date,
    unidadesOrganizativas: [SnomedConcept]
});
const audit = require('../../../mongoose/audit');
_schema.plugin(audit);
export let schema = _schema;
export let model = mongoose.model('organizacion', _schema, 'organizacion');
