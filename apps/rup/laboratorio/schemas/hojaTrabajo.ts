import { profesional } from './../../../../core/tm/schemas/profesional';
import { Practica } from './practica';
import { model, Schema } from 'mongoose';
import { model as efector } from '../../../../core/tm/schemas/organizacion';
import { ObjectID } from 'bson';

enum formatoAnchoColumnas {
    'Texto corto' = 0,
    'Texto mediano' = 1,
    'Texto grande' = 2,
    'Texto corto c/Nro. Fila' = 3
}

export let schema = new Schema({
    laboratorio: efector,
    codigo: String,
    responsable: profesional,
    formato: Number,
    tipoHoja: Boolean,
    formatoAncho: formatoAnchoColumnas,
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
    idUltimoProtocoloListado: ObjectID,
    practicas: [{ nombre: String, practica: Practica }],
});


// Habilitar plugin de auditoría
schema.plugin(require('../../../../mongoose/audit'));

export let HojaTrabajo = model('hojaTrabajo', schema, 'hojaTrabajo');
