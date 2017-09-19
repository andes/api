

import * as mongoose from 'mongoose';
import * as constantes from './constantes';
import { Connections } from './../../../connections';

export let pacienteRejectedSchema = new mongoose.Schema({
    id: mongoose.Schema.Types.ObjectId,
    documento: {
        type: String,
        es_indexed: true
    },
    nombre: {
        type: String,
        es_indexed: true
    },
    apellido: {
        type: String,
        es_indexed: true
    },
    sexo: constantes.SEXO,
    fechaNacimiento: {
        type: Date,
        es_indexed: true
    },
    porcentajeMatch: [{
        entidad: String,
        match: Number
    }]
});

export let pacienteRejected = Connections.mpi.model('pacienteRejected', pacienteRejectedSchema, 'pacienteRejected');
