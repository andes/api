import * as express from 'express';
import * as agenda from '../../turnos/schemas/agenda';
import { Organizacion } from '../../../core/tm/schemas/organizacion';
import { toArray } from '../../../utils/utils';
import * as moment from 'moment';
import { Types } from 'mongoose';

const ObjectId = Types.ObjectId;
const router = express.Router();

/**
 * Get prestaciones que corresponden a agendas disponibles para el totem
 * osea, que tienen turnos de acceso directo disponibles
 */

router.get('/prestacionesDisponibles', async (req: any, res, next) => {
    const pipelinePrestaciones = [];
    const matchAgendas = {};

    // TODO: compararar con organización del token
    // console.log
    matchAgendas['organizacion._id'] = { $eq: new ObjectId('57e9670e52df311059bc8964') };
    matchAgendas['horaInicio'] = { $gte: new Date(moment().format('YYYY-MM-DD HH:mm')) };
    matchAgendas['$or'] = [
        { 'bloques.restantesProgramados': { $gt: 0 } },
        { 'bloques.restantesDelDia': { $gt: 0 } }];

    matchAgendas['estado'] = 'publicada';
    matchAgendas['dinamica'] = false;

    pipelinePrestaciones.push({ $match: matchAgendas });
    pipelinePrestaciones.push({ $unwind: '$bloques' });
    pipelinePrestaciones.push({ $match: { $expr: { $or: [{ $gt: ['$bloques.restantesProgramados', 0] }, { $gt: ['$bloques.restantesDelDia', 0] }] } } });
    pipelinePrestaciones.push({
        $project: {
            prestaciones: '$bloques.tipoPrestaciones',
            _id: 0
        }
    });
    pipelinePrestaciones.push({ $unwind: '$prestaciones' });
    pipelinePrestaciones.push({
        $group: {
            _id: {
                _id: '$prestaciones._id',
                conceptId: '$prestaciones.conceptId',
                fsn: '$prestaciones.fsn',
                semanticTag: '$prestaciones.semanticTag',
                term: '$prestaciones.term'
            }
        }
    });
    pipelinePrestaciones.push({
        $project: {
            _id: '$_id._id',
            conceptId: '$_id.conceptId',
            fsn: '$_id.fsn',
            semanticTag: '$_id.semanticTag',
            term: '$_id.term'
        }
    });

    try {
        let prestaciones = await toArray(agenda.aggregate(pipelinePrestaciones).cursor({}).exec());
        res.json(prestaciones);
    } catch (err) {
        return err;
    }
});

export = router;
