import { EventCore } from '@andes/event-bus/';
import { Auth } from '../../../../auth/auth.class';
import { Prestacion } from '../../schemas/prestacion';
import { PlanIndicacionesCtr } from './plan-indicaciones.routes';
import { PlanIndicacionesEventosCtr } from './plan-indicaciones-eventos.routes';
import { Request } from '@andes/api-tool';
import * as moment from 'moment';

EventCore.on('mapa-camas:plan-indicacion:create', async (prestacion) => {

    prestacion = new Prestacion(prestacion);
    const registros = prestacion.getRegistros();

    const idInternacion = prestacion.trackId;
    const fecha = prestacion.ejecucion.fecha;
    const ambito = prestacion.solicitud.ambitoOrigen;
    registros.filter(r => r.esSolicitud).map(async (registro) => {
        const idRegistro = registro.id;
        const idEvolucion = registro.idEvolucion;
        const indicacion = await PlanIndicacionesCtr.findOne({ registro: idRegistro });

        if (indicacion) {
            indicacion.idPrestacion = prestacion.id;
            indicacion.estados.push({
                tipo: 'active',
                fecha
            });
            const user = Auth.getUserFromResource(prestacion);
            Auth.audit(indicacion, user as any);
            await indicacion.save();
        }
    });
});


EventCore.on('internacion:plan-indicaciones:create', async (indicacion) => {
    await crearEventosSegunPrescripcion(indicacion);
});

EventCore.on('internacion:plan-indicaciones:update', async (indicacion) => {
    switch (indicacion.estadoActual.tipo) {
        case 'active':
            /* Se continua una prescripcion. Deben crearse los eventos correspondientes a la ultima
                frecuencia pero desde el medio dia actual */
            const frecuencias = indicacion.valor.frecuencias
                .filter(frec => frec.frecuencia?.type === 'number')
                .sort((frec1, frec2) => moment(frec1.horario).diff(moment(frec2.horario)) > 0);

            if (frecuencias.length) {
                const ultimaFrecuencia = frecuencias.pop();
                const fechaDesde = moment(ultimaFrecuencia.horario);
                const fechaHasta = moment().endOf('day').add(12, 'hours');
                let horarios;
                if (indicacion.valor.unicaVez) {
                    const horaIndicacion = moment(ultimaFrecuencia.horario);
                    horarios = [moment().hours(horaIndicacion.hours()).minutes(horaIndicacion.minutes())];
                } else {
                    const mediodia = moment().startOf('day').add(12, 'hours');
                    horarios = calcularHorarios(fechaDesde, fechaHasta, ultimaFrecuencia.frecuencia.key)
                        .filter(h => moment(h).diff(mediodia) > 0);
                }
                await crearEventos(horarios, indicacion);
            }
            break;
        case 'draft':
            // Se editó una prescripción existente
            await PlanIndicacionesEventosCtr.deleteByIndicacion(indicacion._id);
            await crearEventosSegunPrescripcion(indicacion);
            break;
    }
});


// Dada una indicación, genera eventos para cada prescripcion con sus respectivas frecuencias
async function crearEventosSegunPrescripcion(indicacion) {
    const frecuencias = indicacion.valor.frecuencias
        .filter(frec => frec.frecuencia?.type === 'number')
        .sort((frec1, frec2) => moment(frec1.horario).diff(moment(frec2.horario)) > 0);

    if (!frecuencias.length) {
        return;
    }
    if (indicacion.valor.unicaVez) {
        if (indicacion.valor.frecuencias[0].horario) {
            const unicoHorario = moment(indicacion.valor.frecuencia[0].horario);
            await crearEventos([unicoHorario], indicacion);
        }
    } else {
        let horariosFrecuencia = [];
        let horarios = [];

        // En caso de existir varias frecuencias se calculan los horarios para todas exceptuando la ultima
        for (let f = 0; f < frecuencias.length - 1; f++) {
            horariosFrecuencia = calcularHorarios(frecuencias[f].horario, frecuencias[f + 1].horario, frecuencias[f].frecuencia.key);
            horarios = horarios.concat(horariosFrecuencia);
        }
        // se calculan los horarios para la ultima frecuencia (puede ser la unica), hasta el proximo medio dia
        const ultimaFrecuencia = frecuencias[frecuencias.length - 1];
        const proxMediodia = moment(frecuencias[frecuencias.length - 1].horario).startOf('day').add(36, 'hours'); // a partir de la ultima indicacion de frecuencia
        horariosFrecuencia = calcularHorarios(ultimaFrecuencia.horario, proxMediodia, ultimaFrecuencia.frecuencia.key);
        horarios = horarios.concat(horariosFrecuencia);

        await crearEventos(horarios, indicacion);
    }
}


// retorna un array de horarios entre dos fechas, separados por una frecuencia determinada
function calcularHorarios(fechaDesde, fechaHasta, frecuencia) {
    const diferenciaEnHoras = moment(fechaHasta).diff(fechaDesde, 'hours');
    const cantTomas = diferenciaEnHoras / frecuencia;
    const result = [];

    for (let t = 0; t < cantTomas; t++) {
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
