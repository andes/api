import * as mongoose from 'mongoose';
import { agendasCache } from '../../legacy/schemas/agendasCache';
import * as configPrivate from '../../../config.private';
import * as sql from 'mssql';
import * as moment from 'moment';
import * as paciente from './../../../core/mpi/controller/paciente';
import { model as organizacion } from './../../../core/tm/schemas/organizacion';

let pool;

const MongoClient = require('mongodb').MongoClient;

let async = require('async');

let connection = {
    user: configPrivate.conSql.auth.user,
    password: configPrivate.conSql.auth.password,
    server: configPrivate.conSql.serverSql.server,
    database: configPrivate.conSql.serverSql.database
};

enum EstadoAgendaSips {
    activa = 1,
    inactiva = 3,
    cerrada = 4
}

enum EstadoTurnosSips {
    activo = 1,
    liberado = 4,
    suspendido = 5
}

const idUsuario = '1486739';

export async function getAgendaSips() {
    pool = await sql.connect(connection);
    let agendasMongo = await getAgendasDeMongo();

    for (let x = 0; x < agendasMongo.length; x++) {

        let idAgenda = await processAgenda(agendasMongo[x]);
        console.log('processAgenda idAgenda', idAgenda);
        let idTurnoCreado = await processTurnos(agendasMongo[x], idAgenda);
        console.log('processTurnos idTurnoCreado', idTurnoCreado);
        let estadoAgenda = await checkEstadoAgenda(agendasMongo[x]);
        let estadoTurno = await checkEstadoTurno(agendasMongo[x], idAgenda);
        let asistenciaTurno = await checkAsistenciaTurno(agendasMongo[x]);
    }
    //pool.close();
    let borrarAgendasCache = await borrarAgendasCacheMongo();
}

async function getAgendasDeMongo() {
    return new Promise<Array<any>>(function (resolve, reject) {
        agendasCache.find().exec(function (err, data) {
            if (err) {
                return (err);
            }
            resolve(data);
        });
    });
}

/* Inicio Sección de Agendas*/
async function processAgenda(agendas: any) {
    let idAgenda = await existeAgendaSips(agendas);

    if (!idAgenda) {
        idAgenda = await grabaAgendaSips(agendas);
    } else {
        console.log("Existe Agenda en SIPS");
    }

    return idAgenda;
}

function existeAgendaSips(agendaMongo: any) {

    return new Promise(function (resolve, reject) {
        let isAgenda;
        let idAgenda = agendaMongo.id;

        return pool.request()
            .input('idAgendaMongo', sql.VarChar(50), agendaMongo.id)
            .query('SELECT idAgenda FROM dbo.CON_Agenda WHERE objectId = @idAgendaMongo GROUP BY idAgenda')
            .then(result => {
                if (result.length > 0) {
                    isAgenda = true;
                    resolve(result[0].idAgenda);
                } else {
                    isAgenda = false;
                    resolve(isAgenda);
                }
            }).catch(err => {
                reject(err);
            });
    });
}

