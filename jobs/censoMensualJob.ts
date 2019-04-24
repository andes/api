
import { censoMensualJob } from '../modules/rup/controllers/censo';

async function run(done) {
    censoMensualJob(done);
}

export = run;
