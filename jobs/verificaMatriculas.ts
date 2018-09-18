
import { vencimientoMatriculaGrado, vencimientoMatriculaPosgrado } from './../core/tm/controller/profesional';

async function run() {
    console.log('soy un job');
    await vencimientoMatriculaGrado();
    await vencimientoMatriculaPosgrado();
}

export = run;
