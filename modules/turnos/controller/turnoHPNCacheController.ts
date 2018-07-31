import * as constantes from '../../legacy/schemas/constantes';
import * as pacienteCtrl from './pacienteHPNController';
import * as pacientes from './../../../core/mpi/controller/paciente';
import * as moment from 'moment';
import * as sql from 'mssql';

export async function saveTurnos(idAgendaAndes, bloque, idTipoPrestacion, pool, transaction) {
    for (let turno of bloque.turnos) {
        if (turno.estado === constantes.EstadoTurnosAndes.asignado &&
            (!await (getIdTurnoHPN(turno._id, pool)))) {
            let result = await pacientes.buscarPaciente(turno.paciente.id);
            let paciente = result.paciente;

            let datosPaciente = await pacienteCtrl.getDatosPaciente('DNI', paciente.documento, pool);
            if (!datosPaciente) {
                datosPaciente = await pacienteCtrl.savePaciente(paciente, transaction);
            }
            await saveTurno(idAgendaAndes, turno, datosPaciente, bloque.duracionTurno, idTipoPrestacion, pool, transaction);
        }
        if (turno.estado === constantes.EstadoTurnosAndes.suspendido ||
            (turno.estado === constantes.EstadoTurnosAndes.disponible && await (getIdTurnoHPN(turno._id, pool)))) {
            await updateTurno(turno._id, turno.estado, pool, transaction);
        }
    }
}

export async function saveSobreturno(idAgendaAndes, sobreturno, idTipoPrestacion, pool, transaction) {
    if (sobreturno.estado === constantes.EstadoTurnosAndes.asignado &&
        (!await (getIdTurnoHPN(sobreturno._id, pool)))) {
        let result = await pacientes.buscarPaciente(sobreturno.paciente.id);
        let paciente = result.paciente;

        let datosPaciente = await pacienteCtrl.getDatosPaciente('DNI', paciente.documento, pool);
        if (!datosPaciente) {
            datosPaciente = await pacienteCtrl.savePaciente(paciente, transaction);
        }
        await save(idAgendaAndes, sobreturno, datosPaciente, idTipoPrestacion, pool, transaction);
    }
}

async function getIdTurnoHPN(idAndes, pool) {
    let query = 'SELECT id FROM dbo.Prestaciones_Worklist WHERE andesId = @idAndes';
    let result = await pool.request()
        .input('idAndes', sql.VarChar(50), idAndes)
        .query(query);
    result = result.recordset;
    return (result.length > 0 ? result[0].id : null);
}

async function save(idAgendaAndes, sobreturno, datosPaciente, idTipoPrestacion, pool, transaction) {
    let idUbicacion = await getUbicacion(idTipoPrestacion);
    let fechaHora = sobreturno.horaInicio;
    let fechaHoraFinalizacion = moment(sobreturno.horaInicio).add(15, 'minutes').toDate();
    let idTipoWorklist = 10; // no
    let idPrioridad = 20; // Prioridad normmal
    let idEstado = 10; // HARDCODE
    let idHistoria = datosPaciente.idHistoria;
    let idPaciente = datosPaciente.idPaciente;

    let idProgramacion = idAgendaAndes;
    let andesId = sobreturno._id;

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
        ',andesId)' +
        ' VALUES (' +
        '@idUbicacion, ' +
        '@fechaHora, ' +
        '@fechaHoraFinalizacion, ' +
        '@idTipoWorklist, ' +
        '@idPrioridad, ' +
        '@idTipoPrestacion, ' +
        '@idEstado, ' +
        '@idHistoria, ' +
        '@idPaciente, ' +
        '@idProgramacion, ' +
        '@andesId)';

    return await new sql.Request(transaction)
        .input('idUbicacion', sql.VarChar(50), idUbicacion)
        .input('fechaHora', sql.DateTimeOffset, fechaHora)
        .input('fechaHoraFinalizacion', sql.DateTimeOffset, fechaHoraFinalizacion)
        .input('idTipoWorklist', sql.Int, idTipoWorklist)
        .input('idPrioridad', sql.Int, idPrioridad)
        .input('idTipoPrestacion', sql.Int, idTipoPrestacion)
        .input('idEstado', sql.Int, idEstado)
        .input('idHistoria', sql.Int, idHistoria)
        .input('idPaciente', sql.Int, idPaciente)
        .input('idProgramacion', sql.Int, idProgramacion)
        .input('andesId', sql.VarChar(50), andesId)
        .query(query)
        .catch(err => {
            throw err;
        });
}

async function saveTurno(idAgendaAndes, turno: any, datosPaciente, duracion, idTipoPrestacion, pool, transaction) {
    let idUbicacion = await getUbicacion(idTipoPrestacion);
    let fechaHora = turno.horaInicio;
    let fechaHoraFinalizacion = moment(turno.horaInicio).add(duracion, 'minutes').toDate();
    let idTipoWorklist = 10; // no
    let idPrioridad = 20; // Prioridad normmal
    let idEstado = 10; // HARDCODE
    let idHistoria = datosPaciente.idHistoria;
    let idPaciente = datosPaciente.idPaciente;

    let idProgramacion = idAgendaAndes;
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
        ',andesId)' +
        ' VALUES (' +
        '@idUbicacion, ' +
        '@fechaHora, ' +
        '@fechaHoraFinalizacion, ' +
        '@idTipoWorklist, ' +
        '@idPrioridad, ' +
        '@idTipoPrestacion, ' +
        '@idEstado, ' +
        '@idHistoria, ' +
        '@idPaciente, ' +
        '@idProgramacion, ' +
        '@andesId)';

    return await new sql.Request(transaction)
        .input('idUbicacion', sql.VarChar(50), idUbicacion)
        .input('fechaHora', sql.DateTimeOffset, fechaHora)
        .input('fechaHoraFinalizacion', sql.DateTimeOffset, fechaHoraFinalizacion)
        .input('idTipoWorklist', sql.Int, idTipoWorklist)
        .input('idPrioridad', sql.Int, idPrioridad)
        .input('idTipoPrestacion', sql.Int, idTipoPrestacion)
        .input('idEstado', sql.Int, idEstado)
        .input('idHistoria', sql.Int, idHistoria)
        .input('idPaciente', sql.Int, idPaciente)
        .input('idProgramacion', sql.Int, idProgramacion)
        .input('andesId', sql.VarChar(50), andesId)
        .query(query)
        .catch(err => {
            throw err;
        });
}


async function updateTurno(id, estado, pool, transaction) {
    let idEstado = 30; // Suponemos la prestación suspendida

    if (estado === constantes.EstadoTurnosAndes.disponible) {
        idEstado = 50; // Prestación ha sido liberada
    }
    let query = 'UPDATE dbo.Prestaciones_Worklist SET ' +
        'idEstado=' + idEstado + ' where andesId=' + '\'' + id + '\'';
    return await new sql.Request(transaction)
        .query(query)
        .catch(err => {
            throw err;
        });
}


export function getUbicacion(idTipoPrestacion) {
    // Se asume que el metodo recibe por parámetro o id de clínica médica o id de consulta pediatrica
    return idTipoPrestacion === 705 ? 14 : 135;
}
