import { EventCore } from '@andes/event-bus/';
import { Auth } from '../../../../auth/auth.class';
import { Prestacion } from '../../schemas/prestacion';
import { PlanIndicacionesCtr } from './plan-indicaciones.routes';
import { PlanIndicacionesEventosCtr } from './plan-indicaciones-eventos.routes';
import { getConfiguracion } from '../../../../core/tm/controller/organizacion';
import { Request } from '@andes/api-tool';
import * as moment from 'moment';

EventCore.on('mapa-camas:plan-indicacion:create', async (prestacion) => {
    prestacion = new Prestacion(prestacion);
    const registros = prestacion.getRegistros();
    const fecha = prestacion.ejecucion.fecha;
    let indicaciones = registros.filter(r => r.esSolicitud).map(async (registro) => {
        const idRegistro = registro.id;
        return PlanIndicacionesCtr.findOne({ registro: idRegistro });
    });

    indicaciones = await Promise.all(indicaciones);
    const savePromises = indicaciones.map(async indicacion => {
        if (indicacion) {
            indicacion.idPrestacion = prestacion.id;
            indicacion.estados.push({
                tipo: 'active',
                fecha,
                ...(!indicacion.requiereAceptacion && {
                    verificacion: {
                        estado: 'aceptada'
                    }
                })
            });
            const user = Auth.getUserFromResource(prestacion);
            Auth.audit(indicacion, user as any);
            return indicacion.save();
        }
    });
    await Promise.all(savePromises);
});

// EventCore.on('internacion:plan-indicaciones-eventos:create', async (evento) => {
//     if (evento.estado === 'realizado') {
//         const indicacion = await PlanIndicacionesCtr.findById(evento.idIndicacion);
//         if (!indicacion || !indicacion.requiereFrecuencia) {
//             return;
//         }
//         await crearEventosSegunPrescripcionDesdeEnfermeria(indicacion, evento.fecha);
//         const ultimaFrecuencia = indicacion.valor.frecuencias[indicacion.valor.frecuencias.length - 1];
//         if (ultimaFrecuencia) {
//             const frecuenciaHoras = ultimaFrecuencia.frecuencia.key;
//             const fechaDesde = moment(evento.fecha);
//             const configOrganizacion = await getConfiguracion(indicacion.organizacion.id);
//             const horaFinEfector = moment(evento.fecha).startOf('day').add(configOrganizacion.planIndicaciones.horaInicio + 24, 'hours');
//             const nuevosHorarios = calcularHorarios(fechaDesde, horaFinEfector, frecuenciaHoras);

//             const futuros = nuevosHorarios.filter(h => moment(h).isAfter(moment(evento.fecha)));

//             if (futuros.length) {
//                 await crearEventos(futuros, indicacion);
//             }
//         }
//     }
// });

EventCore.on('internacion:plan-indicaciones-eventos:create', async (evento) => {
    if (evento.estado === 'realizado' && !evento.updatedAt) {
        /*  Por cada nuevo evento NO PLANIFICADO en estado REALIZADO debe ajustarse el horario de los proximos.
            Un evento es no planificado cuando es creado manualmente por el usuario en lugar de generarse automáticamente
            al momento de guardar una nueva indicación.
        */
        const [indicacion, indicacionEventos] = await Promise.all([
            PlanIndicacionesCtr.findById(evento.idIndicacion),
            PlanIndicacionesEventosCtr.search({ indicacion: evento.idIndicacion })
        ]);
        const configOrganizacion = await getConfiguracion(indicacion.organizacion.id);
        const horaInicioEfector = configOrganizacion.planIndicaciones.horaInicio;

        if (indicacion.valor.unicaVez) {
            return;
        }
        const eventos = indicacionEventos.sort((ev1, ev2) => moment(ev1.fecha).diff(moment(ev2.fecha)));
        const index = eventos.findIndex(ev => ev.id === evento.id);
        const eventosPosteriores = eventos.slice(index + 1, eventos.length);

        // si existen eventos posteriores al nuevo y TODOS estan en estado 'on-hold'
        if (eventosPosteriores && !eventosPosteriores.some(ev => ev.estado !== 'on-hold')) {
            const proximoEvento = eventosPosteriores.shift();
            await PlanIndicacionesEventosCtr.deleteByIndicacion(indicacion.id, proximoEvento.fecha);

            if (eventosPosteriores.length) {
                /* Calculamos la diferencia en horas entre el nuevo evento y el siguiente planificado, luego restamos esta
                diferencia a los eventos proximos para ajustar la planificacion.
                */
                const diferenciaAlProximo = moment(proximoEvento.fecha).diff(moment(evento.fecha), 'hours');
                const nuevosHorarios = eventosPosteriores.map(ev => moment(ev.fecha).subtract(diferenciaAlProximo, 'hours'));

                // Una indicacion puede tener mas de una frecuencia
                const ultimaFrecuenciaIndicacion = indicacion.valor.frecuencias[indicacion.valor.frecuencias.length - 1].frecuencia.key; // ultima frecuencia
                const ultimoHorario = nuevosHorarios[nuevosHorarios.length - 1];

                // Si el adelanto de los horarios genera una franja horaria donde hay lugar para otra toma, se agrega.
                if (moment(ultimoHorario).add(ultimaFrecuenciaIndicacion, 'hours').isBefore(moment().startOf('day').add(horaInicioEfector + 24, 'hours'))) {
                    nuevosHorarios.push(moment(ultimoHorario).add(ultimaFrecuenciaIndicacion, 'hours'));
                }
                await crearEventos(nuevosHorarios, indicacion);
            }
        }
    }
});

