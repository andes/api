import * as mongoose from 'mongoose';

export let tipoPrestacionSchema = new mongoose.Schema({
    // valor por el cual vamos a leer/guardar en nuestra BD
    key: String,
    nombre: String,
    descripcion: String,
    codigo: [String],
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
        type: mongoose.Schema.Types.ObjectId
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

