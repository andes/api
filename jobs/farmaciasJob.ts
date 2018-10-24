import * as farmacias from './../modules/mobileApp/controller/FarmaciasTurnosDownloader';
import * as moment from 'moment';

function run(done) {
    const start = moment(new Date()).format('YYYY-MM-DD');
    const end = moment(new Date()).add(20, 'days').format('YYYY-MM-DD');
    farmacias.donwloadData(start, end)
        .then(done)
        .catch(done);
}

export = run;
