
import { vencimientoMatriculaGrado, vencimientoMatriculaPosgrado } from './../core/tm/controller/profesional';

async function run(done) {
    await vencimientoMatriculaPosgrado(done);
}

export = run;
