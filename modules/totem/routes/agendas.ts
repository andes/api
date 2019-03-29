import * as express from 'express';
import * as agenda from '../../turnos/schemas/agenda';
import { Organizacion } from '../../../core/tm/schemas/organizacion';
import { toArray } from '../../../utils/utils';
import * as moment from 'moment';
import { Types } from 'mongoose';

const ObjectId = Types.ObjectId;

import * as mongoose from 'mongoose';

const router = express.Router();

/**
 * Get agendas disponibles a partir de un conceptId
 * Filtrando los bloques con ese tipo de prestación y turnos de acceso directo disponibles
 */

router.get('/agendasDisponibles', async (req: any, res, next) => {

    const pipelineAgendas = [];
    const matchAgendas = {};
    if (!req.query.prestacion) {
        return res.json();
    }
    // matchAgendas['organizacion._id'] = { $eq: mongoose.Types.ObjectId(Auth.getOrganization(req)) }; // TODO: compararar con id de organización del token
    matchAgendas['organizacion._id'] = { $eq: new ObjectId('57f67d090166fa6aedb2f9fb') };
    matchAgendas['horaInicio'] = { $gte: new Date(moment().format('YYYY-MM-DD HH:mm')) };
    matchAgendas['$or'] = [
        { 'bloques.restantesProgramados': { $gt: 0 } },
        { 'bloques.restantesDelDia': { $gt: 0 } }];

    matchAgendas['estado'] = 'publicada';
    matchAgendas['dinamica'] = false;
    if (req.query.prestacion) {
        matchAgendas['tipoPrestaciones.conceptId'] = req.query.prestacion;
    }
    pipelineAgendas.push({ $match: matchAgendas });
    pipelineAgendas.push({ $unwind: '$bloques' });
    pipelineAgendas.push({ $match: { $expr: { $or: [{ $gt: ['$bloques.restantesProgramados', 0] }, { $gt: ['$bloques.restantesDelDia', 0] }] } } });
    pipelineAgendas.push({ $unwind: '$bloques.tipoPrestaciones' });
    pipelineAgendas.push({ $match: { 'bloques.tipoPrestaciones.conceptId': req.query.prestacion } });

    console.log('pipelineAgendas ', JSON.stringify(pipelineAgendas));
    try {
        let prestaciones = await toArray(agenda.aggregate(pipelineAgendas).cursor({}).exec());
        res.json(prestaciones);
    } catch (err) {
        return err;
    }
});

export = router;

