// Imports
import { agendasCache } from '../../../legacy/schemas/agendasCache';
import { configuracionPrestacionModel } from './../../../../core/term/schemas/configuracionPrestacion';
import * as sql from 'mssql';
import * as moment from 'moment';
import * as constantes from '../../../legacy/schemas/constantes';
import * as logger from './../../../../utils/loggerAgendaSipsCache';
import * as turnoCtrl from './../turnoCacheController';
import * as turnoOps from './operationsTurno';
import * as configPrivate from '../../../../config.private';
import * as dbg from 'debug';
import * as mongoose from 'mongoose' ;

const debug = dbg('integracion');

const config = {
    user: configPrivate.conSql.auth.user,
    password: configPrivate.conSql.auth.password,
    server: configPrivate.conSql.serverSql.server,
    database: configPrivate.conSql.serverSql.database,
    connectionTimeout: 10000,
    requestTimeout: 45000
};
// Sección de operaciones sobre MONGODB
/**
 * Obtiene las agendas con estado exportadaSips o Codificada
 *
 * @export
 * @returns
 */
export function getAgendasDeMongoExportadas() {
    return agendasCache.find({
        estadoIntegracion: constantes.EstadoExportacionAgendaCache.exportada
    });
}
/**
 * Obtiene las agendas de mongo que estan pendientes de procesar
 *
 * @export
 * @returns
 */
export function getAgendasDeMongoPendientes() {

    return agendasCache.find({
        estadoIntegracion: constantes.EstadoExportacionAgendaCache.pendiente,
        organizacion: { $nin: [mongoose.Types.ObjectId('57e9670e52df311059bc8964')]}
    }).sort({
        _id: 1
    }).limit(100);
}

/**
 * Obtiene el idEspecialidad a partir del tipo de prestacion y la organizacion.
 * Si no existe en la coleccion configuracionPrestacion por defecto se asigna consulta ambulatoria.
 * @export
 * @returns
 */
export function getEspecialidad(agenda, conceptId, organizacion) {
    return new Promise<Array<any>>((resolve, reject) => {
        let especialidad: any = 14;
        configuracionPrestacionModel.find({
            'snomed.conceptId': { $eq: conceptId },
            'organizaciones._id': { $eq: agenda.organizacion._id }
        }).exec((err, data: any) => {
            if (err) {
                reject(err);
            }
            // resolve(data);
            let datos;
            if (data.length > 0) {
                const organizaciones = data[0]['organizaciones'];
                if (organizaciones && organizaciones.length > 0) {
                    datos = organizaciones.filter((elem) => String(elem._id) === String(agenda.organizacion._id));
                    if (datos && datos.length > 0) {
                        especialidad = datos[0].idEspecialidad;
                    }
                }
                return resolve(especialidad);
            }
        });
    });
}

/**
 * @description Verifica la existencia de un turno en SIPS, actualiza la codificación del turno y marca la agenda como procesada.
 * @returns Devuelve una Promesa
 * @param agendaCacheada
 */
