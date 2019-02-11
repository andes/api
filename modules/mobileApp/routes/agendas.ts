import * as express from 'express';
import * as agenda from '../../turnos/schemas/agenda';
import { organizacionCache } from '../../../core/tm/schemas/organizacionCache';
import * as organizacion from '../../../core/tm/schemas/organizacion';
import { toArray } from '../../../utils/utils';
import * as moment from 'moment';

const router = express.Router();

/**
 * Get agendas con turnos disponibles
 */

router.get('/agendasDisponibles', async (req: any, res, next) => {
    const pipelineAgendas = [];
    const matchAgendas = {};

    if (req.query.horaInicio) {
        matchAgendas['horaInicio'] = { $gt: new Date(moment().format('YYYY-MM-DD HH:mm')) };
    }
    if (req.query.prestacion) {
        const conceptoTurneable = JSON.parse(req.query.prestacion);
        matchAgendas['tipoPrestaciones.conceptId'] = conceptoTurneable.conceptId;
    }
    matchAgendas['bloques.restantesProgramados'] = { $gt: 0 };
    matchAgendas['bloques.restantesMobile'] = { $gt: 0 };

    matchAgendas['estado'] = 'publicada';
    matchAgendas['dinamica'] = false;

    pipelineAgendas.push({ $match: matchAgendas });
    pipelineAgendas.push({
        $group: {
            _id: { id: '$organizacion._id' },
            id: { $first: '$organizacion._id' },
            organizacion: { $first: '$organizacion.nombre' },
            agendas: { $push: '$$ROOT' }
        }
    });
    pipelineAgendas.push({
        $sort: { 'agendas.horaInicio': 1 }
    });
    const agendasResultado = await toArray(agenda.aggregate(pipelineAgendas).cursor({}).exec());

    // URGENTE: Unificar la información de organizacion y organización cache, ahora hago esta búsqueda para obtener tanto el punto gps como la dirección según sisa.
    const promisesStack = [];
    try {
        for (let i = 0; i <= agendasResultado.length - 1; i++) {
            const org: any = await organizacion.model.findById(agendasResultado[i].id);
            if (org.codigo && org.codigo.sisa) {
                const orgCache: any = await organizacionCache.findOne({ codigo: org.codigo.sisa });
                agendasResultado[i].coordenadasDeMapa = orgCache.coordenadasDeMapa;
                agendasResultado[i].domicilio = orgCache.domicilio;
                promisesStack.push(orgCache);
            }
        }
        await Promise.all(promisesStack);
        res.json(agendasResultado);
    } catch (err) {
        res.status(422).json({ message: err });
    }

});

export = router;
