import * as mongoose from 'mongoose';
import * as moment from 'moment';

import * as agenda from '../../turnos/schemas/agenda';

import * as turnoCtrl from '../../turnos/controller/turnoCacheController';
import * as operationSumar from '../../facturacionAutomatica/controllers/operationsCtrl/operationsSumar';
import * as operationRF from '../../facturacionAutomatica/controllers/operationsCtrl/operationsRF';

import * as configPrivate from '../../../config.private';
import * as constantes from './../../legacy/schemas/constantes';
import * as sql from 'mssql';
import { tipoPrestacion } from '../../../core/tm/schemas/tipoPrestacion';

const MongoClient = require('mongodb').MongoClient;
let async = require('async');
let pool;
let transaction;

let connection = {
    user: configPrivate.conSql.auth.user,
    password: configPrivate.conSql.auth.password,
    server: configPrivate.conSql.serverSql.server,
    database: configPrivate.conSql.serverSql.database
};


export async function facturacionCtrl() {
    try {
        let turnos;
        let unPacienteSumar: any;
        let pacientesSumar: any = [];
        let unPacienteRF: any;
        let pacientesRF: any = [];

        /* Se traen las agendas pendientes de facturación*/
        let agendasMongoPendientes = await getAgendasDeMongoPendientes();
        agendasMongoPendientes.forEach(async (agenda) => {

            for (let x = 0; x < agenda.bloques.length; x++) {
                turnos = agenda.bloques[x].turnos;
                for (let z = 0; z < turnos.length; z++) {
                    if (turnos[z].paciente.obraSocial) {
                        if (turnos[z].paciente.obraSocial.codigo === '499') {
                            unPacienteSumar = {
                                efector: agenda.organizacion,
                                paciente: turnos[z].paciente
                            }

                            pacientesSumar.push(unPacienteSumar);
                        } else {
                            unPacienteRF = {
                                profesional: agenda.profesionales,
                                tipoPrestacion: turnos[z].tipoPrestacion,
                                diagnostico: turnos[z].diagnostico,
                                efector: agenda.organizacion,
                                paciente: turnos[z].paciente
                            }

                            pacientesRF.push(unPacienteRF);
                        }
                    }
                }
            }
        });

        operationSumar.facturacionSumar(pacientesSumar);
        operationRF.facturacionRF(pacientesRF);
    } catch (ex) {
        return (ex);
    }
}

function getAgendasDeMongoPendientes() {
    return new Promise<Array<any>>(function (resolve, reject) {
        agenda.find({
            estadoFacturacion: constantes.EstadoFacturacionAgendasCache.pendiente
        }).sort({
            _id: 1
        }).limit(100).exec(function (err, data: any) {
            if (err) {
                reject(err);
            }
            resolve(data);
        });
    });
}