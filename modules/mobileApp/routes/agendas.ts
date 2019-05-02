import * as express from 'express';
import * as agenda from '../../turnos/schemas/agenda';
import { Organizacion } from '../../../core/tm/schemas/organizacion';
import * as moment from 'moment';
import { getDistanceBetweenPoints } from '../../../utils/utilCoordenadas';

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

    try {
        let agendasResultado = await agenda.aggregate(pipelineAgendas);

        if (req.query.userLocation) {
            const userLocation = JSON.parse(req.query.userLocation);
            for (let i = 0; i <= agendasResultado.length - 1; i++) {
                const org: any = await Organizacion.findById(agendasResultado[i].id);

                if (org.codigo && org.codigo.sisa && org.turnosMobile && org.direccion && org.direccion.geoReferencia) {
                    agendasResultado[i].coordenadasDeMapa = {
                        lat: org.direccion.geoReferencia[0],
                        lng: org.direccion.geoReferencia[1]
                    };
                    agendasResultado[i].domicilio = org.direccion.valor;

                    // Calculamos la distancia entre la posicion actual del usuario y el efector (Aplica applyHaversine)
                    agendasResultado[i].distance = getDistanceBetweenPoints(
                        userLocation,
                        agendasResultado[i].coordenadasDeMapa,
                        'km'
                    ).toFixed(2);
                }
            }

            agendasResultado.sort((locationA, locationB) => {
                return locationA.distance - locationB.distance;
            });
            // Limitamos a 10 km los turnos a mostrar (FILTRA LOS MAYORES A 10 KM)
            agendasResultado = agendasResultado.filter(obj => obj.distance <= 10);
        }

        res.json(agendasResultado);
    } catch (err) {
        res.status(422).json({ message: err });
    }
});

export = router;

