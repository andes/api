import { actualizarDatosProcess } from '../utils/scriptsMongo/actualizarDatosInternacion';

function run(done) {
    actualizarDatosProcess(done);
}

export = run;
