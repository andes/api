import * as mongoose from 'mongoose';
import { agendasCache } from '../../legacy/schemas/agendasCache';
import * as configPrivate from '../../../config.private';
import * as sql from 'mssql';
import * as moment from 'moment';

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

export async function getAgendaSips() {

    let agendasMongo = await getAgendasDeMongo();

    for (let x = 0; x < agendasMongo.length; x++) {
        
        let idAgenda = await checkAgendas(agendasMongo[x]);
        let idTurnoCreado = await checkTurnos(agendasMongo[x], idAgenda);
        let estadoAgenda = await checkEstadoAgenda(agendasMongo[x]);
        let estadoTurno = await checkEstadoTurno(agendasMongo[x]);
        let asistenciaTurno = await checkAsistenciaTurno(agendasMongo[x]);
    }

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
async function checkAgendas(agendas: any) {
    let existeAgenda = await existeAgendaSips(agendas);
    let idAgenda = existeAgenda;

    if (!existeAgenda) {
        await grabaAgendaSips(agendas);
    } else {
        console.log("Existe Agenda en SIPS");
    }

    return idAgenda;
}

function existeAgendaSips(agendaMongo: any) {

    return new Promise(function (resolve, reject) {
        let isAgenda;
        let idAgenda = agendaMongo.id;

        sql.connect(connection).then(pool => {

            return pool.request()
                .input('idAgendaMongo', sql.VarChar(50), agendaMongo.id)
                .query('SELECT idAgenda FROM dbo.CON_Agenda WHERE objectId = @idAgendaMongo GROUP BY idAgenda');
        }).then(result => {

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

    //CON_Agenda de SIPS soporta solo un profesional NOT NULL.
    //En caso de ser nulo el paciente en agenda de ANDES, por defector
    //graba dni '0', correspondiente a 'Sin especifiar', efector SSS.
    let dniProfesional = agendaSips.profesionales[0] ? agendaSips.profesionales[0].documento : '0';
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

    agendaSips.idConsultorio = 273;

    let query;
    return new Promise((resolve: any, reject: any) => {

        getDatosSips(codigoSisa, dniProfesional, tipoPrestacion).then(function (values) {

            let idEfector = values[0][0].idEfector;
            let idProfesional = values[1][0].idProfesional;
            let idEspecialidad = values[2][0].idEspecialidad;
            let idServicio = values[2][0].idServicio;
            let idTipoPrestacion = 0;

            query = "insert into Con_Agenda (idAgendaEstado, idEfector, idServicio, idProfesional, idTipoPrestacion, idEspecialidad, idConsultorio, fecha, duracion, horaInicio, horaFin, maximoSobreTurnos, porcentajeTurnosDia, porcentajeTurnosAnticipados, citarPorBloques, cantidadInterconsulta, turnosDisponibles, idMotivoInactivacion, multiprofesional, objectId) values (" + estado + ", " + idEfector + ", " + idServicio + ", " + idProfesional + ", " + idTipoPrestacion + ", " + idEspecialidad + ", " + agendaSips.idConsultorio + ", '" + fecha + "', " + duracionTurno + ", '" + horaInicio + "', '" + horaFin + "', " + maximoSobreTurnos + ", " + porcentajeTurnosDia + ", " + porcentajeTurnosAnticipados + ", " + citarPorBloques + " , " + cantidadInterconsulta + ", " + turnosDisponibles + ", " + idMotivoInactivacion + ", " + multiprofesional + ", '" + objectId + "')";

            insertaSips(query).then(function (data) {
                resolve(data);
            });
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

function getDatosSips(codigoSisa, dniProfesional, conceptId) {

    return new Promise((resolve: any, reject: any) => {
        (async function () {
            try {
                let pool = await sql.connect(connection);
                let result: any[] = [];

                result[0] = await pool.request()
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

    if (estadoAgendaSips.idAgendaEstado !== estadoAgendaMongo) {
        switch (agendaMongo.estado) {
            case 'suspendida': suspenderAgenda(estadoAgendaMongo, idAgendaSips);
                break;
        }
    }
}

function suspenderAgenda(estadoAgendaMongo, idAgendaSips) {
    let query = "UPDATE dbo.CON_Agenda SET idAgendaEstado = " + estadoAgendaMongo + "   WHERE idAgenda = " + idAgendaSips;

    insertaSips(query);

    /* Envío un ObjectId vacío ya que se suspenden todos los turnos de una determinada agenda*/

    //TODO: Incluir tercer parametro
    actualizarEstadoTurnosSips(idAgendaSips, '', null);
}

function getEstadoAgenda(idAgenda: any) {

    return new Promise((resolve: any, reject: any) => {
        (async function () {
            try {
                let pool = await sql.connect(connection);
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
async function checkTurnos(agendas: any, idAgendaCreada: any) {
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

async function checkEstadoTurno(agenda: any) {
    let turnos;
    let idAgendaSips: any;
    let idTurnoSips: any;

    for (let x = 0; x < agenda.bloques.length; x++) {
        turnos = agenda.bloques[x].turnos;

        for (let i = 0; i < turnos.length; i++) {
            if ((turnos[i].estado !== 'disponible') || (turnos[i].updatedAt)) {
                let estadoTurnoSips: any = await getEstadoTurnoSips(turnos[i]._id);
                let estadoTurnoMongo = getEstadoTurnosCitasSips(turnos[i].estado, turnos[i].updatedAt);

                console.log("pepepe: ", estadoTurnoSips, ' ---- ', estadoTurnoMongo);

                idAgendaSips = estadoTurnoSips.idAgenda;
                idTurnoSips = estadoTurnoSips.idTurno;

                /*TODO: analizar bien el cambio de estados de los turnos*/
                if (estadoTurnoSips !== estadoTurnoMongo) {
                    actualizarEstadoTurnosSips(idAgendaSips, turnos[i]._id, estadoTurnoMongo);
                }
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
                let query = "INSERT INTO dbo.CON_TurnoAsistencia ( idTurno , idUsuario , fechaAsistencia ) VALUES  ( " + idTurno.idTurno + " , 9739 , '" + fechaAsistencia + "' )";
                console.log("IDTurno: ", query);

                insertaSips(query);
            }
        }
    }
}

function existeTurnoSips(turno: any) {
    return new Promise(function (resolve, reject) {
        let isTurno;
        let idTurno = turno._id;

        sql.connect(connection).then(pool => {
            return pool.request()
                .input('idTurnoMongo', sql.VarChar(50), idTurno)
                .query('SELECT idTurno FROM dbo.CON_Turno WHERE objectId = @idTurnoMongo GROUP BY idTurno');
        }).then(result => {

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

    let fechaTurno = moment(turno.horaInicio).format('YYYYMMDD');
    let horaTurno = moment(turno.horaInicio).utcOffset('-03:00').format('HH:mm');

    let query = "INSERT INTO dbo.CON_Turno ( idAgenda , idTurnoEstado , idUsuario ,  idPaciente ,  fecha , hora , sobreturno , idTipoTurno , idObraSocial , idTurnoAcompaniante, objectId ) VALUES  ( " +
         idAgendaSips + " , 1 , 0000 , 410551 , '" + fechaTurno + "' ,'" + horaTurno + "' , 0 , 0 , 1 ,0, '" + turno._id + "')";

    let turnoGrabado = await insertaSips(query);
}

function actualizarEstadoTurnosSips(idAgendaSips, objectId, estado) {
    let objectIdTurno;

    if (objectId) {
        objectIdTurno = " and objectId = '" + objectId + "'";
    }

    /*TODO: hacer enum con los estados */
    let query = "UPDATE dbo.CON_Turno SET idTurnoEstado = " + estado + " WHERE idAgenda = " + idAgendaSips + objectIdTurno;

    insertaSips(query);
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
                let pool = await sql.connect(connection);
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

function insertaSips(query: any) {
    console.log('insertaSips query', query);
    return new Promise((resolve: any, reject: any) => {
        sql.connect(connection).then(pool => {

            return pool.request()
                .query(query);
        }).then(result => {
            resolve(result);

        }).catch(err => {
            reject(err);
        });
    });
}

async function borrarAgendasCacheMongo() {
    return new Promise<Array<any>>(function (resolve, reject) {
        agendasCache.remove({}).exec();
        console.log('Borrando AgendasCache en Mongo');
    });
}
