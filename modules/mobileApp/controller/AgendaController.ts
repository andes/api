import * as agendaModel from '../../turnos/schemas/agenda';
import moment = require('moment');
import { Types } from 'mongoose';

export async function ofertaPrestacional(organizacion) {
    let pipelinePrestaciones = [];
    let diaInicio = moment(new Date()).startOf('day').toDate() as any;
    let diaFin = moment(new Date()).endOf('day').toDate() as any;
    pipelinePrestaciones = [
        {
            $match: {
                'organizacion._id': {
                    $eq: new Types.ObjectId(organizacion)
                },
                horaInicio: { $gte: diaInicio },
                horaFin: { $lte: diaFin },
                $or: [{ estado: 'planificacion' }, { estado: 'publicada' }],
            }
        },
        {
            $unwind: '$bloques'
        },

        {
            $project: {
                prestaciones: '$bloques.tipoPrestaciones',
                horaInicio: '$horaInicio',
                horaFin: '$horaFin'
            }
        },
        {
            $unwind: '$prestaciones'
        },
        {
            $project: {
                prestaciones: '$prestaciones.term',
                horaInicio: 1,
                horaFin: 1
            }
        }


    ];
    let prestaciones = await agendaModel.aggregate(pipelinePrestaciones);
    return prestaciones;
}
