import * as farmacias from '../controller/FarmaciasTurnosDownloader';
import * as moment from 'moment';

function run(done) {
    let start = moment(new Date()).format('YYYY-MM-DD');
    let end = moment(new Date()).add(20, 'days').format('YYYY-MM-DD');
    farmacias.donwloadData(start, end)
        .then(done)
        .catch(done);
}

export = run;
