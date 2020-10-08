import { importarNacimientos } from '../core/mpi/jobs/nacimientosProcess';
import { agregarDocumentosFaltantes } from '../core/mpi/jobs/nacimientosProcess';
import { obtenerModificaciones } from '../core/mpi/jobs/nacimientosProcess';
import debug = require('debug');

const deb = debug('nacimientosJob');

async function run(done) {
    // PARAMETRO FECHA OPCIONAL PARA TESTEAR , el formato debe ser 'yyyy-mm-dd'
    // let fecha='yyyy-mm-dd'
    await importarNacimientos(done);
    await agregarDocumentosFaltantes();
    await obtenerModificaciones(); // <-- parametro opcional fecha va aquí
    done();
}

export = run;
