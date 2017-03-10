import * as mongoose from "mongoose";
import * as config from './config';


let connectMpi = mongoose.createConnection(config.connectionStrings.mongoDB_mpi);

connectMpi.on("error", function(err) {
    if (err) throw err;
});

connectMpi.once("open", function callback() {
    console.info("Mongo db conectado a MPI");
});

export {
  connectMpi
}
