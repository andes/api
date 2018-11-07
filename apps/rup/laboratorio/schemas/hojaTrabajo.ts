import { profesional } from './../../../../core/tm/schemas/profesional';
import { Practica } from './practica';
import * as mongoose from 'mongoose';
import { model as efector } from '../../../../core/tm/schemas/organizacion';
import { ObjectID } from 'bson';
import { SnomedConcept } from './../../../../modules/rup/schemas/snomed-concept';

export let schema = new mongoose.Schema({
    laboratorio: { type: mongoose.Schema.Types.ObjectId, ref: 'efector', required: true },
    nombre: String,
    responsable: { type: mongoose.Schema.Types.ObjectId, ref: 'profesional', required: true },
    area: {
        nombre: {
            type: String,
            required: true
        },
        conceptoSnomed: SnomedConcept
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
        formato: Number, // A4 | Oficio
        orientacion: Boolean, // Horizontal | Vertical
        anchoColumnasMilimetros: Number,
        textoInferiorDerecha: String,
        textoInferiorIzquierda: String,
    },
    baja: Boolean,
    practicas: [{ nombre: String, practica: { type: mongoose.Schema.Types.ObjectId, ref: 'Practica', required: true } }],
});


// Habilitar plugin de auditoría
schema.plugin(require('../../../../mongoose/audit'));

export let HojaTrabajo = mongoose.model('hojaTrabajo', schema, 'hojaTrabajo');
