import * as mongoose from 'mongoose';
import { SnomedConcept } from '../schemas/snomed-concept';

const CamaEstadosSchema = new mongoose.Schema({
    idCama: mongoose.Types.ObjectId,
    idOrganizacion: mongoose.Types.ObjectId,
    ambito: String,
    capa: String,
    start: Date,
    end: Date,
    estados: [{
        fecha: Date,
        estado: {
            type: String,
            // enum: ['ocupada', 'desocupada', 'disponible', 'reparacion', 'bloqueada', 'inactiva'],
            required: true,
            default: 'desocupada'
        },
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
        genero: SnomedConcept,
        /* Datos del paciente e internacion si la cama está ocupada */
        paciente: {
            id: mongoose.Schema.Types.ObjectId,
            documento: String,
            sexo: String,
            genero: String,
            nombre: String,
            apellido: String,
            fechaNacimiento: Date
        },
        idInternacion: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },
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
            required: false,
            default: null
        },
    }]

});

export const CamaEstadoss = mongoose.model('internacionCamaEstadoss', CamaEstadosSchema, 'internacionCamaEstadoss');