function grabaAgendaSips(agendaSips: any) {

    let objectId = agendaSips.id;
    let estado = getEstadoAgendaSips(agendaSips.estado);
    let codigoSisa = agendaSips.organizacion.codigo.sisa;
    let fecha = moment(agendaSips.horaInicio).format('YYYYMMDD');
    let horaInicio = moment(agendaSips.horaInicio).utcOffset('-03:00').format('HH:mm');
    let horaFin = moment(agendaSips.horaFin).utcOffset('-03:00').format('HH:mm');
    let duracionTurno = agendaSips.bloques[0].duracionTurno;
    let tipoPrestacion = agendaSips.tipoPrestaciones[0].conceptId;

    let maximoSobreTurnos = 0;
    let porcentajeTurnosDia = 0;
    let porcentajeTurnosAnticipados = 0;
    let citarPorBloques = 0;
    let cantidadInterconsulta = 0;
    let turnosDisponibles = 1;
    let idMotivoInactivacion = 0;
    let multiprofesional = 0;

    //CON_Agenda de SIPS soporta solo un profesional NOT NULL.
    //En caso de ser nulo el paciente en agenda de ANDES, por defector
    //graba dni '0', correspondiente a 'Sin especifiar', efector SSS.
    let dniProfesional = agendaSips.profesionales[0] ? agendaSips.profesionales[0].documento : '0';

    let query;
    return new Promise((resolve: any, reject: any) => {

        getDatosSips(codigoSisa, dniProfesional, tipoPrestacion).then(async function (values) {

            let idEfector = values[0][0].idEfector;
            let idProfesional = values[1][0].idProfesional;
            let idEspecialidad = values[2][0].idEspecialidad;
            let idServicio = values[2][0].idServicio;
            let idTipoPrestacion = 0;

            let idConsultorio = await creaConsultorioSips(agendaSips, idEfector);
            console.log("Id Consultorioo: ", idConsultorio);

            query = "insert into Con_Agenda (idAgendaEstado, idEfector, idServicio, idProfesional, idTipoPrestacion, idEspecialidad, idConsultorio, fecha, duracion, horaInicio, horaFin, maximoSobreTurnos, porcentajeTurnosDia, porcentajeTurnosAnticipados, citarPorBloques, cantidadInterconsulta, turnosDisponibles, idMotivoInactivacion, multiprofesional, objectId) " +
                "values (" + estado + ", " + idEfector + ", " + idServicio + ", " + idProfesional + ", " + idTipoPrestacion + ", " + idEspecialidad + ", " + idConsultorio + ", '" + fecha + "', " + duracionTurno + ", '" + horaInicio + "', '" + horaFin + "', " + maximoSobreTurnos + ", " + porcentajeTurnosDia + ", " + porcentajeTurnosAnticipados + ", " + citarPorBloques + " , " + cantidadInterconsulta + ", " + turnosDisponibles + ", " + idMotivoInactivacion + ", " + multiprofesional + ", '" + objectId + "')";

            console.log("Queryyy: ", query);
            executeQuery(query).then(function (data) {
                resolve(data);
            });
        });
    });
}

async function creaConsultorioSips(agenda: any, idEfector: any) {

    return new Promise(async (resolve: any, reject: any) => {
        let idConsultorioTipo = await crearConsultorioTipoSips(agenda, idEfector);

        let query = ' INSERT INTO dbo.CON_Consultorio '
            + ' ( idEfector , idTipoConsultorio ,  nombre , Activo ) VALUES ( '
            + idEfector + ','
            + idConsultorioTipo + ','
            + "'" + agenda.espacioFisico + "', "
            + ' 1 )';

        executeQuery(query).then(function (data) {
            return resolve(data);
        });
    });
}

function crearConsultorioTipoSips(agenda, idEfector) {
    return new Promise((resolve: any, reject: any) => {
        let query = 'INSERT INTO dbo.CON_ConsultorioTipo '
            + ' ( idEfector, nombre ) VALUES  ( '
            + idEfector + ','
            + "'" + agenda.espacioFisico + "' )";

        executeQuery(query).then(function (data) {
            return resolve(data);
        });
    });
}

function getEstadoAgendaSips(estadoCitas) {
    let estado: any;

    if (estadoCitas === 'disponible' || estadoCitas === 'publicada') {
        estado = EstadoAgendaSips.activa; // 1
    } else if (estadoCitas === 'suspendida') {
        estado = EstadoAgendaSips.inactiva;
    } else if (estadoCitas === 'codificada') {
        estado = EstadoAgendaSips.cerrada;
    }

    return estado;
}

function getDatosSips(codigoSisa?, dniProfesional?, conceptId?) {

    return new Promise((resolve: any, reject: any) => {
        (async function () {
            try {
                let result: any[] = [];

                result[0] = await pool.request()
                    // .input('codigoSisa', sql.VarChar(50), codigoSisa)
                    .input('codigoSisa', sql.VarChar(50), codigoSisa)
                    .query('select idEfector from dbo.Sys_Efector WHERE codigoSisa = @codigoSisa');

                result[1] = await pool.request()
                    .input('dniProfesional', sql.Int, dniProfesional)
                    .query('SELECT idProfesional FROM dbo.Sys_Profesional WHERE numeroDocumento = @dniProfesional and activo = 1');

                result[2] = await pool.request()
                    .input('conceptId', sql.VarChar(50), conceptId)
                    .query('SELECT E.idEspecialidad, S.idServicio FROM dbo.Sys_Especialidad E INNER JOIN dbo.Sys_Servicio S ON s.unidadOperativa = e.unidadOperativa WHERE E.conceptId_snomed = 268565007 AND s.activo = 1 ');

                resolve(result);
            } catch (err) {
                reject(err);
            }
        })();
    });
}

