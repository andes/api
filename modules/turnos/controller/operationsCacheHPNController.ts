// Imports
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
import { resolve } from 'path';


export async function saveAgendasToHospital(agenda, pool) {
    console.log('saveAgendasToHospital');
    let transaction = await new sql.Transaction(pool);
    
    return new Promise(async function (resolve, reject) {
        transaction.begin(async err => {
            let rolledBack = false;
            transaction.on('rollback', aborted => {
                rolledBack = true;
            });
            try {
                await saveAgenda(agenda);
                transaction.commit(async err2 => {
                    resolve();
                });
            } catch (e) {
                console.log(e);
                //logger.LoggerAgendaCache.logAgenda(agenda._id, e);
                transaction.rollback();
                //reject(e);
            }
        });
    });

    async function saveAgenda(agenda) {   
        console.log('saveAgenda');
        let idUbicacion = 1;//await getUbicacion(idServicio, pool); -- De donde obtengo el id de Servicio?
        let idServicio = 0; // -- De donde obtengo el id de Servicio?
        let idTipoPrestacion = 705 // Validar con Marcelo tipor de Prestaciones
        let idConsultorio = 1; //HARDCODE
        //Verificar si es correcto utcOffset('-03:00')
        let fechaHora = moment(agenda.horaInicio).utcOffset('-03:00').format('YYYY-MM-DD hh:mm:ss');
        let fechaHoraFinalizacion = moment(agenda.horaFin).utcOffset('-03:00').format('YYYY-MM-DD hh:mm:ss');
        let duracionTurnos = agenda.bloques[0].duracionTurno;
        
        // CONSTRAINT 1
        // ([permiteTurnosSimultaneos]=(0) AND [cantidadDeTurnosSimultaneos] IS NULL 
        // OR [permiteTurnosSimultaneos]=(1) AND [cantidadDeTurnosSimultaneos] IS NOT NULL)
        let cantidadDeTurnosSimultaneos = getCantidadDeTurnosSimultaneos(agenda);
        let permiteTurnosSimultaneos = (cantidadDeTurnosSimultaneos == null ? 0 : 1);
        // CONSTRAINT 2 IDEM 1
        let cantidadDeSobreturnos = null; //HARDCODE
        let permiteSobreturnos = (cantidadDeSobreturnos == null ? 0 : 1);
        
        let publicada = (agenda.estado != constantes.EstadoAgendaAndes.publicada ? 0 : 1);
        let suspendida =(agenda.estado != constantes.EstadoAgendaAndes.suspendida ? 0 : 1);
        let andesId = agenda._id;
     
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

        await executeQuery(query).then(idAgendaCreada => {
            console.log('Agenda saved', idAgendaCreada)
            saveBloques(idAgendaCreada, agenda.bloques);
        });
    }

    function saveBloques(idAgendaAndes, bloques: Array<any>) {
        console.log('saveBloques');
        //bloques.forEach(bloque => {
        for (let bloque of bloques) {
            saveTurnos(idAgendaAndes, bloque.turnos);
        };
    }
    
    async function saveTurnos(idAgendaAndes, turnos: Array<any>) {
        console.log('saveTurnos');
        let promisesArray: any = [];
        for (let turno of turnos) {
            await saveTurno(idAgendaAndes, turno);
        };
        console.log('turnos saved');
    }
    
    async function saveTurno(idAgendaAndes, turno: any) {
        console.log('saveTurno', turno._id);
        let idUbicacion = 14;//await getUbicacion(idServicio, pool);
        let fechaHora = moment(turno.horaInicio).utcOffset('-03:00').format('YYYY-MM-DD hh:mm:ss');
        let fechaHoraFinalizacion = moment(turno.horaFin).utcOffset('-03:00').format('YYYY-MM-DD hh:mm:ss');
        let idTipoWorklist = 10; //HARDCODE
        let idPrioridad =  20; //HARDCODE
        let idTipoPrestacion = 705; //HARDCODE
        let idEstado = 10; //HARDCODE
        let idHistoria = 10; //HARDCODE
        let idPaciente = 1447; //HARDCODE
        let idProgramacion = idAgendaAndes;
        let idProfesional = 1; //HARDCODE
        let idConsultorio = 1; //HARDCODE
        let idOrigen = 1; //HARDCODE
        let origen_sector = 1; //HARDCODE
        let idOrigen_profesional = 1; //HARDCODE
        let origen_profesional_otro = 1; //HARDCODE
        let idPrestacionRealizada = 1; //HARDCODE
        let informacionContacto = 1; //HARDCODE
        let contactoPrefijo = 1; //HARDCODE
        let contactoNumero = 1; //HARDCODE
        let contactoCarrier = 1; //HARDCODE
        let observaciones = 1; //HARDCODE
        let idAplicacionOrigen = 1; //HARDCODE
        let idAplicacionOrigen_clave = 1; //HARDCODE
        let auditUser = 1; //HARDCODE
        let auditDatetime = '2017-12-01 01:56:22'; //HARDCODE
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

        await executeQuery(query).then(function (idSavedTurno) {
            console.log('turno saved!', idSavedTurno);
            resolve();
        });   
    }
    
    async function savePaciente(paciente: any, datosSips: any, pool) {
        
        let idEstado = 1;
        let documento = 1;
        let documentoInt = 1;
        let esDNI = 1;
        let apellido = 1;
        let nombre = 1;
        let idSexo = 1;
        let idEstadoCivil = 1;
        let idNacionalidad = 1;
        let nacimientoFecha = '2017-12-17 07:00:00.000';
        let nacimientoFechaEstimada = 0;
        let nacimientoIdUbicacion = 1;
        let idEducacion = 1;
        let idOcupacion = 1;
        let idPadre1 = 1;
        let idPadre2 = 1;
        let ficheroIndice = 1;
        let legacyIdHistoriaClinica = 1;
        let legacyObservaciones = 1;
        let creadoEnPACS = 1;
        let auditUser = 1;
        let auditDatetime = 1;
        let auditValidacionFecha = 1;
        let auditValidacionUsuario = 1;
        let recienNacido = 1;
        let cuil = 1;
        let fallecido = 1;
        let fallecidoRazon = 1;
        let fallecidoFecha = '2017-12-17 07:00:00.000';
        let idGrupoSanguineo = 1;
        
        let query = 'INSERT INTO dbo.Pacientes ' + 
            '(idEstado ' + 
            ',documento ' + 
            ',documentoInt ' + 
            ',esDNI ' + 
            ',apellido ' + 
            ',nombre ' + 
            ',idSexo ' + 
            ',idEstadoCivil ' +
            ',idNacionalidad ' + 
            ',nacimientoFecha ' + 
            ',nacimientoFechaEstimada ' + 
            ',nacimientoIdUbicacion ' + 
            ',idEducacion ' + 
            ',idOcupacion ' + 
            ',__idPadre1 ' + 
            ',__idPadre2 ' + 
            ',ficheroIndice ' + 
            ',legacy_idHistoriaClinica ' + 
            ',legacy_observaciones ' + 
            ',creadoEnPACS ' + 
            ',audit_user ' + 
            ',audit_datetime ' + 
            ',audit_validacionFecha ' + 
            ',audit_validacionUsuario ' + 
            ',recienNacido ' + 
            ',cuil ' + 
            ',fallecido ' + 
            ',fallecidoRazon ' + 
            ',fallecidoFecha ' + 
            ',idGrupoSanguineo) ' + 
        'VALUES (' +
            idEstado + ',' +
            documento + ',' +
            documentoInt + ',' +
            esDNI + ',' +
            apellido + ',' +
            nombre + ',' +
            idSexo + ',' +
            idEstadoCivil + ',' +
            idNacionalidad + ',' +
            '\'' + nacimientoFecha + '\',' +
            nacimientoFechaEstimada + ',' +
            nacimientoIdUbicacion + ',' +
            idEducacion + ',' +
            idOcupacion + ',' +
            idPadre1 + ',' +
            idPadre2 + ',' +
            ficheroIndice + ',' +
            legacyIdHistoriaClinica + ',' +
            legacyObservaciones + ',' +
            creadoEnPACS + ',' +
            auditUser + ',' +
            auditDatetime + ',' +
            auditValidacionFecha + ',' +
            auditValidacionUsuario + ',' +
            recienNacido + ',' +
            cuil + ',' +
            fallecido + ',' +
            fallecidoRazon + ',' +
            '\'' + fallecidoFecha + '\',' +
            idGrupoSanguineo +
        ')';
     
        console.log(query);
        await executeQuery(query).then(function (idSavedPaciente) {
            console.log('peciente saved!', idSavedPaciente);
        });
    }

    async function executeQuery(query: any) {
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
}

   

async function getUbicacion(idServicio, pool) {
    return new Promise(async (resolve, reject) => {
        try {
            let query = 'SELECT Codigo FROM dbo.Ubicaciones WHERE Nombre = @idServicio COLLATE SQL_Latin1_General_CP1_CI_AI';
            let result = await pool.request()
                .input('idServicio', sql.Varchar, idServicio)
                .query(query);

            resolve(result[0]);
        } catch (err) {
            reject(err);
        }
    })
}

function getCantidadDeTurnosSimultaneos (agenda){
    return 1;
}

export async function getAgendasDeMongoPendientes() {
    
    return new Promise<Array<any>>(function (resolve, reject) {
        var ObjectId = require('mongoose').Types.ObjectId; 
        agendasCache.find({
            estadoIntegracion: constantes.EstadoExportacionAgendaCache.pendiente,
            'organizacion._id': new ObjectId(constantes.idOrganizacionHPN)
        }).exec(async function (err, data: any) {
            if (err) {
                reject(err);
            }
            resolve(data);
        });
    });
}