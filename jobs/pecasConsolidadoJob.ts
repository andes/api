import * as pecasCtrl from './../modules/estadistica/pecas/controller/agenda';
import * as moment from 'moment';

function run() {
    const start = moment(new Date().setHours(0, 0, 0, 0)).subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss');
    const end = moment(new Date().setHours(23, 59, 0, 0)).subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss');
    pecasCtrl.consultaPecas(start, end);
}

export = run;
