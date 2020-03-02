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

            updateRegistroHistorial(prestacion, turno, 'liberacionTurno');
            Auth.audit(prestacion, req);
            return prestacion.save();
        }
    } catch (err) {
        return (err);
    }
}

function updateRegistroHistorial(prestacion, turno, _accion) {
    if (!prestacion.solicitud.historial) {
        prestacion.solicitud.historial = [];
    }

    let registroHistorial: any = {
        turno,
        organizacion: prestacion.solicitud.organizacion,
        accion: _accion
    };

    if (prestacion.solicitud.profesional) {
        registroHistorial.profesional = prestacion.solicitud.profesional;
    }

    prestacion.solicitud.historial.push(registroHistorial);
}

export async function enEjecucion(turno) {
    let prestacion: any = await Prestacion.findOne({ 'solicitud.turno': turno._id }).exec();
    return (prestacion && prestacion.ejecucion && prestacion.ejecucion.fecha);
}
