import * as agendaCtrl from '../modules/turnos/controller/agenda';
import moment = require('moment');

async function run(done) {
    const fechaDesde = moment(new Date(2018, 11, 1)); // mes - 1
    const fechaHAsta = moment(new Date(2018, 11, 31)); // mes - 1

    const start = (moment(fechaDesde).startOf('day')).format('YYYY-MM-DD HH:mm:ss');
    const end = (moment(fechaHAsta).endOf('day')).format('YYYY-MM-DD HH:mm:ss');
    agendaCtrl.actualizarEstadoAgendas(start, end).then(done)
        .catch(done);
}

export = run;
