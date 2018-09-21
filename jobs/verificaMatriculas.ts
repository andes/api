
import { vencimientoMatriculaGrado, vencimientoMatriculaPosgrado } from './../core/tm/controller/profesional';

async function run() {
    await vencimientoMatriculaGrado();
    // await vencimientoMatriculaPosgrado();
}

export = run;
