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
    const coleccion = 'agendasCache';
    let offset = 0;

    MongoClient.connect(url, function (errorConexion: any, dbMongo: any) {
        if (errorConexion) {
            dbMongo.close();
        }

        dbMongo.collection(coleccion).find().toArray(function (errMongo, listasAgendaMongo) {
            async.eachOfSeries(listasAgendaMongo, function (agendaMongo, key, callback) {

                existeAgendaSips(agendaMongo.id).then(function (data) {

                    console.log("Data: ", data);
                    if (data) {
                        console.log("La agenda existe: ", agendaMongo.organizacion.nombre);
                        callback();
                    } else {
                        setTimeout(function () {
                            console.log("AgendaMongoooo ", agendaMongo);

                            grabaSips(agendaMongo);

                            callback();
                        }, 15000 + offset);
                        offset += 10000;
                    }
                }, function (err) {
                    if (err) console.error(err.message);
                    // configs is now a map of JSON data
                    console.log("All done")
                });

                // async.forEach(listasAgendaMongo, function (agendaMongo, done) {
                //     existeAgendaSips(agendaMongo.id).then(function (data) {

                //         console.log("Devuelve Data: ", data);

                //         if (data) {
                //             console.log("La agenda existe: ", agendaMongo.organizacion.nombre);
                //         } else {
                //             let offset = 0;

                //             setTimeout(function () {
                //                 console.log("AgendaMongoooo ", agendaMongo);

                //                 grabaSips(agendaMongo);
                //             }, 5000 + offset);
                //             offset += 10000;
                //         }
                //     });
                // });
            });
        });
    });

    // Verifica si la agenda ya existe en SIPS a través del objectId de Mongo
    function existeAgendaSips(idMongo: any) {
        console.log("Idmongo ", idMongo);
        let isAgenda = false;

        let query = "SELECT * FROM dbo.CON_Agenda WHERE objectId = '" + idMongo + "'";
        console.log("Query: ", query);

        var listaRegistros: any[] = [];

        return new Promise((resolve: any, reject: any) => {
            sql.connect(connection, function (err: any) {
                if (err) {
                    console.log("Error de Conexión sql", err);
                    reject(err);
                }

                var request = new sql.Request();
                request.stream = true;
                request.query(query);
                // Puede ser una consulta a una vista que tenga toda la información

                request.on('row', function (row: any) {
                    // Emitted for each row in a recordset
                    console.log("Registrosss ", row);
                    // listaRegistros.push(row);
                    if (row > 0) {
                        isAgenda = true;
                    }
                });

                request.on('error', function (err: any) {
                    // May be emitted multiple times
                });

                request.on('done', function (affected: any) {
                    // Always emitted as the last one
                    console.log("Cant de registros: ", affected);

                    if (affected > 0) {
                        isAgenda = true;
                    }
                    resolve(isAgenda);

                    sql.close();
                    
                });

            });
            sql.on('error', function (err: any) {
                console.log("Error de conexión", err);
                reject(err);
            });
        });

    }

    // export function getAgendaSips() {
    //     const url = configPrivate.hosts.mongoDB_main.host;
    //     const coleccion = 'agendasCache';

    //     MongoClient.connect(url, function (err: any, dbMongo: any) {

    //         if (err) {
    //             dbMongo.close();

    //             return ({
    //                 err: 'No se puede conectar a MongoClient'
    //             });
    //         }
    //         let x = 0;
    //         dbMongo.collection(coleccion).find().toArray(function (err3, items) {

    //             async.forEach(items, function (agendaMongo, done) {

    //                 isAgendaSips(agendaMongo.id).then(function (agendaSips: any) {

    //                     if (agendaSips.isAgenda) {
    //                         let offset = 0;

    //                         setTimeout(function () {
    //                             grabaTurnoSips(agendaMongo, agendaSips[0]);
    //                         }, 5000 + offset);
    //                         offset += 10000;

    //                     } else {
    //                         let offset = 0;

    //                         setTimeout(function () {
    //                             // console.log('Cursooo: ', agenda);
    //                             console.log("AgendaMongoooo ", agendaMongo + ' --- ' + x);
    //                             x++;
    //                             grabaSips(agendaMongo);
    //                         }, 5000 + offset);
    //                         offset += 10000;
    //                     }
    //                 });
    //             });

    //         });

    //         dbMongo.close();
    //     });
    // }

    // function grabaTurnoSips(agendaMongo, agendaSips) {
    //     let turnos;

    //     console.log("Mongopoo ", agendaMongo);
    //     console.log("SIPSSSS ", agendaSips);

    //     for (let x = 0; x < agendaMongo.bloques.length; x++) {
    //         turnos = agendaMongo.bloques[x].turnos;

    //         if (turnos[x].estado === 'asignado') {

    //             let fechaTurno = moment(turnos[x].horaInicio).format('YYYYMMDD');
    //             let horaTurno = moment(turnos[x].horaInicio).utc().format('HH:mm');

    //             let query = "INSERT INTO dbo.CON_Turno ( idAgenda , idTurnoEstado , idUsuario ,  idPaciente ,  fecha , hora , sobreturno , idTipoTurno , idObraSocial , idTurnoAcompaniante, objectId ) VALUES  ( " + agendaSips.idAgenda + " , 1 , 0000 , 410551 , '" + fechaTurno +  "' ,'" + horaTurno + "' , 0 , 0 , 1 ,0, '" + turnos[x]._id + "')";            

    //             (async function () {
    //                 try {
    //                     let pool = await sql.connect(connection);

    //                     const transaction = new sql.Transaction(pool);
    //                     transaction.begin(err => {
    //                         // ... error checks 

    //                         var request = new sql.Request(transaction);
    //                         request.query(query, (err, result) => {
    //                             // ... error checks
    //                             if (err)
    //                                 return console.log("Errooo.", err.message);;


    //                             transaction.commit(err1 => {
    //                                 // ... error checks 
    //                                 if (err1)
    //                                     return console.log('Transaction uncommitted.', err1);

    //                                 return 'Transaction Commited.';
    //                             });
    //                         });
    //                     });

    //                 } catch (err) {
    //                     // ... error checks 
    //                 }
    //             })();
    //         }
    //     }
    // }

    // // Verifica si la agenda ya existe en SIPS a través del objectId de Mongo
    // function isAgendaSips(idMongo: any) {
    //     let isAgenda = false;

    //     let query = "SELECT * FROM dbo.CON_Agenda WHERE objectId = '" + idMongo + "'";

    //     return new Promise((resolve: any, reject: any) => {
    //         (async function () {
    //             try {
    //                 let pool = await sql.connect(connection);

    //                 const transaction = new sql.Transaction(pool);
    //                 transaction.begin(err => {
    //                     // ... error checks 

    //                     const request = new sql.Request(transaction)
    //                     request.query(query, (err, result) => {
    //                         // ... error checks
    //                         if (err)
    //                             return console.log('Error SQL.', err.message);

    //                         transaction.commit(err1 => {
    //                             // ... error checks 
    //                             if (err1)
    //                                 return console.log('Transaction uncommitted.', err1);

    //                             // console.log('Resultttt ', result);
    //                             return 'Transaction Commited.';
    //                         });

    //                         if (result.length > 0) {

    //                             result.isAgenda = true;
    //                             console.log("Resulttt ", result);
    //                         }
    //                         resolve(result);

    //                     });
    //                 });

    //             } catch (err) {
    //                 // ... error checks 
    //             }
    //         })();

    //         sql.on('error', err => {
    //             // ... error handler 
    //         });
    //     });
    // }

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

        // let datosSips = getDatosSips(codigoSisa, dniProfesional, tipoPrestacion);


        // var p1 = new Promise((resolve, reject) => {
        //     // setTimeout(resolve, 1000, "one"); 
        //     getDatosSips(codigoSisa, dniProfesional, tipoPrestacion);
        // });

        // var p2 = new Promise((resolve, reject) => { 
        //     setTimeout(resolve, 2000, "two");
        //   });
        let query;

        // Promise.all([datosSips]).then(values => {
        getDatosSips(codigoSisa, dniProfesional, tipoPrestacion).then(function (values) {

            let idEfector = values[0][0].idEfector;
            let idProfesional = values[1][0].idProfesional;
            let idEspecialidad = values[2][0].idEspecialidad;
            let idServicio = values[2][0].idServicio;
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

                    console.dir(result);

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

