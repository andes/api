import moment = require('moment');
import { Agenda, AgendaSchema } from '../modules/turnos/schemas/agenda';
import { notificacionesLog } from '../modules/turnos/citasLog';
import { userScheduler } from '../config.private';
import { EventCore } from '@andes/event-bus';

async function run(done) {

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

    const agendasMañana = Agenda.find(match).cursor({ batchSize: 1000 });

    const recorrerTurnos = async (agenda) => {
        try {
            for (const bloque of agenda.bloques) {
                for (const turno of bloque.turnos) {
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
                            EventCore.emitAsync('notificaciones:enviar', dtoMensaje);
                        }
                    } else {
                        notificacionesLog.error('obteneIdTurno', { turno }, { error: 'No se encontró el turno' }, userScheduler);
                    }
                }
            }
        } catch (unError) {
            notificacionesLog.error('obtenerAgenda', { agenda }, unError, userScheduler);
        }
    };

    await agendasMañana.eachAsync(async (agenda: any) => {
        await recorrerTurnos(agenda);
    });
    done();
}

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

export = run;
