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



export async function saveAgenda(agenda: any, datosSips: any, pool) {
    console.log('saveAgenda');
    let idUbicacion = 1;//await getUbicacion(idServicio, pool);
    let idServicio = 0; //HARDCODE
    let idTipoPrestacion = 705 //HARDCODE
    let idConsultorio = 1; //HARDCODE
    let fechaHora = '2017-12-17 07:00:00.000'; //moment(agenda.horaInicio).utcOffset('-03:00');
    let fechaHoraFinalizacion = '2017-12-17 16:00:00.000'; // moment(agenda.horaFin).utcOffset('-03:00');
    let duracionTurnos = 30; //HARDCODE //agenda.bloques[0].duracionTurno;
    
    // CONSTRAINT 1
    // ([permiteTurnosSimultaneos]=(0) AND [cantidadDeTurnosSimultaneos] IS NULL 
    // OR [permiteTurnosSimultaneos]=(1) AND [cantidadDeTurnosSimultaneos] IS NOT NULL)
    let permiteTurnosSimultaneos = 0; //HARDCODE
    let cantidadDeTurnosSimultaneos = null; //HARDCODE
    ////////
    
    // CONSTRAINT 2
    // IDEM 1
    let permiteSobreturnos = 0; //HARDCODE 
    let cantidadDeSobreturnos = null; //HARDCODE
    ////////

    let publicada = 0; //HARDCODE
    let suspendida = 0; //HARDCODE
    let andesId = 123;//agenda.id;
 
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
        andesId + ')';
    
    await executeQuery(query).then(function (idAgendaCreada) {
        console.log('Agenda saved!');
    });
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

export async function saveTurno(turno: any, datosSips: any, pool) {
    let idUbicacion = 1;//await getUbicacion(idServicio, pool);
    let fechaHora = '2017-12-17 07:00:00.000'; //moment(turno.horaInicio).utcOffset('-03:00');
    let fechaHoraFinalizacion = '2017-12-17 16:00:00.000'; // moment(turno.horaFin).utcOffset('-03:00');
    let idTipoWorklist = 1;
    let idPrioridad =  1;
    let idTipoPrestacion = 1;
    let idEstado = 1;
    let idHistoria = 1;
    let idPaciente = 1;
    let idProgramacion = 1;
    let idProfesional = 1;
    let idConsultorio = 1;
    let idOrigen = 1;
    let origen_sector = 1;
    let idOrigen_profesional = 1;
    let origen_profesional_otro = 1;
    let idPrestacionRealizada = 1;
    let informacionContacto = 1;
    let contactoPrefijo = 1;
    let contactoNumero = 1;
    let contactoCarrier = 1;
    let observaciones = 1;
    let idAplicacionOrigen = 1;
    let idAplicacionOrigen_clave = 1;
    let auditUser = 1;
    let auditDatetime = 1;
    let andesId = 1;


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
        auditDatetime + ',' +
        andesId +
    ')';

    await executeQuery(query).then(function (idSavedTurno) {
        console.log('turno saved!', idSavedTurno);
    });
}    

export async function savePaciente(paciente: any, datosSips: any, pool) {
    
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

function executeQuery(query: any) {
    query += ' select SCOPE_IDENTITY() as id';
    return new Promise((resolve: any, reject: any) => {
        let transaction;
        return new sql.Request(transaction)
            .query(query)
            .then(result => {
                resolve(result[0].id);
            }).catch(err => {
                reject(err);
            });
    });
}

export async function getAgendasDeMongoPendientes() {
    return new Promise<Array<any>>(function (resolve, reject) {
        agendasCache.find({
            estadoIntegracion: constantes.EstadoExportacionAgendaCache.pendiente,
            organizacion: {
                _id: constantes.idOrganizacionHPN
            } 
        }).exec(async function (err, data: any) {
            if (err) {
                reject(err);
            }
            resolve(data);
        });
    });
}