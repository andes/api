import * as mongoose from 'mongoose';
import { agendasCache } from '../../legacy/schemas/agendasCache';
import * as configPrivate from '../../../config.private';
import * as sql from 'mssql';
import * as moment from 'moment';
import * as pacientes from './../../../core/mpi/controller/paciente';
import * as constantes from '../../legacy/schemas/constantes';
import * as logger from './../../../utils/loggerAgendaSipsCache';
import * as agendaSchema from '../schemas/agenda';
import * as turnoCtrl from './turnoCacheController';

const MongoClient = require('mongodb').MongoClient;

let async = require('async');
let pool;
let transaction;

let connection = {
    user: configPrivate.conSql.auth.user,
    password: configPrivate.conSql.auth.password,
    server: configPrivate.conSql.serverSql.server,
    database: configPrivate.conSql.serverSql.database
};

export async function getAgendaSips() {
    pool = await sql.connect(connection);
    
    let agendasMongoExportadas = await getAgendasDeMongoExportadas();

    agendasMongoExportadas.forEach(async (agenda) => {
        await checkCodificacion(agenda);
    });

    let agendasMongoPendientes = await getAgendasDeMongoPendientes();

    if (agendasMongoPendientes.length > 0) {
        await guardarCacheASips(agendasMongoPendientes, 0);
    }

    async function guardarCacheASips(agendasMongo, index) {
        let agenda = agendasMongo[index];
        let transaccion = await new sql.Transaction(pool);
        await transaccion.begin(async err => {

            let rolledBack = false;
            transaccion.on('rollback', aborted => {                
                rolledBack = true;
            });

            try {
                // CON_Agenda de SIPS soporta solo un profesional NOT NULL.
                // En caso de ser nulo el paciente en agenda de ANDES, por defector
                // graba dni '0', correspondiente a 'Sin especifiar', efector SSS.
                let dniProfesional = agenda.profesionales[0] ? agenda.profesionales[0].documento : '0';
                let codigoSisa = agenda.organizacion.codigo.sisa;

                let datosSips = {
                    idEfector: '',
                    idProfesional: ''
                };

                let datosArr = await getDatosSips(codigoSisa, dniProfesional);

                datosSips.idEfector = datosArr[0][0].idEfector;
                datosSips.idProfesional = datosArr[1][0].idProfesional;

                let idAgenda = await processAgenda(agenda, datosSips);

                await processTurnos(agenda, idAgenda, datosSips.idEfector);
                await checkEstadoAgenda(agenda, idAgenda);
                await checkEstadoTurno(agenda, idAgenda);
                await checkAsistenciaTurno(agenda);               

                transaccion.commit(async err2 => {
                    await markAgendaAsProcessed(agenda);
                    next();
                });

            } catch (ee) {
                logger.LoggerAgendaCache.logAgenda(agenda._id, ee);
                transaccion.rollback();
                next();
            }
        });

        function next() {
            ++index;
            if (index < agendasMongo.length) {
                guardarCacheASips(agendasMongo, index);
            }
        }
    }

    /* Traemos las agendas de CITAS/Mongo que están pendientes de exportar a SIPS*/
    async function getAgendasDeMongoPendientes() {
        return new Promise<Array<any>>(function (resolve, reject) {
            agendasCache.find({ estadoIntegracion: constantes.EstadoExportacionAgendaCache.pendiente }).exec(async function (err, data: any) {
                if (err) {
                    return (err);
                }

                resolve(data);
            });
        });
    }

    /* Traemos las agendas de CITAS/Mongo que ya fueron exportadas a SIPS*/
    async function getAgendasDeMongoExportadas() {
        return new Promise<Array<any>>(function (resolve, reject) {
            agendasCache.find({ $or: [{ estadoIntegracion: constantes.EstadoExportacionAgendaCache.exportadaSIPS }, { estadoIntegracion: constantes.EstadoExportacionAgendaCache.codificada }] }).exec(function (err, data) {
                if (err) {
                    return (err);
                }
                resolve(data);
            });
        });
    }

    //#region Codificación Agenda en SIPS  /*

    async function checkCodificacion(agenda) {
        let turno;
        let codificacionOdonto: any = {};
        let idNomenclador: any = [];
        let datosTurno = {};

        for (let x = 0; x < agenda.bloques.length; x++) {
            turno = agenda.bloques[x].turnos;
            turno.diagnosticoSecundario = [];

            for (let z = 0; z < turno.length; z++) {

                let idTurno = await existeTurnoSips(turno[z]);                
                let cloneTurno: any = [];

                if (idTurno) {

                    let idConsulta = await existeConsultaTurno(idTurno);
                    let turnoPaciente: any = await getPacienteAgenda(agenda, turno[z]._id);

                    if (idConsulta) {
                        idNomenclador = await getConsultaOdontologia(idConsulta);

                        for (let i = 0; i < idNomenclador.length; i++) {
                            turno[z] = turnoPaciente;

                            codificacionOdonto = await getCodificacionOdonto(idNomenclador[i].idNomenclador);

                            turno[z].asistencia = 'asistio';
                            turno[z].diagnosticoSecundario[i] = {
                                ilegible: false,
                                codificacion: {
                                    codigo: codificacionOdonto.codigo,
                                    nombre: codificacionOdonto.descripcion,
                                    sinonimo: codificacionOdonto.descripcion,
                                }
                            };
                        }

                        datosTurno = {
                            idAgenda: agenda.id,
                            idTurno: turno[z]._id,
                            idBloque: agenda.bloques[x]._id,
                            idUsuario: constantes.idUsuarioSips,
                            turno: turno[z]
                        };
                    }

                    await turnoCtrl.updateTurno(datosTurno);
                    await markAgendaAsProcessed(agenda);
                }
            }
        }
    }

    /* Busca el paciente de un turno y agenda determinada*/
    function getPacienteAgenda(agenda, idTurno) {
        let turno;
        return new Promise(function (resolve, reject) {
            agendaSchema.findById(agenda.id, function getAgenda(err, data) {
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
            });
        });
    }

    function existeConsultaTurno(idTurno) {
        return new Promise(function (resolve, reject) {
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

    function getConsultaOdontologia(idConsulta) {
        return new Promise(function (resolve, reject) {
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
    //#endregion Codificación Agenda en SIPS

    /* Inicio Sección de Agendas*/
    async function processAgenda(agenda: any, datosSips) {
        let idAgenda = await existeAgendaSips(agenda);

        if (!idAgenda) {
            idAgenda = await grabaAgendaSips(agenda, datosSips);
        }

        return idAgenda;
    }

    function existeAgendaSips(agendaMongo: any) {

        return new Promise(function (resolve, reject) {
            return new sql.Request(transaction)
                .input('idAgendaMongo', sql.VarChar(50), agendaMongo.id)
                .query('SELECT idAgenda FROM dbo.CON_Agenda WHERE objectId = @idAgendaMongo GROUP BY idAgenda')
                .then(result => {
                    if (result.length > 0) {
                        resolve(result[0].idAgenda);
                    } else {
                        resolve(false);
                    }
                }).catch(err => {
                    reject(err);
                });
        });
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

        let listaIdProfesionales = [];
        listaIdProfesionales = await getProfesional(agendaSips.profesionales);

        if (agendaSips.profesionales.length > 1) {
            multiprofesional = 1;
        } else {
            multiprofesional = 0;
        }

        return new Promise(async (resolve: any, reject: any) => {
            let idEfector = datosSips.idEfector;
            let idProfesional = datosSips.idProfesional;
            let idEspecialidad = await getEspecialidadSips(agendaSips.tipoPrestaciones[0].term);
            let idServicio = 177;
            let idTipoPrestacion = 0;
            let idConsultorio = await existeConsultorio(agendaSips, idEfector);

            let query = 'insert into Con_Agenda (idAgendaEstado, idEfector, idServicio, idProfesional, idTipoPrestacion, idEspecialidad, idConsultorio, fecha, duracion, horaInicio, horaFin, maximoSobreTurnos, porcentajeTurnosDia, porcentajeTurnosAnticipados, citarPorBloques, cantidadInterconsulta, turnosDisponibles, idMotivoInactivacion, multiprofesional, objectId) ' +
                'values (' + estado + ', ' + idEfector + ', ' + idServicio + ', ' + idProfesional + ', ' + idTipoPrestacion + ', ' + idEspecialidad + ', ' + idConsultorio + ', \'' + fecha + '\', ' + duracionTurno + ', \'' + horaInicio + '\', \'' + horaFin + '\', ' + maximoSobreTurnos + ', ' + porcentajeTurnosDia + ', ' + porcentajeTurnosAnticipados + ', ' + citarPorBloques + ' , ' + cantidadInterconsulta + ', ' + turnosDisponibles + ', ' + idMotivoInactivacion + ', ' + multiprofesional + ', \'' + objectId + '\')';

            executeQuery(query).then(function (idAgendaCreada) {
                let query2;

                if (listaIdProfesionales.length > 0) {
                    listaIdProfesionales.forEach(async function (listaIdProf) {

                        query2 = 'INSERT INTO dbo.CON_AgendaProfesional ( idAgenda, idProfesional, baja, CreatedBy , '
                            + ' CreatedOn, ModifiedBy, ModifiedOn, idEspecialidad ) VALUES  ( '
                            + idAgendaCreada + ','
                            + listaIdProf[0].idProfesional + ','
                            + 0 + ','
                            + constantes.idUsuarioSips + ','
                            + '\'' + moment().format('YYYYMMDD HH:mm:ss') + '\', '
                            + '\'' + moment().format('YYYYMMDD HH:mm:ss') + '\', '
                            + '\'' + moment().format('YYYYMMDD HH:mm:ss') + '\', '
                            + idEspecialidad + ' ) ';

                        await executeQuery(query2);
                    });
                }

                resolve(idAgendaCreada);
            });
        });
    }

    function getProfesional(profesionalMongo) {
        profesionalMongo = profesionalMongo.map(profMongo => arrayIdProfesionales(profMongo));

        return Promise
            .all(profesionalMongo)
            .then(arrayIdProf => {
                return arrayIdProf;
            });
    }

    function getEspecialidadSips(tipoPrestacion) {
        let idEspecialidad = 0;

        return new Promise((resolve, reject) => {
            if (tipoPrestacion.includes('odonto')) {
                /*IdEspecialidad 34 = odontologia en SIPS*/
                idEspecialidad = 34;
                resolve(idEspecialidad);
            }
        });
    }

    function arrayIdProfesionales(profMongo) {
        return new Promise((resolve, reject) => {
            const array = [];
            (async function () {
                try {
                    let query = 'SELECT idProfesional FROM dbo.Sys_Profesional WHERE numeroDocumento = @dniProfesional AND activo = 1';

                    let result = await pool.request()
                        .input('dniProfesional', sql.Int, profMongo.documento)
                        .query(query);

                    array.push(result[0]);
                    return resolve(array);
                } catch (err) {
                    reject(err);
                }
            })();
        });

    }

    async function creaConsultorioSips(agenda: any, idEfector: any) {
        let nombre = { nombre: 'Sin Espacio Físico', _id: 'andesCitas2017' };
        agenda.espacioFisico = nombre;

        return new Promise(async (resolve: any, reject: any) => {
            let idConsultorioTipo = await crearConsultorioTipoSips(agenda, idEfector);

            let query = ' INSERT INTO dbo.CON_Consultorio '
                + ' ( idEfector , idTipoConsultorio ,  nombre , Activo, objectId ) VALUES ( '
                + idEfector + ','
                + idConsultorioTipo + ','
                + '\'' + agenda.espacioFisico.nombre + '\', '
                + ' 1 ,'
                + '\'' + agenda.espacioFisico._id + '\' )';

            executeQuery(query).then(function (data) {
                return resolve(data);
            });
        });
    }

    function crearConsultorioTipoSips(agenda, idEfector) {
        let nombre = { nombre: 'Sin Espacio Físico', _id: 'andesCitas2017' };
        agenda.espacioFisico = nombre;

        return new Promise(async (resolve: any, reject: any) => {
            let query = 'INSERT INTO dbo.CON_ConsultorioTipo '
                + ' ( idEfector, nombre, objectId ) VALUES  ( '
                + idEfector + ','
                + '\'' + agenda.espacioFisico.nombre + '\','
                + '\'' + agenda.espacioFisico._id + '\' )';

            executeQuery(query).then(function (data) {
                return resolve(data);
            });
        });
    }

    function existeConsultorio(agenda, idEfector) {
        let idConsultorio;
        let espacioFisicoObjectId = null;

        if (agenda.espacioFisico) {
            espacioFisicoObjectId = agenda.espacioFisico._id;
        } else {
            /*La agenda viene sin espacio físico, así que se lo agrego para poder verlo en SIPS*/
            espacioFisicoObjectId = 'andesCitas2017';
        }

        return new Promise((resolve: any, reject: any) => {
            (async function () {
                try {

                    let query = 'SELECT top 1 idConsultorio FROM dbo.CON_Consultorio WHERE objectId = @objectId';
                    let result = await new sql.Request(transaction)
                        .input('objectId', sql.VarChar(50), espacioFisicoObjectId)
                        .query(query);

                    if (typeof result[0] !== 'undefined') {
                        idConsultorio = result[0].idConsultorio;
                        resolve(idConsultorio);
                    } else {
                        idConsultorio = await creaConsultorioSips(agenda, idEfector);
                        resolve(idConsultorio);
                    }

                } catch (err) {
                    reject(err);
                }
            })();
        });
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

        return estado;
    }

    function getDatosSips(codigoSisa?, dniProfesional?) {

        return new Promise((resolve: any, reject: any) => {
            (async function () {
                try {
                    let result: any[] = [];

                    result[0] = await new sql.Request(transaction)
                        .input('codigoSisa', sql.VarChar(50), codigoSisa)
                        .query('select idEfector from dbo.Sys_Efector WHERE codigoSisa = @codigoSisa');

                    result[1] = await new sql.Request(transaction)
                        .input('dniProfesional', sql.Int, dniProfesional)
                        .query('SELECT idProfesional FROM dbo.Sys_Profesional WHERE numeroDocumento = @dniProfesional and activo = 1');                    

                    resolve(result);
                } catch (err) {
                    reject(err);
                }
            })();
        });
    }

    async function checkEstadoAgenda(agendaMongo: any, idAgendaSips: any) {

        let estadoAgendaSips: any = await getEstadoAgenda(agendaMongo.id);
        let estadoAgendaMongo = getEstadoAgendaSips(agendaMongo.estado);

        if ((estadoAgendaSips !== estadoAgendaMongo) && (agendaMongo.estado === 'suspendida')) {
            let query = 'UPDATE dbo.CON_Agenda SET idAgendaEstado = ' + estadoAgendaMongo + '   WHERE idAgenda = ' + idAgendaSips;
            await executeQuery(query);
        }
    }

    function getEstadoAgenda(idAgenda: any) {

        return new Promise((resolve: any, reject: any) => {
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

    /*Fin Sección Agendas*/

    /*Inicio Sección Turnos*/
    async function processTurnos(agendas: any, idAgendaCreada: any, idEfector: any) {
        let turnos;

        for (let x = 0; x < agendas.bloques.length; x++) {
            turnos = agendas.bloques[x].turnos;

            for (let i = 0; i < turnos.length; i++) {

                if (turnos[i].estado === 'asignado') {
                    let idTurno = await existeTurnoSips(turnos[i]);

                    if (!idTurno) {
                        await grabaTurnoSips(turnos[i], idAgendaCreada, idEfector);
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
                    await actualizarEstadoTurnoSips(idAgendaSips, turnos[i]);
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

                    let idTurno: any = await getEstadoTurnoSips(turnos[i]._id);
                    let fechaAsistencia = moment(turnos[i].updatedAt).format('YYYYMMDD');
                    let query = 'INSERT INTO dbo.CON_TurnoAsistencia ( idTurno , idUsuario , fechaAsistencia ) VALUES  ( ' +
                        idTurno.idTurno + ' , ' + constantes.idUsuarioSips + ' , \'' + fechaAsistencia + '\' )';

                    await executeQuery(query);
                }
            }
        }
    }

    function existeTurnoSips(turno: any) {
        return new Promise(function (resolve, reject) {

            return new sql.Request(transaction)
                .input('idTurnoMongo', sql.VarChar(50), turno._id)
                .query('SELECT idTurno FROM dbo.CON_Turno WHERE objectId = @idTurnoMongo GROUP BY idTurno')
                .then(result => {
                    if (result.length > 0) {
                        resolve(result[0].idTurno);
                    } else {
                        resolve(false);
                    }
                }).catch(err => {
                    reject(err);
                });
        });
    }

    async function grabaTurnoSips(turno, idAgendaSips, idEfector) {
        // TODO: El paciente pudiera no estar validado, en ese caso no se encontrara en la
        // colección de paciente de MPI, en ese caso buscar en la coleccion de pacientes de Andes
        let pacienteEncontrado = await pacientes.buscarPaciente(turno.paciente.id);
        let paciente = pacienteEncontrado.paciente;
        // if(!pacienteEncontrado) {
        //  pacienteEncontrado = buscar en andes.......
        // }

        let idObraSocial = await getIdObraSocialSips(paciente.documento);
        let pacienteId = await getPacienteMPI(paciente, idEfector);

        let fechaTurno = moment(turno.horaInicio).format('YYYYMMDD');
        let horaTurno = moment(turno.horaInicio).utcOffset('-03:00').format('HH:mm');

        let query = 'INSERT INTO dbo.CON_Turno ( idAgenda , idTurnoEstado , idUsuario ,  idPaciente ,  fecha , hora , sobreturno , idTipoTurno , idObraSocial , idTurnoAcompaniante, objectId ) VALUES  ( ' +
            idAgendaSips + ' , 1 , ' + constantes.idUsuarioSips + ' ,' + pacienteId + ', \'' + fechaTurno + '\' ,\'' + horaTurno + '\' , 0 , 0 ,' + idObraSocial + ' , 0, \'' + turno._id + '\')';

        let turnoGrabado = await executeQuery(query);
    }

    // getIdObraSocialSips obtiene ID de O.Social buscando coincidencias 'DNI/Cod O.S' en la tabla de PUCO
    // pudiendo devolver 0..n códigos de obra social. Según los códigos obtenidos, se retornará un único id
    // según siguiente criterio:
    // --> Si se obtiene +2 resultados, se optará por el de máxima prioridad, siendo que:
    //      - ISSN: Mínima prioridad
    //      - PAMI: Prioridad media
    //      - Cualquier otro financiador: Prioridad máxima
    // --> Si obtiene 1 resultado, es el elegido
    // --> Si se obtiene 0 resultados, se retorna el id de PLAN SUMAR por defecto, cuyo valor está en constante.
    async function getIdObraSocialSips(documentoPaciente) {
        const idSumar = 499;
        let query = 'SELECT TOP(1) sips_os.idObraSocial as idOS '
            + 'FROM [Padron].[dbo].[Pd_PUCO] puco '
            + 'JOIN [SIPS].[dbo].[Sys_ObraSocial] sips_os ON puco.CodigoOS = sips_os.cod_PUCO '
            + 'WHERE puco.DNI =  ' + documentoPaciente
            + 'ORDER BY  ( '
            + 'SELECT p =  '
            + 'CASE prio.prioridad  '
            + 'WHEN NULL THEN 1 '
            + 'ELSE prio.prioridad '
            + 'END '
            + 'FROM [SIPS].[dbo].[Sys_ObraSocial_Prioridad] as prio '
            + 'WHERE prio.idObraSocial = sips_os.idObraSocial '
            + ') ASC';

        try {
            let result = await new sql.Request(transaction).query(query);
            return (result.length > 0 ? result[0].idOS : idSumar);
        } catch (err) {
            return false;
        }
    }

    async function actualizarEstadoTurnoSips(idAgendaSips, turno) {

        let estadoTurnoSips: any = await getEstadoTurnoSips(turno._id);
        let estadoTurnoMongo = getEstadoTurnosCitasSips(turno.estado, turno.updatedAt);

        if (estadoTurnoSips.idTurnoEstado !== estadoTurnoMongo) {
            let objectIdTurno;

            if (turno._id) {
                objectIdTurno = ' and objectId = \'' + turno._id + '\'';
            }

            /*TODO: hacer enum con los estados */
            var horaInicio = moment(turno.horaInicio).utcOffset('-03:00').format('HH:mm');

            if ((estadoTurnoMongo === constantes.EstadoTurnosSips.suspendido || turno.estado === 'turnoDoble') && !await existeTurnoBloqueoSips(idAgendaSips, horaInicio)) {
                await grabarTurnoBloqueo(idAgendaSips, turno);
            }

            let query = 'UPDATE dbo.CON_Turno SET idTurnoEstado = ' + estadoTurnoMongo + ' WHERE idAgenda = ' + idAgendaSips + objectIdTurno;
            await executeQuery(query);
        }
    }

    async function existeTurnoBloqueoSips(idAgendaSips, horaInicio) {

        let query = 'SELECT COUNT(b.idTurnoBloqueo) as count FROM CON_TurnoBloqueo b ' +
            'JOIN CON_TURNO t on t.idAgenda = b.idAgenda ' +
            'WHERE b.idAgenda = ' + idAgendaSips +
            ' AND b.horaTurno = \'' + horaInicio + '\'';

        try {
            let result = await new sql.Request(transaction).query(query);
            return result[0].count > 0;
        } catch (err) {
            return false;
        }
    }

    async function grabarTurnoBloqueo(idAgendaSips, turno) {
        const motivoBloqueo = getMotivoTurnoBloqueoSips(turno);
        var fechaBloqueo = moment(turno.horaInicio).format('YYYYMMDD');
        var horaBloqueo = moment(turno.horaInicio).utcOffset('-03:00').format('HH:mm');

        let queryTurnoBloqueo = 'INSERT dbo.CON_TurnoBloqueo (idAgenda '
            + ', fechaTurno '
            + ', horaTurno '
            + ', idUsuarioBloqueo '
            + ', fechaBloqueo '
            + ', idMotivoBloqueo) ';
        queryTurnoBloqueo += 'VALUES ('
            + idAgendaSips + ', '
            + '\'' + fechaBloqueo + '\', '
            + '\'' + horaBloqueo + '\', '
            + constantes.idUsuarioSips + ', '
            + '\'' + moment(turno.updatedAt).format('YYYYMMDD') + '\', '
            + motivoBloqueo + ')';

        await executeQuery(queryTurnoBloqueo);
    }

    function getMotivoTurnoBloqueoSips(turno) {
        let motivoBloqueo;

        if (turno.estado === 'suspendido') {
            motivoBloqueo = getMotivoTurnoSuspendido(turno.motivoSuspension);
        } else if (turno.estado === 'turnoDoble') {
            motivoBloqueo = constantes.MotivoTurnoBloqueo.turnoDoble;
        }

        return motivoBloqueo;
    }

    function getMotivoTurnoSuspendido(motivoSuspension) {
        let devuelveMotivoSuspension;

        switch (motivoSuspension) {
            case 'profesional': devuelveMotivoSuspension = constantes.MotivoTurnoBloqueo.retiroDelProfesional;
                break;
            case 'edilicia': devuelveMotivoSuspension = constantes.MotivoTurnoBloqueo.otros;
                break;
            case 'organizacion': devuelveMotivoSuspension = constantes.MotivoTurnoBloqueo.reserva;
                break;
        }

        return devuelveMotivoSuspension;
    }

    /* TODO: ver si hay mas estados de turnos entre CITAS y SIPS*/
    function getEstadoTurnosCitasSips(estadoTurnoCitas, updated) {
        let estado: any;

        if (estadoTurnoCitas === 'asignado') {
            estado = constantes.EstadoTurnosSips.activo;
        } else if ((estadoTurnoCitas === 'disponible') && (updated)) {
            estado = constantes.EstadoTurnosSips.liberado;
        } else if (estadoTurnoCitas === 'suspendido') {
            estado = constantes.EstadoTurnosSips.suspendido;
        }

        return estado;
    }

    /* Devuelve el estado del turno en Con_Turno de SIPS */
    function getEstadoTurnoSips(objectId: any) {
        return new Promise((resolve: any, reject: any) => {
            (async function () {
                try {
                    let query = 'SELECT idAgenda, idTurno, idTurnoEstado FROM dbo.CON_Turno WHERE objectId = @objectId';
                    let result = await new sql.Request(transaction)
                        .input('objectId', sql.VarChar(50), objectId)
                        .query(query);

                    if (typeof result[0] !== 'undefined') {
                        resolve(result[0]);
                    } else {
                        let idTurnoEstado = 0;
                        resolve(idTurnoEstado);
                    }

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
            return new sql.Request(transaction)
                .query(query)
                .then(result => {
                    resolve(result[0].id);
                }).catch(err => {
                    reject(err);
                });
        });
    }

    async function markAgendaAsProcessed(agenda) {
        let estadoIntegracion;

        switch (agenda.estadoIntegracion) {
            case 'pendiente': estadoIntegracion = constantes.EstadoExportacionAgendaCache.exportadaSIPS;
                break;
            case 'exportada a Sips': estadoIntegracion = constantes.EstadoExportacionAgendaCache.codificada;
                break;
        }

        return agendasCache.update({ _id: agenda._id }, {
            $set: {
                estadoIntegracion: estadoIntegracion
            }
        }
        ).exec();
    }

    function existePacienteSips(pacienteSips) {
        let idPacienteSips;

        return new Promise((resolve: any, reject: any) => {
            (async function () {
                try {
                    let query = 'SELECT idPaciente FROM dbo.Sys_Paciente WHERE objectId = @objectId';
                    let result = await new sql.Request(transaction)
                        .input('objectId', sql.VarChar(50), pacienteSips.objectId)
                        .query(query);

                    if (typeof result[0] !== 'undefined') {
                        idPacienteSips = result[0].idPaciente;
                        resolve(idPacienteSips);
                    } else {
                        idPacienteSips = 0;
                        resolve(idPacienteSips);
                    }

                } catch (err) {
                    reject(err);
                }
            })();
        });
    }

    //#region Inserta Paciente en SIPS
    async function insertaPacienteSips(pacienteSips: any) {
        let idPacienteGrabadoSips;
        let idPaciente = await existePacienteSips(pacienteSips);

        if (idPaciente === 0) {

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
                + '\'' + pacienteSips.apellido + '\','
                + '\'' + pacienteSips.nombre + '\', '
                + pacienteSips.numeroDocumento + ', '
                + pacienteSips.idSexo + ', '
                + '\'' + pacienteSips.fechaNacimiento + '\','
                + pacienteSips.idEstado + ', '
                + pacienteSips.idMotivoNI + ', '
                + pacienteSips.idPais + ', '
                + pacienteSips.idProvincia + ', '
                + pacienteSips.idNivelInstruccion + ', '
                + pacienteSips.idSituacionLaboral + ', '
                + pacienteSips.idProfesion + ', '
                + pacienteSips.idOcupacion + ', '
                + '\'' + pacienteSips.calle + '\', '
                + pacienteSips.numero + ', '
                + '\'' + pacienteSips.piso + '\', '
                + '\'' + pacienteSips.departamento + '\', '
                + '\'' + pacienteSips.manzana + '\', '
                + pacienteSips.idBarrio + ', '
                + pacienteSips.idLocalidad + ', '
                + pacienteSips.idDepartamento + ', '
                + pacienteSips.idProvinciaDomicilio + ', '
                + '\'' + pacienteSips.referencia + '\', '
                + '\'' + pacienteSips.informacionContacto + '\', '
                + pacienteSips.cronico + ', '
                + pacienteSips.idObraSocial + ', '
                + pacienteSips.idUsuario + ', '
                + '\'' + pacienteSips.fechaAlta + '\', '
                + '\'' + pacienteSips.fechaDefuncion + '\', '
                + '\'' + pacienteSips.fechaUltimaActualizacion + '\', '
                + pacienteSips.idEstadoCivil + ', '
                + pacienteSips.idEtnia + ', '
                + pacienteSips.idPoblacion + ', '
                + pacienteSips.idIdioma + ', '
                + '\'' + pacienteSips.otroBarrio + '\', '
                + '\'' + pacienteSips.camino + '\', '
                + '\'' + pacienteSips.campo + '\', '
                + pacienteSips.esUrbano + ', '
                + '\'' + pacienteSips.lote + '\', '
                + '\'' + pacienteSips.parcela + '\', '
                + '\'' + pacienteSips.edificio + '\', '
                + pacienteSips.activo + ', '
                + '\'' + pacienteSips.fechaAltaObraSocial + '\', '
                + '\'' + pacienteSips.numeroAfiliado + '\', '
                + '\'' + pacienteSips.numeroExtranjero + '\', '
                + '\'' + pacienteSips.telefonoFijo + '\', '
                + '\'' + pacienteSips.telefonoCelular + '\', '
                + '\'' + pacienteSips.email + '\', '
                + '\'' + pacienteSips.latitud + '\', '
                + '\'' + pacienteSips.longitud + '\', '
                + '\'' + pacienteSips.objectId + '\' '
                + ') ';

            idPacienteGrabadoSips = await executeQuery(query);
        } else {
            idPacienteGrabadoSips = idPaciente;
        }

        return idPacienteGrabadoSips;
    }
    //#endregion

    // #region GetPacienteMPI
    /** Este método se llama desde grabaTurnoSips */
    async function getPacienteMPI(paciente: any, idEfectorSips: any) {

        let pacienteSips = {
            idEfector: idEfectorSips,
            nombre: paciente.nombre,
            apellido: paciente.apellido,
            numeroDocumento: paciente.documento,
            idSexo: (paciente.sexo === 'masculino' ? 3 : paciente.sexo === 'femenino' ? 2 : 1),
            fechaNacimiento: moment(paciente.fechaNacimiento).format('YYYYMMDD'),
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
            idUsuario: constantes.idUsuarioSips,
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
            objectId: paciente._id
        };

        let idPacienteGrabadoSips = await insertaPacienteSips(pacienteSips);

        return idPacienteGrabadoSips;
    }
    //#endregion
}
