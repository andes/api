
import { notificarVencimientosMinutas } from '../modules/mobileApp/controller/RecordatorioController';

async function run(done) {
    await notificarVencimientosMinutas(done);
}

export = run;
