import * as pecasCtrl from './../modules/estadistica/pecas/controller/agenda';
import * as moment from 'moment';

function run() {
    let start = moment(new Date()).subtract(1, 'hours').format('YYYY-MM-DD HH:mm:ss');
    let end = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');
    pecasCtrl.consultaPecas(start, end);
}

export = run;
