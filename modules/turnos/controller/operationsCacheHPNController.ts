//  Imports
import * as mongoose from 'mongoose';
import {
    agendasCache
} from '../../legacy/schemas/agendasCache';
import * as sql from 'mssql';
import * as moment from 'moment';
import * as constantes from '../../legacy/schemas/constantes';
import * as logger from './../../../utils/loggerAgendaHPNCache';
import * as agendaSchema from '../schemas/agenda';
import * as pacienteHPN from './pacienteHPNController';
import * as turnoCtrl from './turnoHPNCacheController';
import { resolve } from 'path';

export async function saveAgendaToPrestaciones(agenda, pool) {
    let transaction = await new sql.Transaction(pool);
    return new Promise(async function (resolve2, reject) {
        let idProfesional = agenda.profesionales ? await getIdProfesionalPrestaciones(agenda.profesionales[0].documento) : null;
        if (idProfesional) {
            transaction.begin(async err => {
                let rolledBack = false;
                transaction.on('rollback', aborted => {
                    rolledBack = true;
                });
                try {
                    let idAgendaHPN = await getIdAgendaHPN(agenda.id);
                    // Asumimos que la agenda posee un único tipo de prestación,
                    // y que ese id de prestación sera el que mismo para los bloques y turnos
                    let idTipoPrestacion = await getIdTipoPrestacion(agenda);
                    if (idTipoPrestacion) {
                        if (!idAgendaHPN) {
                            idAgendaHPN = await saveAgenda(agenda, idTipoPrestacion);
                            await saveAgendaProfesional(idAgendaHPN, idProfesional);
                            await saveAgendaTipoPrestacion(idAgendaHPN, idTipoPrestacion);
                        }

                        await saveBloques(idAgendaHPN, agenda.bloques, idTipoPrestacion);
                        await setEstadoAgendaToIntegrada(agenda._id);
                        transaction.commit(async err2 => {
                            resolve2();
                        });
                    } else {
                        resolve2();
                    }
                } catch (e) {
                    logger.LoggerAgendaCache.logAgenda(agenda._id, e);
                    transaction.rollback();
                    reject(e);
                }
            });
        } else {
            resolve2();
        }
    });

    async function getIdProfesionalPrestaciones(documento) {
        let query = 'select TOP(1) medicos.id ' +
            'from Medicos ' +
            'where documento = @documento ' +
            'OR EXISTS ( ' +
            'SELECT * ' +
            'FROM Personal_Agentes ' +
            'WHERE Personal_Agentes.Numero = numeroAgente ' +
            'AND Personal_Agentes.Documento = @documento ' +
            ')';
        let result = await pool.request()
            .input('documento', sql.VarChar(50), documento)
            .query(query);
        result = result.recordset;

        return (result.length > 0 ? result[0].id : null);
    }

    async function getIdAgendaHPN(idAndes) {
        let query = 'SELECT id FROM dbo.Prestaciones_Worklist_Programacion WHERE andesId = @idAndes';
        let result = await pool.request()
            .input('idAndes', sql.VarChar(50), idAndes)
            .query(query);
        result = result.recordset;

        return (result.length > 0 ? result[0].id : null);
    }

    async function saveAgendaProfesional(idProgramacion, idProfesional) {
        let query = 'INSERT INTO dbo.Prestaciones_Worklist_Programacion_Profesionales ' +
            '(idProgramacion, idProfesional) VALUES (@idProgramacion, @idProfesional)';

        return await new sql.Request(transaction)
            .input('idProgramacion', sql.Int, idProgramacion)
            .input('idProfesional', sql.Int, idProfesional)
            .query(query).then(() => {
                return;
            }).catch(err => {
                throw err;
            });
    }

    async function saveAgendaTipoPrestacion(idProgramacion, idTipoPrestacion) {
        let query = 'INSERT INTO dbo.Prestaciones_Worklist_Programacion_TiposPrestaciones ' +
            '(idProgramacion, idTipoPrestacion) VALUES (@idProgramacion, @idTipoPrestacion)';

        return await new sql.Request(transaction)
            .input('idProgramacion', sql.Int, idProgramacion)
            .input('idTipoPrestacion', sql.Int, idTipoPrestacion)
            .query(query).then(() => {
                return;
            }).catch(err => {
                throw err;
            });
    }

    async function saveAgenda(_agenda, idTipoPrestacion) {
        let idAgendaHPN;
        let idUbicacion = turnoCtrl.getUbicacion(idTipoPrestacion); // checkar datos en produccion
        let fechaHora = _agenda.horaInicio;
        let fechaHoraFinalizacion = _agenda.horaFin;
        let duracionTurnos = _agenda.bloques[0].duracionTurno;
        let permiteTurnosSimultaneos = 0;
        let permiteSobreturnos = 0;
        let publicada = (_agenda.estado !== constantes.EstadoAgendaAndes.publicada ? 0 : 1);
        let suspendida = (_agenda.estado !== constantes.EstadoAgendaAndes.suspendida ? 0 : 1);
        let andesId = _agenda.id;

        let query = 'INSERT INTO dbo.Prestaciones_Worklist_Programacion ' +
            '(idUbicacion ' +
            ',idTipoPrestacion ' +
            ',fechaHora ' +
            ',fechaHoraFinalizacion ' +
            ',duracionTurnos ' +
            ',permiteTurnosSimultaneos ' +
            ',permiteSobreturnos ' +
            ',publicada ' +
            ',suspendida ' +
            ',andesId) ' +
            'VALUES ( ' +
            '@idUbicacion,' +
            '@idTipoPrestacion,' +
            '@fechaHora,' +
            '@fechaHoraFinalizacion,' +
            '@duracionTurnos,' +
            '@permiteTurnosSimultaneos,' +
            '@permiteSobreturnos,' +
            '@publicada,' +
            '@suspendida,' +
            '@andesId) ' +
            'SELECT SCOPE_IDENTITY() AS id';

        await new sql.Request(transaction)
            .input('idUbicacion', sql.Int, idUbicacion)
            .input('idTipoPrestacion', sql.Int, idTipoPrestacion)
            .input('fechaHora', sql.DateTime, fechaHora)
            .input('fechaHoraFinalizacion', sql.DateTime, fechaHoraFinalizacion)
            .input('duracionTurnos', sql.Int, duracionTurnos)
            .input('permiteTurnosSimultaneos', sql.Bit, permiteTurnosSimultaneos)
            .input('permiteSobreturnos', sql.Bit, permiteSobreturnos)
            .input('publicada', sql.Bit, publicada)
            .input('suspendida', sql.Bit, suspendida)
            .input('andesId', sql.VarChar(50), andesId)
            .query(query)
            .then(result => {
                idAgendaHPN = result.recordset[0].id;
            }).catch(err => {
                throw err;
            });

        return idAgendaHPN;
    }

    async function saveBloques(idAgendaAndes, bloques: Array<any>, idTipoPrestacion) {
        for (let bloque of bloques) {
            await turnoCtrl.saveTurnos(idAgendaAndes, bloque, idTipoPrestacion, pool, transaction);
        }
    }

    function executeQuery(query: any) {
        query += ' select SCOPE_IDENTITY() as id';
        return new Promise((resolve2: any, reject: any) => {
            return new sql.Request(transaction)
                .query(query)
                .then(result => {
                    resolve2(result.recordset[0].id);
                }).catch(err => {
                    reject(err);
                });
        });
    }
}

