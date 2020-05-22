
import { censoMensualJob } from '../modules/rup/internacion/censo.controller';

async function run(done) {
    censoMensualJob(done);
}

export = run;
