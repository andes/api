import * as moment from 'moment';
import * as agendaSchema from '../../turnos/schemas/agenda';
import { toArray } from '../../../utils/utils';
import { prestacionesAFacturarModel } from '../schemas/prestacionesAFacturar';

export async function getPrestacionesAfacturar() {
    let arrayConceptId = [];
    return new Promise((resolve, reject) => {
        prestacionesAFacturarModel.find({ activo: true }).exec((err, data: any) => {
            data.forEach(unaPrestacion => {
                arrayConceptId.push(unaPrestacion.conceptId);
            });
            resolve(arrayConceptId);
        });
    });
}


export async function getTurnosFacturacionPendiente() {
    let hoyDesde = moment(new Date()).startOf('day').format();
    let hoyHasta = moment(new Date()).endOf('day').format();
    let prestaciones = await getPrestacionesAfacturar();
    let match = {
        $match: {
            $and: [{ 'bloques.turnos.estadoFacturacion': { $eq: 'sinFacturar' } },
            { createdAt: { $gte: new Date(hoyDesde), $lte: new Date(hoyHasta) } },
            { 'bloques.turnos.estado': { $eq: 'asignado' } },
            { 'bloques.turnos.asistencia': { $exists: true, $eq: 'asistio' } },
            { 'bloques.turnos.tipoPrestacion.conceptId': { $in: prestaciones } }

            ]
        }
    };

    let data = await toArray(agendaSchema.aggregate([
        match,
        { $unwind: '$bloques' },
        { $unwind: '$bloques.turnos' },
        match
    ]).cursor({})
        .exec());

    let turnos = [];
    data.forEach(agenda => {
        turnos.push({
            datosAgenda: {
                id: agenda._id,
                organizacion: agenda.organizacion,
                horaInicio: agenda.horaInicio,
                profesionales: agenda.profesionales
            },
            turno: agenda.bloques.turnos,
        });
    });

    return turnos;
}

