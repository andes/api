import * as mongoose from 'mongoose';
import * as config from './config';


let connectMpi = mongoose.createConnection(config.connectionStrings.mongoDB_mpi);

connectMpi.on('error', function (err) {
    console.log('[Mongoose] No se pudo conectar a MPI');
});

connectMpi.once('open', function callback() {
    console.log('[Mongoose] Conexión a MPI OK');
});

export {
    connectMpi
}
