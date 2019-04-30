import { Schema, model, SchemaTypes } from 'mongoose';
import * as edificioSchema from './edificio';
import * as direccionSchema from './direccion';
import * as contactoSchema from './contacto';
import * as tipoEstablecimientoSchema from './tipoEstablecimiento';
import { SnomedConcept } from '../../../modules/rup/schemas/snomed-concept';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';

export let MapaSectoresSchema = new Schema({
    tipoSector: SnomedConcept,
    unidadConcept: {
        type: SnomedConcept,
        required: false
    },
    nombre: String
});
MapaSectoresSchema.add({ hijos: [MapaSectoresSchema] });

let CodigoSchema = new Schema({
    sisa: {
        type: String,
        required: true
    },
    cuie: String,
    remediar: String,
    sips: String
});

const _schema = new Schema({
    codigo: {
        type: CodigoSchema
    },
    nombre: String,
    tipoEstablecimiento: {
        type: tipoEstablecimientoSchema
    },
    contacto: [contactoSchema],
    direccion: {
        type: direccionSchema
    },
    edificio: [edificioSchema],
    nivelComplejidad: Number,
    activo: {
        type: Boolean,
        required: true,
        default: true
    },
    turnosMobile: {
        type: Boolean,
        default: false
    },
    fechaAlta: Date,
    fechaBaja: Date,
    showMapa: Boolean,
    mapaSectores: [MapaSectoresSchema],
    unidadesOrganizativas: [SnomedConcept],
    configuraciones: SchemaTypes.Mixed,
    ofertaPrestacional: [{ idSisa: Number, nombre: String }] // "prestaciones" traidas de sisa. Se muestran en la app mobile
});

_schema.plugin(AuditPlugin);

export const OrganizacionSchema = _schema;
export const Organizacion = model('organizacion', _schema, 'organizacion');
