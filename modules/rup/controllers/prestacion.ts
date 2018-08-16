import { model as Prestacion } from '../../rup/schemas/prestacion';
import * as mongoose from 'mongoose';
import { ObjectId } from 'bson';
import { Auth } from '../../../auth/auth.class';

/**
 * Libera la referencia al turno dentro de la solicitud
 *
 * @export
 * @param {*} tid id del turno que se libera
 * @param {*} req request
 */
export function liberarRefTurno(tid, req) {
    let query = Prestacion.findOne({ $where: 'this.estados[this.estados.length - 1].tipo ==  "pendiente"' });
    query.where({ 'solicitud.turno': mongoose.Types.ObjectId(tid) });
    query.exec(function (err, data1: any) {
        if (err) {
            return ({
                err: 'No se encontro prestacion para el turno'
            });
        }
        if (data1 && data1.solicitud) {
            data1.solicitud.turno = undefined;
        }
        Auth.audit(data1, req);

        data1.save(function (error) {
            if (error) {
                // console.log('error ', error);
                return (error);
            }
        });
        return (data1);
    });
}
