import { importarNacimientos } from '../core/mpi/jobs/nacimientosProcess';

function run(done) {
    // PARAMETRO FECHA OPCIONAL PARA TESTEAR , el formato debe ser 'yyyy-mm-dd'
    // let fecha='yyyy-mm-dd'
    importarNacimientos(done, '2018/10/01'); // <-- parametro opcional va aquí
}

export = run;
