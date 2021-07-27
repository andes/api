import { exportCovid19 } from '../modules/vacunas/controller/vacunas.controller';

async function run(done) {
    // Si length=5 entonces vienen dos argumentos (fechaDesde y fechaHasta)
    if (process.argv.length === 5) {
        const desde = process.argv[3];
        const hasta = process.argv[4];
        await exportCovid19(null, null, desde, hasta);
    } else { // Si no es 5 entonces viene 1 solo argumento (horas) o sin argumentos (por defecto una hora)
        const horas = process.argv[3] || '1';
        await exportCovid19(horas, null, null, null);
    }
    done();
}

export = run;

