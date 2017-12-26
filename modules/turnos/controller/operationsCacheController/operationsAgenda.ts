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
export async function getAgendasDeMongoPendientes() {
    return new Promise<Array<any>>(function (resolve, reject) {
        agendasCache.find({
            estadoIntegracion: constantes.EstadoExportacionAgendaCache.pendiente
        }).exec(async function (err, data: any) {
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
export function checkCodificacion(agenda, pool) {
    return new Promise(async function (resolve, reject) {
        let turno;
        let datosTurno = {};
        let idEspecialidad: any;

        for (let x = 0; x < agenda.bloques.length; x++) {
            turno = agenda.bloques[x].turnos;

            for (let z = 0; z < turno.length; z++) {
                let idTurno = await turnoOps.existeTurnoSips(turno[z]);
                let cloneTurno: any = [];

                if (idTurno) {
                    let idConsulta = await existeConsultaTurno(idTurno);
                    let turnoPaciente: any = await getPacienteAgenda(agenda, turno[z]._id);
                    idEspecialidad = (agenda.tipoPrestaciones[0].term.includes('odonto')) ? 34 : 14;
                    turno[z] = turnoPaciente;

                    if (idConsulta) {
                        if (idEspecialidad === constantes.Especialidades.odontologia) {
                            turno[z] = await codificaOdontologia(idConsulta, turno[z]);
                            // resolve();
                        } else {
                            turno[z] = await codificacionCie10(idConsulta, turno[z]);
                            // resolve();
                        }
                        // resolve();
                    } else {
                        // resolve();
                    }

                    datosTurno = {
                        idAgenda: agenda.id,
                        idTurno: turno[z]._id,
                        idBloque: agenda.bloques[x]._id,
                        idUsuario: constantes.idUsuarioSips,
                        turno: turno[z]
                    };

                    await turnoCtrl.updateTurno(datosTurno);
                    await markAgendaAsProcessed(agenda);

                    // resolve();
                } else {
                    // resolve();
                }
            }
        }
        resolve();

        // pool.close();
        // console.log("Cierro Conexion CheckCodificacion: ", pool)
    });
}
async function codificaOdontologia(idConsulta: any, turno: any) {
    return new Promise(async function (resolve, reject) {
        let idNomenclador: any = [];
        let codificacionOdonto: any = {};
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
        resolve(turno);
    });
}
async function codificacionCie10(idConsulta: any, turno: any) {
    return new Promise(async function (resolve, reject) {

        let codCie10: any = [];
        let codificaCie10: any = {};
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
        resolve(turno);
    });
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
    let transaction;
    try {
        let result = await new sql.Request(transaction)
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


function getCodificacionCie10(codcie10) {
    return new Promise(function (resolve, reject) {
        let transaction;
        return new sql.Request(transaction)
            .input('codcie10', sql.Int, codcie10)
            .query('SELECT * FROM dbo.Sys_CIE10 WHERE id = @codcie10')
            .then(result => {
                resolve(result[0]);
            }).catch(err => {
                reject(err);
            });
    });
}

function markAgendaAsProcessed(agenda) {
    return new Promise(async function (resolve, reject) {
        let estadoIntegracion;
        switch (agenda.estadoIntegracion) {
            case 'pendiente':
                estadoIntegracion = constantes.EstadoExportacionAgendaCache.exportadaSIPS;
                break;
            case 'exportada a Sips':
            default:
                estadoIntegracion = constantes.EstadoExportacionAgendaCache.codificada;
        }
        resolve(agendasCache.update({
            _id: agenda._id
        }, {
                $set: {
                    estadoIntegracion: estadoIntegracion
                }
            }).exec());
    });
}

function getConsultaDiagnostico(idConsulta) {
    return new Promise(function (resolve, reject) {
        let transaction;
        return new sql.Request(transaction)
            .input('idConsulta', sql.Int, idConsulta)
            .query('SELECT CODCIE10, PRINCIPAL FROM dbo.CON_ConsultaDiagnostico WHERE idConsulta = @idConsulta')
            .then(result => {
                resolve(result);
            }).catch(err => {
                reject(err);
            });
    });
}

function getConsultaOdontologia(idConsulta) {
    return new Promise(function (resolve, reject) {
        let transaction;
        return new sql.Request(transaction)
            .input('idConsulta', sql.Int, idConsulta)
            .query('SELECT idNomenclador FROM dbo.CON_ConsultaOdontologia WHERE idConsulta = @idConsulta')
            .then(result => {
                resolve(result);
            }).catch(err => {
                reject(err);
            });
    });
}

function getCodificacionOdonto(idNomenclador) {
    return new Promise(function (resolve, reject) {
        let transaction;
        return new sql.Request(transaction)
            .input('idNomenclador', sql.Int, idNomenclador)
            .query('SELECT codigo, descripcion FROM dbo.ODO_Nomenclador WHERE idNomenclador = @idNomenclador')
            .then(result => {
                resolve(result[0]);
            }).catch(err => {
                reject(err);
            });
    });
}
/**
 * Guarda la agenda en SIPS
 * @param agendasMongo
 * @param index
 * @param pool
 */
export async function guardarCacheASips(agendasMongo, index, pool) {
    // return new Promise(async function (resolve, reject) {
    let agenda = agendasMongo[index];
    let transaccion = new sql.Transaction(pool);
    let rolledBack = false;
    transaccion.begin(async err => {
        if (err) {
            logger.LoggerAgendaCache.logAgenda(agenda._id, err);
            transaccion.rollback();
            siguiente(pool);
            return (err);
        }
        transaccion.on('rollback', aborted => {
            rolledBack = true;
        });
        // CON_Agenda de SIPS soporta solo un profesional NOT NULL.
        // En caso de ser nulo el paciente en agenda de ANDES, por defector
        // graba dni '0', correspondiente a 'Sin especifiar', efector SSS.
        let dniProfesional = agenda.profesionales[0] ? agenda.profesionales[0].documento : '0';
        let codigoSisa = agenda.organizacion.codigo.sisa;
        let datosSips = {
            idEfector: '',
            idProfesional: ''
        };
        try {
            let datosArr = await Promise.all(getDatosSips(codigoSisa, dniProfesional));
            datosSips.idEfector = datosArr[0][0].idEfector;
            datosSips.idProfesional = datosArr[1][0].idProfesional;
            let idAgenda = processAgenda(agenda, datosSips, pool);
            await turnoOps.processTurnos(agenda, idAgenda, datosSips.idEfector);
            await checkEstadoAgenda(agenda, idAgenda);
            await turnoOps.checkEstadoTurno(agenda, idAgenda);
            await turnoOps.checkAsistenciaTurno(agenda);

            transaccion.commit(async err2 => {
                if (err2) {
                    logger.LoggerAgendaCache.logAgenda(agenda._id, err2);
                    transaccion.rollback();
                    siguiente(pool);
                    return (err2);
                }
                await markAgendaAsProcessed(agenda);
                siguiente(pool);
                // return;
            });
        } catch (error) {
            console.log('-----------------> ERROR en guardarCacheASips ', error);
            return (error);
        }
    });
    // });
    /**
     * Vuelve a ejecutar guardarCacheSips con la siguiente agenda.
     *
     * @param {any} unPool conexión sql
     * @returns
     */
    function siguiente(unPool) {
        ++index;
        if (index < agendasMongo.length) {
            guardarCacheASips(agendasMongo, index, unPool);
        } else {
            pool.close();
        }
    }
}

async function checkEstadoAgenda(agendaMongo: any, idAgendaSips: any) {
    return new Promise(async function (resolve, reject) {
        try {
            let estadoAgendaSips: any = await getEstadoAgenda(agendaMongo.id);
            let estadoAgendaMongo = getEstadoAgendaSips(agendaMongo.estado);

            if ((estadoAgendaSips !== estadoAgendaMongo) && (agendaMongo.estado === 'suspendida')) {
                let query = 'UPDATE dbo.CON_Agenda SET idAgendaEstado = ' + estadoAgendaMongo + '   WHERE idAgenda = ' + idAgendaSips;
                await executeQuery(query);
                resolve();
            } else {
                resolve();
            }
        } catch (ex) {
            reject(ex);
        }
    });
}

function getEstadoAgenda(idAgenda: any) {
    return new Promise((resolve: any, reject: any) => {
        let transaction;
        (async function () {
            try {
                let query = 'SELECT idAgendaEstado as idEstado FROM dbo.CON_Agenda WHERE objectId = @idAgenda';

                let result = await new sql.Request(transaction)
                    .input('idAgenda', sql.VarChar(50), idAgenda)
                    .query(query);

                resolve(result[0].idEstado);
            } catch (err) {
                reject(err);
            }
        })();
    });
}

function existeConsultaTurno(idTurno) {
    return new Promise(function (resolve, reject) {
        let transaction;
        return new sql.Request(transaction)
            .input('idTurno', sql.Int, idTurno)
            .query('SELECT idConsulta FROM dbo.CON_Consulta WHERE idTurno = @idTurno')
            .then(result => {
                if (result.length > 0) {
                    resolve(result[0].idConsulta);
                } else {
                    resolve(false);
                }
            }).catch(err => {
                reject(err);
            });
    });
}

// Set de funciones locales no publicas
/**
 * Consulta Sql para obtener idEfector y idProfesional, devuelve un array de 2 promises
 *
 * @param {any} [codigoSisa]
 * @param {any} [dniProfesional]
 * @returns
 */
function getDatosSips(codigoSisa?, dniProfesional?) {

    let result1 = new sql.Request()
        .input('codigoSisa', sql.VarChar(50), codigoSisa)
        .query('select idEfector from dbo.Sys_Efector WHERE codigoSisa = @codigoSisa');

    let result2 = new sql.Request()
        .input('dniProfesional', sql.Int, dniProfesional)
        .query('SELECT idProfesional FROM dbo.Sys_Profesional WHERE numeroDocumento = @dniProfesional and activo = 1');

    return ([result1, result2]); // devuelvo un arreglo de promesas para que se ejecuten en paralelo y las capturo con un promise.all
}


async function processAgenda(agenda: any, datosSips, pool) {
    try {
        let result = await existeAgendaSips(agenda);
        let idAgenda;
        if (result.length > 0) {
            idAgenda = result[0].idAgenda;
        } else {
            idAgenda = grabaAgendaSips(agenda, datosSips, pool);
        }
        return (idAgenda);
    } catch (err) {
        console.log('-----------------> ERROR en processAgenda ', err);
        return err;
    }
}

/**
 * Verifica si existe la agenda pasada por parámetro en SIPS
 *
 * @param {*} agendaMongo
 * @returns el id agenda o -1 en caso contrario
 */
function existeAgendaSips(agendaMongo): any {
    return new sql.Request()
        .input('idAgendaMongo', sql.VarChar(50), agendaMongo.id)
        .query('SELECT idAgenda FROM dbo.CON_Agenda WHERE objectId = @idAgendaMongo GROUP BY idAgenda');
}

async function grabaAgendaSips(agendaSips: any, datosSips: any, pool) {
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
        let listaIdProfesionales = await Promise.all(getProfesionales(agendaSips.profesionales, pool));
        if (listaIdProfesionales.length > 0) {
            let promiseArray = [];
            listaIdProfesionales.forEach(listaIdProf => {
                let query2 = 'select SCOPE_IDENTITY() as id INSERT INTO dbo.CON_AgendaProfesional ( idAgenda, idProfesional, baja, CreatedBy , ' +
                    ' CreatedOn, ModifiedBy, ModifiedOn, idEspecialidad ) VALUES  ( ' + idAgendaCreada + ',' +
                    listaIdProf[0].idProfesional + ',' + 0 + ',' + constantes.idUsuarioSips + ',' +
                    '\'' + moment().format('YYYYMMDD HH:mm:ss') + '\', ' +
                    '\'' + moment().format('YYYYMMDD HH:mm:ss') + '\', ' +
                    '\'' + moment().format('YYYYMMDD HH:mm:ss') + '\', ' +
                    idEspecialidad + ' ) ';
                promiseArray.push(new sql.request().query(query2));
            });
            await Promise.all(promiseArray);
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
 * @param {any} pool
 * @returns
 */
function getProfesionales(profesionalesMongo, pool) {
    let profesionalesSipsPromise = [];
    profesionalesMongo.map(async profMongo => profesionalesSipsPromise.push(arrayIdProfesionales(profMongo, pool)));
    return profesionalesSipsPromise;
}

function arrayIdProfesionales(profMongo, pool) {
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
            resolve();
        });
    });
}

async function existeTurnoBloqueoSips(idAgendaSips, horaInicio) {
    return new Promise(async function (resolve, reject) {
        let transaction;
        let query = 'SELECT COUNT(b.idTurnoBloqueo) as count FROM CON_TurnoBloqueo b ' +
            'JOIN CON_TURNO t on t.idAgenda = b.idAgenda ' +
            'WHERE b.idAgenda = ' + idAgendaSips +
            ' AND b.horaTurno = \'' + horaInicio + '\'';

        try {
            let result = await new sql.Request(transaction).query(query);
            resolve(result[0].count > 0);
        } catch (err) {
            reject(err);
        }
    });
}

async function grabarTurnoBloqueo(idAgendaSips, turno) {
    return new Promise(async function (resolve, reject) {
        try {
            const motivoBloqueo = getMotivoTurnoBloqueoSips(turno);
            var fechaBloqueo = moment(turno.horaInicio).format('YYYYMMDD');
            var horaBloqueo = moment(turno.horaInicio).utcOffset('-03:00').format('HH:mm');

            let queryTurnoBloqueo = 'INSERT dbo.CON_TurnoBloqueo (idAgenda ' +
                ', fechaTurno ' +
                ', horaTurno ' +
                ', idUsuarioBloqueo ' +
                ', fechaBloqueo ' +
                ', idMotivoBloqueo) ';
            queryTurnoBloqueo += 'VALUES (' +
                idAgendaSips + ', ' +
                '\'' + fechaBloqueo + '\', ' +
                '\'' + horaBloqueo + '\', ' +
                constantes.idUsuarioSips + ', ' +
                '\'' + moment(turno.updatedAt).format('YYYYMMDD') + '\', ' +
                motivoBloqueo + ')';

            await executeQuery(queryTurnoBloqueo);
            resolve();
        } catch (ex) {
            reject(ex);
        }
    });
}


function getMotivoTurnoBloqueoSips(turno) {
    return new Promise(async function (resolve, reject) {
        try {
            let motivoBloqueo;

            if (turno.estado === 'suspendido') {
                motivoBloqueo = getMotivoTurnoSuspendido(turno.motivoSuspension);
            } else if (turno.estado === 'turnoDoble') {
                motivoBloqueo = constantes.MotivoTurnoBloqueo.turnoDoble;
            }

            resolve(motivoBloqueo);
        } catch (ex) {
            reject(ex);
        }
    });
}


function getMotivoTurnoSuspendido(motivoSuspension) {
    return new Promise(async function (resolve, reject) {
        try {
            let devuelveMotivoSuspension;

            switch (motivoSuspension) {
                case 'profesional':
                    devuelveMotivoSuspension = constantes.MotivoTurnoBloqueo.retiroDelProfesional;
                    break;
                case 'edilicia':
                    devuelveMotivoSuspension = constantes.MotivoTurnoBloqueo.otros;
                    break;
                case 'organizacion':
                    devuelveMotivoSuspension = constantes.MotivoTurnoBloqueo.reserva;
                    break;
            }

            resolve(devuelveMotivoSuspension);
        } catch (ex) {
            reject(ex);
        }
    });
}


/* TODO: ver si hay mas estados de turnos entre CITAS y SIPS*/
function getEstadoTurnosCitasSips(estadoTurnoCitas, updated) {
    return new Promise(async function (resolve, reject) {
        try {
            let estado: any;

            if (estadoTurnoCitas === 'asignado') {
                estado = constantes.EstadoTurnosSips.activo;
            } else if ((estadoTurnoCitas === 'disponible') && (updated)) {
                estado = constantes.EstadoTurnosSips.liberado;
            } else if (estadoTurnoCitas === 'suspendido') {
                estado = constantes.EstadoTurnosSips.suspendido;
            }

            resolve(estado);
        } catch (ex) {
            reject(ex);
        }
    });
}



function executeQuery(query: any) {
    query += ' select SCOPE_IDENTITY() as id';
    return new Promise((resolve: any, reject: any) => {
        return new sql.Request()
            .query(query)
            .then(result => {
                resolve(result[0].id);
            }).catch(err => {
                reject(err);
            });
    });
}




// #region GetPacienteMPI
