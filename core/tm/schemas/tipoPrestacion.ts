// import { tipoProblema } from './../../../modules/rup/schemas/tipoProblema';
import * as mongoose from 'mongoose';
import * as codificadorSchema from '../../../modules/rup/schemas/codificador';

export let tipoPrestacionSchema = new mongoose.Schema({
    // valor por el cual vamos a leer/guardar en nuestra BD
    key: String,
    nombre: String,
    descripcion: String,
    codigo: [codificadorSchema],
    autonoma: Boolean,
    solicitud: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'tipoPrestacion'
    }],
    ejecucion: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'tipoPrestacion'
    }],
    tipoProblemas: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'tipoProblema'
    }],
    turneable: Boolean,
    activo: Boolean,
    componente: {
        ruta: String,
        nombre: String
    },
    granularidad: String,
    tipo: {
        type: String,
        enum: ['entidadObservable', 'problema']
    }
});

export let tipoPrestacion = mongoose.model('tipoPrestacion', tipoPrestacionSchema, 'tipoPrestacion');

