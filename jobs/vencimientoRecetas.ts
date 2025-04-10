import { actualizarEstadosRecetas } from './../modules/recetas/recetasController';

async function run(done) {
    await actualizarEstadosRecetas(done);
}

export = run;
