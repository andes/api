// Imports
import * as mongoose from 'mongoose';
import {
    agendasCache
} from '../../../legacy/schemas/agendasCache';
import * as sql from 'mssql';
import * as moment from 'moment';
import * as pacientes from './../../../../core/mpi/controller/paciente';
import * as constantes from '../../../legacy/schemas/constantes';
import * as logger from './../../../../utils/loggerAgendaSipsCache';
import * as agendaSchema from '../../schemas/agenda';
import * as turnoCtrl from './../turnoCacheController';
import * as configPrivate from '../../../../config.private';
import * as pacienteOps from './operationsPaciente';
import * as dbg from 'debug';

const debug = dbg('integracion');
let poolTurnos;
let config = {
    user: configPrivate.conSql.auth.user,
    password: configPrivate.conSql.auth.password,
    server: configPrivate.conSql.serverSql.server,
    database: configPrivate.conSql.serverSql.database
};
let transaction;
/**
 * Verifica cada turno asignado de la agenda y graba en SIPS los turnos nuevos.
 *
 * @export
 * @param {*} agenda
 * @param {*} idAgendaCreada
 * @param {*} idEfector
 * @returns
 */
export async function processTurnos(agenda: any, idAgendaCreada: any, idEfector: any, tr, poolAgendas) {
    debug('inicia 4');
    transaction = tr;
    let turnos;
    // poolTurnos = await new sql.ConnectionPool(config).connect();
    console.log('entro a los turnos');
    for (let x = 0; x < agenda.bloques.length; x++) {
        turnos = agenda.bloques[x].turnos;
        for (let i = 0; i < turnos.length; i++) {
            if (turnos[i].estado === 'asignado') {
                // let resultado = await existeTurnoSips(turnos[i], transaction);
                // if (resultado.recordset && resultado.recordset.length <= 0) {
                console.log('por cada turno: ', i);
                await grabaTurnoSips(turnos[i], idAgendaCreada, idEfector, transaction, poolAgendas);
                console.log('luego de grabar el turno en sips...');
                // }
            }
        }
    }
    debug(' 4 - turnos grabados');

}

export async function existeTurnoSips(turno: any, poolAgendas) {
    console.log('entra a existeTurnoSips..................');
    let result = await new sql.Request(poolAgendas)
        .input('idTurnoMongo', sql.VarChar(50), turno._id)
        .query('SELECT idTurno FROM dbo.CON_Turno WHERE objectId = @idTurnoMongo GROUP BY idTurno');
    
        console.log('resultado de existe turno en sips::::: ', result);
    return result;
}

async function  grabaTurnoSips(turno, idAgendaSips, idEfector, tr, poolAgendas) {
    console.log('ingresa a grabar turnos sips!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!'); 
    transaction = tr;
    let pacienteEncontrado = await pacientes.buscarPaciente(turno.paciente.id);
    let paciente = pacienteEncontrado.paciente;
    let idObraSocial = await getIdObraSocialSips(paciente.documento, poolAgendas);
    let pacienteId = await pacienteOps.insertarPacienteEnSips(paciente, idEfector, poolAgendas);
    let fechaTurno = moment(turno.horaInicio).format('YYYYMMDD');
    let horaTurno = moment(turno.horaInicio).utcOffset('-03:00').format('HH:mm');
    if (typeof pacienteId === 'number' && typeof idObraSocial === 'number') {
        console.log('antes verificar existeTurno en Sipsssssssssss');
        let resultado = await existeTurnoSips(turno, poolAgendas);
        console.log('imprimo el resultado si existe turno en sips: ', resultado);
        let query;
        if (resultado && resultado.recordset && resultado.recordset.length > 0) {
            query = 'UPDATE dbo.CON_Turno SET idPaciente = ' + pacienteId + ', idObraSocial = ' + idObraSocial + '  WHERE idAgenda = ' + idAgendaSips + ' and objectId = \'' + turno._id + '\'';
            console.log('entro por el updateeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee');
        } else {

            query = 'INSERT INTO dbo.CON_Turno ( idAgenda , idTurnoEstado , idUsuario ,  idPaciente , fecha , hora , sobreturno , idTipoTurno , idObraSocial , idTurnoAcompaniante, objectId ) VALUES  ( ' + idAgendaSips + ' , 1 , ' + constantes.idUsuarioSips + ' ,' + pacienteId + ', \'' + fechaTurno + '\' ,\'' + horaTurno + '\' , 0 , 0 ,' + idObraSocial + ' , 0, \'' + turno._id + '\')';
            query += ' select SCOPE_IDENTITY() as id';
            console.log('Entro por el haaarto inserttttttttttttttttttttttttttttt');
        }

        debug('Q:', query);
        let res = await new sql.Request(poolAgendas).query(query);
        debug('--------grabado turno sips-------->>>>>>', res);
    } else {
        // Si tenemos un error en la consulta por obra social o por IdPaciente tenemos que sacar la agenda de la coleccion
        throw new Error('Error grabaTurnoSips');
    }
}


