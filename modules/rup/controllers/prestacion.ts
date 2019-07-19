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
export function liberarRefTurno(tid, req) {
    const query = Prestacion.findOne({ $where: 'this.estados[this.estados.length - 1].tipo ==  "pendiente"' });
    query.where({ 'solicitud.turno': mongoose.Types.ObjectId(tid) });
    query.exec((err, data1: any) => {
        if (err) {
            return ({
                err: 'No se encontro prestacion para el turno'
            });
        }
        if (data1 && data1.solicitud) {
            data1.solicitud.turno = undefined;
            Auth.audit(data1, req);

            data1.save((error) => {
                if (error) {
                    return (error);
                }
            });
            return (data1);
        }

    });
}

export async function enEjecucion(turno) {
    let prestacion: any = await Prestacion.findOne({ 'solicitud.turno': turno._id }).exec();
    return (prestacion && prestacion.ejecucion && prestacion.ejecucion.fecha);
}
