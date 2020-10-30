import { importarNacimientos } from '../core/mpi/jobs/nacimientosProcess';
import { importarDocumentosAsignados } from '../core/mpi/jobs/nacimientosProcess';
import debug = require('debug');


async function run(done) {
    // PARAMETRO FECHA OPCIONAL PARA TESTEAR , el formato debe ser 'yyyy-mm-dd'
    // let fecha='yyyy-mm-dd'
    await importarNacimientos(done);
    await importarDocumentosAsignados(done);
    done();
}

export = run;