async function checkEstadoAgenda(agendaMongo: any) {

    let estadoAgendaSips: any = await getEstadoAgenda(agendaMongo.id);

    let estadoAgendaMongo = getEstadoAgendaSips(agendaMongo.estado);
    let idAgendaSips = estadoAgendaSips.idAgenda;

    if ((estadoAgendaSips.idAgendaEstado !== estadoAgendaMongo) && (agendaMongo.estado === 'suspendida')) {
        let query = "UPDATE dbo.CON_Agenda SET idAgendaEstado = " + estadoAgendaMongo + "   WHERE idAgenda = " + idAgendaSips;
        executeQuery(query);
    }
}

function getEstadoAgenda(idAgenda: any) {

    return new Promise((resolve: any, reject: any) => {
        (async function () {
            try {
                let query = 'SELECT idAgenda, idAgendaEstado FROM dbo.CON_Agenda WHERE objectId = @idAgenda';

                let result = await pool.request()
                    .input('idAgenda', sql.VarChar(50), idAgenda)
                    .query(query);

                resolve(result[0]);
            } catch (err) {
                reject(err);
            }
        })();
    });
}

/*Fin Sección Agendas*/

/*Inicio Sección Turnos*/
async function processTurnos(agendas: any, idAgendaCreada: any) {
    let turnos;

    for (let x = 0; x < agendas.bloques.length; x++) {
        turnos = agendas.bloques[x].turnos;

        for (let i = 0; i < turnos.length; i++) {

            if (turnos[i].estado === 'asignado') {
                let existeTurno = await existeTurnoSips(turnos[i]);

                if (!existeTurno) {
                    await grabaTurnoSips(turnos[i], idAgendaCreada);
                } else {
                    console.log("El turno ya existe!!!");
                }
            }
        }
    }
}

async function checkEstadoTurno(agenda: any, idAgendaSips) {
    let turnos;

    for (let x = 0; x < agenda.bloques.length; x++) {
        turnos = agenda.bloques[x].turnos;

        for (let i = 0; i < turnos.length; i++) {
            if ((turnos[i].estado !== 'disponible') || (turnos[i].updatedAt)) {
                actualizarEstadoTurnoSips(idAgendaSips, turnos[i]);
            }
        }
    }
}

async function checkAsistenciaTurno(agenda: any) {
    let turnos;

    for (let x = 0; x < agenda.bloques.length; x++) {
        turnos = agenda.bloques[x].turnos;

        for (let i = 0; i < turnos.length; i++) {
            if (turnos[i].asistencia === 'asistio') {

                // let idTurno  = await existeTurnoSips(turnos[i]);
                let idTurno: any = await getEstadoTurnoSips(turnos[i]._id);
                let fechaAsistencia = moment(turnos[i].updatedAt).format('YYYYMMDD');
                let query = "INSERT INTO dbo.CON_TurnoAsistencia ( idTurno , idUsuario , fechaAsistencia ) VALUES  ( " +
                    idTurno.idTurno + " , " + idUsuario + " , '" + fechaAsistencia + "' )";

                executeQuery(query);
            }
        }
    }
}

function existeTurnoSips(turno: any) {
    return new Promise(function (resolve, reject) {
        let isTurno;
        let idTurno = turno._id;

        return pool.request()
            .input('idTurnoMongo', sql.VarChar(50), idTurno)
            .query('SELECT idTurno FROM dbo.CON_Turno WHERE objectId = @idTurnoMongo GROUP BY idTurno')
            .then(result => {
                if (result.length > 0) {
                    isTurno = true;
                    resolve(isTurno);
                } else {
                    isTurno = false;
                    resolve(isTurno);
                }
            }).catch(err => {
                reject(err);
            });
    });
}

