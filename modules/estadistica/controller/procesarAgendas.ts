import * as agenda from '../../turnos/schemas/agenda';

export async function procesar(parametros: any) {
    let query = agenda.find({ estado: { $nin: ['planificacion', 'borrada', 'suspendida', 'pausada'] } });
    // Agregar filtro x estado
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
    turnos = devolverTurnos(data);
    return turnos;
}

function devolverTurnos(ArrAgenda) {
    const ArrTurnos = [];
    for (let j = 0; j < ArrAgenda.length; j++) {
        let unaAgenda = ArrAgenda[j];
        // Se recorren los turnos (aqui se debería filtrar por los estados y por financiador)
        for (let i = 0; i < unaAgenda.bloques.length; i++) {
            let b = unaAgenda.bloques[i];
            for (let j = 0; j < b.turnos.length; j++) {
                let t = unaAgenda.bloques[i].turnos[j];
                if (t.estado === 'asignado') {
                    let estado = estadoTurno(t);
                    ArrTurnos.push({
                        idAgenda: unaAgenda._id,
                        idBloque: unaAgenda.bloques[i]._id,
                        fecha: t.horaInicio,
                        paciente: t.paciente,
                        turno: t,
                        profesionales: unaAgenda.profesionales,
                        estado
                    });
                }
            }
        }

        for (let i = 0; i < unaAgenda.sobreturnos.length; i++) {
            let t = unaAgenda.sobreturnos[i];
            if (t.estado === 'asignado') {
                let estado = estadoTurno(t);
                ArrTurnos.push({
                    idAgenda: unaAgenda._id,
                    idBloque: null,
                    fecha: t.horaInicio,
                    paciente: t.paciente,
                    turno: t,
                    profesionales: unaAgenda.profesionales,
                    estado
                });
            }
        }
    }
    return ArrTurnos;
}

function estadoTurno(turno) {
    let estado = null;
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
    return estado;
}
