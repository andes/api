import * as express from 'express';
import * as mongoose from 'mongoose';
import * as agenda from '../../turnos/schemas/agenda';
import { organizacionCache } from '../../../core/tm/schemas/organizacionCache';
import * as organizacion from '../../../core/tm/schemas/organizacion';
import * as agendaCtrl from '../../turnos/controller/agenda';
import { Auth } from './../../../auth/auth.class';
import { Logger } from '../../../utils/logService';
import * as recordatorioController from '../controller/RecordatorioController';
import { LoggerPaciente } from '../../../utils/loggerPaciente';
import { toArray } from '../../../utils/utils';
import * as moment from 'moment';
import { forEach } from 'async';
import { ObjectID, ObjectId } from 'bson';

const router = express.Router();

/**
 * Get agendas con turnos disponibles
 */

router.get('/agendasDisponibles', async (req: any, res, next) => {
    const pipelineAgendas = [];
    const matchAgendas = {};
    const agendas = [];
    let ag: any;

    const pacienteId = req.user.pacientes[0].id;

    if (req.query.horaInicio) {
        matchAgendas['horaInicio'] = { $gt: new Date(moment().format('YYYY-MM-DD HH:mm')) };
    }
    matchAgendas['tipoPrestaciones.conceptId'] = '34043003'; // Tipo de turno Hardcodeado para odontología
    matchAgendas['bloques.restantesProgramados'] = { $gt: 0 };
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
            const org: any = await organizacion.Organizacion.findById(agendasResultado[i].id);
            if (org.codigo && org.codigo.sisa && org.turnosMobile) {
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
