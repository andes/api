
import { notificarVencimientosMinutas } from '../modules/mobileApp/controller/RecordatorioController';

async function run(done) {
    console.log("holi")
    await notificarVencimientosMinutas(done);
}

export = run;
