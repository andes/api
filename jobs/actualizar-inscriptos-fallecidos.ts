import { updateInsriptosFallecidos } from '../modules/vacunas/controller/inscripcion.vacunas.controller';
import { userScheduler } from '../config.private';

async function run(done) {
    await updateInsriptosFallecidos(userScheduler);
    done();
}

export = run;
