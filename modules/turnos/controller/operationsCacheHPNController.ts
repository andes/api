//  Imports
import * as mongoose from 'mongoose';
import {
    agendasCache
} from '../../legacy/schemas/agendasCache';
import * as sql from 'mssql';
import * as moment from 'moment';
import * as pacientes from './../../../core/mpi/controller/paciente';
import * as constantes from '../../legacy/schemas/constantes';
import * as logger from './../../../utils/loggerAgendaSipsCache';
import * as agendaSchema from '../schemas/agenda';
import * as turnoCtrl from './turnoCacheController';
import * as pacienteHPN from './pacienteHPNController';
import * as medicosExistentes from '../../legacy/schemas/medicosExistentesHPN';
import { resolve } from 'path';


export async function saveAgendaToPrestaciones(agenda, pool) {
    console.log('saveAgendasToPrestaciones');
    let transaction = await new sql.Transaction(pool);

    return new Promise(async function (resolve, reject) {
        if (medicosExistentes.documentos.indexOf(agenda.profesionales[0].documento) >= 0) {
            transaction.begin(async err => {
                let rolledBack = false;
                transaction.on('rollback', aborted => {
                    rolledBack = true;
                });
                try {
                    let idAgendaHPN = await getIdAgendaHPN(agenda._id);

                    if (!idAgendaHPN) {
                        idAgendaHPN = await saveAgenda(agenda);
                        console.log( await getIdProfesionalPrestaciones(agenda.profesionales[0].documento));
                        await saveAgendaProfesional(idAgendaHPN, await getIdProfesionalPrestaciones(agenda.profesionales[0].documento));
                        // await saveAgendaTipoPrestacion(idAgendaHPN, await getIdTipoPrestacion());
                        await saveAgendaTipoPrestacion(idAgendaHPN, 705);
                    }

                    await saveBloques(idAgendaHPN, agenda.bloques);
                    transaction.commit(async err2 => {
                        resolve();
                    });
                } catch (e) {
                    console.log(e);
                    // logger.LoggerAgendaCache.logAgenda(agenda._id, e);
                    transaction.rollback();
                    reject(e);
                }
            });
        } else {
            resolve();
        }
    });

    async function getIdAgendaHPN(idAndes) {
        return await getIdHPN(idAndes, 'dbo.Prestaciones_Worklist_Programacion');
    }

    async function getIdProfesionalPrestaciones(documento) {
        let query = 'SELECT id FROM dbo.Medicos WHERE documento = @documento';
         let result = await pool.request()
             .input('documento', sql.Varchar, documento)
             .query(query);

         return result[0].id;
    }

    async function saveAgendaProfesional(idProgramacion, idProfesional) {
        let query = 'INSERT INTO dbo.Prestaciones_Worklist_Programacion_Profesionales ' +
            '(idProgramacion, idProfesional) VALUES (@idProgramacion, @idProfesional)';
        return await pool.request()
            .input('idProgramacion', sql.Int, idProgramacion)
            .input('idProfesional', sql.Int, idProfesional)
            .query(query);
    }

    async function saveAgendaTipoPrestacion(idProgramacion, idTipoPrestacion) {
        let query = 'INSERT INTO dbo.Prestaciones_Worklist_Programacion_TiposPrestaciones ' +
            '(idProgramacion, idProfesional) VALUES (@idProgramacion, @idTipoPrestacion)';
        return await pool.request()
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
        let andesId = _agenda._id;

        let query = 'INSERT INTO dbo.Prestaciones_Worklist_Programacion ' +
            '(idUbicacion ' +
            ',idTipoPrestacion ' +
            ',idConsultorio ' +
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
            idConsultorio + ',' +
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
        console.log('saveBloques');

        for (let bloque of bloques) {
            await saveTurnos(idAgendaAndes, bloque.turnos);
        }
    }

    async function saveTurnos(idAgendaAndes, turnos: Array<any>) {
        console.log('saveTurnos', turnos.length);

        for (let turno of turnos) {
            if (turno.estado === constantes.EstadoTurnosAndes.asignado
                && (! await (getIdTurnoHPN(turno._id)))) {

                let result = await pacientes.buscarPaciente(turno.paciente.id);
                let paciente = result.paciente;
                console.log('existsPacienteHospital', paciente.documento, await existsPacienteHospital('DNI', paciente.documento));
                if (! await existsPacienteHospital('DNI', paciente.documento)) {
                    console.log('will save paciente');
                    await pacienteHPN.savePaciente(paciente, transaction);
                }
                await saveTurno(idAgendaAndes, turno);
            }
        }
        console.log('turnos saved');
    }

    async function existsPacienteHospital(tipoDocumento, nroDocumento) {
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

    async function saveTurno(idAgendaAndes, turno: any) {
        console.log('createTurno', turno._id);
        let idUbicacion = 14; // await getUbicacion(idServicio, pool);
        let fechaHora = moment(turno.horaInicio).utcOffset('-03:00').format('YYYY-MM-DD hh:mm:ss');
        let fechaHoraFinalizacion = moment(turno.horaFin).utcOffset('-03:00').format('YYYY-MM-DD hh:mm:ss');
        let idTipoWorklist = 10; // no
        let idPrioridad =  20; // HARDCODE
        let idTipoPrestacion = 705; // HARDCODE
        let idEstado = 10; // HARDCODE
        let idHistoria = 10; // HARDCODE
        let idPaciente = 1447; // HARDCODE
        let idProgramacion = idAgendaAndes;
        let idProfesional = 1; // HARDCODE
        let idConsultorio = 1; // HARDCODE
        let idOrigen = 1; // HARDCODE
        let origen_sector = 1; // HARDCODE
        let idOrigen_profesional = 1; // HARDCODE
        let origen_profesional_otro = 1; // HARDCODE
        let idPrestacionRealizada = 1; // HARDCODE
        let informacionContacto = 1; // HARDCODE
        let contactoPrefijo = 1; // HARDCODE
        let contactoNumero = 1; // HARDCODE
        let contactoCarrier = 1; // HARDCODE
        let observaciones = 1; // HARDCODE
        let idAplicacionOrigen = 1; // HARDCODE
        let idAplicacionOrigen_clave = 1; // HARDCODE
        let auditUser = 1; // HARDCODE
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
            ',idProfesional' +
            ',idConsultorio' +
            ',idOrigen' +
            ',origen_sector' +
            ',idOrigen_profesional' +
            ',origen_profesional_otro' +
            ',idPrestacionRealizada' +
            ',informacionContacto' +
            ',contactoPrefijo' +
            ',contactoNumero' +
            ',contactoCarrier' +
            ',observaciones' +
            ',idAplicacionOrigen' +
            ',idAplicacionOrigen_clave' +
            ',audit_user' +
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
            idProfesional + ',' +
            idConsultorio + ',' +
            idOrigen + ',' +
            origen_sector + ',' +
            idOrigen_profesional + ',' +
            origen_profesional_otro + ',' +
            idPrestacionRealizada + ',' +
            informacionContacto + ',' +
            contactoPrefijo + ',' +
            contactoNumero + ',' +
            contactoCarrier + ',' +
            observaciones + ',' +
            idAplicacionOrigen + ',' +
            idAplicacionOrigen_clave + ',' +
            auditUser + ',' +
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
    return await agendasCache.update({
            _id: idAgenda
        }, {
            $set: {
                estadoIntegracion: constantes.EstadoExportacionAgendaCache.exportadaSIPS
            }
        }).exec();
}
