import * as express from 'express';
import * as mongoose from 'mongoose';
import * as agenda from '../../turnos/schemas/agenda';
import * as agendaCtrl from '../../turnos/controller/agenda';
import { Auth } from './../../../auth/auth.class';
import { Logger } from '../../../utils/logService';
import * as recordatorioController from '../controller/RecordatorioController';
import { LoggerPaciente } from '../../../utils/loggerPaciente';
import { toArray } from '../../../utils/utils';
import * as moment from 'moment';

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
        matchAgendas['horaInicio'] = { $gte: new Date(moment().format('YYYY-MM-DD')) };
    }
    matchAgendas['tipoPrestaciones.conceptId'] = '34043003'; // Tipo de turno Hardcodeado para odontología
    matchAgendas['estado'] = 'publicada';
    matchAgendas['dinamica'] = false;

    pipelineAgendas.push({ $match: matchAgendas });
    pipelineAgendas.push({
        $group: {
            _id: { id: '$organizacion.nombre' },
            agendas: { $push: '$$ROOT' }
        }
    });
    pipelineAgendas.push({
        $sort: { 'agendas.horaInicio': 1 }
    });

    const agendasResultado = await toArray(agenda.aggregate(pipelineAgendas).cursor({}).exec());
    const promisesStack = [];

    if (promisesStack.length === 0) {
        promisesStack.push(Promise.resolve());
    }

    Promise.all(promisesStack).then(() => {
        res.json(agendasResultado);
    }).catch((err) => {
        res.status(422).json({ message: err });
    });


});

export = router;
