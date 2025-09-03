import { actualizarEstadosDispensa } from '../modules/recetas/recetasController';

function run(done) {
    actualizarEstadosDispensa().finally(() => done());
}

export = run;