export async function checkCodificacion(agendaCacheada) {
    try {

        const connection = await new sql.ConnectionPool(config).connect();

        let turnos;
        let sobreturnos;
        let datosTurno = {};
        let idEspecialidad: any;
        let idConsulta;
        if (agendaCacheada.estado !== 'auditada') {

            for (let x = 0; x < agendaCacheada.bloques.length; x++) {
                turnos = agendaCacheada.bloques[x].turnos;
                for (let z = 0; z < turnos.length; z++) {
                    let arrayPrestaciones = await new sql.Request(connection)
                        .input('idTurnoMongo', sql.VarChar(50), turnos[z]._id)
                        .query('select * from vw_andes_integracion WHERE objectId = @idTurnoMongo');
                    if (arrayPrestaciones.recordset.length > 0) {
                        arrayPrestaciones = arrayPrestaciones.recordset;
                        idConsulta = arrayPrestaciones[0].idConsulta; // ambas prestaciones tienen el mismo id de consulta.
                        idEspecialidad = arrayPrestaciones[0].idEspecialidad;
                        if (idConsulta) {
                            // console.log('idagenda ', agenda.id, 'idespecialidad ', idEspecialidad);
                            if (idEspecialidad === constantes.Especialidades.odontologia) {
                                turnos[z] = await codificaOdontologia(connection, idConsulta, turnos[z], arrayPrestaciones);
                            } else {
                                turnos[z] = await codificacionCie10(connection, idConsulta, turnos[z]);
                            }
                            datosTurno = {
                                idAgenda: agendaCacheada.id, // este es el id de la agenda original de ANDES
                                posTurno: z,
                                posBloque: x,
                                idUsuario: constantes.idUsuarioSips,
                                turno: turnos[z]
                            };
                            await turnoCtrl.updateTurnoAgendaMongo(datosTurno);
                            await turnoCtrl.updateTurnoAgendaCache(datosTurno, agendaCacheada);
                        }
                    }
                }
            }

            // Caso especial sobreturnos
            // TODO: refactorizar codigo repetido.
            if (agendaCacheada.sobreturnos) {
                sobreturnos = agendaCacheada.sobreturnos;
                for (let z = 0; z < agendaCacheada.sobreturnos.length; z++) {
                    let arrayPrestaciones = await new sql.Request(connection)
                        .input('idTurnoMongo', sql.VarChar(50), sobreturnos[z]._id)
                        .query('select * from vw_andes_integracion WHERE objectId = @idTurnoMongo');

                    if (arrayPrestaciones.recordset.length > 0) {
                        arrayPrestaciones = arrayPrestaciones.recordset;
                        idConsulta = arrayPrestaciones[0].idConsulta; // ambas prestaciones tienen el mismo id de consulta y especialidad
                        idEspecialidad = arrayPrestaciones[0].idEspecialidad;
                        if (idConsulta) {
                            if (idEspecialidad === constantes.Especialidades.odontologia) {
                                agendaCacheada.sobreturnos[z] = await codificaOdontologia(connection, idConsulta, agendaCacheada.sobreturnos[z], arrayPrestaciones);
                            } else {
                                agendaCacheada.sobreturnos[z] = await codificacionCie10(connection, idConsulta, agendaCacheada.sobreturnos[z]);
                            }
                            datosTurno = {
                                idAgenda: agendaCacheada.id, // este es el id de la agenda original de ANDES
                                posTurno: z,
                                posBloque: -1,
                                idUsuario: constantes.idUsuarioSips,
                                turno: agendaCacheada.sobreturnos[z]
                            };
                            await turnoCtrl.updateTurnoAgendaMongo(datosTurno);
                            await turnoCtrl.updateTurnoAgendaCache(datosTurno, agendaCacheada);
                        }
                    }
                }
            }
        }

        const estadoAgendaSips: any = await getEstadoAgenda(connection, agendaCacheada.id);
        if (estadoAgendaSips === 4 || agendaCacheada.estado === 'auditada') {  // estado cerrada en sips o agenda en estado auditada
            await markAgendaAsProcessed(agendaCacheada);
        }
        return (agendaCacheada);
    } catch (ex) {
        return (ex);
    }
}

