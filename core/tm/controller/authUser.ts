/**
 * Función que verifica la última vez que se actualizó/logueó un usuario.
 * Si es mayor o igual a 3 meses se desactiva,
 * cambiando la variable activo que se encuentra en cada organización a false.
 */
import * as moment from 'moment';
import { AuthUsers } from '../../../auth/schemas/authUsers';

export async function verificarUltimoLogueo(done) {
    const usuarios = AuthUsers.find({ 'organizaciones.activo': true }).cursor({ batchSize: 100 });
    const fLimite = moment().subtract(3, 'months').toDate();
    const fSinLogin = moment().subtract(4, 'months').toDate();
    const esMenor = (fecha) => (fecha && fecha < fLimite);
    for await (const user of usuarios) {
        for (const org of user.organizaciones) {
            const lastUpdate = org.updatedAt || org.createdAt || user.updatedAt || user.createdAt;
            if (esMenor(lastUpdate) && esMenor(org.lastLogin)) {
                org.activo = false;
            }
            if (!org.lastLogin && org.activo) {
                org.lastLogin = user.lastLogin || lastUpdate || fSinLogin;
            }
        }
        await AuthUsers.updateOne(
            { _id: user._id },
            {
                $set: {
                    organizaciones: user.organizaciones
                }
            }
        );
    }

    done();
}
