// Imports
import * as mongoose from 'mongoose';
import {
    agendasCache
} from '../../../legacy/schemas/agendasCache';
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

let transaction;
let config = {
    user: configPrivate.conSql.auth.user,
    password: configPrivate.conSql.auth.password,
    server: configPrivate.conSql.serverSql.server,
    database: configPrivate.conSql.serverSql.database
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
            $or: [{
                estadoIntegracion: constantes.EstadoExportacionAgendaCache.exportadaSIPS
            }, {
                estadoIntegracion: constantes.EstadoExportacionAgendaCache.codificada
            }]
        }).exec(function (err, data) {
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
        }).exec(function (err, data: any) {
            if (err) {
                reject(err);
            }
            resolve(data);
        });
    });
}
/**
 * @description Verifica la existencia de un turno en SIPS, actualiza la codificación del turno y marca la agenda como procesada.
 * @returns Devuelve una Promesa
 * @param agenda
 */
export async function checkCodificacion(agenda) {
    try {
        let defaultPool = await sql.connect(config);
        let turno;
        let datosTurno = {};
        let idEspecialidad: any;

        for (let x = 0; x < agenda.bloques.length; x++) {
            turno = agenda.bloques[x].turnos;

            for (let z = 0; z < turno.length; z++) {
                let resultado = await turnoOps.existeTurnoSips(turno[z]);
                let cloneTurno: any = [];

                if (resultado.length > 0) {
                    let idConsulta = await existeConsultaTurno(resultado[0].idTurno);
                    let turnoPaciente: any = await getPacienteAgenda(agenda, turno[z]._id);
                    idEspecialidad = (agenda.tipoPrestaciones[0].term.includes('odonto')) ? 34 : 14;
                    turno[z] = turnoPaciente;

                    if (idConsulta) {
                        if (idEspecialidad === constantes.Especialidades.odontologia) {
                            turno[z] = await codificaOdontologia(idConsulta, turno[z]);
                        } else {
                            turno[z] = await codificacionCie10(idConsulta, turno[z]);
                        }
                    }
                    datosTurno = {
                        idAgenda: agenda.id,
                        idTurno: turno[z]._id,
                        idBloque: agenda.bloques[x]._id,
                        idUsuario: constantes.idUsuarioSips,
                        turno: turno[z]
                    };

                    turnoCtrl.updateTurno(datosTurno);
                    markAgendaAsProcessed(agenda);
                }
            }
        }
    } catch (ex) {
        console.log('...> error en checkCodificacion', ex);
        return (ex);
    }
}

async function codificaOdontologia(idConsulta: any, turno: any) {
    let idNomenclador: any = [];
    let codificacionOdonto: any = {};
    try {
        idNomenclador = await getConsultaOdontologia(idConsulta);
        let m = 0;
        for (let i = 0; i < idNomenclador.length; i++) {
            codificacionOdonto = await getCodificacionOdonto(idNomenclador[i].idNomenclador);
            if (i === 0) {
                turno.asistencia = 'asistio';
                turno.diagnosticoPrincipal = {
                    ilegible: false,
                    codificacion: {
                        codigo: codificacionOdonto.codigo,
                        nombre: codificacionOdonto.descripcion,
                        sinonimo: codificacionOdonto.descripcion,
                    }
                };
            } else {
                turno.asistencia = 'asistio';
                turno.diagnosticoSecundario[m] = {
                    ilegible: false,
                    codificacion: {
                        codigo: codificacionOdonto.codigo,
                        nombre: codificacionOdonto.descripcion,
                        sinonimo: codificacionOdonto.descripcion,
                    }
                };
                m++;
            }
        }
    } catch (ex) {
        console.log('...> error en checkCodificacion', ex);
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
                turno.diagnostico.codificaciones.unshift({ // El diagnostico principal se inserta al comienzo del arrays
                    codificacionProfesional: {
                        causa: codificaCie10.CAUSA,
                        subcausa: codificaCie10.SUBCAUSA,
                        codigo: codificaCie10.CODIGO,
                        nombre: codificaCie10.Nombre,
                        sinonimo: codificaCie10.Sinonimo,
                        c2: codificaCie10.C2
                        // TODO: campo primeraVez -> verificar en SIPS
                    }
                });
            } else {
                turno.diagnostico.codificaciones.push({
                    codificacionProfesional: {
                        causa: codificaCie10.CAUSA,
                        subcausa: codificaCie10.SUBCAUSA,
                        codigo: codificaCie10.CODIGO,
                        nombre: codificaCie10.Nombre,
                        sinonimo: codificaCie10.Sinonimo,
                        c2: codificaCie10.C2
                    }
                });
            }
        }
    } catch (ex) {
        console.log('...> error en checkCodificacion', ex);
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
        let result = await new sql.Request()
            .input('objectId', sql.VarChar(50), espacioFisicoObjectId)
            .query('SELECT top 1 idConsultorio FROM dbo.CON_Consultorio WHERE objectId = @objectId');

        if (typeof result[0] !== 'undefined') {
            return result[0].idConsultorio;
        } else {
            idConsultorio = creaConsultorioSips(agenda, idEfector);
            return (idConsultorio);
        }

    } catch (err) {
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
        let result = await new sql.Request()
            .input('codcie10', sql.Int, codcie10)
            .query('SELECT * FROM dbo.Sys_CIE10 WHERE id = @codcie10');
        return result;
    } catch (err) {
        return (err);
    }
}