// [REVISAR] variable _idConsulta no se usa
async function codificaOdontologia(connection, _idConsulta: any, turno: any, prestaciones) {
    let codificacionOdonto: any = {};
    let repetido = [];
    try {
        /*
        cantidad:1
        caraD:false
        caraL:false
        caraM:false
        caraO:true
        caraP:false
        caraV:false
        diente:22
        idConsulta:1153795
        idConsultaOdontologia:280775
        idNomenclador:23
        */
        for (const prestacion of prestaciones) {
            repetido = [];
            let caras = '';
            let diente = '';
            if (prestacion.caraD) { caras = caras + 'caraD '; }
            if (prestacion.caraL) { caras = caras + 'caraL '; }
            if (prestacion.caraM) { caras = caras + 'caraM '; }
            if (prestacion.caraO) { caras = caras + 'caraO '; }
            if (prestacion.caraP) { caras = caras + 'caraP '; }
            if (prestacion.caraV) { caras = caras + 'caraV '; }
            diente = prestacion.diente.toString();
            codificacionOdonto = await getCodificacionOdonto(connection, prestacion.idNomenclador);
            /*
            cantidad:1
            caraD:false
            caraL:false
            caraM:false
            caraO:true
            caraP:false
            caraV:false
            diente:22
            idConsulta:1153795
            idConsultaOdontologia:280775
            idNomenclador:23
            piezaDental:true
             */
            turno.asistencia = 'asistio';
            turno.diagnostico.ilegible = false;
            if (diente && caras === '') {
                repetido = turno.diagnostico.codificaciones.filter(elem =>
                    elem.codificacionAuditoria && elem.codificacionAuditoria.codigo === codificacionOdonto.codigo
                    && elem.codificacionAuditoria.causa && elem.codificacionAuditoria.causa === diente);
            }
            if (diente && caras !== '') {
                repetido = turno.diagnostico.codificaciones.filter(elem =>
                    elem.codificacionAuditoria
                    && elem.codificacionAuditoria.codigo === codificacionOdonto.codigo
                    && elem.codificacionAuditoria.causa && elem.codificacionAuditoria.causa === diente
                    && elem.codificacionAuditoria.subcausa && elem.codificacionAuditoria.subcausa === caras);
            }
            if (!diente) {
                repetido = turno.diagnostico.codificaciones.filter(elem =>
                    elem.codificacionAuditoria && elem.codificacionAuditoria.codigo === codificacionOdonto.codigo);
            }
            if (repetido.length === 0) {
                turno.diagnostico.codificaciones.push({
                    codificacionAuditoria: {
                        causa: diente,
                        subcausa: caras,
                        codigo: codificacionOdonto.codigo,
                        nombre: codificacionOdonto.descripcion,
                        sinonimo: codificacionOdonto.descripcion,
                        c2: false
                    }
                });
            }
        }
    } catch (ex) {
        return (ex);
    }
    return (turno);
}


async function codificacionCie10(connection, idConsulta: any, turno: any) {

    let codCie10: any = [];
    let codificaCie10: any = {};
    try {
        codCie10 = await getConsultaDiagnostico(connection, idConsulta);
        turno.diagnostico.codificaciones = [];
        for (let i = 0; i < codCie10.length; i++) {
            codificaCie10 = await getCodificacionCie10(connection, codCie10[i].CODCIE10);
            turno.asistencia = 'asistio';
            turno.diagnostico.ilegible = false;
            if (codCie10[i].PRINCIPAL === true) {
                if (codificaCie10 && codificaCie10[0]) {
                    turno.diagnostico.codificaciones.unshift({ // El diagnostico principal se inserta al comienzo del arrays
                        codificacionAuditoria: {
                            causa: codificaCie10[0].CAUSA,
                            subcausa: codificaCie10[0].SUBCAUSA,
                            codigo: codificaCie10[0].CODIGO,
                            nombre: codificaCie10[0].Nombre,
                            sinonimo: codificaCie10[0].Sinonimo,
                            c2: codificaCie10[0].C2
                            // TODO: campo primeraVez -> verificar en SIPS
                        }
                    });
                }
            } else {
                if (codificaCie10 && codificaCie10[0]) {
                    turno.diagnostico.codificaciones.push({
                        codificacionAuditoria: {
                            causa: codificaCie10[0].CAUSA,
                            subcausa: codificaCie10[0].SUBCAUSA,
                            codigo: codificaCie10[0].CODIGO,
                            nombre: codificaCie10[0].Nombre,
                            sinonimo: codificaCie10[0].Sinonimo,
                            c2: codificaCie10[0].C2
                        }
                    });
                }
            }
        }
    } catch (ex) {
        return (ex);
    }
    return (turno);
}


// Fin de sección de operaciones sobre mongoDB
// Sección de operaciones sobre SIPS

/**
 * Verifica que exista el consultorio en sips || crea el consultorio en sips
 *
 * @param {any} agenda
 * @param {any} idEfector
 * @returns
 */
