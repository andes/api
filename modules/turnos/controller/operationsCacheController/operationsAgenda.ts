// Imports
import * as mongoose from 'mongoose';
import {
    agendasCache
} from '../../../legacy/schemas/agendasCache';
import { tipoPrestacion } from './../../../../core/tm/schemas/tipoPrestacion';
import { configuracionPrestacionModel } from './../../../../core/term/schemas/configuracionPrestaciones';
import * as sql from 'mssql';
import * as moment from 'moment';
import * as pacientes from './../../../../core/mpi/controller/paciente';
import * as constantes from '../../../legacy/schemas/constantes';
import * as logger from './../../../../utils/loggerAgendaSipsCache';
import * as agendaSchema from '../../schemas/agenda';
import * as turnoCtrl from './../turnoCacheController';
import * as turnoOps from './operationsTurno';
import * as pacienteOps from './operationsPaciente';
import * as configPrivate from '../../../../config.private';
import * as dbg from 'debug';

const debug = dbg('integracion');

let transaction;
let poolAgendas;
let config = {
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
    return new Promise<Array<any>>(function (resolve, reject) {
        agendasCache.find({
            estadoIntegracion: constantes.EstadoExportacionAgendaCache.exportadaSIPS
        })
            .exec(function (err, data) {
                if (err) {
                    reject(err);
                }
                resolve(data);
            });
    });
}
/**
 * Obtiene las agendas de mongo que estan pendientes de procesar
 *
 * @export
 * @returns
 */