function markAgendaAsProcessed(agenda) {
    let estadoIntegracion;
    switch (agenda.estadoIntegracion) {
        case 'pendiente':
            estadoIntegracion = constantes.EstadoExportacionAgendaCache.exportadaSIPS;
            break;
        case 'exportada a Sips':
        default:
            estadoIntegracion = constantes.EstadoExportacionAgendaCache.codificada;
    }
    agendasCache.update({
        _id: agenda._id
    }, {
            $set: {
                estadoIntegracion: estadoIntegracion
            }
        }).exec();
}

async function getConsultaDiagnostico(idConsulta) {
    try {
        let result = await new sql.Request()
            .input('idConsulta', sql.Int, idConsulta)
            .query('SELECT CODCIE10, PRINCIPAL FROM dbo.CON_ConsultaDiagnostico WHERE idConsulta = @idConsulta');
        return result;
    } catch (err) {
        return (err);
    }
}

async function getConsultaOdontologia(idConsulta) {
    try {
        let result = await new sql.Request()
            .input('idConsulta', sql.Int, idConsulta)
            .query('SELECT idNomenclador FROM dbo.CON_ConsultaOdontologia WHERE idConsulta = @idConsulta');
        return result;
    } catch (err) {
        return (err);
    }
}

function getCodificacionOdonto(idNomenclador) {
    try {
        let result = new sql.Request()
            .input('idNomenclador', sql.Int, idNomenclador)
            .query('SELECT codigo, descripcion FROM dbo.ODO_Nomenclador WHERE idNomenclador = @idNomenclador');
        return (result[0]);
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
    let dniProfesional = agenda.profesionales[0] ? agenda.profesionales[0].documento : '0';
    let codigoSisa = agenda.organizacion.codigo.sisa;
    let datosSips = {
        idEfector: '',
        idProfesional: ''
    };
    let datosArr = await Promise.all(getDatosSips(codigoSisa, dniProfesional));
    datosSips.idEfector = datosArr[0][0].idEfector;
    if (datosArr[1][0]) {
        datosSips.idProfesional = datosArr[1][0].idProfesional;

        let transactionPool = await sql.connect(config);
        transaction = new sql.Transaction(transactionPool);

        transaction.begin(async err => {
            let rolledBack = false;
            transaction.rollback(err2 => {
                console.log('transaction rolled back!!');
                logger.LoggerAgendaCache.logAgenda(agenda._id, err2);

                return err2;
            });
            if (err) {
                logger.LoggerAgendaCache.logAgenda(agenda._id, err);
                transaction.rollback();
                console.log('Error en begin transaction', err);
                return (err);
            }
            transaction.on('rollback', aborted => {
                console.log('transaccion abortada!');
                rolledBack = true;
            });

            try {

                let idAgenda = await processAgenda(agenda, datosSips);
                let promArray = [];
                promArray.push(turnoOps.processTurnos(agenda, idAgenda, datosSips.idEfector, transaction));
                promArray.push(checkEstadoAgenda(agenda, idAgenda));
                promArray.push(turnoOps.checkEstadoTurno(agenda, idAgenda, transaction));
                promArray.push(turnoOps.checkAsistenciaTurno(agenda, transaction));
                await Promise.all(promArray);

                transaction.commit(err2 => {
                    if (err2) {
                        logger.LoggerAgendaCache.logAgenda(agenda._id, err2);
                        transaction.rollback();
                        return (err2);
                    }
                    console.log('Transaction committed.');
                    markAgendaAsProcessed(agenda);
                });
            } catch (error) {
                console.log('-----------------> ERROR en guardarCacheASips ', error);
                return (error);
            }

        });
    } else {
        console.log('Profesional inexistente en SIPS, agenda no copiada');
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
    try {
        let estadoAgendaSips: any = await getEstadoAgenda(agendaMongo.id);
        let estadoAgendaMongo = getEstadoAgendaSips(agendaMongo.estado);

        if ((estadoAgendaSips !== estadoAgendaMongo) && (agendaMongo.estado === 'suspendida')) {
            let query = 'UPDATE dbo.CON_Agenda SET idAgendaEstado = ' + estadoAgendaMongo + '   WHERE idAgenda = ' + idAgendaSips;
            executeQuery(query);
        }
    } catch (ex) {

        return (ex);
    }
}

async function getEstadoAgenda(idAgenda: any) {
    try {
        let query = 'SELECT idAgendaEstado as idEstado FROM dbo.CON_Agenda WHERE objectId = @idAgenda';
        let result = await new sql.Request()
            .input('idAgenda', sql.VarChar(50), idAgenda)
            .query(query);
        return (result[0].idEstado);
    } catch (err) {
        return (err);
    }
}

async function existeConsultaTurno(idTurno) {
    try {
        let result = await new sql.Request()
            .input('idTurno', sql.Int, idTurno)
            .query('SELECT idConsulta FROM dbo.CON_Consulta WHERE idTurno = @idTurno');

        if (result.length > 0) {
            return (result[0].idConsulta);
        } else {
            return (false);
        }
    } catch (err) {
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

    let result1 = new sql.Request()
        .input('codigoSisa', sql.VarChar(50), codigoSisa)
        .query('select idEfector from dbo.Sys_Efector WHERE codigoSisa = @codigoSisa');

    let result2 = new sql.Request()
        .input('dniProfesional', sql.Int, dniProfesional)
        .query('SELECT idProfesional FROM dbo.Sys_Profesional WHERE numeroDocumento = @dniProfesional and activo = 1');

    return ([result1, result2]); // devuelvo un arreglo de promesas para que se ejecuten en paralelo y las capturo con un promise.all
}


async function processAgenda(agenda: any, datosSips) {
    try {
        //  Verifica si existe la agenda pasada por parámetro en SIPS
        let result = await new sql.Request()
            .input('idAgendaMongo', sql.VarChar(50), agenda.id)
            .query('SELECT idAgenda FROM dbo.CON_Agenda WHERE objectId = @idAgendaMongo GROUP BY idAgenda');

        let idAgenda;
        if (result.length > 0) {
            idAgenda = result[0].idAgenda;
        } else {
            idAgenda = await grabaAgendaSips(agenda, datosSips);
        }
        return (idAgenda);
    } catch (err) {
        console.log('-----------------> ERROR en processAgenda ', err);
        return err;
    }
}

async function grabaAgendaSips(agendaSips: any, datosSips: any) {
    let objectId = agendaSips.id;
    let estado = getEstadoAgendaSips(agendaSips.estado);
    let fecha = moment(agendaSips.horaInicio).format('YYYYMMDD');
    let horaInicio = moment(agendaSips.horaInicio).utcOffset('-03:00').format('HH:mm');
    let horaFin = moment(agendaSips.horaFin).utcOffset('-03:00').format('HH:mm');
    let duracionTurno = agendaSips.bloques[0].duracionTurno;

    let maximoSobreTurnos = 0;
    let porcentajeTurnosDia = 0;
    let porcentajeTurnosAnticipados = 0;
    let citarPorBloques = 0;
    let cantidadInterconsulta = 0;
    let turnosDisponibles = 1;
    let idMotivoInactivacion = 0;
    let multiprofesional = 0;

    let dniProfesional = agendaSips.profesionales[0].documento;
    try {

        if (agendaSips.profesionales.length > 1) {
            multiprofesional = 1;
        } else {
            multiprofesional = 0;
        }

        let idEfector = datosSips.idEfector;
        let idProfesional = datosSips.idProfesional;
        let idEspecialidad = (agendaSips.tipoPrestaciones[0].term.includes('odonto')) ? 34 : 14;  /*IdEspecialidad 34 = odontologia en SIPS*/
        let idServicio = 177;
        let idTipoPrestacion = 0;
        let idConsultorio = await existeConsultorio(agendaSips, idEfector);
        // ---> Grabamos la agenda en SIPS
        let query = 'insert into Con_Agenda (idAgendaEstado, idEfector, idServicio, idProfesional, idTipoPrestacion, idEspecialidad, idConsultorio, fecha, duracion, horaInicio, horaFin, maximoSobreTurnos, porcentajeTurnosDia, porcentajeTurnosAnticipados, citarPorBloques, cantidadInterconsulta, turnosDisponibles, idMotivoInactivacion, multiprofesional, objectId) ' +
            'values (' + estado + ', ' + idEfector + ', ' + idServicio + ', ' + idProfesional + ', ' + idTipoPrestacion + ', ' + idEspecialidad + ', ' + idConsultorio + ', \'' + fecha + '\', ' + duracionTurno + ', \'' + horaInicio + '\', \'' + horaFin + '\', ' + maximoSobreTurnos + ', ' + porcentajeTurnosDia + ', ' + porcentajeTurnosAnticipados + ', ' + citarPorBloques + ' , ' + cantidadInterconsulta + ', ' + turnosDisponibles + ', ' + idMotivoInactivacion + ', ' + multiprofesional + ', \'' + objectId + '\')';

        let idAgendaCreada = await executeQuery(query);

        // ---> Obtenemos los id's de profesionales(SIPS) para la agenda actual y luego insertamos las "agendasProfesional" correspondientes en SIPS
        let listaIdProfesionales = await Promise.all(getProfesionales(agendaSips.profesionales));

        if (listaIdProfesionales[0].length > 0) {
            let promiseArray = [];
            listaIdProfesionales.forEach(async listaIdProf => {
                let query2 = 'select SCOPE_IDENTITY() as id INSERT INTO dbo.CON_AgendaProfesional ( idAgenda, idProfesional, baja, CreatedBy , ' +
                    ' CreatedOn, ModifiedBy, ModifiedOn, idEspecialidad ) VALUES  ( ' + idAgendaCreada + ',' +
                    listaIdProf[0].idProfesional + ',' + 0 + ',' + constantes.idUsuarioSips + ',' +
                    '\'' + moment().format('YYYYMMDD HH:mm:ss') + '\', ' +
                    '\'' + moment().format('YYYYMMDD HH:mm:ss') + '\', ' +
                    '\'' + moment().format('YYYYMMDD HH:mm:ss') + '\', ' +
                    idEspecialidad + ' ) ';
                await executeQuery(query2);
            });
        }
        return (idAgendaCreada);
    } catch (err) {
        console.log('-----------------> ERROR en existeAgendaSips ', err);
        return err;
    }
}

function getEstadoAgendaSips(estadoCitas) {
    let estado: any;
    if (estadoCitas === 'disponible' || estadoCitas === 'publicada') {
        estado = constantes.EstadoAgendaSips.activa; // 1
    } else if (estadoCitas === 'suspendida') {
        estado = constantes.EstadoAgendaSips.inactiva;
    } else if (estadoCitas === 'codificada') {
        estado = constantes.EstadoAgendaSips.cerrada;
    }
    return (estado);
}

/**
* Busca los id's en SIPS de los profesionales de la agenda y devuelve un array de promises.
 *
 * @param {any} profesionalesMongo
 * @returns
 */
function getProfesionales(profesionalesMongo) {
    let profesionalesSipsPromise = [];
    profesionalesMongo.map(async profMongo => profesionalesSipsPromise.push(arrayIdProfesionales(profMongo)));
    return profesionalesSipsPromise;
}

function arrayIdProfesionales(profMongo) {
    return new sql.Request()
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
        let result = await new sql.Request(transaction).query(query);
        return result[0].id;
    } catch (err) {
        return (err);
    }
}