async function existeConsultorio(connection, agenda, idEfector) {
    let idConsultorio;
    let espacioFisicoObjectId = null;
    if (agenda.espacioFisico) {
        espacioFisicoObjectId = agenda.espacioFisico._id;
    } else {
        /*La agenda viene sin espacio físico, así que se lo agrego para poder verlo en SIPS*/
        espacioFisicoObjectId = 'andesCitas2017';
    }
    try {
        const result = await new sql.Request(connection)
            .input('objectId', sql.VarChar(50), espacioFisicoObjectId)
            .query('SELECT top 1 idConsultorio FROM dbo.CON_Consultorio WHERE objectId = @objectId');
        if (result && result.recordset && result.recordset.length) {
            return result.recordset[0].idConsultorio;
        } else {
            idConsultorio = await creaConsultorioSips(connection, agenda, idEfector);
            return (idConsultorio);
        }

    } catch (err) {
        debug('existe consultorio:', err);
        return (err);
    }
}

async function creaConsultorioSips(connection, agenda: any, idEfector: any) {
    agenda.espacioFisico = {
        nombre: 'Sin Espacio Físico',
        _id: 'andesCitas2017'
    };
    const idConsultorioTipo = await executeQuery(connection, 'INSERT INTO dbo.CON_ConsultorioTipo ' + ' ( idEfector, nombre, objectId ) VALUES  ( ' +
        idEfector + ',' + '\'' + agenda.espacioFisico.nombre + '\',' + '\'' + agenda.espacioFisico._id + '\' )');

    const result = await executeQuery(connection, ' INSERT INTO dbo.CON_Consultorio ' + ' ( idEfector , idTipoConsultorio ,  nombre , Activo, objectId ) VALUES ( ' +
        idEfector + ',' + idConsultorioTipo + ',' + '\'' + agenda.espacioFisico.nombre + '\', ' + ' 1 ,' + '\'' + agenda.espacioFisico._id + '\' )');
    return result;
}

async function getCodificacionCie10(connection, codcie10) {
    try {
        const result = await new sql.Request(connection)
            .input('codcie10', sql.Int, codcie10)
            .query('SELECT * FROM dbo.Sys_CIE10 WHERE id = @codcie10');
        return result.recordset;
    } catch (err) {
        return (err);
    }
}

async function markAgendaAsProcessed(agenda, error = null) {
    const estados = constantes.EstadoExportacionAgendaCache;
    let estadoIntegracion;
    if (error) {
        // O no tiene efector o no tiene asociado un profesional
        estadoIntegracion = estados.error;
    } else {
        switch (agenda.estadoIntegracion) {
            case estados.pendiente:
                estadoIntegracion = constantes.EstadoExportacionAgendaCache.exportada;
                break;
            case estados.exportada:
                estadoIntegracion = constantes.EstadoExportacionAgendaCache.codificada;
                break;
            default:
                estadoIntegracion = constantes.EstadoExportacionAgendaCache.codificada;
        }
    }
    try {
        return agendasCache.update({ _id: agenda._id }, {
            $set: {
                estadoIntegracion
            }
        });
    } catch (err) {
        return err;
    }
}

async function getConsultaDiagnostico(connection, idConsulta) {
    try {
        const result = await new sql.Request(connection)
            .input('idConsulta', sql.Int, idConsulta)
            .query('SELECT CODCIE10, PRINCIPAL FROM dbo.CON_ConsultaDiagnostico WHERE idConsulta = @idConsulta');
        return result.recordset;
    } catch (err) {
        return (err);
    }
}
/* [REVISAR]
async function getConsultaOdontologia(connection, idConsulta) {
    try {
        let result = await new sql.Request(connection)
            .input('idConsulta', sql.Int, idConsulta)
            .query('SELECT * FROM dbo.CON_ConsultaOdontologia WHERE idConsulta = @idConsulta');
        return result.recordset;
    } catch (err) {
        return (err);
    }
}
*/

async function getCodificacionOdonto(connection, idNomenclador) {
    try {
        const result = await new sql.Request(connection)
            .input('idNomenclador', sql.Int, idNomenclador)
            .query('SELECT * FROM dbo.ODO_Nomenclador WHERE idNomenclador = @idNomenclador');
        return (result.recordset[0]);
    } catch (err) {
        return (err);
    }
}
/**
 * Guarda la agenda en SIPS
 * @param agendasMongo
 * @param index
 * @param pool
 */
