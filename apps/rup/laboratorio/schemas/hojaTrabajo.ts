import { profesional } from './../../../../core/tm/schemas/profesional';
import { Practica } from './practica';
import * as mongoose from 'mongoose';
import { model as efector } from '../../../../core/tm/schemas/organizacion';
import { ObjectID } from 'bson';

export let schema = new mongoose.Schema({
    laboratorio: { type: mongoose.Schema.Types.ObjectId, ref: 'efector', required: true },
    codigo: String,
    responsable: { type: mongoose.Schema.Types.ObjectId, ref: 'profesional', required: true },
    protocolo: {
        imprimirPrioridad: Boolean,
        imprimirOrigen: Boolean,
        imprimirCorrelativo: Boolean,
        imprimirDiagnostico: Boolean,
        idUltimoProtocoloListado: ObjectID,
    },
    paciente: {
        imprimirApellidoNombre: Boolean,
        imprimirEdad: Boolean,
        imprimirSexo: Boolean,
        cantidadLineaAdicional: Number,
        imprimirAntecedente: Boolean,
    },
    papel: {
        formato: Number,
        orientacion: Boolean,
        anchoColumnasMilimetros: Number,
        imprimirFechaHora: Boolean,
        imprimirMedico: Boolean,
        textoInferiorDerecha: String,
        textoInferiorIzquierda: String,
    },
    baja: Boolean,
    practicas: [{ nombre: String, practica: { type: mongoose.Schema.Types.ObjectId, ref: 'Practica', required: true } }],
});


// Habilitar plugin de auditoría
schema.plugin(require('../../../../mongoose/audit'));

export let HojaTrabajo = mongoose.model('hojaTrabajo', schema, 'hojaTrabajo');
