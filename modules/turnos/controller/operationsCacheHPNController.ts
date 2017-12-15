//  Imports
import * as mongoose from 'mongoose';
import {
    agendasCache
} from '../../legacy/schemas/agendasCache';
import * as sql from 'mssql';
import * as moment from 'moment';
import * as pacientes from './../../../core/mpi/controller/paciente';
import * as constantes from '../../legacy/schemas/constantes';
import * as logger from './../../../utils/loggerAgendaHPNCache';
import * as agendaSchema from '../schemas/agenda';
import * as turnoCtrl from './turnoCacheController';
import * as pacienteHPN from './pacienteHPNController';
import * as medicosExistentes from '../../legacy/schemas/medicosExistentesHPN';
import { resolve } from 'path';


export async function saveAgendaToPrestaciones(agenda, pool) {
    console.log('saveAgendasToPrestaciones');
    let transaction = await new sql.Transaction(pool);

    return new Promise(async function (resolve2, reject) {
        // TODO if (medicosExistentes.documentos.indexOf(agenda.profesionales[0].documento) >= 0) {
        if (true) {
            transaction.begin(async err => {
                let rolledBack = false;
                transaction.on('rollback', aborted => {
                    rolledBack = true;
                });
                try {
                    let idAgendaHPN = await getIdAgendaHPN(agenda.id);

                    if (!idAgendaHPN) {
                        idAgendaHPN = await saveAgenda(agenda);
                        await saveAgendaProfesional(idAgendaHPN, await getIdProfesionalPrestaciones(agenda.profesionales[0].documento));
                        // await saveAgendaTipoPrestacion(idAgendaHPN, await getIdTipoPrestacion());
                        await saveAgendaTipoPrestacion(idAgendaHPN, 705);
                    }   

                    await saveBloques(idAgendaHPN, agenda.bloques);
                    await setEstadoAgendaToIntegrada(agenda._id);
                    transaction.commit(async err2 => {
                        resolve2();
                    });
                } catch (e) {
                    logger.LoggerAgendaCache.logAgenda(agenda._id, e);
                    transaction.rollback();
                    reject(e);
                }
            });
        } else {
            resolve2();
        }
    });

    async function getIdAgendaHPN(idAndes) {
        return await getIdHPN(idAndes, 'dbo.Prestaciones_Worklist_Programacion');
    }

    async function getIdProfesionalPrestaciones(documento) {
        console.log('getIdProfesionalPrestaciones');
        // let query = 'SELECT id FROM dbo.Medicos WHERE documento = @documento';
        // let result = await pool.request()
        //      .input('documento', sql.Varchar, documento)
        //      .query(query);

        // return result[0].id;
        return 18;
    }

    async function saveAgendaProfesional(idProgramacion, idProfesional) {
        console.log('saveAgendaProfesional');
        let query = 'INSERT INTO dbo.Prestaciones_Worklist_Programacion_Profesionales ' +
            '(idProgramacion, idProfesional) VALUES (@idProgramacion, @idProfesional)';
         
        // return await sql.Request(transaction)
        return await new sql.Request(transaction)
            .input('idProgramacion', sql.Int, idProgramacion)
            .input('idProfesional', sql.Int, idProfesional)
            .query(query);
    }

    async function saveAgendaTipoPrestacion(idProgramacion, idTipoPrestacion) {
        console.log('saveAgendaTipoPrestacion');
        let query = 'INSERT INTO dbo.Prestaciones_Worklist_Programacion_TiposPrestaciones ' +
            '(idProgramacion, idTipoPrestacion) VALUES (@idProgramacion, @idTipoPrestacion)';
        return await new sql.Request(transaction)
            .input('idProgramacion', sql.Int, idProgramacion)
            .input('idTipoPrestacion', sql.Int, idTipoPrestacion)
            .query(query);
    }

    async function getIdHPN(idAndes, table) {
        let query = 'SELECT id FROM ' + table + ' WHERE andesId = @idAndes';
        let result = await pool.request()
            .input('idAndes', sql.VarChar(50), idAndes)
            .query(query);

        return (result.length > 0 ?  result[0].id : null);
    }

    async function saveAgenda(_agenda) {
        console.log('saveAgenda');
        let idUbicacion = 1; // await getUbicacion(idServicio, pool); -- De donde obtengo el id de Servicio?
        let idServicio = 0; //  -- De donde obtengo el id de Servicio?
        let idTipoPrestacion = 705; //  Validar con Marcelo tipor de Prestaciones
        let idConsultorio = 1; // HARDCODE
        // Verificar si es correcto utcOffset('-03:00')
        let fechaHora = moment(_agenda.horaInicio).utcOffset('-03:00').format('YYYY-MM-DD hh:mm:ss');
        let fechaHoraFinalizacion = moment(_agenda.horaFin).utcOffset('-03:00').format('YYYY-MM-DD hh:mm:ss');
        let duracionTurnos = _agenda.bloques[0].duracionTurno;

        //  CONSTRAINT 1
        //  ([permiteTurnosSimultaneos]=(0) AND [cantidadDeTurnosSimultaneos] IS NULL
        //  OR [permiteTurnosSimultaneos]=(1) AND [cantidadDeTurnosSimultaneos] IS NOT NULL)
        let cantidadDeTurnosSimultaneos = getCantidadDeTurnosSimultaneos(_agenda);
        let permiteTurnosSimultaneos = (cantidadDeTurnosSimultaneos == null ? 0 : 1);
        //  CONSTRAINT 2 IDEM 1
        let cantidadDeSobreturnos = null; // HARDCODE
        let permiteSobreturnos = (cantidadDeSobreturnos == null ? 0 : 1);

        let publicada = (_agenda.estado !== constantes.EstadoAgendaAndes.publicada ? 0 : 1);
        let suspendida = (_agenda.estado !== constantes.EstadoAgendaAndes.suspendida ? 0 : 1);
        let andesId = _agenda.id;

        let query = 'INSERT INTO dbo.Prestaciones_Worklist_Programacion ' +
            '(idUbicacion ' +
            ',idTipoPrestacion ' +
            // ',idConsultorio ' +
            ',fechaHora ' +
            ',fechaHoraFinalizacion ' +
            ',duracionTurnos ' +
            ',permiteTurnosSimultaneos ' +
            ',cantidadDeTurnosSimultaneos ' +
            ',permiteSobreturnos ' +
            ',cantidadDeSobreturnos ' +
            ',publicada ' +
            ',suspendida ' +
            ',andesId) VALUES  ( ' +
            idUbicacion + ',' +
            idTipoPrestacion + ',' +
            // idConsultorio + ',' +
            '\'' + fechaHora + '\',' +
            '\'' + fechaHoraFinalizacion + '\',' +
            duracionTurnos + ',' +
            permiteTurnosSimultaneos + ',' +
            cantidadDeTurnosSimultaneos + ',' +
            permiteSobreturnos + ',' +
            cantidadDeSobreturnos + ',' +
            publicada + ',' +
            suspendida + ',' +
            '\'' + andesId + '\')';

        return await executeQuery(query);
    }

    async function saveBloques(idAgendaAndes, bloques: Array<any>) {
        
        for (let bloque of bloques) {
            await saveTurnos(idAgendaAndes, bloque.turnos, bloque.duracionTurno);
        }
    }

    async function saveTurnos(idAgendaAndes, turnos: Array<any>, duracion) {

        for (let turno of turnos) {
            if (turno.estado === constantes.EstadoTurnosAndes.asignado
                && (! await (getIdTurnoHPN(turno._id)))) {

                let result = await pacientes.buscarPaciente(turno.paciente.id);
                let paciente = result.paciente;

                if (! await existsPacienteHospital('DNI', paciente.documento)) {
                    await pacienteHPN.savePaciente(paciente, transaction);
                }
                await saveTurno(idAgendaAndes, turno, duracion);
            }
        }

        console.log('turnos saved');
    }

    async function existsPacienteHospital(tipoDocumento, nroDocumento) {
        console.log('existsPacienteHospital');
        let query = 'SELECT Codigo FROM dbo.Historias_Clinicas ' +
            'WHERE  HC_Tipo_de_documento = @tipoDocumento AND HC_Documento = @nroDocumento';
        let result = await pool.request()
            .input('tipoDocumento', sql.VarChar(50), tipoDocumento)
            .input('nroDocumento', sql.VarChar(50), nroDocumento)
            .query(query);

        return (result.length > 0);
    }

    async function getIdTurnoHPN(idAndes) {
        return await getIdHPN(idAndes, 'dbo.Prestaciones_Worklist');
    }

    async function saveTurno(idAgendaAndes, turno: any, duracion) {
        console.log('createTurno', turno._id);

        let idUbicacion = 14; // await getUbicacion(idServicio, pool);
        let fechaHora = moment(turno.horaInicio).utcOffset('-03:00').format('YYYY-MM-DD hh:mm:ss');
        let fechaHoraFinalizacion = moment(turno.horaInicio).add(duracion, 'minutes').utcOffset('-03:00').format('YYYY-MM-DD hh:mm:ss');
        let idTipoWorklist = 10; // no
        let idPrioridad =  20; // HARDCODE
        let idTipoPrestacion = 705; // HARDCODE
        let idEstado = 10; // HARDCODE
        let idHistoria = 10; // HARDCODE
        let idPaciente = 1447; // HARDCODE
        let idProgramacion = idAgendaAndes;
        // let idProfesional = sql.NULL; // HARDCODE
        // let idConsultorio = sql.NULL; // HARDCODE
        // let idOrigen = sql.NULL; // HARDCODE
        // let origen_sector = sql.NULL; // HARDCODE
        // let idOrigen_profesional = sql.NULL; // HARDCODE
        // let origen_profesional_otro = sql.NULL; // HARDCODE
        // let idPrestacionRealizada = sql.NULL; // HARDCODE
        // let informacionContacto = sql.NULL; // HARDCODE
        // let contactoPrefijo = sql.NULL; // HARDCODE
        // let contactoNumero = sql.NULL; // HARDCODE
        // let contactoCarrier = sql.NULL; // HARDCODE
        // let observaciones = sql.NULL; // HARDCODE
        // let idAplicacionOrigen = sql.NULL; // HARDCODE
        // let idAplicacionOrigen_clave = sql.NULL; // HARDCODE
        // let auditUser = sql.NULL; // HARDCODE
        let auditDatetime = '2017-12-01 01:56:22'; // HARDCODE
        let andesId = turno._id;

        let query = 'INSERT INTO dbo.Prestaciones_Worklist ' +
            '(idUbicacion' +
            ',fechaHora' +
            ',fechaHoraFinalizacion' +
            ',idTipoWorklist' +
            ',idPrioridad' +
            ',idTipoPrestacion' +
            ',idEstado' +
            ',idHistoria' +
            ',idPaciente' +
            ',idProgramacion' +
            // ',idProfesional' +
            // ',idConsultorio' +
            // ',idOrigen' +
            // ',origen_sector' +
            // ',idOrigen_profesional' +
            // ',origen_profesional_otro' +
            // ',idPrestacionRealizada' +
            // ',informacionContacto' +
            // ',contactoPrefijo' +
            // ',contactoNumero' +
            // ',contactoCarrier' +
            // ',observaciones' +
            // ',idAplicacionOrigen' +
            // ',idAplicacionOrigen_clave' +
            // ',audit_user' +
            ',audit_datetime' +
            ',andesId)' +
        'VALUES (' +
            idUbicacion + ',' +
            '\'' + fechaHora + '\',' +
            '\'' + fechaHoraFinalizacion + '\','  +
            idTipoWorklist + ',' +
            idPrioridad + ',' +
            idTipoPrestacion + ',' +
            idEstado + ',' +
            idHistoria + ',' +
            idPaciente + ',' +
            idProgramacion + ',' +
            // idProfesional + ',' +
            // idConsultorio + ',' +
            // idOrigen + ',' +
            // origen_sector + ',' +
            // idOrigen_profesional + ',' +
            // origen_profesional_otro + ',' +
            // idPrestacionRealizada + ',' +
            // informacionContacto + ',' +
            // contactoPrefijo + ',' +
            // contactoNumero + ',' +
            // contactoCarrier + ',' +
            // observaciones + ',' +
            // idAplicacionOrigen + ',' +
            // idAplicacionOrigen_clave + ',' +
            // auditUser + ',' +
            '\'' + auditDatetime + '\',' +
            '\'' + andesId + '\')';

        return await executeQuery(query);
    }

    function executeQuery(query: any) {
        query += ' select SCOPE_IDENTITY() as id';
        return new Promise((resolve2: any, reject: any) => {
            return new sql.Request(transaction)
                .query(query)
                .then(result => {
                    resolve2(result[0].id);
                }).catch(err => {
                    reject(err);
                });
        });
    }
}

async function getUbicacion(idServicio, pool) {
    let query = 'SELECT Codigo FROM dbo.Ubicaciones WHERE Nombre = @idServicio COLLATE SQL_Latin1_General_CP1_CI_AI';
    let result = await pool.request()
        .input('idServicio', sql.Varchar, idServicio)
        .query(query);

    return result[0];
}

function getCantidadDeTurnosSimultaneos(agenda) {
    return 1;
}

export async function getAgendasDeMongoPendientes() {
    var ObjectId = require('mongoose').Types.ObjectId;
    return await agendasCache.find({
        estadoIntegracion: constantes.EstadoExportacionAgendaCache.pendiente,
        'organizacion._id': new ObjectId(constantes.idOrganizacionHPN)
    });
}

async function setEstadoAgendaToIntegrada(idAgenda) {
    console.log(idAgenda);
    return await agendasCache.update({
            _id: idAgenda
        }, {
            $set: {
                estadoIntegracion: constantes.EstadoExportacionAgendaCache.exportadaSIPS
            }
        }).exec();
}
