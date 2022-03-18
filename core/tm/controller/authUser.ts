/**
 * Funcion que verifica la ultima vez que se logueo un usuario y si es mayor a 3 meses se desactiva
 * cambiando la variable activo que se encuentra en cada organizacion a false.
 */
import * as moment from 'moment';
import { AuthUsers } from '../../../auth/schemas/authUsers';

export async function verificarUltimoLogueo(done) {
    const usuarios: any = AuthUsers.find({
        $and:[
            { lastLogin:{ $lte: moment().subtract(3, 'months').toDate() } },
            { 'organizaciones.activo':true }
        ],
    }).cursor({ batchSize: 100 });
    for await (const user of usuarios) {
        await AuthUsers.update(
            { _id:user._id },
            {
                $set: {
                    'organizaciones.$[].activo': false
                }
            }
        );
    }
    done();
}
