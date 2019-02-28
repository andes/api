import * as agenda from '../../turnos/schemas/agenda';

/**
 * @export Devuelve los turnos con paciente asignado que cumplen con los filtros
 * @param {object} Filtros {rango de fechas, prestación, profesional, financiador, estado}
 * @returns {object} {fecha, paciente, financiador, prestacion, profesionales, estado, idAgenda, idBloque, turno, idPrestacion:null}
 */
export async function procesar(parametros: any) {
    let query = agenda.find({ estado: { $nin: ['planificacion', 'borrada', 'suspendida', 'pausada'] } });
    // Agregar filtro x estado del turno y financiador
    query.where('organizacion._id').equals(parametros.organizacion);

    if (parametros.fechaDesde) {
        query.where('horaInicio').gte(parametros.fechaDesde);
    }

    if (parametros.fechaHasta) {
        query.where('horaFin').lte(parametros.fechaHasta);
    }

    if (parametros.prestacion) {
        query.where('tipoPrestaciones._id').equals(parametros.prestacion);
    }

    if (parametros.profesional) {
        query.where('profesionales._id').equals(parametros.profesional);
    }

    let turnos = [];
    let data = await query.exec();
    let turnoEstado = parametros.estado ? parametros.estado : 'todos';
    let os = parametros.financiador ? parametros.financiador : 'todos';
    turnos = devolverTurnos(data, turnoEstado, os);
    return turnos;
}

function devolverTurnos(ArrAgenda, turnoEstado, os) {
    const ArrTurnos = [];
    for (let k = 0; k < ArrAgenda.length; k++) {
        let unaAgenda = ArrAgenda[k];
        // Se recorren los turnos (aqui se debería filtrar por los estados y por financiador)
        for (let i = 0; i < unaAgenda.bloques.length; i++) {
            let b = unaAgenda.bloques[i];
            for (let j = 0; j < b.turnos.length; j++) {
                let t = unaAgenda.bloques[i].turnos[j];
                if (t.estado === 'asignado') {
                    let estado = estadoTurno(t, turnoEstado);
                    let obraSocial = obraSocialTurno(t, os);
                    if (estado && obraSocial) {
                        ArrTurnos.push({
                            fecha: t.horaInicio,
                            paciente: t.paciente,
                            financiador: t.paciente && t.paciente.obraSocial ? t.paciente.obraSocial : null,
                            prestacion: t.tipoPrestacion,
                            profesionales: unaAgenda.profesionales,
                            estado,
                            idAgenda: unaAgenda._id,
                            idBloque: unaAgenda.bloques[i]._id,
                            turno: t,
                            idPrestacion: null
                        });
                    }
                }
            }
        }

        for (let i = 0; i < unaAgenda.sobreturnos.length; i++) {
            let t = unaAgenda.sobreturnos[i];
            if (t.estado === 'asignado') {
                let estado = estadoTurno(t, turnoEstado);
                let obraSocial = obraSocialTurno(t, os);
                if (estado && obraSocial) {
                    ArrTurnos.push({
                        fecha: t.horaInicio,
                        paciente: t.paciente,
                        financiador: t.paciente && t.paciente.obraSocial ? t.paciente.obraSocial : null,
                        prestacion: t.tipoPrestacion,
                        profesionales: unaAgenda.profesionales,
                        estado,
                        idAgenda: unaAgenda._id,
                        idBloque: null,
                        turno: t,
                        idPrestacion: null
                    });
                }
            }
        }
    }
    return ArrTurnos;
}

function estadoTurno(turno, turnoEstado) {
    let estado;
    if (turno) {
        if (turno.asistencia) {
            if (turno.asistencia === 'noAsistio') {
                estado = 'Ausente';
            }
            if (turno.asistencia === 'sinDatos') {
                estado = 'Sin registro de asistencia';
            }
            if (turno.asistencia === 'asistio') {
                estado = 'Presente sin registro del profesional';
            }
        } else {
            estado = 'Sin registro de asistencia';
        }
        if (turno.diagnostico.codificaciones.length > 0) {
            if (turno.diagnostico.codificaciones[0].codificacionProfesional) {
                estado = 'Presente con registro del profesional';
            }
        }
    }
    if (estado === turnoEstado || turnoEstado === 'todos') {
        return estado;
    } else {
        return null;
    }
}
function obraSocialTurno(turno, os) {
    if (os !== 'todos') {
        if (turno && turno.paciente && turno.paciente.obraSocial) {
            return turno.paciente.obraSocial.financiador === os ? true : false;
        } else {
            if (os === 'No posee' && turno.paciente && !turno.paciente.obraSocial) {
                return true;
            } else {
                return false;
            }
        }
    } else {
        return true;
    }
}