export async function guardarCacheASips(agenda) {

    // CON_Agenda de SIPS soporta solo un profesional NOT NULL.
    // En caso de ser nulo el paciente en agenda de ANDES, por defector
    // graba dni '0', correspondiente a 'Sin especifiar', efector SSS.
    const dniProfesional = (agenda.profesionales && agenda.profesionales[0] && agenda.profesionales[0].documento) ? agenda.profesionales[0].documento : '0';
    const codigoSisa = agenda.organizacion.codigo.sisa;
    const datosSips = {
        idEfector: '',
        idProfesional: ''
    };
    let connection;
    try {
        connection = await new sql.ConnectionPool(config).connect();

        const resultEfector: any = await new sql.Request(connection)
            .input('codigoSisa', sql.VarChar(50), codigoSisa)
            .query('select idEfector from dbo.Sys_Efector WHERE codigoSisa = @codigoSisa');
        if (resultEfector.recordset[0] && resultEfector.recordset[0].idEfector) {
            datosSips.idEfector = resultEfector.recordset[0].idEfector;
        }
        debug('1 - efector', resultEfector);

        const resultProfesional = await new sql.Request(connection)
            .input('dniProfesional', sql.Int, dniProfesional)
            .query('SELECT idProfesional FROM dbo.Sys_Profesional WHERE numeroDocumento = @dniProfesional and activo = 1');
        debug('2 - Profesinoal', resultProfesional);
        if (resultProfesional.recordset[0] && resultProfesional.recordset[0].idProfesional) {
            datosSips.idProfesional = resultProfesional.recordset[0].idProfesional;
        }

        if (datosSips.idProfesional && datosSips.idEfector) {
            const idAgenda = await processAgenda(connection, agenda, datosSips);
            debug('Cual es el id de agenda?: ', idAgenda);
            if (typeof idAgenda === 'number') { // Controlamos el idAgenda por si la fun processAgenda() da timeout
                try {
                    debug('Antes de procesar los turnos');
                    await turnoOps.processTurnos(agenda, idAgenda, datosSips.idEfector, connection);
                    await checkEstadoAgenda(connection, agenda, idAgenda);
                    await turnoOps.checkEstadoTurno(agenda, idAgenda, connection);
                    await turnoOps.checkAsistenciaTurno(agenda, connection);
                    await markAgendaAsProcessed(agenda);

                    connection.close();
                    debug('Cierro conexión');

                } catch (error) {
                    debug('ERROR guardarCacheASips', error);
                    logger.LoggerAgendaCache.logAgenda(agenda._id, error);
                    // connection.close();
                    debug('Cierro conexión');

                    if (error === 'Error grabaTurnoSips') {
                        debug('Procesando agenda con error');
                    }
                    return (error);
                }
            } else {
                debug('TIMEOUT PROCESS AGENDA, cerramos conexión');
                // connection.close();
            }
        } else {
            debug('Profesional inexistente en SIPS, agenda no copiada');
            await markAgendaAsProcessed(agenda, true);
            connection.close();
        }
    } catch (error) {
        debug('Error GuardaCacheSIPS ', error);
        if (connection) {
            connection.close();
            connection = null;
        }
        logger.LoggerAgendaCache.logAgenda(agenda._id, error);
        return (error);
    }
}

async function processAgenda(connection, agenda: any, datosSips) {
    try {
        let result = null;
        let idAgenda;
        //  Verifica si existe la agenda pasada por parámetro en SIPS
        if (agenda) {
            result = await new sql.Request(connection)
                .input('idAgendaMongo', sql.VarChar(50), agenda.id)
                .query('SELECT * FROM dbo.CON_Agenda WHERE objectId = @idAgendaMongo');
        }
        if (result && result.recordset && result.recordset.length > 0) {
            // aca debemos actualizar la agenda en sips
            const agendaSips = result.recordset[0];
            await updateAgendaSips(connection, agendaSips, datosSips);
            idAgenda = agendaSips.idAgenda;
        } else {
            idAgenda = await grabaAgendaSips(connection, agenda, datosSips);
        }
        debug('3- return idAgenda');
        return (idAgenda);
    } catch (err) {
        debug('ERROR PROCESSAGENDA', err);
        logger.LoggerAgendaCache.logAgenda(agenda._id, err);
        return err;
    }
}

