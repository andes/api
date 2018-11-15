
import { insertSips } from './../core/mpi/controller/paciente';
import * as pecasCtrl from './../modules/estadistica/pecas/controller/agenda';
import * as moment from 'moment';

async function run(done) {
    await insertSips(done);
}

export = run;
