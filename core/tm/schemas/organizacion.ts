import * as mongoose from 'mongoose';
import * as edificioSchema from './edificio';
import * as direccionSchema from './direccion';
import * as contactoSchema from './contacto';
import * as tipoEstablecimientoSchema from './tipoEstablecimiento';

import { SnomedConcept } from '../../../modules/rup/schemas/snomed-concept';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';

export let mapaSectoresSchema = new mongoose.Schema({
    tipoSector: SnomedConcept,
    unidadConcept: {
        type: SnomedConcept,
        required: false
    },
    nombre: String
});
mapaSectoresSchema.add({ hijos: [mapaSectoresSchema] });

let codigoSchema = new mongoose.Schema({
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
    turnosMobile: { type: Boolean, default: false },
    fechaAlta: Date,
    fechaBaja: Date,
    mapaSectores: [mapaSectoresSchema],
    unidadesOrganizativas: [SnomedConcept]
});

_schema.plugin(AuditPlugin);

export let schema = _schema;
export let model = mongoose.model('organizacion', _schema, 'organizacion');
