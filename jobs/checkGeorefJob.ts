import { checkGeoreferencia } from '../core/mpi/controller/checkGeoref';

function run(done) {
    checkGeoreferencia().then(() => {
        done();
    }, () => {
        done();
    });
}

export = run;
