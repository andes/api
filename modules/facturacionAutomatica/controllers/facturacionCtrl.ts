import * as mongoose from 'mongoose';
import * as moment from 'moment';

import * as agendaSchema from '../../turnos/schemas/agenda';
import * as turnoCtrl from '../../turnos/controller/turnoCacheController';
import * as operationsSumar from '../controllers/operationsCtrl/operationsSumar'
import * as configPrivate from '../../../config.private';
import * as sql from 'mssql';

const MongoClient = require('mongodb').MongoClient;
let async = require('async');



export async function facturacionCtrl() {
    return await operationsSumar.completaComprobante()

}