export async function checkEstadoTurno(agenda: any, idAgendaSips, poolAgendas) {
    debug('6 - inicio');
    let turnos;
    for (let x = 0; x < agenda.bloques.length; x++) {
        turnos = agenda.bloques[x].turnos;

        for (let i = 0; i < turnos.length; i++) {
            if ((turnos[i].estado !== 'disponible') || (turnos[i].updatedAt)) {
                await actualizarEstadoTurnoSips(idAgendaSips, turnos[i], poolAgendas);
                debug('6 - actualizando turno sips');

            }
        }
    }
    debug('6 - FIN');

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
    console.log('debería pasar por aca si o siiiii: ', estado);
    return estado;
}

async function actualizarEstadoTurnoSips(idAgendaSips, turno, poolAgendas) {
    console.log('entra a actualizarEstadoTurnoSips');
    let estadoTurnoSips: any = await getEstadoTurnoSips(turno._id, poolAgendas);
    console.log('Luego de getEstadoTurnoSips: ', turno.estado, turno.updatedAt);
    let estadoTurnoMongo = getEstadoTurnosCitasSips(turno.estado, turno.updatedAt);
    console.log('Luego de getEstadoTurnosCitasSips y antes de if: ', estadoTurnoSips.idTurnoEstado, estadoTurnoMongo);
    if (estadoTurnoSips.idTurnoEstado !== estadoTurnoMongo) {
        let objectIdTurno;
        console.log('dentro?????????????');
        if (turno._id) {
            objectIdTurno = ' and objectId = \'' + turno._id + '\'';
        }
        let horaInicio = moment(turno.horaInicio).utcOffset('-03:00').format('HH:mm');
        console.log('antes de condicion largaaaa');
        if ((estadoTurnoMongo === constantes.EstadoTurnosSips.suspendido || turno.estado === 'turnoDoble') && !await existeTurnoBloqueoSips(idAgendaSips, horaInicio)) {
            console.log('antes de grabar turno bloqueo');
            await grabarTurnoBloqueo(idAgendaSips, turno, poolAgendas);
        }
        console.log('antes del update de turnooooooooooooooooo');
        let query = 'UPDATE dbo.CON_Turno SET idTurnoEstado = ' + estadoTurnoMongo + ' WHERE idAgenda = ' + idAgendaSips + objectIdTurno;
        await executeQuery(query, poolAgendas);
    }
}

async function existeTurnoBloqueoSips(idAgendaSips, horaInicio) {
    let query = 'SELECT COUNT(b.idTurnoBloqueo) as count FROM CON_TurnoBloqueo b ' +
        'JOIN CON_TURNO t on t.idAgenda = b.idAgenda ' +
        'WHERE b.idAgenda = ' + idAgendaSips +
        ' AND b.horaTurno = \'' + horaInicio + '\'';

    try {
        let result = await new sql.Request(transaction).query(query);
        return (result[0].count > 0);
    } catch (err) {
        return (err);
    }
}



async function grabarTurnoBloqueo(idAgendaSips, turno, poolAgendas) {
    try {
        const motivoBloqueo = getMotivoTurnoBloqueoSips(turno);
        let fechaBloqueo = moment(turno.horaInicio).format('YYYYMMDD');
        let horaBloqueo = moment(turno.horaInicio).utcOffset('-03:00').format('HH:mm');

        let queryTurnoBloqueo = 'INSERT dbo.CON_TurnoBloqueo (idAgenda ' +
            ', fechaTurno ' +
            ', horaTurno ' +
            ', idUsuarioBloqueo ' +
            ', fechaBloqueo ' +
            ', idMotivoBloqueo) ';
        queryTurnoBloqueo += 'VALUES (' +
            idAgendaSips + ', ' +
            '\'' + fechaBloqueo + '\', ' +
            '\'' + horaBloqueo + '\', ' +
            constantes.idUsuarioSips + ', ' +
            '\'' + moment(turno.updatedAt).format('YYYYMMDD') + '\', ' +
            motivoBloqueo + ')';

        await executeQuery(queryTurnoBloqueo, poolAgendas);
    } catch (ex) {
        return (ex);
    }
}

function getMotivoTurnoBloqueoSips(turno) {
    let motivoBloqueo;

    if (turno.estado === 'suspendido') {
        motivoBloqueo = getMotivoTurnoSuspendido(turno.motivoSuspension);
    } else if (turno.estado === 'turnoDoble') {
        motivoBloqueo = constantes.MotivoTurnoBloqueo.turnoDoble;
    }

    return (motivoBloqueo);
}