EventCore.on('internacion:plan-indicaciones:create', async (indicacion) => {
    if (indicacion.requiereFrecuencia) {
        await crearEventosSegunPrescripcion(indicacion);
    }
});


EventCore.on('internacion:plan-indicaciones:update', async (indicacion) => {
    switch (indicacion.estadoActual.tipo) {
        case 'active':
            if (indicacion.estadoActual.verificacion) {
                /* los nuevos eventos se crean solo cuando se valida o continúa (validacion del dia)
                    una indicación, pero no cuando se verifica */
                break;
            }
            const configOrganizacion = await getConfiguracion(indicacion.organizacion.id);
            const horaInicioEfector = configOrganizacion.planIndicaciones.horaInicio;
            /* Se continua una prescripcion. Deben crearse los eventos correspondientes a la ultima
                frecuencia desde el inicio del dia segun efector */
            let horarios;
            if (indicacion.valor.unicaVez) {
                const unicoHorario = moment(indicacion.valor.frecuencias[0].horario);
                horarios = [moment().hours(unicoHorario.hours()).minutes(unicoHorario.minutes())];
            } else {
                const frecuencias = indicacion.valor.frecuencias
                    .filter(frec => frec.frecuencia?.type === 'number')
                    .sort((frec1, frec2) => moment(frec1.horario).diff(moment(frec2.horario)) > 0);
                if (!frecuencias.length) {
                    return;
                }
                const ultimaFrecuencia = frecuencias.pop();
                const horaInicio = moment(ultimaFrecuencia.horario).hours();
                const fechaDesde = moment().hours(horaInicio).minutes(0);
                const fechaHasta = moment().startOf('day').add(horaInicioEfector + 24, 'hours');
                horarios = calcularHorarios(fechaDesde, fechaHasta, ultimaFrecuencia.frecuencia.key);
            }
            await crearEventos(horarios, indicacion);
            break;
        case 'draft':
            await PlanIndicacionesEventosCtr.deleteByIndicacion(indicacion._id);
            if (indicacion.requiereFrecuencia) {
                await crearEventosSegunPrescripcion(indicacion);
            }
            break;

        case 'bypass':
            if (indicacion.requiereFrecuencia) {
                await crearEventosSegunPrescripcion(indicacion);
            }
            break;
    }
});

EventCore.on('internacion:plan-indicaciones-eventos:update', async (evento) => {
    if (evento.estado === 'realizado') {
        const indicacion = await PlanIndicacionesCtr.findById(evento.idIndicacion);

        if (!indicacion || !indicacion.requiereFrecuencia) {
            return;
        }

        await crearEventosSegunPrescripcionDesdeEnfermeria(indicacion, evento.fecha);
    }
});


