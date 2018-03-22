import * as farmacias from './../modules/mobileApp/controller/FarmaciasTurnosDownloader';
import * as moment from 'moment';

function run() {
    let start = moment(new Date()).add(1, 'days').format('YYYY-MM-DD');
    let end = moment(new Date()).add(24, 'days').format('YYYY-MM-DD');
    farmacias.donwloadData(start, end);
}

export = run;
