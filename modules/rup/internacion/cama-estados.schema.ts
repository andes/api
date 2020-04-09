import { SchemaTypes, Schema, model } from 'mongoose';
import { SnomedConcept } from '../schemas/snomed-concept';

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
        extras: {
            egreso: { type: Boolean, required: false },
            ingreso: { type: Boolean, required: false },
            idInternacion: { type: SchemaTypes.ObjectId, required: false }, // idInternacion al egresar
        },
        createdAt: { type: Date, required: false },
        createdBy: { type: SchemaTypes.Mixed, required: false },
        updatedAt: { type: Date, required: false },
        updatedBy: { type: SchemaTypes.Mixed, required: false },
    }]
});


export const CamaEstados = model('internacionCamaEstados', CamaEstadosSchema, 'internacionCamaEstados');
