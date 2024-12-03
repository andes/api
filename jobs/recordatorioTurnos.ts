import moment = require('moment');
import { Agenda } from '../modules/turnos/schemas/agenda';
import { notificacionesRecordatorioLog } from '../modules/turnos/citasLog';
import { userScheduler } from '../config.private';
import * as mongoose from 'mongoose';
import { WebHook } from '../modules/webhook/webhook.schema';
import { handleHttpRequest } from '../utils/requestHandler';
import { Constantes } from '../modules/constantes/constantes.schema';

async function run(done) {
    try {
        await recorrerAgendas();
        done();
    } catch (error) {
        done(error);
    }
}

async function recorrerAgendas() {
    let instancia: number;
    let instAnt: number;
    let time: number;
    await timeOut().then(num => {
        time = num;
    });
    const tipoTurno = ['programado', 'gestion'];
    const fechaAgenda: Date = moment().add(2, 'days').toDate();
    const match = {
        horaInicio: {
            $gte: moment(fechaAgenda).startOf('day').toDate(),
            $lte: moment(fechaAgenda).endOf('day').toDate()
        },
        estado: { $in: ['disponible', 'publicada'] },
        nominalizada: true,
        dinamica: false,
        enviarSms: true,
        'bloques.turnos.estado': 'asignado'
    };
    const agendasMañana: any[] = await Agenda.find(match);
    for (let i = 0; i < agendasMañana.length; i++) {
        const agenda = agendasMañana[i];
        for (let j = 0; j < agenda.bloques.length; j++) {
            const bloque = agenda.bloques[j];
            for (let k = 0; k < bloque.turnos.length; k++) {
                const turno = bloque.turnos[k];
                if (turno.estado === 'asignado' && turno.paciente?.telefono && tipoTurno.includes(turno.tipoTurno)) {
                    const ultNum = turno.paciente.telefono.slice(-1);
                    instancia = ['0', '1', '2'].includes(ultNum) ? 1 : ['3', '4', '5'].includes(ultNum) ? 2 : 3;
                    await new Promise(resolve => setTimeout(resolve, instancia === instAnt ? time : time / 2));
                    instAnt = instancia;
                    await recordarTurno(agenda, turno);
                }
            }
        }
    }
}

async function recordarTurno(agenda, turno) {
    try {
        if (turno?._id || turno?.id) {
            const fechaMayor = moment(turno.horaInicio).toDate() > moment().toDate();
            const idTurno = turno._id || turno.id;
            const datoAgenda = dataAgenda(agenda, idTurno);

            if (fechaMayor && turno.paciente.telefono && datoAgenda.organizacion) {
                const dtoMensaje: any = {
                    idTurno: turno._id,
                    mensaje: 'turno-recordatorio',
                    telefono: turno.paciente.telefono,
                    nombrePaciente: `${turno.paciente.apellido}, ${turno.paciente.alias ? turno.paciente.alias : turno.paciente.nombre}`,
                    tipoPrestacion: turno.tipoPrestacion.term,
                    fecha: moment(turno.horaInicio).locale('es').format('dddd DD [de] MMMM [de] YYYY [a las] HH:mm [Hs.]'),
                    profesional: datoAgenda.profesionales ? datoAgenda.profesionales : '',
                    organizacion: datoAgenda.organizacion ? datoAgenda.organizacion : ''
                };
                await send('recordatorio:enviar', dtoMensaje);
            }
        } else {
            notificacionesRecordatorioLog.error('obteneIdTurno', { turno, agenda }, { error: 'No se encontró el turno' }, userScheduler);
        }
    } catch (unError) {
        notificacionesRecordatorioLog.error('obtenerAgenda', { turno, agenda }, unError, userScheduler);
    }
};

function dataAgenda(agenda, idTurno) {
    let profesionales = '';
    let organizacion = '';
    try {
        if (agenda) {
            if (agenda.profesionales.length) {
                profesionales = agenda.profesionales.length === 1 ? 'con el/la profesional ' : 'con los profesionales ';
                for (const prof of agenda.profesionales) {
                    profesionales += `${prof.nombre} ${prof.apellido}, `;
                }
            }
            organizacion = agenda.organizacion?.nombre;
            if (agenda.espacioFisico?.nombre) {
                organizacion += `, ${agenda.espacioFisico.nombre}`;
            }
            return {
                profesionales,
                organizacion
            };
        } else {
            notificacionesRecordatorioLog.error('verificarAgenda:agenda', { turno: idTurno }, { error: 'agenda no encontrada' }, userScheduler);
            return null;
        }
    } catch (error) {
        notificacionesRecordatorioLog.error('verificarAgenda', { turno: idTurno, agenda }, { error: error.message }, userScheduler);
        return null;
    }
}

async function send(event, datos) {

    const subscriptions: any = await WebHook.findOne({
        active: true,
        event
    });

    if (subscriptions) {
        const data = {
            id: new mongoose.Types.ObjectId(),
            subscription: subscriptions._id,
            data: datos,
            event
        };
        try {
            const resultado = await handleHttpRequest({
                method: subscriptions.method,
                uri: subscriptions.url,
                headers: subscriptions.headers,
                body: data,
                json: true,
                timeout: 10000,
            });
            return resultado;
        } catch (err) {
            notificacionesRecordatorioLog.error('envioNotificacion', { error: err, turno: datos }, userScheduler);
            return null;
        }
    } else {
        notificacionesRecordatorioLog.error('envioNotificacion', { turno: datos }, { error: 'evento no encontrado' }, userScheduler);
        return null;
    }

}

async function timeOut() {
    let constante: any;
    const time = 10000;
    const key = 'waap-timeOut';
    try {
        constante = await Constantes.findOne({ key });
        return constante ? parseInt(constante.nombre, 10) : time;
    } catch (error) {
        log.error('timeOut()', { constante, key }, { error: error.message }, userScheduler);
        return time;
    }
}

export = run;
