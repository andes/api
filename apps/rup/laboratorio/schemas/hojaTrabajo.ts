import * as mongoose from 'mongoose';
import { SnomedConcept } from './../../../../modules/rup/schemas/snomed-concept';

export let schema = new mongoose.Schema({
    laboratorio: { type: mongoose.Schema.Types.ObjectId, ref: 'organizacion', required: true },
    nombre: String,
    responsable: { type: mongoose.Schema.Types.ObjectId, ref: 'profesional', required: true },
    area: {
        id: String,
        nombre: {
            type: String,
            required: true
        }
    },
    protocolo: {
        imprimirPrioridad: Boolean,
        imprimirOrigen: Boolean,
        imprimirDiagnostico: Boolean
    },
    paciente: {
        imprimirApellidoNombre: Boolean,
        imprimirEdad: Boolean,
        imprimirSexo: Boolean,
        cantidadLineaAdicional: Number
    },
    papel: {
        formato: {
            type: String,
            enum: ['A4', 'Oficio']
        },
        orientacion: {
            type: String,
            enum: ['Horizontal', 'Vertical']
        },
        anchoColumnasMilimetros: Number,
        textoInferiorDerecha: String,
        textoInferiorIzquierda: String,
    },
    baja: Boolean,
    practicas: [{
        id: mongoose.Schema.Types.ObjectId,
        nombre: String,
        practica: {
            id: mongoose.Schema.Types.ObjectId,
            codigo: {
                type: String,
                required: false
            },
            nombre: {
                type: String,
                required: true
            },
            concepto: SnomedConcept,
        }
    }],
});


// Habilitar plugin de auditoría
schema.plugin(require('../../../../mongoose/audit'));

export let HojaTrabajo = mongoose.model('hojaTrabajo', schema, 'hojaTrabajo');
