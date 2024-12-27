
import { exportarMatriculasGado } from '../core/tm/controller/profesional';

async function run(done) {
    await exportarMatriculasGado(done);
}

export = run;
