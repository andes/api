import { exportCovid19 } from './exportCovid19';

function run(done) {
    // Cantidad de horas inicio Ej: Si quiero todas las prestaciones desde hace 6 horas hasta este momento, envio el número 6.
    const horas = process.env.HORAS;
    exportCovid19(done, parseInt(horas, 10));
}

export = run;
