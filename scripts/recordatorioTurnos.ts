import moment = require('moment');
import { Agenda, AgendaSchema } from '../modules/turnos/schemas/agenda';
import { notificacionesLog } from '../modules/turnos/citasLog';
import { userScheduler } from '../config.private';
import { EventCore } from '@andes/event-bus';
import * as mongoose from 'mongoose';
import { WebHook } from '../modules/webhook/webhook.schema';
import { WebHookLog } from '../modules/webhook/webhooklog/webhooklog.schema';

const request = require('request');

async function run(done) {
    try {
        await recorrerAgendas();
        done();
    } catch (error) {
        done(error);
    }
}

async function recorrerAgendas() {

    const fechaAgenda: Date = moment().add(1, 'days').toDate();
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

    const agendasMañana: any[] = await Agenda.find(match);;

    // for (const agenda of agendasMañana) {
    //     for (const bloque of agenda.bloques) {
    //         for (const turno of bloque.turnos) {
    //             await recordarTurno(agenda, turno);
    //         }
    //     }
    // }

    for (let i = 0; i < agendasMañana.length; i++) {
        const agenda = agendasMañana[i];
        for (let j = 0; j < agenda.bloques.length; j++) {
            const bloque = agenda.bloques[j];
            for (let k = 0; k < bloque.turnos.length; k++) {
                const turno = bloque.turnos[k];
                await recordarTurno(agenda, turno);
            }
        }
    }
}

async function recordarTurno(agenda, turno) {
    try {
        if (turno?._id || turno.id) {
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
                // EventCore.emitAsync('notificaciones:enviar', dtoMensaje);
                await webHook('notificaciones:enviar', dtoMensaje);
            }
        } else {
            notificacionesLog.error('obteneIdTurno', { turno }, { error: 'No se encontró el turno' }, userScheduler);
        }
    } catch (unError) {
        notificacionesLog.error('obtenerAgenda', { turno }, unError, userScheduler);
    }
};

function dataAgenda(agenda, idTurno) {
    let profesionales = '';
    let organizacion = '';
    try {
        if (agenda) {
            if (agenda.profesionales.length) {
                profesionales = 'con el/los profesionales ';
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
            notificacionesLog.error('verificarAgenda:agenda', { turno: idTurno }, { error: 'agenda no encontrada' }, userScheduler);
            return null;
        }
    } catch (error) {
        notificacionesLog.error('verificarAgenda', { turno: idTurno }, { error: error.message }, userScheduler);
        return null;
    }
}

async function webHook(event, datos) {

    const subscriptions = await WebHook.find({
        active: true,
        event
    });

    subscriptions.forEach((sub: any) => {

        const data = {
            id: new mongoose.Types.ObjectId(),
            subscription: sub._id,
            data: datos,
            event
        };

        // console.log({ method: sub.method, uri: sub.url, headers: sub.headers, body: data, json: true, timeout: 10000, });

        request({
            method: sub.method,
            uri: sub.url,
            headers: sub.headers,
            body: data,
            json: true,
            timeout: 10000,
        }, (error, response, _body) => {
            const log = new WebHookLog({
                event,
                url: sub.url,
                method: sub.method,
                headers: sub.headers,
                body: data,
                subscriptionId: sub._id,
                status: error ? 0 : response.statusCode,
                response: _body
            });
            log.save();
        });

    });
}
export = run;


