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
                    verificacion: { estado: 'aceptada' }
                })
            });
            const user = Auth.getUserFromResource(prestacion);
            Auth.audit(indicacion, user as any);
            return indicacion.save();
        }
    });
    await Promise.all(savePromises);
});


EventCore.on('internacion:plan-indicaciones-eventos:create', async (evento) => {
    try {
        if (evento.estado !== 'realizado') { return; }

        const [indicacion, indicacionEventos] = await Promise.all([
            PlanIndicacionesCtr.findById(evento.idIndicacion),
            PlanIndicacionesEventosCtr.search({ indicacion: evento.idIndicacion })
        ]);

        const configOrganizacion = await getConfiguracion(indicacion.organizacion.id);
        const horaInicioEfector = configOrganizacion?.planIndicaciones?.horaInicio || 0;

        const eventos = indicacionEventos.sort((a, b) => moment(a.fecha).diff(moment(b.fecha)));
        const index = eventos.findIndex(ev => String(ev._id) === String(evento._id));
        const eventosPosteriores = eventos.slice(index + 1);

        if (eventosPosteriores.length && !eventosPosteriores.some(ev => ev.estado !== 'on-hold')) {
            const proximoEvento = eventosPosteriores.shift();
            await PlanIndicacionesEventosCtr.deleteByIndicacion(indicacion.id, proximoEvento.fecha);

            if (eventosPosteriores.length) {
                const diferenciaHoras = moment(proximoEvento.fecha).diff(moment(evento.fecha), 'hours');
                const nuevosHorarios = eventosPosteriores.map(ev => moment(ev.fecha).subtract(diferenciaHoras, 'hours'));

                const ultimaFrecuencia = indicacion.valor.frecuencias.at(-1);
                const frecuenciaHoras = ultimaFrecuencia?.frecuencia?.key || ultimaFrecuencia?.frecuenciaValor || 0;
                const ultimoHorario = nuevosHorarios.at(-1);
                const limiteDia = moment(evento.fecha).startOf('day').add(horaInicioEfector + 24, 'hours');

                if (frecuenciaHoras && moment(ultimoHorario).add(frecuenciaHoras, 'hours').isBefore(limiteDia)) {
                    nuevosHorarios.push(moment(ultimoHorario).add(frecuenciaHoras, 'hours'));
                }
                await crearEventos(nuevosHorarios, indicacion);
            }
        } else {
            await crearEventosSegunPrescripcionDesdeEnfermeria(indicacion, evento.fecha);
        }

    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('❌ Error en plan-indicaciones-eventos:create:', error);
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
            if (indicacion.estadoActual.verificacion) { break; }
            const configOrganizacion = await getConfiguracion(indicacion.organizacion.id);
            const horaInicioEfector = configOrganizacion.planIndicaciones.horaInicio;

            let horarios;
            if (indicacion.valor.unicaVez) {
                const unicoHorario = moment(indicacion.valor.frecuencias[0].horario);
                horarios = [moment().hours(unicoHorario.hours()).minutes(unicoHorario.minutes())];
            } else {
                const frecuencias = indicacion.valor.frecuencias
                    .filter(frec => (frec.frecuencia?.type === 'number') || (typeof frec.frecuenciaValor === 'number'))
                    .sort((f1, f2) => moment(f1.horario).diff(moment(f2.horario)));
                if (!frecuencias.length) { return; }

                const ultimaFrecuencia = frecuencias.pop();
                const frecuenciaKey = ultimaFrecuencia.frecuencia?.key || ultimaFrecuencia.frecuenciaValor;
                const horaInicio = moment(ultimaFrecuencia.horario).hours();
                const fechaDesde = moment().hours(horaInicio).minutes(0);
                const fechaHasta = moment().startOf('day').add(horaInicioEfector + 24, 'hours');
                horarios = calcularHorarios(fechaDesde, fechaHasta, frecuenciaKey);
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
            await PlanIndicacionesEventosCtr.deleteByIndicacion(indicacion._id);
            if (indicacion.requiereFrecuencia) {
                await crearEventosSegunPrescripcion(indicacion);
            }
            break;
    }
});

async function crearEventosSegunPrescripcion(indicacion) {
    const configOrganizacion = await getConfiguracion(indicacion.organizacion.id);
    const horaInicioEfector = configOrganizacion.planIndicaciones.horaInicio;

    if (indicacion.valor.unicaVez) {
        if (indicacion.valor.frecuencias[0].horario) {
            const unicoHorario = moment(indicacion.valor.frecuencias[0].horario);
            await crearEventos([unicoHorario], indicacion);
        }
        return;
    }

    let horarios: any[] = [];
    const frecuencias = indicacion.valor.frecuencias
        .filter(frec => (frec.frecuencia?.type === 'number') || (typeof frec.frecuenciaValor === 'number'))
        .sort((f1, f2) => moment(f1.horario).diff(moment(f2.horario)));

    for (let f = 0; f < frecuencias.length - 1; f++) {
        const freqValue = frecuencias[f].frecuencia?.key || frecuencias[f].frecuenciaValor;
        const horariosFrecuencia = calcularHorarios(frecuencias[f].horario, frecuencias[f + 1].horario, freqValue);
        horarios = horarios.concat(horariosFrecuencia);
    }

    const ultimaFrecuencia = frecuencias.at(-1);
    if (ultimaFrecuencia) {
        const frecuenciaHoras = ultimaFrecuencia.frecuencia?.key || ultimaFrecuencia.frecuenciaValor;
        const horaFinEfector = moment(ultimaFrecuencia.horario).startOf('day').add(horaInicioEfector + 24, 'hours');
        const horariosFrecuencia = calcularHorarios(ultimaFrecuencia.horario, horaFinEfector, frecuenciaHoras);
        horarios = horarios.concat(horariosFrecuencia);
        await crearEventos(horarios, indicacion);
    }
}

async function crearEventosSegunPrescripcionDesdeEnfermeria(indicacion, fechaEvento) {
    const configOrganizacion = await getConfiguracion(indicacion.organizacion.id);
    const horaInicioEfector = configOrganizacion.planIndicaciones.horaInicio;

    if (indicacion.valor.unicaVez) { return; }

    const frecuencias = indicacion.valor.frecuencias
        .filter(frec => (frec.frecuencia?.type === 'number') || (typeof frec.frecuenciaValor === 'number'))
        .sort((f1, f2) => moment(f1.horario).diff(moment(f2.horario)));

    const ultimaFrecuencia = frecuencias.at(-1);
    const frecuenciaHoras = ultimaFrecuencia.frecuencia?.key || ultimaFrecuencia.frecuenciaValor;
    const fechaDesde = moment(fechaEvento);
    const fechaHasta = moment(fechaEvento).startOf('day').add(horaInicioEfector + 24, 'hours');

    const nuevosHorarios = calcularHorarios(fechaDesde, fechaHasta, frecuenciaHoras)
        .filter(h => moment(h).isAfter(moment(fechaEvento)));

    if (nuevosHorarios.length) {
        await crearEventos(nuevosHorarios, indicacion);
    }
}

function calcularHorarios(fechaDesde, fechaHasta, frecuencia) {
    const diferenciaEnHoras = moment(fechaHasta).diff(moment(fechaDesde), 'hours');
    const cantTomas = diferenciaEnHoras / frecuencia;
    const result = [];

    for (let t = 0; t <= cantTomas; t++) {
        result.push(moment(fechaDesde).add(t * frecuencia, 'hours'));
    }
    return result;
}

async function crearEventos(horarios, indicacion) {
    const eventosPromises = horarios.map(async (horario) => {
        const data = {
            idInternacion: indicacion.idInternacion,
            idIndicacion: indicacion.id,
            fecha: horario,
            estado: 'on-hold'
        };
        const eventRequest = {
            user: indicacion.createdBy,
            ip: 'localhost',
            connection: { localAddress: '' },
            body: indicacion
        };

        try {
            await PlanIndicacionesEventosCtr.create(data, (eventRequest as Request));
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('❌ Error al crear evento on-hold:', error);
        }
    });

    await Promise.all(eventosPromises);
}
