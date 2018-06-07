import * as mongoose from 'mongoose';
import * as moment from 'moment';

import * as agendaSchema from '../../turnos/schemas/agenda';

import * as turnoCtrl from '../../turnos/controller/turnoCacheController';
// import * as operationSumar from '../../facturacionAutomatica/controllers/operationsCtrl/operationsSumar';
// // import * as operationRF from '../../facturacionAutomatica/controllers/operationsCtrl/operationsRF';
// import * as operations from '../../facturacionAutomatica/controllers/operationsCtrl/operations';

import * as configPrivate from '../../../config.private';
import * as constantes from './../../legacy/schemas/constantes';
import * as sql from 'mssql';
import { tipoPrestacion } from '../../../core/tm/schemas/tipoPrestacion';
import { toArray } from '../../../utils/utils';
const MongoClient = require('mongodb').MongoClient;
let async = require('async');


export async function getTurnosFacturacionPendiente() {
    let hoyDesde = moment(new Date()).startOf('day').format();
    let hoyHasta = moment(new Date()).endOf('day').format();
    let prestaciones = ['2091000013100', '2091000013101'];
    let match = {
        $match: {
            $and: [{ 'bloques.turnos.estadoFacturacion': { $eq: 'sinFacturar' } },
            { 'createdAt': { $gte: new Date(hoyDesde), $lte: new Date(hoyHasta) } },
            { 'bloques.turnos.estado': { $eq: 'asignado' } },
            { 'bloques.turnos.asistencia': { $exists: true, $eq: 'asistio' } },
            { 'bloques.turnos.tipoPrestacion.conceptId': { $in: prestaciones } }

            ]
        }
    };

    let data = await toArray(agendaSchema.aggregate([
        match,
        { $unwind: '$bloques' },
        { $unwind: '$bloques.turnos' },
        match
    ]).cursor({})
        .exec());

    let turnos = [];
    data.forEach(agenda => {
        turnos.push({
            datosAgenda: {
                'organizacion': agenda.organizacion,
                'horaInicio': agenda.horaInicio,
                'profesionales': agenda.profesionales
            },
            turno: agenda.bloques.turnos,
        });
    });

    return turnos;
}