export function getAgendasDeMongoPendientes() {
    return new Promise<Array<any>>(function (resolve, reject) {
        agendasCache.find({
            estadoIntegracion: constantes.EstadoExportacionAgendaCache.pendiente
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

/**
 * Obtiene el idEspecialidad a partir del tipo de prestacion y la organizacion.
 * Si no existe en la coleccion configuracionPrestacion por defecto se asigna consulta ambulatoria.
 * @export
 * @returns
 */
export function getEspecialidad(agenda, conceptId, organizacion) {
    return new Promise<Array<any>>(function (resolve, reject) {
        let especialidad: any = 14;
        configuracionPrestacionModel.find({
            'tipoPrestacion.conceptId': { $eq: conceptId },
            'organizacionesSips._id': { $eq: agenda.organizacion._id }
        }).exec(function (err, data: any) {
            if (err) {
                reject(err);
            }
            // resolve(data);
            let datos;
            if (data.length > 0) {
                let organizacionesSips = data[0]['organizacionesSips'];
                if (organizacionesSips && organizacionesSips.length > 0) {
                    datos = organizacionesSips.filter((elem) => String(elem._id) === String(agenda.organizacion._id));
                    if (datos && datos.length > 0) {
                        especialidad = datos[0].idEspecialidad;
                    }
                }
            }
            resolve(especialidad);
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
        try {
            poolAgendas = await new sql.ConnectionPool(config).connect();
        } catch (ex) {
            return (ex);
        }
        let turnos;
        let datosTurno = {};
        let idEspecialidad: any;
        let idConsulta;
        for (let x = 0; x < agendaCacheada.bloques.length; x++) {
            turnos = agendaCacheada.bloques[x].turnos;

            for (let z = 0; z < turnos.length; z++) {
                let resultado = await turnoOps.existeTurnoSips(turnos[z], poolAgendas);
                let cloneTurno: any = [];

                if (resultado.recordset.length > 0) {
                    idConsulta = await existeConsultaTurno(resultado.recordset[0].idTurno);
                    let turnoPaciente: any = await getPacienteAgenda(agendaCacheada, turnos[z]._id);
                    // idEspecialidad = (agenda.tipoPrestaciones[0].term.includes('odonto')) ? 34 : 14;
                    idEspecialidad = await getEspecialidad(agendaCacheada, agendaCacheada.tipoPrestaciones[0].conceptId, agendaCacheada.organizacion._id);
                    turnos[z] = turnoPaciente;
                    if (idConsulta) {
                        // console.log('idagenda ', agenda.id, 'idespecialidad ', idEspecialidad);
                        if (idEspecialidad === constantes.Especialidades.odontologia) {
                            turnos[z] = await codificaOdontologia(idConsulta, turnos[z]);
                        } else {
                            turnos[z] = await codificacionCie10(idConsulta, turnos[z]);
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
            for (let z = 0; z < agendaCacheada.sobreturnos.length; z++) {
                let resultado = await turnoOps.existeTurnoSips(agendaCacheada.sobreturnos[z], poolAgendas);

                if (resultado.recordset.length > 0) {
                    idConsulta = await existeConsultaTurno(resultado.recordset[0].idTurno);
                    // idEspecialidad = (agenda.tipoPrestaciones[0].term.includes('odonto')) ? 34 : 14;
                    idEspecialidad = await getEspecialidad(agendaCacheada, agendaCacheada.tipoPrestaciones[0].conceptId, agendaCacheada.organizacion._id);

                    if (idConsulta) {
                        if (idEspecialidad === constantes.Especialidades.odontologia) {
                            agendaCacheada.sobreturnos[z] = await codificaOdontologia(idConsulta, agendaCacheada.sobreturnos[z]);
                        } else {
                            agendaCacheada.sobreturnos[z] = await codificacionCie10(idConsulta, agendaCacheada.sobreturnos[z]);
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
        if (idConsulta) {
            await markAgendaAsProcessed(agendaCacheada);
        }
        return (agendaCacheada);
    } catch (ex) {
        return (ex);
    }
}

async function codificaOdontologia(idConsulta: any, turno: any) {
    let idNomenclador: any = [];
    let codificacionOdonto: any = {};
    let repetido = [];
    try {
        idNomenclador = await getConsultaOdontologia(idConsulta);
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
        let caras = '';
        if (idNomenclador[0].caraD) { caras = caras + 'caraD '; }
        if (idNomenclador[0].caraL) { caras = caras + 'caraL '; }
        if (idNomenclador[0].caraM) { caras = caras + 'caraM '; }
        if (idNomenclador[0].caraO) { caras = caras + 'caraO '; }
        if (idNomenclador[0].caraP) { caras = caras + 'caraP '; }
        if (idNomenclador[0].caraV) { caras = caras + 'caraV '; }
        let diente = idNomenclador[0].diente;
        let m = 0;
        for (let i = 0; i < idNomenclador.length; i++) {
            repetido = [];
            codificacionOdonto = await getCodificacionOdonto(idNomenclador[i].idNomenclador);
            /*
            clasificacion:"Conservadora"
            codigo:"03010"
            descripcion:"TRATAMIENTO CONDUCTO UNIRRADICULAR. CONDUCTO CONVENCIONAL EN PIEZA UNI-RADICULAR PERMANENTE, OBTURADO CON CONOC Y CEMENTO DE GROSSMAN."
            idNomenclador:23
            piezaDental:true
             */
            turno.asistencia = 'asistio';
            turno.diagnostico.ilegible = false;
            if (diente && caras === '') {
                repetido = turno.diagnostico.codificaciones.filter(elem =>
                    elem.codificacionProfesional
                    && elem.codificacionProfesional.codigo === codificacionOdonto.codigo
                    && elem.causa && elem.causa === diente);
            }
            if (diente && caras !== '') {
                repetido = turno.diagnostico.codificaciones.filter(elem =>
                    elem.codificacionProfesional
                    && elem.codificacionProfesional.codigo === codificacionOdonto.codigo
                    && elem.causa && elem.causa === diente
                    && elem.subcausa && elem.subcausa === caras);
            }
            if (!diente) {
                repetido = turno.diagnostico.codificaciones.filter(elem =>
                    elem.codificacionProfesional
                    && elem.codificacionProfesional.codigo === codificacionOdonto.codigo);
            }
            if (repetido && repetido.length <= 0) {
                turno.diagnostico.codificaciones.push({
                    codificacionProfesional: {
                        cie10: {
                            causa: diente,
                            subcausa: caras,
                            codigo: codificacionOdonto.codigo,
                            nombre: codificacionOdonto.descripcion,
                            sinonimo: codificacionOdonto.descripcion,
                            c2: false
                        }
                    }
                });
            }
        }
    } catch (ex) {
        return (ex);
    }
    return (turno);
}

async function codificacionCie10(idConsulta: any, turno: any) {

    let codCie10: any = [];
    let codificaCie10: any = {};
    try {
        codCie10 = await getConsultaDiagnostico(idConsulta);
        let diagnosticos = [];
        turno.diagnostico.codificaciones = [];
        for (let i = 0; i < codCie10.length; i++) {
            codificaCie10 = await getCodificacionCie10(codCie10[i].CODCIE10);
            turno.asistencia = 'asistio';
            turno.diagnostico.ilegible = false;
            if (codCie10[i].PRINCIPAL === true) {
                if (codificaCie10 && codificaCie10[0]) {
                    turno.diagnostico.codificaciones.unshift({ // El diagnostico principal se inserta al comienzo del arrays
                        codificacionProfesional: {
                            cie10: {
                                causa: codificaCie10[0].CAUSA,
                                subcausa: codificaCie10[0].SUBCAUSA,
                                codigo: codificaCie10[0].CODIGO,
                                nombre: codificaCie10[0].Nombre,
                                sinonimo: codificaCie10[0].Sinonimo,
                                c2: codificaCie10[0].C2
                                // TODO: campo primeraVez -> verificar en SIPS
                            }
                        }
                    });
                }
            } else {
                if (codificaCie10 && codificaCie10[0]) {
                    turno.diagnostico.codificaciones.push({
                        codificacionProfesional: {
                            cie10: {
                                causa: codificaCie10[0].CAUSA,
                                subcausa: codificaCie10[0].SUBCAUSA,
                                codigo: codificaCie10[0].CODIGO,
                                nombre: codificaCie10[0].Nombre,
                                sinonimo: codificaCie10[0].Sinonimo,
                                c2: codificaCie10[0].C2
                            }
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
async function existeConsultorio(agenda, idEfector) {
    let idConsultorio;
    let espacioFisicoObjectId = null;
    if (agenda.espacioFisico) {
        espacioFisicoObjectId = agenda.espacioFisico._id;
    } else {
        /*La agenda viene sin espacio físico, así que se lo agrego para poder verlo en SIPS*/
        espacioFisicoObjectId = 'andesCitas2017';
    }
    try {
        let result = await new sql.Request(poolAgendas)
            .input('objectId', sql.VarChar(50), espacioFisicoObjectId)
            .query('SELECT top 1 idConsultorio FROM dbo.CON_Consultorio WHERE objectId = @objectId');
        if (result && result.recordset && result.recordset.length) {
            return result.recordset[0].idConsultorio;
        } else {
            idConsultorio = await creaConsultorioSips(agenda, idEfector);
            return (idConsultorio);
        }

    } catch (err) {
        debug('existe consultorio:', err);
        return (err);
    }
}

async function creaConsultorioSips(agenda: any, idEfector: any) {
    agenda.espacioFisico = {
        nombre: 'Sin Espacio Físico',
        _id: 'andesCitas2017'
    };
    let idConsultorioTipo = await executeQuery('INSERT INTO dbo.CON_ConsultorioTipo ' + ' ( idEfector, nombre, objectId ) VALUES  ( ' +
        idEfector + ',' + '\'' + agenda.espacioFisico.nombre + '\',' + '\'' + agenda.espacioFisico._id + '\' )');

    let result = await executeQuery(' INSERT INTO dbo.CON_Consultorio ' + ' ( idEfector , idTipoConsultorio ,  nombre , Activo, objectId ) VALUES ( ' +
        idEfector + ',' + idConsultorioTipo + ',' + '\'' + agenda.espacioFisico.nombre + '\', ' + ' 1 ,' + '\'' + agenda.espacioFisico._id + '\' )');
    return result;
}

async function getCodificacionCie10(codcie10) {
    try {
        let result = await new sql.Request(poolAgendas)
            .input('codcie10', sql.Int, codcie10)
            .query('SELECT * FROM dbo.Sys_CIE10 WHERE id = @codcie10');
        return result.recordset;
    } catch (err) {
        return (err);
    }
}

async function markAgendaAsProcessed(agenda) {
    let estadoIntegracion;
    switch (agenda.estadoIntegracion) {
        case 'pendiente':
            estadoIntegracion = constantes.EstadoExportacionAgendaCache.exportadaSIPS;
            break;
        case 'exportada a Sips':
            estadoIntegracion = constantes.EstadoExportacionAgendaCache.codificada;
            break;
        default:
            estadoIntegracion = constantes.EstadoExportacionAgendaCache.codificada;
    }
    try {
        return agendasCache.update({
            _id: agenda._id
        }, {
                $set: {
                    estadoIntegracion: estadoIntegracion
                }
            }, function (err, raw) {
                if (err) {
                    return (err);
                }
                return (raw);
            });
    } catch (err) {
        return err;
    }
}

async function getConsultaDiagnostico(idConsulta) {
    try {
        let result = await new sql.Request(poolAgendas)
            .input('idConsulta', sql.Int, idConsulta)
            .query('SELECT CODCIE10, PRINCIPAL FROM dbo.CON_ConsultaDiagnostico WHERE idConsulta = @idConsulta');
        return result.recordset;
    } catch (err) {
        return (err);
    }
}

async function getConsultaOdontologia(idConsulta) {
    try {
        let result = await new sql.Request(poolAgendas)
            .input('idConsulta', sql.Int, idConsulta)
            .query('SELECT * FROM dbo.CON_ConsultaOdontologia WHERE idConsulta = @idConsulta');
        return result.recordset;
    } catch (err) {
        return (err);
    }
}

async function getCodificacionOdonto(idNomenclador) {
    try {
        let result = await new sql.Request(poolAgendas)
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
export async function
    guardarCacheASips(agenda) {

    // CON_Agenda de SIPS soporta solo un profesional NOT NULL.
    // En caso de ser nulo el paciente en agenda de ANDES, por defector
    // graba dni '0', correspondiente a 'Sin especifiar', efector SSS.
    let dniProfesional = agenda.profesionales ? agenda.profesionales[0].documento : '0';
    let codigoSisa = agenda.organizacion.codigo.sisa;
    let datosSips = {
        idEfector: '',
        idProfesional: ''
    };
    try {
        poolAgendas = await new sql.ConnectionPool(config).connect();

        sql.on('error', err => {
            // ... error handler
            debug('error SQL', err);
        });
        let result: any = await new sql.Request(poolAgendas)
            .input('codigoSisa', sql.VarChar(50), codigoSisa)
            .query('select idEfector from dbo.Sys_Efector WHERE codigoSisa = @codigoSisa');
        if (result.recordset[0] && result.recordset[0].idEfector) {
            datosSips.idEfector = result.recordset[0].idEfector;
        }
        debug('1 - result', result);
        let result2 = await new sql.Request(poolAgendas)
            .input('dniProfesional', sql.Int, dniProfesional)
            .query('SELECT idProfesional FROM dbo.Sys_Profesional WHERE numeroDocumento = @dniProfesional and activo = 1');
        debug('2 - result2', result2);
        if (result2.recordset[0] && result2.recordset[0].idProfesional) {
            datosSips.idProfesional = result2.recordset[0].idProfesional;
            let idAgenda = await processAgenda(agenda, datosSips);
            if (typeof idAgenda === 'number') { // Controlamos el idAgenda por si la fun processAgenda() da timeout
                try {
                    await turnoOps.processTurnos(agenda, idAgenda, datosSips.idEfector, poolAgendas);
                    await checkEstadoAgenda(agenda, idAgenda);
                    await turnoOps.checkEstadoTurno(agenda, idAgenda, poolAgendas);
                    await turnoOps.checkAsistenciaTurno(agenda, poolAgendas);
                    markAgendaAsProcessed(agenda);
                } catch (error) {
                    /** Handleamos errores acá para poder rollbackear la transacción si pincha en algún punto**/
                    debug('----------------------------> ERROR guardarCacheASips', error);
                    logger.LoggerAgendaCache.logAgenda(agenda._id, error);
                    if (error === 'Error grabaTurnoSips') {
                        debug('Procesando agenda con error');
                    }
                    return (error);
                }
            } else {
                debug('TIMEOUT PROCESS AGENDA', idAgenda);
            }
        } else {
            debug('Profesional inexistente en SIPS, agenda no copiada');
            markAgendaAsProcessed(agenda);
        }
    } catch (error) {
        debug('Error GuardaCacheSIPS ', error);
        logger.LoggerAgendaCache.logAgenda(agenda._id, error);
        return (error);
    }
}

async function processAgenda(agenda: any, datosSips) {
    try {
        let result = null;
        let idAgenda;
        //  Verifica si existe la agenda pasada por parámetro en SIPS
        if (agenda) {
            result = await new sql.Request(poolAgendas)
                .input('idAgendaMongo', sql.VarChar(50), agenda.id)
                .query('SELECT idAgenda FROM dbo.CON_Agenda WHERE objectId = @idAgendaMongo GROUP BY idAgenda');
        }
        if (result && result.recordset && result.recordset.length > 0) {
            idAgenda = result.recordset[0].idAgenda;
        } else {
            idAgenda = await grabaAgendaSips(agenda, datosSips, poolAgendas);
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
async function checkEstadoAgenda(agendaMongo: any, idAgendaSips: any) {
    debug('5 - inicio');
    let estadoAgendaSips: any = await getEstadoAgenda(agendaMongo.id);
    let estadoAgendaMongo = getEstadoAgendaSips(agendaMongo.estado);

    if ((estadoAgendaSips !== estadoAgendaMongo) && (agendaMongo.estado === 'suspendida')) {

        let query = 'UPDATE dbo.CON_Agenda SET idAgendaEstado = ' + estadoAgendaMongo + '   WHERE idAgenda = ' + idAgendaSips;
        let res = await executeQuery(query);
        debug('5 - Update estado agenda', res);
    }
    debug('5 - fin');
}

async function getEstadoAgenda(idAgenda: any) {
    let query = 'SELECT idAgendaEstado as idEstado FROM dbo.CON_Agenda WHERE objectId = @idAgenda';
    let result = await new sql.Request(poolAgendas)
        .input('idAgenda', sql.VarChar(50), idAgenda)
        .query(query);
    if (result && result.recordset && result.recordset.length > 0) {
        return (result.recordset[0].idEstado);
    } else {
        return '';
    }
}

async function existeConsultaTurno(idTurno) {
    try {
        let result = await new sql.Request(poolAgendas)
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

// Set de funciones locales no publicas
/**
 * Consulta Sql para obtener idEfector y idProfesional, devuelve un array de 2 promises
 *
 * @param {any} [codigoSisa]
 * @param {any} [dniProfesional]
 * @returns
 */
function getDatosSips(codigoSisa, dniProfesional) {
    let result1 = new sql.Request(poolAgendas)
        .input('codigoSisa', sql.VarChar(50), codigoSisa)
        .query('select idEfector from dbo.Sys_Efector WHERE codigoSisa = @codigoSisa');

    let result2 = new sql.Request(poolAgendas)
        .input('dniProfesional', sql.Int, dniProfesional)
        .query('SELECT idProfesional FROM dbo.Sys_Profesional WHERE numeroDocumento = @dniProfesional and activo = 1');

    return ([result1, result2]); // devuelvo un arreglo de promesas para que se ejecuten en paralelo y las capturo con un promise.all
}


async function grabaAgendaSips(agendaSips: any, datosSips: any, tr) {
    let transactoin = tr;

    let objectId = agendaSips.id.toString();
    let estado = getEstadoAgendaSips(agendaSips.estado);
    let fecha = moment(agendaSips.horaInicio).format('YYYYMMDD');
    let horaInicio = moment(agendaSips.horaInicio).utcOffset('-03:00').format('HH:mm');
    let horaFin = moment(agendaSips.horaFin).utcOffset('-03:00').format('HH:mm');
    let duracionTurno = agendaSips.bloques[0].duracionTurno;

    let maximoSobreTurnos = 100;
    let porcentajeTurnosDia = 0;
    let porcentajeTurnosAnticipados = 0;
    let citarPorBloques = 0;
    let cantidadInterconsulta = 0;
    let turnosDisponibles = 1;
    let idMotivoInactivacion = 0;
    let multiprofesional = 0;

    let dniProfesional = agendaSips.profesionales ? agendaSips.profesionales[0].documento : '0';
    try {

        if (agendaSips.profesionales && agendaSips.profesionales.length > 1) {
            multiprofesional = 1;
        } else {
            multiprofesional = 0;
        }

        let idEfector = datosSips.idEfector;
        let idProfesional = datosSips.idProfesional;
        // let idEspecialidad = (agendaSips.tipoPrestaciones[0].term.includes('odonto')) ? 34 : 14; /*IdEspecialidad 34 = odontologia en SIPS*/
        let idEspecialidad = await getEspecialidad(agendaSips, agendaSips.tipoPrestaciones[0].conceptId, agendaSips.organizacion._id);
        let idServicio = 177;
        let idTipoPrestacion = 0;
        let idConsultorio = await existeConsultorio(agendaSips, idEfector);


        // ---> Grabamos la agenda en SIPS
        let query = 'insert into Con_Agenda (idAgendaEstado, idEfector, idServicio, idProfesional, idTipoPrestacion, idEspecialidad, idConsultorio, fecha, duracion, horaInicio, horaFin, maximoSobreTurnos, porcentajeTurnosDia, porcentajeTurnosAnticipados, citarPorBloques, cantidadInterconsulta, turnosDisponibles, idMotivoInactivacion, multiprofesional, objectId) ' +
            'values (' + estado + ', ' + idEfector + ', ' + idServicio + ', ' + idProfesional + ', ' + idTipoPrestacion + ', ' + idEspecialidad + ', ' + idConsultorio + ', \'' + fecha + '\', ' + duracionTurno + ', \'' + horaInicio + '\', \'' + horaFin + '\', ' + maximoSobreTurnos + ', ' + porcentajeTurnosDia + ', ' + porcentajeTurnosAnticipados + ', ' + citarPorBloques + ' , ' + cantidadInterconsulta + ', ' + turnosDisponibles + ', ' + idMotivoInactivacion + ', ' + multiprofesional + ', \'' + objectId + '\')';


        let idAgendaCreada = await executeQuery(query);

        // ---> Obtenemos los id's de profesionales(SIPS) para la agenda actual y luego insertamos las "agendasProfesional" correspondientes en SIPS
        if (agendaSips.profesionales) {
            let listaIdProfesionales = await Promise.all(getProfesionales(agendaSips.profesionales));

            if (listaIdProfesionales && listaIdProfesionales[0].recordset && listaIdProfesionales[0].recordset.length > 0) {
                let promiseArray = [];
                listaIdProfesionales.forEach(async elem => {
                    let query2 = 'INSERT INTO dbo.CON_AgendaProfesional ( idAgenda, idProfesional, baja, CreatedBy , ' +
                        ' CreatedOn, ModifiedBy, ModifiedOn, idEspecialidad ) VALUES  ( ' + idAgendaCreada + ',' +
                        elem.recordset[0].idProfesional + ',' + 0 + ',' + constantes.idUsuarioSips + ',' +
                        '\'' + moment().format('YYYYMMDD HH:mm:ss') + '\', ' +
                        '\'' + moment().format('YYYYMMDD HH:mm:ss') + '\', ' +
                        '\'' + moment().format('YYYYMMDD HH:mm:ss') + '\', ' +
                        idEspecialidad + ' ) ';
                    await executeQuery(query2);
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
function getProfesionales(profesionalesMongo) {
    if (!profesionalesMongo) { return null; }
    let profesionalesSipsPromise = [];
    profesionalesMongo.map(async profMongo => profesionalesSipsPromise.push(arrayIdProfesionales(profMongo)));
    return profesionalesSipsPromise;
}

function arrayIdProfesionales(profMongo) {
    return new sql.Request(poolAgendas)
        .input('dniProfesional', sql.Int, profMongo.documento)
        .query('SELECT idProfesional FROM dbo.Sys_Profesional WHERE numeroDocumento = @dniProfesional AND activo = 1');
}

/**
 * @param agenda @description Busca el paciente correspondiente a un turno y agenda pasados por parámetro
 * @param idTurno
 * @returns Promise
 */
function getPacienteAgenda(agenda, idTurno) {
    return new Promise(function (resolve, reject) {
        let turno;
        agendaSchema.findById(agenda.id, function getAgenda(err, data) {
            if (err) {
                reject(err);
            }
            if (data) {
                for (let x = 0; x < (data as any).bloques.length; x++) {
                    // Si existe este bloque...
                    if ((data as any).bloques[x] != null) {
                        // Buscamos y asignamos el turno con id que coincida (si no coincide "asigna" null)
                        turno = (data as any).bloques[x].turnos.id(idTurno);
                        // Si encontró el turno dentro de alguno de los bloques, lo devuelve
                        if (turno !== null) {
                            resolve(turno);
                        }
                    }
                }
            }
            resolve();
        });
    });
}

async function executeQuery(query: any) {
    try {
        query += ' select SCOPE_IDENTITY() as id';
        let result = await new sql.Request(poolAgendas).query(query);
        if (result && result.recordset) {
            return result.recordset[0].id;
        }
    } catch (err) {
        return (err);
    }
}
