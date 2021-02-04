import { exportSisa } from './exportNexosSisa';

function run(done) {
    const horas = process.env.HORAS || '4';
    exportSisa(done, parseInt(horas, 10));
}

export = run;