// Dada una indicación, genera eventos para cada prescripcion con sus respectivas frecuencias
async function crearEventosSegunPrescripcion(indicacion) {
    const configOrganizacion = await getConfiguracion(indicacion.organizacion.id);
    const horaInicioEfector = configOrganizacion.planIndicaciones.horaInicio;
    if (indicacion.valor.unicaVez) {
        if (indicacion.valor.frecuencias[0].horario) {
            const unicoHorario = moment(indicacion.valor.frecuencias[0].horario);
            await crearEventos([unicoHorario], indicacion);
        }
    } else {
        let horariosFrecuencia = [];
        let horarios = [];
        const frecuencias = indicacion.valor.frecuencias
            .filter(frec => frec.frecuencia?.type === 'number')
            .sort((frec1, frec2) => moment(frec1.horario).diff(moment(frec2.horario)) > 0);

        // En caso de existir varias frecuencias se calculan los horarios para todas exceptuando la ultima
        for (let f = 0; f < frecuencias.length - 1; f++) {
            horariosFrecuencia = calcularHorarios(frecuencias[f].horario, frecuencias[f + 1].horario, frecuencias[f].frecuencia.key);
            horarios = horarios.concat(horariosFrecuencia);
        }
        // se calculan los horarios para la ultima frecuencia (puede ser la unica), hasta el fin del turno (horario segun efector)
        const ultimaFrecuencia = frecuencias[frecuencias.length - 1];
        if (ultimaFrecuencia) {
            const horaFinEfector = moment(frecuencias[frecuencias.length - 1].horario).startOf('day').add(horaInicioEfector + 24, 'hours'); // a partir de la ultima indicacion de frecuencia
            horariosFrecuencia = calcularHorarios(ultimaFrecuencia.horario, horaFinEfector, ultimaFrecuencia.frecuencia.key);
            horarios = horarios.concat(horariosFrecuencia);

            await crearEventos(horarios, indicacion);
        }
    }
}

async function crearEventosSegunPrescripcionDesdeEnfermeria(indicacion, fechaEvento) {
    const configOrganizacion = await getConfiguracion(indicacion.organizacion.id);
    const horaInicioEfector = configOrganizacion.planIndicaciones.horaInicio;

    if (indicacion.valor.unicaVez) {
        return;
    }

    const frecuencias = indicacion.valor.frecuencias
        .filter(frec => frec.frecuencia?.type === 'number')
        .sort((f1, f2) => moment(f1.horario).diff(moment(f2.horario)));

    if (!frecuencias.length) {
        return;
    }

    const ultimaFrecuencia = frecuencias[frecuencias.length - 1];
    const frecuenciaHoras = ultimaFrecuencia.frecuencia.key;

    const fechaDesde = moment(fechaEvento);
    const fechaHasta = moment(fechaEvento).startOf('day').add(horaInicioEfector + 24, 'hours');

    const nuevosHorarios = calcularHorarios(fechaDesde, fechaHasta, frecuenciaHoras)
        .filter(h => moment(h).isAfter(moment(fechaEvento)));

    if (nuevosHorarios.length) {
        await crearEventos(nuevosHorarios, indicacion);
    }
}

// retorna un array de horarios entre dos fechas, separados por una frecuencia determinada
function calcularHorarios(fechaDesde, fechaHasta, frecuencia) {
    const diferenciaEnHoras = moment(fechaHasta).diff(moment(fechaDesde), 'hours');
    const cantTomas = diferenciaEnHoras / frecuencia;
    const result = [];

    for (let t = 0; t <= cantTomas; t++) {
        result.push(moment(fechaDesde).add(t * frecuencia, 'hours'));
    }
    return result;
}


// genera eventos nuevos segun un array de horarios para una determinada indicacion
async function crearEventos(horarios: any[], indicacion) {
    const eventosPromises = horarios.map(horario => {
        const data = {
            idInternacion: indicacion.idInternacion,
            idIndicacion: indicacion.id,
            fecha: horario,
            estado: 'on-hold'
        };
        const eventRequest = {
            user: indicacion.createdBy,
            ip: 'localhost',
            connection: {
                localAddress: ''
            },
            body: indicacion
        };
        return PlanIndicacionesEventosCtr.create(data, (eventRequest as Request));
    });
    await Promise.all(eventosPromises);
}
