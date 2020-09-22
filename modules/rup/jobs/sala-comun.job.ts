import * as moment from 'moment';
import { createSnapshotSalaComun } from '../internacion/sala-comun/sala-comun-snapshot';

async function run(done) {
    const fecha = moment().startOf('h').subtract(1, 'h').toDate();
    createSnapshotSalaComun(fecha).then(done);
}

export = run;
