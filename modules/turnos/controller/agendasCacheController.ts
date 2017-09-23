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

export async function getAgendaSips() {

    let agendasMongo = await getAgendasDeMongo();

    for (let x = 0; x < agendasMongo.length; x++) {

        let idAgenda = await checkAgendas(agendasMongo[x]);
        let idTurnoCreado = await checkTurnos(agendasMongo[x], idAgenda);

        let estadoAgenda = await checkEstadoAgenda(agendasMongo[x]);
    }
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
    let dniProfesional = agendaSips.profesionales[0].documento;
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
        estado = 1;
    } else if (estadoCitas === 'suspendida') {
        estado = 3;
    } else if (estadoCitas === 'codificada') {
        estado = 4;
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
                    .input('codigoSisa', sql.BigInt, codigoSisa)
                    .query('select idEfector from dbo.Sys_Efector WHERE codigoSisa = @codigoSisa');

                result[1] = await pool.request()
                    .input('dniProfesional', sql.Int, dniProfesional)
                    .query('SELECT idProfesional FROM dbo.Sys_Profesional WHERE numeroDocumento = @dniProfesional and activo = 1');

                result[2] = await pool.request()
                    .input('conceptId', sql.BigInt, conceptId)
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

    suspenderTurnosSips(idAgendaSips);
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

    let query = "INSERT INTO dbo.CON_Turno ( idAgenda , idTurnoEstado , idUsuario ,  idPaciente ,  fecha , hora , sobreturno , idTipoTurno , idObraSocial , idTurnoAcompaniante, objectId ) VALUES  ( " + idAgendaSips + " , 1 , 0000 , 410551 , '" + fechaTurno + "' ,'" + horaTurno + "' , 0 , 0 , 1 ,0, '" + turno._id + "')";

    let turnoGrabado = await insertaSips(query);
}

function suspenderTurnosSips(idAgendaSips) {
    let query = "UPDATE dbo.CON_Turno SET idTurnoEstado = 5 WHERE idAgenda = " + idAgendaSips;

    insertaSips(query);
}

/*Fin Sección Turnos*/

function insertaSips(query: any) {
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