function getMotivoTurnoSuspendido(motivoSuspension) {
    let devuelveMotivoSuspension;

    switch (motivoSuspension) {
        case 'profesional':
            devuelveMotivoSuspension = constantes.MotivoTurnoBloqueo.retiroDelProfesional;
            break;
        case 'edilicia':
            devuelveMotivoSuspension = constantes.MotivoTurnoBloqueo.otros;
            break;
        case 'organizacion':
            devuelveMotivoSuspension = constantes.MotivoTurnoBloqueo.reserva;
            break;
    }

    return (devuelveMotivoSuspension);
}


/* Devuelve el estado del turno en Con_Turno de SIPS */
async function getEstadoTurnoSips(objectId: any, poolAgendas) {
    console.log('entra a getEstadoTurno????: ', objectId);
    let query = 'SELECT idAgenda, idTurno, idTurnoEstado FROM dbo.CON_Turno WHERE objectId = @objectId';

    let result = new sql.Request(poolAgendas)
        .input('objectId', sql.VarChar(50), objectId)
        .query(query, (err, result) => {
            if (err) {
                console.log('palo horrible:', err);
            } 
            console.log('hace algo en esta parte?????????????????????????');
            if (result && result.recordset && result.recordset.length > 0) {
                console.log('algo encontroooo: ', result.recordset[0]);
                return (result.recordset[0]);
            } else {
                console.log('No encontro una gomaaaaaaaaaaaaaa');
                let idTurnoEstado = 0;
                return (idTurnoEstado);
            }
        });
}

export async function checkAsistenciaTurno(agenda: any, poolAgendas) {
    let turnos;
    for (let x = 0; x < agenda.bloques.length; x++) {
        turnos = agenda.bloques[x].turnos;
        for (let i = 0; i < turnos.length; i++) {
            if (turnos[i].asistencia === 'asistio') {

                let idTurno: any = await getEstadoTurnoSips(turnos[i]._id, poolAgendas);
                let fechaAsistencia = moment(turnos[i].updatedAt).format('YYYYMMDD');
                let query = 'INSERT INTO dbo.CON_TurnoAsistencia ( idTurno , idUsuario , fechaAsistencia ) VALUES  ( ' +
                    idTurno.idTurno + ' , ' + constantes.idUsuarioSips + ' , \'' + fechaAsistencia + '\' )';
                await executeQuery(query, poolAgendas);
            }
        }
    }
}



/**
 * @description obtiene ID de O.Social buscando coincidencias 'DNI/Cod O.S' en la tabla de PUCO
 * pudiendo devolver 0..n códigos de obra social. Según los códigos obtenidos, se retornará un único id
 * según siguiente criterio:
 *     - Si se obtiene +2 resultados, se optará por el de máxima prioridad, siendo que:
 *     - ISSN: Mínima prioridad
 *     - PAMI: Prioridad media
 *     - Cualquier otro financiador: Prioridad máxima
 *     - Si obtiene 1 resultado, es el elegido
 *     - Si se obtiene 0 resultados, se retorna el id de PLAN SUMAR por defecto, cuyo valor está en constante.
 * @param {any} documentoPaciente
 * @returns
 */
async function getIdObraSocialSips(documentoPaciente, poolAgendas) {
    const idSumar = 499;
    let query = 'SELECT TOP(1) sips_os.idObraSocial as idOS ' +
        'FROM [Padron].[dbo].[Pd_PUCO] puco ' +
        'JOIN [SIPS].[dbo].[Sys_ObraSocial] sips_os ON puco.CodigoOS = sips_os.cod_PUCO ' +
        'WHERE puco.DNI =  ' + documentoPaciente +
        'ORDER BY  ( ' +
        'SELECT p =  ' +
        'CASE prio.prioridad  ' +
        'WHEN NULL THEN 1 ' +
        'ELSE prio.prioridad ' +
        'END ' +
        'FROM [SIPS].[dbo].[Sys_ObraSocial_Prioridad] as prio ' +
        'WHERE prio.idObraSocial = sips_os.idObraSocial ' +
        ') ASC';

    try {
        let result = await new sql.Request(poolAgendas).query(query);

        return ((result.recordset && result.recordset.length > 0) ? result.recordset[0].idOS : idSumar);
    } catch (err) {
        return (err);
    }
}

async function executeQuery(query: any, poolAgendas) {
    try {
        query += ' select SCOPE_IDENTITY() as id';
        let result = await new sql.Request(poolAgendas).query(query);
        if (result.recordset) {
            return result.recordset[0].id;
        }
    } catch (err) {
        debug('executeQUERY----------____>', err);
        return (err);
    }
}