/**
 * Sincroniza el estado de la agenda monga con su gemela en SIPS
 *
 * @param {*} agendaMongo
 * @param {*} idAgendaSips
 * @returns
 */
async function checkEstadoAgenda(connection, agendaMongo: any, idAgendaSips: any) {
    debug('5 - inicio');
    const estadoAgendaSips: any = await getEstadoAgenda(connection, agendaMongo.id);
    const estadoAgendaMongo = getEstadoAgendaSips(agendaMongo.estado);

    if ((estadoAgendaSips !== estadoAgendaMongo) && (agendaMongo.estado === 'suspendida')) {

        const query = 'UPDATE dbo.CON_Agenda SET idAgendaEstado = ' + estadoAgendaMongo + '   WHERE idAgenda = ' + idAgendaSips;
        const res = await executeQuery(connection, query);
        debug('5 - Update estado agenda', res);
    }
    debug('5 - fin');
}

async function getEstadoAgenda(connection, idAgenda: any) {
    const query = 'SELECT idAgendaEstado as idEstado FROM dbo.CON_Agenda WHERE objectId = @idAgenda';
    const result = await new sql.Request(connection)
        .input('idAgenda', sql.VarChar(50), idAgenda)
        .query(query);
    if (result && result.recordset && result.recordset.length > 0) {
        return (result.recordset[0].idEstado);
    } else {
        return '';
    }
}

/*
[REVISAR]
async function existeConsultaTurno(connection, idTurno) {
    try {
        let result = await new sql.Request(connection)
            .input('idTurno', sql.Int, idTurno)
            .query('SELECT idConsulta FROM dbo.CON_Consulta WHERE idTurno = @idTurno');

        if (result.recordset.length > 0) {
            return (result.recordset[0].idConsulta);
        } else {
            return (false);
        }
    } catch (err) {
        debug('existeCOnsultTurno------------___>', err);
        return (err);
    }
}
*/

// Set de funciones locales no publicas
/**
 * Consulta Sql para obtener idEfector y idProfesional, devuelve un array de 2 promises
 *
 * @param {any} [codigoSisa]
 * @param {any} [dniProfesional]
 * @returns
 */
/* [REVISAR]
function getDatosSips(connection, codigoSisa, dniProfesional) {
    let result1 = new sql.Request(connection)
        .input('codigoSisa', sql.VarChar(50), codigoSisa)
        .query('select idEfector from dbo.Sys_Efector WHERE codigoSisa = @codigoSisa');

    let result2 = new sql.Request(connection)
        .input('dniProfesional', sql.Int, dniProfesional)
        .query('SELECT idProfesional FROM dbo.Sys_Profesional WHERE numeroDocumento = @dniProfesional and activo = 1');

    return ([result1, result2]); // devuelvo un arreglo de promesas para que se ejecuten en paralelo y las capturo con un promise.all
}
*/

/**
 * Realiza la actualización de una agenda en sips
 */
