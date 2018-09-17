import { updatingMpi } from '../core/mpi/controller/mpiUpdater';

function run(done) {
    updatingMpi().then(() => {
        done();
    }, () => {
        done();
    });
}

export = run;