async function grabaTurnoSips(turno, idAgendaSips) {

    let pacienteId = await getPacienteMPI(turno.paciente, idAgendaSips);

    let fechaTurno = moment(turno.horaInicio).format('YYYYMMDD');
    let horaTurno = moment(turno.horaInicio).utcOffset('-03:00').format('HH:mm');

    let query = "INSERT INTO dbo.CON_Turno ( idAgenda , idTurnoEstado , idUsuario ,  idPaciente ,  fecha , hora , sobreturno , idTipoTurno , idObraSocial , idTurnoAcompaniante, objectId ) VALUES  ( " +
        idAgendaSips + " , 1 , " + idUsuario + " ," + pacienteId + ", '" + fechaTurno + "' ,'" + horaTurno + "' , 0 , 0 , 1 ,0, '" + turno._id + "')";

    let turnoGrabado = await executeQuery(query);
}

async function actualizarEstadoTurnoSips(idAgendaSips, turno) {
    let estadoTurnoSips: any = await getEstadoTurnoSips(turno._id);
    let estadoTurnoMongo = getEstadoTurnosCitasSips(turno.estado, turno.updatedAt);

    if (!turno || (estadoTurnoSips !== estadoTurnoMongo)) {
        let objectIdTurno;

        if (turno._id) {
            objectIdTurno = " and objectId = '" + turno._id + "'";
        }

        /*TODO: hacer enum con los estados */
        var horaInicio = moment(turno.horaInicio).utcOffset('-03:00').format('HH:mm')

        if (estadoTurnoMongo === EstadoTurnosSips.suspendido && !await existeTurnoBloqueoSips(idAgendaSips, horaInicio)) {
            await grabarTurnoBloqueo(idAgendaSips, turno);
        }

        let query = "UPDATE dbo.CON_Turno SET idTurnoEstado = " + estadoTurnoMongo + " WHERE idAgenda = " + idAgendaSips + objectIdTurno;
        await executeQuery(query);
    }
}

async function existeTurnoBloqueoSips(idAgendaSips, horaInicio) {
    let query = "SELECT COUNT(b.idTurnoBloqueo) as count FROM CON_TurnoBloqueo b " +
        "JOIN CON_TURNO t on t.idAgenda = b.idAgenda " +
        "WHERE b.idAgenda = " + idAgendaSips +
        " AND b.horaTurno = '" + horaInicio + "'";

    try {
        let result = await pool.request().query(query);
        return result[0].count > 0;
    } catch (err) {
        console.log(err);
        return false;
    }
}

async function grabarTurnoBloqueo(idAgendaSips, turno) {
    const motivoBloqueo = (turno.motivoSuspension == 'profesional') ? 2 : 3;

    var fechaBloqueo = moment(turno.horaInicio).format('YYYYMMDD');
    var horaBloqueo = moment(turno.horaInicio).utcOffset('-03:00').format('HH:mm');

    let queryTurnoBloqueo = "INSERT dbo.CON_TurnoBloqueo (idAgenda "
        + ", fechaTurno "
        + ", horaTurno "
        + ", idUsuarioBloqueo "
        + ", fechaBloqueo "
        + ", idMotivoBloqueo) ";
    queryTurnoBloqueo += "VALUES ("
        + idAgendaSips + ", "
        + "'" + fechaBloqueo + "', "
        + "'" + horaBloqueo + "', "
        + turno.updatedBy.documento + ", "
        + "'" + moment(turno.updatedAt).format('YYYYMMDD') + "', "
        + motivoBloqueo + ")";

    await executeQuery(queryTurnoBloqueo);
}

/* TODO: ver si hay mas estados de turnos entre CITAS y SIPS*/
function getEstadoTurnosCitasSips(estadoTurnoCitas, updated) {
    let estado: any;

    if (estadoTurnoCitas === 'asignado') {
        estado = EstadoTurnosSips.activo;
    } else if ((estadoTurnoCitas === 'disponible') && (updated)) {
        estado = EstadoTurnosSips.liberado;
    } else if (estadoTurnoCitas === 'suspendido') {
        estado = EstadoTurnosSips.suspendido;
    }

    return estado;
}

/* Devuelve el estado del turno en Con_Turno de SIPS */
function getEstadoTurnoSips(objectId: any) {
    return new Promise((resolve: any, reject: any) => {
        (async function () {
            try {
                let query = 'SELECT idAgenda, idTurno, idTurnoEstado FROM dbo.CON_Turno WHERE objectId = @objectId';
                let result = await pool.request()
                    .input('objectId', sql.VarChar(50), objectId)
                    .query(query);

                resolve(result[0]);
            } catch (err) {
                reject(err);
            }
        })();
    });
}

