import * as constantes from '../../legacy/schemas/constantes';
import * as pacienteCtrl from './pacienteHPNController';
import * as pacientes from './../../../core/mpi/controller/paciente';
import * as moment from 'moment';
import * as sql from 'mssql';
import { getDatosPaciente } from './pacienteHPNController';

export async function saveTurnos(idAgendaAndes, bloque, idTipoPrestacion, pool, transaction) {
    for (let turno of bloque.turnos) {
        if (turno.estado === constantes.EstadoTurnosAndes.asignado
            && (! await (getIdTurnoHPN(turno._id, pool)))) {

            let result = await pacientes.buscarPaciente(turno.paciente.id);
            let paciente = result.paciente;

            let datosPaciente = await pacienteCtrl.getDatosPaciente('DNI', paciente.documento, pool);

            if (!datosPaciente) {
                datosPaciente = await pacienteCtrl.savePaciente(paciente, transaction);
            }

            await saveTurno(idAgendaAndes, turno, bloque.duracionTurnos, idTipoPrestacion, pool, transaction);
        }
    }

    console.log('turnos saved');
}

async function getIdTurnoHPN(idAndes, pool) {
    let query = 'SELECT id FROM dbo.Prestaciones_Worklist WHERE andesId = @idAndes';
    let result = await pool.request()
        .input('idAndes', sql.VarChar(50), idAndes)
        .query(query);

    return (result.length > 0 ?  result[0].id : null);
}

async function saveTurno(idAgendaAndes, turno: any, duracion, idTipoPrestacion, pool, transaction) {
    console.log('createTurno', turno._id);

    let idUbicacion = await getUbicacion(idTipoPrestacion);
    let fechaHora = moment(turno.horaInicio).format('YYYY-MM-DD hh:mm:ss');
    let fechaHoraFinalizacion = moment(turno.horaInicio).add(duracion, 'minutes').format('YYYY-MM-DD hh:mm:ss');
    let idTipoWorklist = 10; // no
    let idPrioridad =  20; // Prioridad normmal
    let idEstado = 10; // HARDCODE
    let datosPaciente = await pacienteCtrl.getDatosPaciente(turno.paciente.documento, pool);
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
        ',audit_datetime' +
        ',andesId)' +
    ' VALUES (' +
        '@idUbicacio, ' +
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
        .input('idUbicacion', sql.Int, idUbicacion)
        .input('fechaHora', sql.DateTime, fechaHora)
        .input('fechaHoraFinalizacion', sql.DateTime, fechaHoraFinalizacion)
        .input('idTipoWorklist', sql.Int, idTipoWorklist)
        .input('idPrioridad', sql.Int, idPrioridad)
        .input('idTipoPrestacion', sql.Int, idTipoPrestacion)
        .input('idEstado', sql.Int, idEstado)
        .input('idHistoria', sql.Int, idHistoria)
        .input('idPaciente', sql.Int, idPaciente)
        .input('idProgramacion', sql.Int, idProgramacion)
        .input('andesId', sql.VarChar(50), andesId)
        .query(query)
        .then(() => {
            return;
        }).catch(err => {
            throw err;
        });
}

function getUbicacion(idTipoPrestacion) {
    // Se asume que el metodo recibe por parámetro o id de clínica médica o id de consulta pediatrica
    return idTipoPrestacion === constantes.tiposPrestacionesHPN.clinicaMedica.id ?
        constantes.tiposPrestacionesHPN.clinicaMedica.conceptId : constantes.tiposPrestacionesHPN.consultaPediatrica.conceptId;
}
