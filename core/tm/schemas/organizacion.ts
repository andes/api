import * as mongoose from 'mongoose';
import * as edificioSchema from './edificio';
import * as direccionSchema from './direccion';
import * as contactoSchema from './contacto';
import * as tipoEstablecimientoSchema from './tipoEstablecimiento';
import { SnomedConcept } from '../../../modules/rup/schemas/snomed-concept';

const codigoSchema = new mongoose.Schema({
    sisa: {
        type: String,
        required: true
    },
    cuie: String,
    remediar: String,
    sips: String
});

const _schema = new mongoose.Schema({
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
    /*
    //Se modifica el campo unidadesOrganizativas por servicios
    // dado que desde la app se envia el campo con el nombre servicios
    // (el esquema del modelo en la app se llama servicios)
    // con este cambio se pudieron actualizar correctamente los servicios
    // unidadesOrganizativas: [SnomedConcept]
    // Esto tambien traia incoveninentes en el get dado que el objeto desde la api
    // no era igual al del esquema
    // el del castro rendon funcionaba por si tenia el campo llamado servicios
    */
    servicios: [SnomedConcept]
});
const audit = require('../../../mongoose/audit');
_schema.plugin(audit);
export let schema = _schema;
export let model = mongoose.model('organizacion', _schema, 'organizacion');