async function updateAgendaSips(connection, agenda, datosSips: any) {
    const idProfesional = datosSips.idProfesional;

    const queryAgenda = 'update Con_Agenda set idProfesional = ' + datosSips.idProfesional + ' where idAgenda = ' + agenda.idAgenda;
    debug('Actualizamos el profesional en la agenda OK');
    await executeQuery(connection, queryAgenda);

    const agendaProfesional = await new sql.Request(connection)
        .input('idAgenda', sql.Int, agenda.idAgenda)
        .query('SELECT idAgendaProfesional FROM CON_AgendaProfesional where idAgenda = @idAgenda');
    debug('Buscamos en agenda profesional si existe el registro: ');

    if (agendaProfesional && agendaProfesional.recordset && agendaProfesional.recordset.length > 0) {
        const idAP = agendaProfesional.recordset[0].idAgendaProfesional;
        const queryAgendaProfesional = 'update CON_AgendaProfesional set idProfesional = ' + datosSips.idProfesional + ' where idAgendaProfesional = ' + idAP;
        debug('Actualizamos el profesional en la con_agendaProfesional OK', idAP);
        await executeQuery(connection, queryAgendaProfesional);
    } else {
        const insertProfesional = 'INSERT INTO dbo.CON_AgendaProfesional ( idAgenda, idProfesional, baja, CreatedBy , ' +
            ' CreatedOn, ModifiedBy, ModifiedOn, idEspecialidad ) VALUES  ( ' + agenda.idAgenda + ',' +
            idProfesional + ',' + 0 + ',' + constantes.idUsuarioSips + ',' +
            '\'' + moment().format('YYYYMMDD HH:mm:ss') + '\', ' +
            '\'' + moment().format('YYYYMMDD HH:mm:ss') + '\', ' +
            '\'' + moment().format('YYYYMMDD HH:mm:ss') + '\', ' +
            agenda.idEspecialidad + ' ) ';
        debug('Inserta el profesional en la tabla de con_agendaProfesional: ', insertProfesional);
        await executeQuery(connection, insertProfesional);
    }

}

async function grabaAgendaSips(connection, agendaSips: any, datosSips: any) {
    const objectId = agendaSips.id.toString();
    const estado = getEstadoAgendaSips(agendaSips.estado);
    const fecha = moment(agendaSips.horaInicio).format('YYYYMMDD');
    const horaInicio = moment(agendaSips.horaInicio).utcOffset('-03:00').format('HH:mm');
    const horaFin = moment(agendaSips.horaFin).utcOffset('-03:00').format('HH:mm');
    const duracionTurno = agendaSips.bloques[0].duracionTurno <= 0 ? 20 : agendaSips.bloques[0].duracionTurno;

    const maximoSobreTurnos = 100;
    const porcentajeTurnosDia = 0;
    const porcentajeTurnosAnticipados = 0;
    const citarPorBloques = 0;
    const cantidadInterconsulta = 0;
    const turnosDisponibles = 1;
    const idMotivoInactivacion = 0;
    let multiprofesional = 0;

    try {

        if (agendaSips.profesionales && agendaSips.profesionales.length > 1) {
            multiprofesional = 1;
        } else {
            multiprofesional = 0;
        }

        const idEfector = datosSips.idEfector;
        const idProfesional = datosSips.idProfesional;
        // let idEspecialidad = (agendaSips.tipoPrestaciones[0].term.includes('odonto')) ? 34 : 14; /*IdEspecialidad 34 = odontologia en SIPS*/
        const idEspecialidad = await getEspecialidad(agendaSips, agendaSips.tipoPrestaciones[0].conceptId, agendaSips.organizacion._id);
        const idServicio = 177;
        const idTipoPrestacion = 0;
        const idConsultorio = await existeConsultorio(connection, agendaSips, idEfector);


        // ---> Grabamos la agenda en SIPS
        const query = 'insert into Con_Agenda (idAgendaEstado, idEfector, idServicio, idProfesional, idTipoPrestacion, idEspecialidad, idConsultorio, fecha, duracion, horaInicio, horaFin, maximoSobreTurnos, porcentajeTurnosDia, porcentajeTurnosAnticipados, citarPorBloques, cantidadInterconsulta, turnosDisponibles, idMotivoInactivacion, multiprofesional, objectId) ' +
            'values (' + estado + ', ' + idEfector + ', ' + idServicio + ', ' + idProfesional + ', ' + idTipoPrestacion + ', ' + idEspecialidad + ', ' + idConsultorio + ', \'' + fecha + '\', ' + duracionTurno + ', \'' + horaInicio + '\', \'' + horaFin + '\', ' + maximoSobreTurnos + ', ' + porcentajeTurnosDia + ', ' + porcentajeTurnosAnticipados + ', ' + citarPorBloques + ' , ' + cantidadInterconsulta + ', ' + turnosDisponibles + ', ' + idMotivoInactivacion + ', ' + multiprofesional + ', \'' + objectId + '\')';


        const idAgendaCreada = await executeQuery(connection, query);

        // ---> Obtenemos los id's de profesionales(SIPS) para la agenda actual y luego insertamos las "agendasProfesional" correspondientes en SIPS
        if (agendaSips.profesionales) {
            const listaIdProfesionales = await Promise.all(getProfesionales(connection, agendaSips.profesionales));

            if (listaIdProfesionales && listaIdProfesionales[0].recordset && listaIdProfesionales[0].recordset.length > 0) {
                listaIdProfesionales.forEach(async elem => {
                    const query2 = 'INSERT INTO dbo.CON_AgendaProfesional ( idAgenda, idProfesional, baja, CreatedBy , ' +
                        ' CreatedOn, ModifiedBy, ModifiedOn, idEspecialidad ) VALUES  ( ' + idAgendaCreada + ',' +
                        elem.recordset[0].idProfesional + ',' + 0 + ',' + constantes.idUsuarioSips + ',' +
                        '\'' + moment().format('YYYYMMDD HH:mm:ss') + '\', ' +
                        '\'' + moment().format('YYYYMMDD HH:mm:ss') + '\', ' +
                        '\'' + moment().format('YYYYMMDD HH:mm:ss') + '\', ' +
                        idEspecialidad + ' ) ';
                    await executeQuery(connection, query2);
                });
            }
        }

        debug(' 2.5 - return graba agenda : ', idAgendaCreada);
        return (idAgendaCreada);
    } catch (err) {
        debug('grabaAgendaSips ', err);
        return err;
    }
}

