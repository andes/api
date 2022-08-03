
import { vencimientoMatriculaGrado } from './../core/tm/controller/profesional';

async function run(done) {
    await vencimientoMatriculaGrado(done);
}

export = run;
