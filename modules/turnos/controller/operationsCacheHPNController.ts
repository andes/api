import { agendasCache } from '../../legacy/schemas/agendasCache';
import * as sql from 'mssql';
import * as constantes from '../../legacy/schemas/constantes';
import * as logger from './../../../utils/loggerAgendaHPNCache';
import * as turnoCtrl from './turnoHPNCacheController';
import { configuracionPrestacionModel } from '../../../core/term/schemas/configuracionPrestacion';

export async function saveAgendaToPrestaciones(agenda, pool) {
    const transaction = await new sql.Transaction(pool);
    return new Promise(async (resolve2, reject) => {
        const idProfesional = agenda.profesionales ? await getIdProfesionalPrestaciones(agenda.profesionales[0].documento) : null;
        if (idProfesional) {
            transaction.begin(async _err => {
                // let rolledBack = false;
                transaction.on('rollback', aborted => {
                    // rolledBack = true;
                });
                try {
                    let idAgendaHPN = await getIdAgendaHPN(agenda.id);
                    // Asumimos que la agenda posee un único tipo de prestación,
                    // y que ese id de prestación sera el que mismo para los bloques y turnos
                    const idTipoPrestacion = await getIdTipoPrestacion(agenda);
                    if (idTipoPrestacion) {
                        if (!idAgendaHPN) {
                            idAgendaHPN = await saveAgenda(agenda, idTipoPrestacion);
                            await saveAgendaProfesional(idAgendaHPN, idProfesional);
                            await saveAgendaTipoPrestacion(idAgendaHPN, idTipoPrestacion);
                        }
                        await saveBloques(idAgendaHPN, agenda, idTipoPrestacion);
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
                    // Reintentamos ejecutar la agenda hasta 3 retry, sino le cambiamos el estado a fail para no trabar el resto de las agendas
                    await agendaRetryAndFail(agenda);
                    reject(e);
                }
            });
        } else {
            resolve2();
        }
    });

    async function getIdProfesionalPrestaciones(documento) {
        const query = 'select TOP(1) medicos.id ' +
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
        const query = 'SELECT id FROM dbo.Prestaciones_Worklist_Programacion WHERE andesId = @idAndes';
        let result = await pool.request()
            .input('idAndes', sql.VarChar(50), idAndes)
            .query(query);
        result = result.recordset;

        return (result.length > 0 ? result[0].id : null);
    }

    async function saveAgendaProfesional(idProgramacion, idProfesional) {
        const query = 'INSERT INTO dbo.Prestaciones_Worklist_Programacion_Profesionales ' +
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
        const query = 'INSERT INTO dbo.Prestaciones_Worklist_Programacion_TiposPrestaciones ' +
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
        const autocitada = (_agenda.reservadoProfesional === _agenda.cantidadTurnos) ? 1 : 0;
        let idAgendaHPN;
        const idUbicacion = turnoCtrl.getUbicacion(idTipoPrestacion);
        const fechaHora = _agenda.horaInicio;
        const fechaHoraFinalizacion = _agenda.horaFin;
        const duracionTurnos = _agenda.bloques[0].duracionTurno;
        const permiteTurnosSimultaneos = 0;
        const permiteSobreturnos = 0;
        const publicada = (_agenda.estado === constantes.EstadoAgendaAndes.publicada || autocitada === 1) ? 1 : 0;
        const suspendida = (_agenda.estado !== constantes.EstadoAgendaAndes.suspendida ? 0 : 1);
        const andesId = _agenda.id;

        const query = 'INSERT INTO dbo.Prestaciones_Worklist_Programacion ' +
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
            .input('fechaHora', sql.DateTimeOffset, fechaHora)
            .input('fechaHoraFinalizacion', sql.DateTimeOffset, fechaHoraFinalizacion)
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


    async function saveBloques(idAgendaAndes, _agenda: any, idTipoPrestacion) {
        const bloques = _agenda.bloques;
        for (const bloque of bloques) {
            await turnoCtrl.saveTurnos(idAgendaAndes, bloque, idTipoPrestacion, pool, transaction);
        }
        if (_agenda.sobreturnos) {
            for (const sobreturno of _agenda.sobreturnos) {
                await turnoCtrl.saveSobreturno(idAgendaAndes, sobreturno, idTipoPrestacion, pool, transaction);
            }
        }
    }
    /* [REVISAR]
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
    */
}

export async function getAgendasDeMongoPendientes() {
    const ObjectId = require('mongoose').Types.ObjectId;
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
            estadoIntegracion: constantes.EstadoExportacionAgendaCache.exportada
        }
    }).exec();
}

export function getAgendasDeMongoExportadas() {
    return new Promise<Array<any>>((resolve2, reject) => {
        agendasCache.find({
            $or: [{
                estadoIntegracion: constantes.EstadoExportacionAgendaCache.exportada
            },    {
                estadoIntegracion: constantes.EstadoExportacionAgendaCache.codificada
            }]
        }).exec((err, data) => {
            if (err) {
                reject(err);
            }
            resolve2(data);
        });
    });
}

export async function getIdTipoPrestacion(_agenda) {
    let idTipoPrestacion = null;
    let prestacionesIntegrada: any = null;

    // Primero filtramos por el conceptId de la agenda que (según requerimientos era siempre 1) por eso verificamos _agenda.tipoPrestaciones[0]
    const configuracionesPrestacion: any = await configuracionPrestacionModel.findOne({
        'snomed.conceptId': _agenda.tipoPrestaciones[0].conceptId
    });
    if (configuracionesPrestacion) {
        // Verificamos si nuestra organización tiene a esta prestación para integrar y así continuar con el proceso.
        configuracionesPrestacion.organizaciones.forEach(obj => {
            if (obj._id.toString() === _agenda.organizacion._id.toString()) {
                prestacionesIntegrada = obj;
                return prestacionesIntegrada;
            }
        });
        // Si está integrada devuelvo el identificador de la prestación en sistema legacy.
        if (prestacionesIntegrada) {
            idTipoPrestacion = prestacionesIntegrada.codigo;
        }
        return idTipoPrestacion;
    } else {
        return null;
    }
}

async function agendaRetryAndFail(_agenda) {
    if (!_agenda.retry) {
        _agenda.retry = 1;
    } else {
        if (_agenda.retry > 3) {
            _agenda.estadoIntegracion = 'fail';
        } else {
            _agenda += 1;
        }
    }
    return await agendasCache.update({
        _id: _agenda._id
    }, {
        $set: {
            retry: _agenda.retry,
            estadoIntegracion: _agenda.estadoIntegracion
        }
    }).exec();
}
