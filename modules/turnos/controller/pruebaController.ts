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

const url = configPrivate.hosts.mongoDB_main.host;
const coleccion = 'agendasCache';

export function getAgendaSips() {

    let hayAgenda: any;
    let x = 0;
    getAgendasDeMongo().then(function (agendaMongo) {
        console.log("Primer then");
        for (let x = 0; x < agendaMongo.length; x++) {
            // existeAgendaSips(agendaMongo[x]).then(function (isAgenda) {


            // if (!isAgenda) {

            grabaSips(agendaMongo[x]).then(function (data) {
                setTimeout(function () {
                    console.log("Contador", x);

                }, 10000);
                x++;
            });
        }
    }).then(function () {
        console.log("Segundo then: ");
    });
}


function getAgendasDeMongo() {
    return new Promise(function (resolve, reject) {

        MongoClient.connect(url, function (errorConexion: any, dbMongo: any) {
            if (errorConexion) {
                dbMongo.close();
                reject(errorConexion);
            }

            dbMongo.collection(coleccion).find().toArray(function (errMongo, listasAgendaMongo) {
                resolve(listasAgendaMongo);
                dbMongo.close();
            });
        });
    });
}

function existeAgendaSips(agendaMongo: any) {

    let isAgenda = false;
    let idAgenda = agendaMongo;
    console.log("ObjectId: ", idAgenda);

    return new Promise(function (resolve, reject) {

        setTimeout(function () {
            sql.connect(connection).then(pool => {

                return pool.request()
                    .input('idAgendaMongo', sql.VarChar(50), idAgenda)
                    .query('SELECT COUNT(1) AS cant FROM dbo.CON_Agenda WHERE objectId = @idAgendaMongo');
            }).then(result => {
                if (result[0].cant > 0) {
                    isAgenda = true;
                    resolve(idAgenda);
                } else {
                    // grabaSips(agendaMongo).then(function (data) {
                    //     console.log("Grabaaaaaa: ", data);
                    resolve(false);
                    // });
                }
                console.log("Primer result; ", result);

            }).then(result => {
                console.dir("Segundo Result: ", result);
            }).catch(err => {
                reject(err);
            });
        }, 15000);

    });

}

function grabaSips(agendaSips: any) {

    let objectId = agendaSips.id;
    let estado = getEstadoAgendaSips(agendaSips.estado);
    let codigoSisa = agendaSips.organizacion.codigo.sisa;
    let dniProfesional = agendaSips.profesionales[0].documento;
    let fecha = moment(agendaSips.horaInicio).format('YYYYMMDD');
    let horaInicio = moment(agendaSips.horaInicio).utc().format('HH:mm');
    let horaFin = moment(agendaSips.horaFin).utc().format('HH:mm');
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
        // Promise.all([datosSips]).then(values => {
        getDatosSips(codigoSisa, dniProfesional, tipoPrestacion).then(function (values) {

            let idEfector = values[0][0].idEfector;
            let idProfesional = values[1][0].idProfesional;
            let idEspecialidad = values[2][0].idEspecialidad;
            let idServicio = values[2][0].idServicio;
            let idTipoPrestacion = 0;

            existeAgendaSips(agendaSips.id).then(function (existeAgenda) {
                console.log("Existe Agenda: ", existeAgenda);

                if (!existeAgenda) {
                    sql.connect(connection).then(pool => {
                        query = "insert into Con_Agenda (idAgendaEstado, idEfector, idServicio, idProfesional, idTipoPrestacion, idEspecialidad, idConsultorio, fecha, duracion, horaInicio, horaFin, maximoSobreTurnos, porcentajeTurnosDia, porcentajeTurnosAnticipados, citarPorBloques, cantidadInterconsulta, turnosDisponibles, idMotivoInactivacion, multiprofesional, objectId) values (" + estado + ", " + idEfector + ", " + idServicio + ", " + idProfesional + ", " + idTipoPrestacion + ", " + idEspecialidad + ", " + agendaSips.idConsultorio + ", '" + fecha + "', " + duracionTurno + ", '" + horaInicio + "', '" + horaFin + "', " + maximoSobreTurnos + ", " + porcentajeTurnosDia + ", " + porcentajeTurnosAnticipados + ", " + citarPorBloques + " , " + cantidadInterconsulta + ", " + turnosDisponibles + ", " + idMotivoInactivacion + ", " + multiprofesional + ", '" + objectId + "')";

                        return pool.request()
                            .query(query);
                    }).then(result => {

                        resolve(result);
                        // console.Log("Graboo:  ", result);

                    }).catch(err => {

                    });
                }
            });

        });

    });
}

function getEstadoAgendaSips(estadoCitas) {
    let estado: any;

    if (estadoCitas === 'disponible' || estadoCitas === 'publicada') {
        estado = 1;
    } else if (estadoCitas === 'suspendida') {
        estado = 2;
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
                // ... error checks 
                console.log(err);
            }
        })();
    });
}

