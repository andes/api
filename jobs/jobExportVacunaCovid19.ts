import { exportCovid19 } from './exportCovid19';


function run(done) {
    // Si length=5 entonces vienen dos argumentos (fechaDesde y fechaHasta)
    if (process.argv.length === 5) {
        const desde = process.argv[3];
        const hasta = process.argv[4];
        exportCovid19(done, null, desde, hasta);
    } else { // Si no es 5 entonces viene 1 solo argumento (horas) o sin argumentos (por defecto una hora)
        const horas = process.argv[3] || '1';
        exportCovid19(done, parseInt(horas, 10), null, null);
    }
}

export = run;

