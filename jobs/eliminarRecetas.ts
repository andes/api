import { eliminarRecetas } from './../modules/recetas/recetasController';

async function run(done) {
    await eliminarRecetas(done);
}

export = run;
