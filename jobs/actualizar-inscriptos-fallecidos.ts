import { updateInsriptosFallecidos } from '../modules/vacunas/controller/inscripcion.vacunas.controller';

async function run(done) {
    await updateInsriptosFallecidos();
    done();
}

export = run;