export async function getAgendasDeMongoPendientes() {
    var ObjectId = require('mongoose').Types.ObjectId;
    return await agendasCache.find({
        estadoIntegracion: constantes.EstadoExportacionAgendaCache.pendiente,
        'organizacion._id': new ObjectId(constantes.idOrganizacionHPN)
    });
}

async function setEstadoAgendaToIntegrada(idAgenda) {
    return await agendasCache.update({
        _id: idAgenda
    }, {
            $set: {
                estadoIntegracion: constantes.EstadoExportacionAgendaCache.exportadaSIPS
            }
        }).exec();
}

export function getAgendasDeMongoExportadas() {
    return new Promise<Array<any>>(function (resolve2, reject) {
        agendasCache.find({
            $or: [{
                estadoIntegracion: constantes.EstadoExportacionAgendaCache.exportadaSIPS
            }, {
                estadoIntegracion: constantes.EstadoExportacionAgendaCache.codificada
            }]
        }).exec(function (err, data) {
            if (err) {
                reject(err);
            }
            resolve2(data);
        });
    });
}

export function getIdTipoPrestacion(_agenda) {
    let idTipoPrestacion = null;
    let prestacionesIntegradas: any;
    let datosOrganizacion = constantes.prestacionesIntegradasPorEfector.find(elem => { return elem.organizacion === _agenda.organizacion._id.toString(); } );
    if (datosOrganizacion) {
        prestacionesIntegradas = datosOrganizacion.prestaciones.find(prestacion => {
            return (_agenda.tipoPrestaciones.filter(prest => prest.conceptId === prestacion.conceptId).length > 0);
        });
    }

    if (prestacionesIntegradas) {
         idTipoPrestacion = prestacionesIntegradas.id;
    }

    return idTipoPrestacion;
}