function getEstadoAgendaSips(estadoCitas) {
    let estado: any;
    switch (estadoCitas) {
        case 'disponible':
        case 'publicada':
        case 'pausada':
            estado = constantes.EstadoAgendaSips.activa;
            break;
        case 'suspendida':
        case 'borrada':
            estado = constantes.EstadoAgendaSips.inactiva;
            break;
        case 'codificada':
        case 'pendienteAsistencia':
        case 'pendienteAuditoria':
        case 'auditada':
            estado = constantes.EstadoAgendaSips.cerrada;
            break;
    }
    return estado;
}

/**
 * Busca los id's en SIPS de los profesionales de la agenda y devuelve un array de promises.
 *
 * @param {any} profesionalesMongo
 * @returns
 */
function getProfesionales(connection, profesionalesMongo) {
    if (!profesionalesMongo) {
        return null;
    } else {
        const profesionalesSipsPromise = [];
        profesionalesMongo.map(profMongo => profesionalesSipsPromise.push(arrayIdProfesionales(connection, profMongo)));
        return profesionalesSipsPromise;
    }
}

function arrayIdProfesionales(connection, profMongo) {
    return new sql.Request(connection)
        .input('dniProfesional', sql.Int, profMongo.documento)
        .query('SELECT idProfesional FROM dbo.Sys_Profesional WHERE numeroDocumento = @dniProfesional AND activo = 1');
}

/**
 * @param agenda @description Busca el paciente correspondiente a un turno y agenda pasados por parámetro
 * @param idTurno
 * @returns Promise
 */
/* [REVISAR]
function getPacienteAgenda(agenda, idTurno) {
    return new Promise(function (resolve, reject) {
        let turno;
        agendaSchema.findById(agenda.id, function getAgenda(err, data) {
            if (err) {
                return reject(err);
            }
            if (data) {
                for (let x = 0; x < (data as any).bloques.length; x++) {
                    // Si existe este bloque...
                    if ((data as any).bloques[x] != null) {
                        // Buscamos y asignamos el turno con id que coincida (si no coincide "asigna" null)
                        turno = (data as any).bloques[x].turnos.id(idTurno);
                        // Si encontró el turno dentro de alguno de los bloques, lo devuelve
                        if (turno !== null) {
                            return resolve(turno);
                        }
                    }
                }
            }
            return resolve();
        });
    });
}
*/

async function executeQuery(connection, query: any) {
    try {
        query += ' select SCOPE_IDENTITY() as id';
        const result = await new sql.Request(connection).query(query);
        if (result && result.recordset) {
            return result.recordset[0].id;
        }
    } catch (err) {
        return (err);
    }
}
