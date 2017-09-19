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

export function getAgendaSips() {
    const url = configPrivate.hosts.mongoDB_main.host;
    const coleccion = 'agendaSipsCache';

    MongoClient.connect(url, function (err: any, dbMongo: any) {

        if (err) {
            dbMongo.close();

            return ({
                err: 'No se puede conectar a MongoClient'
            });
        }

        dbMongo.collection(coleccion).find().toArray(function (err3, items) {

            async.forEach(items, function (agenda, done) {

                isAgendaSips(agenda._id).then(function (data) {

                    if (data) {

                        grabaTurnoSips(agenda);

                    } else {
                        let offset = 0;

                        setTimeout(function () {
                            // console.log('Cursooo: ', agenda);
                            grabaSips(agenda);
                        }, 5000 + offset);
                        offset += 10000;
                    }
                });
            });

        });

        dbMongo.close();
    });
}

function grabaTurnoSips(agendaMongo) {
    let turnos;

    for (let x = 0; x < agendaMongo.bloques.length; x++) {
        turnos = agendaMongo.bloques[x].turnos;

        if (turnos[x].estado === 'asignado') {
            console.log("Turnossss ", turnos[x].estado);
        }
    }
}

// Verifica si la agenda ya existe en SIPS a través del objectId de Mongo
function isAgendaSips(idMongo: any) {

    let query = "SELECT * FROM dbo.CON_Agenda WHERE objectId = '" + idMongo + "'";

    return new Promise((resolve: any, reject: any) => {
        (async function () {
            try {
                let pool = await sql.connect(connection);

                const transaction = new sql.Transaction(pool);
                transaction.begin(err => {
                    // ... error checks 

                    const request = new sql.Request(transaction)
                    request.query(query, (err, result) => {
                        // ... error checks
                        if (err)
                            return console.log('Error SQL.', err.message);

                        transaction.commit(err1 => {
                            // ... error checks 
                            if (err1)
                                return console.log('Transaction uncommitted.', err1);

                            // console.log('Resultttt ', result);
                            return 'Transaction Commited.';
                        });

                        if (result.length > 0) {

                            resolve(result);
                        }

                    });
                });

            } catch (err) {
                // ... error checks 
            }
        })();

        sql.on('error', err => {
            // ... error handler 
        });
    });
}

function grabaSips(agendaSips: any) {

    let objectId = agendaSips._id;
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

    let datosSips = getDatosSips(codigoSisa, dniProfesional, tipoPrestacion);

    let query;

    Promise.all([datosSips]).then(values => {

        let idEfector = values[0][0][0].idEfector;
        let idProfesional = values[0][1][0].idProfesional;
        let idEspecialidad = values[0][2][0].idEspecialidad;
        let idServicio = values[0][2][0].idServicio;
        let idTipoPrestacion = 0;

        query = "insert into Con_Agenda (idAgendaEstado, idEfector, idServicio, idProfesional, idTipoPrestacion, idEspecialidad, idConsultorio, fecha, duracion, horaInicio, horaFin, maximoSobreTurnos, porcentajeTurnosDia, porcentajeTurnosAnticipados, citarPorBloques, cantidadInterconsulta, turnosDisponibles, idMotivoInactivacion, multiprofesional, objectId) values (" + estado + ", " + idEfector + ", " + idServicio + ", " + idProfesional + ", " + idTipoPrestacion + ", " + idEspecialidad + ", " + agendaSips.idConsultorio + ", '" + fecha + "', " + duracionTurno + ", '" + horaInicio + "', '" + horaFin + "', " + maximoSobreTurnos + ", " + porcentajeTurnosDia + ", " + porcentajeTurnosAnticipados + ", " + citarPorBloques + " , " + cantidadInterconsulta + ", " + turnosDisponibles + ", " + idMotivoInactivacion + ", " + multiprofesional + ", '" + objectId + "'); select @@identity";

        (async function () {
            try {
                let pool = await sql.connect(connection);

                const transaction = new sql.Transaction(pool);
                transaction.begin(err => {
                    // ... error checks 

                    var request = new sql.Request(transaction);
                    request.query(query, (err, result) => {
                        // ... error checks
                        if (err)
                            return console.log("Errooo.", err.message);;


                        transaction.commit(err1 => {
                            // ... error checks 
                            if (err1)
                                return console.log('Transaction uncommitted.', err1);


                            return 'Transaction Commited.';
                        });
                    });
                });

            } catch (err) {
                // ... error checks 
            }
        })();

        sql.on('error', err => {
            // ... error handler 
        });
    }, reason => {
        console.log(reason)
    });
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

                // console.dir(result1);

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

