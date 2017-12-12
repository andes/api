import * as laboratorio from './../modules/legacy/controller/laboratorio';
import * as moment from 'moment';

function run() {
    let fecha = moment(new Date()).subtract(13,'month').format('DD/MM/YYYY');
    // let fecha = moment('2016-06-12', 'DD/MM/YYYY');
    laboratorio.generarCDA(fecha);
}

run();
// export = run;
