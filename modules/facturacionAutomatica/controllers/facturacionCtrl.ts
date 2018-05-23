import * as mongoose from 'mongoose';
import * as moment from 'moment';

import * as agendaSchema from '../../turnos/schemas/agenda';

import * as turnoCtrl from '../../turnos/controller/turnoCacheController';
import * as operationSumar from '../../facturacionAutomatica/controllers/operationsCtrl/operationsSumar';
import * as operationRF from '../../facturacionAutomatica/controllers/operationsCtrl/operationsRF';

import * as configPrivate from '../../../config.private';
import * as constantes from './../../legacy/schemas/constantes';
import * as sql from 'mssql';
import { tipoPrestacion } from '../../../core/tm/schemas/tipoPrestacion';
import { toArray } from '../../../utils/utils';
const MongoClient = require('mongodb').MongoClient;
let async = require('async');



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
                    console.log(turnos[z].estadoFacturacion);
                    if (turnos[z].estadoFacturacion === 'sinFacturar') {
                        if (turnos[z].paciente.obraSocial) {
                            if (turnos[z].paciente.obraSocial.codigo === '499') {
                                unPacienteSumar = {
                                    idTurno: turnos[z]._id,
                                    efector: agenda.organizacion,
                                    fecha: agenda.horaInicio,
                                    paciente: turnos[z].paciente,
                                    tipoPrestacion: turnos[z].tipoPrestacion,
                                };

                                pacientesSumar.push(unPacienteSumar);
                            } else {
                                unPacienteRF = {
                                    _id: turnos[z]._id,
                                    profesionales: agenda.profesionales,
                                    tipoPrestacion: turnos[z].tipoPrestacion,
                                    diagnostico: turnos[z].diagnostico,
                                    efector: agenda.organizacion,
                                    paciente: turnos[z].paciente,
                                    fecha: turnos[z].horaInicio,
                                    motivoConsulta: turnos[z].motivoConsulta,
                                };

                                pacientesRF.push(unPacienteRF);
                            }
                        }
                    }
                }
            }
        });
        operationSumar.facturacionSumar(pacientesSumar);
        //operationRF.facturacionRF(pacientesRF);
    } catch (ex) {
        return (ex);
    }
}

export async function getAgendasDeMongoPendientes() {
    // return new Promise<Array<any>>(function (resolve, reject) {
    // agendaSchema.find({
    //     estadoFacturacion: constantes.EstadoFacturacionAgendasCache.pendiente
    // }).sort({
    //     _id: 1
    // }).limit(100).exec(function (err, data: any) {
    //     if (err) {
    //         reject(err);
    //     }
    //     resolve(data);
    // });
    let hoyDesde = moment(new Date()).startOf('day').format();
    let hoyHasta = moment(new Date()).endOf('day').format();
    let agendas = await toArray(agendaSchema.aggregate({
        $match: {
            'createdAt': {
                $gte: new Date(hoyDesde), $lte: new Date(hoyHasta)
            },
            'estadoFacturacion': constantes.EstadoFacturacionAgendasCache.pendiente
        }
    }).cursor({ batchSize: 1000 }).exec());
    return agendas
    // });
}