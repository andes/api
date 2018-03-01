import * as farmacias from './../modules/mobileApp/controller/FarmaciasTurnosDownloader';
import * as moment from 'moment';

function run() {
    let start = moment(new Date()).add(1, 'days').startOf('month').format('YYYY-MM-DD');
    let end = moment(new Date()).add(10, 'days').endOf('month').format('YYYY-MM-DD');
    farmacias.donwloadData(start, end);
}

export = run;
