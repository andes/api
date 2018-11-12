import { importBebes } from '../core/mpi/controller/bebeProcess';

function run(done) {
    // PARAMETRO FECHA OPCIONAL PARA TESTEAR , el formato debe ser 'yyyy-mm-dd'
    // let fecha='yyyy-mm-dd'
    importBebes(done); // <-- parametro opcional va aquí
}

export = run;