/*Fin Sección Turnos*/

function executeQuery(query: any) {
    query += ' select SCOPE_IDENTITY() as id';

    return new Promise((resolve: any, reject: any) => {
        return pool.request()
            .query(query)
            .then(result => {
                resolve(result[0].id);
            }).catch(err => {
                console.error(err);
                reject(err);
            });
    });
}

async function borrarAgendasCacheMongo() {
    return new Promise<Array<any>>(function (resolve, reject) {
        // // agendasCache.remove({}).exec();
        // console.log('Borrando AgendasCache en Mongo');
    });
}

/** Dado un id de Organización devuelve el objeto completo */
function getEfector(idAgendaSIps): any {
    return new Promise(function (resolve, reject) {
        return pool.request()
            .input('idAgenda', sql.Int, idAgendaSIps)
            .query('SELECT idEfector FROM dbo.CON_Agenda WHERE idAgenda = @idAgenda')
            .then(result => {
                resolve(result[0].idEfector);
            }).catch(err => {
                reject(err);
            });
    });
}


//#region Inserta Paciente en SIPS
async function insertaPacienteSips(pacienteSips: any) {
    let query = 'INSERT INTO dbo.Sys_Paciente '
        + ' ( idEfector ,'
        + ' apellido , '
        + ' nombre, '
        + ' numeroDocumento, '
        + ' idSexo, '
        + ' fechaNacimiento, '
        + ' idEstado, '
        + ' idMotivoNI, '
        + ' idPais, '
        + ' idProvincia, '
        + ' idNivelInstruccion, '
        + ' idSituacionLaboral, '
        + ' idProfesion, '
        + ' idOcupacion, '
        + ' calle, '
        + ' numero, '
        + ' piso, '
        + ' departamento, '
        + ' manzana, '
        + ' idBarrio, '
        + ' idLocalidad, '
        + ' idDepartamento, '
        + ' idProvinciaDomicilio, '
        + ' referencia, '
        + ' informacionContacto, '
        + ' cronico, '
        + ' idObraSocial, '
        + ' idUsuario, '
        + ' fechaAlta, '
        + ' fechaDefuncion, '
        + ' fechaUltimaActualizacion, '
        + ' idEstadoCivil, '
        + ' idEtnia, '
        + ' idPoblacion, '
        + ' idIdioma, '
        + ' otroBarrio, '
        + ' camino, '
        + ' campo, '
        + ' esUrbano, '
        + ' lote, '
        + ' parcela, '
        + ' edificio, '
        + ' activo, '
        + ' fechaAltaObraSocial, '
        + ' numeroAfiliado, '
        + ' numeroExtranjero, '
        + ' telefonoFijo, '
        + ' telefonoCelular, '
        + ' email, '
        + ' latitud, '
        + ' longitud, '
        + ' objectId ) '
        + ' VALUES( '
        + pacienteSips.idEfector + ', '
        + "'" + pacienteSips.apellido + "',"
        + "'" + pacienteSips.nombre + "', "
        + pacienteSips.numeroDocumento + ', '
        + pacienteSips.idSexo + ', '
        + "'" + pacienteSips.fechaNacimiento + "',"
        + pacienteSips.idEstado + ', '
        + pacienteSips.idMotivoNI + ', '
        + pacienteSips.idPais + ', '
        + pacienteSips.idProvincia + ', '
        + pacienteSips.idNivelInstruccion + ', '
        + pacienteSips.idSituacionLaboral + ', '
        + pacienteSips.idProfesion + ', '
        + pacienteSips.idOcupacion + ', '
        + "'" + pacienteSips.calle + "', "
        + pacienteSips.numero + ', '
        + "'" + pacienteSips.piso + "', "
        + "'" + pacienteSips.departamento + "', "
        + "'" + pacienteSips.manzana + "', "
        + pacienteSips.idBarrio + ', '
        + pacienteSips.idLocalidad + ', '
        + pacienteSips.idDepartamento + ', '
        + pacienteSips.idProvinciaDomicilio + ', '
        + "'" + pacienteSips.referencia + "', "
        + "'" + pacienteSips.informacionContacto + "', "
        + pacienteSips.cronico + ', '
        + pacienteSips.idObraSocial + ', '
        + pacienteSips.idUsuario + ', '
        + "'" + pacienteSips.fechaAlta + "', "
        + "'" + pacienteSips.fechaDefuncion + "', "
        + "'" + pacienteSips.fechaUltimaActualizacion + "', "
        + pacienteSips.idEstadoCivil + ', '
        + pacienteSips.idEtnia + ', '
        + pacienteSips.idPoblacion + ', '
        + pacienteSips.idIdioma + ', '
        + "'" + pacienteSips.otroBarrio + "', "
        + "'" + pacienteSips.camino + "', "
        + "'" + pacienteSips.campo + "', "
        + pacienteSips.esUrbano + ', '
        + "'" + pacienteSips.lote + "', "
        + "'" + pacienteSips.parcela + "', "
        + "'" + pacienteSips.edificio + "', "
        + pacienteSips.activo + ', '
        + "'" + pacienteSips.fechaAltaObraSocial + "', "
        + "'" + pacienteSips.numeroAfiliado + "', "
        + "'" + pacienteSips.numeroExtranjero + "', "
        + "'" + pacienteSips.telefonoFijo + "', "
        + "'" + pacienteSips.telefonoCelular + "', "
        + "'" + pacienteSips.email + "', "
        + "'" + pacienteSips.latitud + "', "
        + "'" + pacienteSips.longitud + "', "
        + "'" + pacienteSips.objectId + "' "
        + ') ';

    let idPacienteGrabadoSips = await executeQuery(query);

    return idPacienteGrabadoSips;
}
//#endregion

