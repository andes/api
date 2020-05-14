import { model as Prestacion } from '../../rup/schemas/prestacion';
import * as mongoose from 'mongoose';
import { Auth } from '../../../auth/auth.class';

/**
 * Libera la referencia al turno dentro de la solicitud
 *
 * @export
 * @param {*} tid id del turno que se libera
 * @param {*} req request
 */
export async function liberarRefTurno(turno, req) {
    try {
        const query = Prestacion.findOne({ $where: 'this.estados[this.estados.length - 1].tipo ==  "pendiente"' });
        query.where({ 'solicitud.turno': mongoose.Types.ObjectId(turno.id) });
        let prestacion: any = await query.exec();
        if (!prestacion) {
            return { err: 'No se encontro prestacion para el turno' };
        } else if (prestacion.solicitud) {
            prestacion.solicitud.turno = null;

            updateRegistroHistorialSolicitud(prestacion.solicitud, 'liberacionTurno', turno);
            Auth.audit(prestacion, req);
            return prestacion.save();
        }
    } catch (err) {
        return (err);
    }
}

export function updateRegistroHistorialSolicitud(solicitud, accion, turno?) {
    if (!solicitud.historial) {
        solicitud.historial = [];
    }

    let registroHistorial: any = {
        organizacion: solicitud.organizacion,
        accion
    };

    if (turno) {
        registroHistorial.turno = turno;
    }

    if (solicitud.profesional) {
        registroHistorial.profesional = solicitud.profesional;
    }

    solicitud.historial.push(registroHistorial);
}

export async function enEjecucion(turno) {
    let prestacion: any = await Prestacion.findOne({ 'solicitud.turno': turno._id }).exec();
    return (prestacion && prestacion.ejecucion && prestacion.ejecucion.fecha);
}
