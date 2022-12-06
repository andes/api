import { ObjectId } from '@andes/core';
import { SchemaTypes, Schema, model } from 'mongoose';
import { ISnomedConcept, SnomedConcept } from '../schemas/snomed-concept';

export interface InternacionExtras {
    egreso?: boolean;
    ingreso?: boolean;
    tipo_egreso?: string;
    idInternacion?: ObjectId;
    unidadOrganizativaOrigen?: ISnomedConcept;
    idMovimiento?: ObjectId;

}
export const InternacionExtrasSchema = new Schema(
    {
        egreso: { type: Boolean, required: false },
        ingreso: { type: Boolean, required: false },
        tipo_egreso: { type: String, required: false },
        prestamo: { type: Boolean, required: false },
        devolucion: { type: Boolean, required: false },
        edicionCama: { type: Boolean, required: false },
        cambioDeCama: { type: Boolean, required: false },
        idInternacion: { type: SchemaTypes.ObjectId, required: false }, // idInternacion al egresar,
        unidadOrganizativaOrigen: { type: SnomedConcept, required: false },
        idMovimiento: { type: SchemaTypes.ObjectId, required: false },

    },
    { _id: false }
);

const CamaEstadosSchema = new Schema({
    idCama: SchemaTypes.ObjectId,
    idOrganizacion: SchemaTypes.ObjectId,
    ambito: String,
    capa: String,
    start: Date,
    end: Date,
    estados: [{
        fecha: Date,
        estado: String,
        unidadOrganizativa: {
            type: SnomedConcept,
            required: true
        },
        especialidades: [SnomedConcept],
        esCensable: {
            type: Boolean,
            required: true,
            default: true
        },
        genero: { type: SnomedConcept, required: false },
        /* Datos del paciente e internacion si la cama está ocupada */
        paciente: {
            id: SchemaTypes.ObjectId,
            documento: String,
            sexo: String,
            genero: String,
            nombre: String,
            apellido: String,
            fechaNacimiento: Date
        },
        idInternacion: SchemaTypes.ObjectId,
        fechaIngreso: Date,
        observaciones: {
            type: String
        },
        esMovimiento: {
            type: Boolean,
            required: true,
            default: false
        },
        sugierePase: {
            type: SnomedConcept,
            required: false
        },
        equipamiento: [SnomedConcept],
        extras: { type: InternacionExtrasSchema, required: false },
        nota: { type: String, required: false },
        createdAt: { type: Date, required: false },
        createdBy: { type: SchemaTypes.Mixed, required: false },
        updatedAt: { type: Date, required: false },
        updatedBy: { type: SchemaTypes.Mixed, required: false },
        deletedAt: { type: Date, required: false },
        deletedBy: { type: SchemaTypes.Mixed, required: false },
    }]
});

CamaEstadosSchema.index({ ambito: 1, capa: 1, start: 1, end: 1 });
CamaEstadosSchema.index({ ambito: 1, capa: 1, idOrganizacion: 1, start: 1, end: 1 });
CamaEstadosSchema.index({ ambito: 1, capa: 1, idOrganizacion: 1, idCama: 1, start: 1, end: 1 });

CamaEstadosSchema.index({ 'estados.idInternacion': 1 });
CamaEstadosSchema.index({ 'estados.extras.idInternacion': 1 });
CamaEstadosSchema.index({ 'estados.extras.idMovimiento': 1 });


export const CamaEstados = model('internacionCamaEstados', CamaEstadosSchema, 'internacionCamaEstados');
