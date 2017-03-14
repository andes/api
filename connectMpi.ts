import * as mongoose from 'mongoose';
import * as config from './config';


let connectMpi = mongoose.createConnection(config.connectionStrings.mongoDB_mpi);

connectMpi.on('error', function (err) {
    console.log('No se pudo conectar a MPI: ', err);
});

connectMpi.once('open', function callback() {
    console.log('Mongo db conectado a MPI');
});

export {
    connectMpi
}
