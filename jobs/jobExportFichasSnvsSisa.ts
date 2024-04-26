import { exportSisaFicha, exportFichaSNVS } from './exportNexosFichaSisa';

function run(done) {
    if (process.argv.length === 5) {
        const desde = process.argv[3];
        const hasta = process.argv[4];
        exportSisaFicha(done, null, desde, hasta);
        exportFichaSNVS(done, null, desde, hasta);
    } else { // Si no es 5 entonces viene 1 solo argumento (horas) o sin argumentos (por defecto una hora)
        const horas = process.argv[3] || '4';
        exportSisaFicha(done, parseInt(horas, 10), null, null);
        exportFichaSNVS(done, parseInt(horas, 10), null, null);
    }

}

export = run;
