import * as agenda from '../../turnos/schemas/agenda';
import * as prestaciones from '../../../modules/rup/schemas/prestacion';
import * as mongoose from 'mongoose';

/**
 * @export Devuelve los turnos con paciente asignado que cumplen con los filtros
 * @param {object} Filtros {rango de fechas, prestación, profesional, financiador, estado}
 * @returns {object} {fecha, paciente, financiador, prestacion, profesionales, estado, idAgenda, idBloque, turno, idPrestacion:null}
 */


export async function procesar(parametros: any) {

    let match = {
        estado: { $nin: ['planificacion', 'borrada', 'suspendida', 'pausada'] },
        'organizacion._id': parametros.organizacion,
        bloques: {
            $ne: null
        },
        'bloques.turnos': {
            $ne: null
        },
        'bloques.turnos.estado': 'asignado'
    };

    if (parametros.fechaDesde) {
        match['horaInicio'] = { $gte: parametros.fechaDesde };
    }

    if (parametros.fechaHasta) {
        match['horaFin'] = { $lte: parametros.fechaHasta };
    }

    if (parametros.prestacion) {
        match['tipoPrestaciones._id'] = parametros.prestacion;
    }

    if (parametros.profesional) {
        match['profesionales._id'] = parametros.profesional;
    }
    let turnos = [];
    let data = await agenda.find(match).exec();
    let turnoEstado = parametros.estado ? parametros.estado : 'todos';
    let os = parametros.financiador ? parametros.financiador : 'todos';
    turnos = await devolverTurnos(data, turnoEstado, os);
    return turnos;
}

async function devolverTurnos(ArrAgenda, turnoEstado, os) {
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
                    let prestacionId = await buscarPrestacion(t);
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
                            idPrestacion: prestacionId
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
                let prestacionId = await buscarPrestacion(t);
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
                        idPrestacion: prestacionId
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

async function buscarPrestacion(turno) {
    let query = prestaciones.model.find({ 'solicitud.turno': new mongoose.Types.ObjectId(turno.id) });
    let data = await query.exec();
    let indice = data.length - 1;
    if (indice >= 0) {
        return data[indice]._id;
    } else {
        return null;
    }
}
