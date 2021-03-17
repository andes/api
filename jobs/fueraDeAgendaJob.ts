import * as fueraAgendaCtrl from './../modules/estadistica/pecas/controller/fueraDeAgenda';
import * as moment from 'moment';

function run(done) {
    const paramInicio = process.argv[3];
    const paramFin = process.argv[4];
    const start = paramInicio ?
        moment(new Date(paramInicio).setHours(0, 0, 0, 0)).format('YYYY-MM-DD HH:mm:ss') :
        moment(new Date().setHours(0, 0, 0, 0)).subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss');
    const end = paramFin ?
        moment(new Date(paramFin).setHours(23, 59, 0, 0)).format('YYYY-MM-DD HH:mm:ss') :
        moment(new Date().setHours(23, 59, 0, 0)).subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss');
    fueraAgendaCtrl.fueraAgendaPecas(start, end, done);
}

export = run;