// #region GetPacienteMPI
/** Este método se llama desde grabaTurnoSips */
async function getPacienteMPI(pacienteTurno: any, idAgendaSips: any) {

    let pacienteEncontrado = await paciente.buscarPaciente(pacienteTurno.id);
    let idEfectorSips = await getEfector(idAgendaSips);

    let pacienteSips = {
        idEfector: idEfectorSips,
        nombre: pacienteEncontrado.paciente.nombre,
        apellido: pacienteEncontrado.paciente.apellido,
        numeroDocumento: pacienteEncontrado.paciente.documento,
        idSexo: (pacienteEncontrado.paciente.sexo === 'masculino' ? 3 : pacienteEncontrado.paciente.sexo === 'femenino' ? 2 : 1),
        fechaNacimiento: moment(pacienteEncontrado.paciente.fechaNacimiento).format('YYYYMMDD'),
        idEstado: 3, /* Estado Validado en SIPS*/
        idMotivoNI: 0,
        idPais: 54,
        idProvincia: 139,
        idNivelInstruccion: 0,
        idSituacionLaboral: 0,
        idProfesion: 0,
        idOcupacion: 0,
        calle: '',
        numero: 0,
        piso: '',
        departamento: '',
        manzana: '',
        idBarrio: -1,
        idLocalidad: 52,
        idDepartamento: 557,
        idProvinciaDomicilio: 139,
        referencia: '',
        informacionContacto: '',
        cronico: 0,
        idObraSocial: 499,
        idUsuario: idUsuario,
        fechaAlta: moment().format('YYYYMMDD HH:mm:ss'),
        fechaDefuncion: '19000101',
        fechaUltimaActualizacion: moment().format('YYYYMMDD HH:mm:ss'),
        idEstadoCivil: 0,
        idEtnia: 0,
        idPoblacion: 0,
        idIdioma: 0,
        otroBarrio: '',
        camino: '',
        campo: '',
        esUrbano: 1,
        lote: '',
        parcela: '',
        edificio: '',
        activo: 1,
        fechaAltaObraSocial: '19000101',
        numeroAfiliado: null,
        numeroExtranjero: '',
        telefonoFijo: 0,
        telefonoCelular: 0,
        email: '',
        latitud: 0,
        longitud: 0,
        objectId: pacienteEncontrado.paciente._id
    };

    let idPacienteGrabadoSips = await insertaPacienteSips(pacienteSips);

    return idPacienteGrabadoSips;
}

//#endregion
