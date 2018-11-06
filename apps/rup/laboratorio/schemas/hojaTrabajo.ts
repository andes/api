import { profesional } from './../../../../core/tm/schemas/profesional';
import { Practica } from './practica';
import { model, Schema } from 'mongoose';
import { model as efector } from '../../../../core/tm/schemas/organizacion';


export let schema = new Schema({
    laboratorio: efector,
    codigo: String,
    responsable: profesional,
    formato: Number,
    tipoHoja: Boolean,
    formatoAncho: Number,
    imprimirPrioridad: Boolean,
    imprimirOrigen: Boolean,
    imprimirApellidoNombre: Boolean,
    imprimirEdad: Boolean,
    imprimirSexo: Boolean,
    imprimirAntecedente: Boolean,
    imprimirFechaHora: Boolean,
    imprimirCorrelativo: Boolean,
    imprimirMedico: Boolean,
    textoInferiorDerecha: String,
    textoInferiorIzquierda: String,
    cantidadLineaAdicional: Number,
    baja: Boolean,
    idUsuarioRegistro: Number,
    fechaRegistro: Date,
    idUltimoProtocoloListado: Number,

});


// Habilitar plugin de auditoría
schema.plugin(require('../../../../mongoose/audit'));

export let HojaTrabajo = model('hojaTrabajo', schema, 'hojaTrabajo');
