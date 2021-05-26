import { updatePerinatalFechaFinEmbarazo } from './perinatalFechaFinEmbarazo';

async function run(done) {
    await updatePerinatalFechaFinEmbarazo();
    done();
}

export = run;
