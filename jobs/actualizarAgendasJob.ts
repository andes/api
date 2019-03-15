import * as agendaCtrl from './../modules/turnos/controller/agenda';
import moment = require('moment');

function run(done) {
    const fechaActualizar = moment(new Date());
    const start = (moment(fechaActualizar).startOf('day').subtract(1, 'days').toDate() as any);
    const end = (moment(fechaActualizar).endOf('day').toDate() as any);
    Promise.all([
        agendaCtrl.actualizarTiposDeTurno(),
        agendaCtrl.actualizarEstadoAgendas(start, end)
    ]).then(done).catch(done);
}

export = run;
