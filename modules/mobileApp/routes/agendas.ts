import * as express from 'express';
import { Agenda } from '../../turnos/schemas/agenda';
import { Organizacion } from '../../../core/tm/schemas/organizacion';
import * as moment from 'moment';
import { getDistanceBetweenPoints } from '../../../utils/utilCoordenadas';
import { verificarCondicionPaciente } from '../../../modules/turnos/condicionPaciente/condicionPaciente.controller';
import { CondicionPaciente } from '../../../modules/turnos/condicionPaciente/condicionPaciente.schema';

const router = express.Router();

/**
 * Get agendas con turnos disponibles
 */

router.get('/agendasDisponibles', async (req: any, res, next) => {
    const pipelineAgendas = [];
    const matchAgendas = {};
    const condiciones: any = await CondicionPaciente.find({activo: true});
    let reglas = [];
    let fieldRegla;
    if (req.query.idPaciente) {
        for (const condicion of condiciones) {
            const verificar = await verificarCondicionPaciente(condicion, req.query.idPaciente);
            if (verificar) {
                reglas.push(condicion.tipoPrestacion.conceptId);
            }
        }
    }

    if (req.query.conceptId) {
        matchAgendas['tipoPrestaciones.conceptId'] = req.query.conceptId;
    }
    matchAgendas['horaInicio'] = { $gt: new Date(moment().format('YYYY-MM-DD HH:mm')) };
    matchAgendas['bloques.restantesProgramados'] = { $gt: 0 };
    matchAgendas['estado'] = 'publicada';
    matchAgendas['dinamica'] = false;
    if (reglas) {
        matchAgendas['$or'] = [
            {
                'bloques.restantesMobile': { $gt: 0 },
            },
            {
                'tipoPrestaciones.conceptId': { $in:  reglas }
            }
        ];
        fieldRegla = {
            cumpleRegla: {
                $not: [{$eq: [{$size: { $setIntersection: ['$tipoPrestaciones.conceptId', reglas]}}, 0]}]
            }
        };
    } else {
        matchAgendas['bloques.restantesMobile'] = { $gt: 0 };
    }
    pipelineAgendas.push({ $match: matchAgendas });
    if (fieldRegla) {
        pipelineAgendas.push({ $addFields: fieldRegla });
    }
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
        let agendasResultado = await Agenda.aggregate(pipelineAgendas);

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

