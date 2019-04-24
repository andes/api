import * as express from 'express';
import * as agenda from '../../turnos/schemas/agenda';
import { Organizacion } from '../../../core/tm/schemas/organizacion';
import { toArray } from '../../../utils/utils';
import * as moment from 'moment';

const router = express.Router();

/**
 * Get agendas con turnos disponibles
 */

router.get('/agendasDisponibles', async (req: any, res, next) => {
    const pipelineAgendas = [];
    const matchAgendas = {};

    if (req.query.prestacion) {
        const conceptoTurneable = JSON.parse(req.query.prestacion);
        matchAgendas['tipoPrestaciones.conceptId'] = conceptoTurneable.conceptId;
    }

    matchAgendas['horaInicio'] = { $gt: new Date(moment().format('YYYY-MM-DD HH:mm')) };
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
    let agendasResultado = await toArray(agenda.aggregate(pipelineAgendas).cursor({}).exec());
    try {
        for (let i = 0; i <= agendasResultado.length - 1; i++) {
            const org: any = await Organizacion.findById(agendasResultado[i].id);
            if (org.codigo && org.codigo.sisa && org.turnosMobile && org.direccion && org.direccion.geoReferencia) {
                agendasResultado[i].coordenadasDeMapa = {
                    latitud: org.direccion.geoReferencia[0],
                    longitud: org.direccion.geoReferencia[1]
                };
                agendasResultado[i].domicilio = org.direccion.valor;
            }
        }
        res.json(agendasResultado);
    } catch (err) {
        res.status(422).json({ message: err });
    }
});

export = router;

