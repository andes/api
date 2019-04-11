import * as express from 'express';
import * as agenda from '../../turnos/schemas/agenda';
import { Organizacion } from '../../../core/tm/schemas/organizacion';
import { toArray } from '../../../utils/utils';
import * as moment from 'moment';
import { Types } from 'mongoose';
import { Auth } from '../../../auth/auth.class';
const ObjectId = Types.ObjectId;

import * as mongoose from 'mongoose';

const router = express.Router();

/**
 * Get agendas disponibles a partir de un conceptId
 * Filtrando los bloques con ese tipo de prestación y turnos de acceso directo disponibles
 * y solo devolviendo una agenda por profesional
 */

router.get('/agendasDisponibles', async (req: any, res, next) => {

    const pipelineAgendas = [];
    const matchAgendas = {};
    if (!req.query.prestacion) {
        return res.json();
    }
    matchAgendas['organizacion._id'] = { $eq: mongoose.Types.ObjectId(Auth.getOrganization(req)) }; // TODO: compararar con id de organización del token
    matchAgendas['organizacion._id'] = { $eq: new ObjectId('57e9670e52df311059bc8964') };
    matchAgendas['bloques.turnos.horaInicio'] = { $gte: new Date(moment().format('YYYY-MM-DD HH:mm')) };
    matchAgendas['$or'] = [
        { 'bloques.restantesProgramados': { $gt: 0 } },
        { 'bloques.restantesDelDia': { $gt: 0 } }];

    matchAgendas['estado'] = 'publicada';
    matchAgendas['dinamica'] = false;
    if (req.query.prestacion) {
        matchAgendas['tipoPrestaciones.conceptId'] = req.query.prestacion;
    }
    pipelineAgendas.push({ $match: matchAgendas });
    // Las siguientes dos operaciones del aggregate son para filtrar solo 1 agenda por profesional
    pipelineAgendas.push({ $group: { _id: '$profesionales', resultado: { $push: '$$ROOT' } } });
    pipelineAgendas.push({ $project: { resultado: { $arrayElemAt: ['$resultado', 0] }, _id: 0 } });

    pipelineAgendas.push({ $unwind: '$resultado' });
    pipelineAgendas.push({ $unwind: '$resultado.bloques' });
    pipelineAgendas.push({ $match: { $expr: { $or: [{ $gt: ['$resultado.bloques.restantesProgramados', 0] }, { $gt: ['$resultado.bloques.restantesDelDia', 0] }] } } });
    pipelineAgendas.push({ $unwind: '$resultado.bloques.tipoPrestaciones' });
    pipelineAgendas.push({ $match: { 'resultado.bloques.tipoPrestaciones.conceptId': req.query.prestacion } });

    try {
        let prestaciones = await toArray(agenda.aggregate(pipelineAgendas).cursor({}).exec());
        res.json(prestaciones.map(elem => { return elem.resultado; }));
    } catch (err) {
        return err;
    }
});

export = router;

