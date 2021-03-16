import * as vacunaCtr from '../modules/vacunas/controller/vacunas.controller';

export async function exportCovid19(done, horas, desde, hasta) {
    await vacunaCtr.exportCovid19(horas, null, desde, hasta);
    done();
}
