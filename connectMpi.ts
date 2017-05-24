import * as mongoose from 'mongoose';
import * as config from './config';

export let connection = mongoose.createConnection(config.connectionStrings.mongoDB_mpi)
    .on('error', function (err) {
        console.log('[Mongoose] No se pudo conectar a MPI');
    }).once('open', function callback() {
        console.log('[Mongoose] Conexión a MPI OK');
    });
