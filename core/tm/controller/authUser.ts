/**
 * Función que verifica la última vez que se actualizó/logueó un usuario.
 * Si es mayor o igual a 1 mes se desactiva,
 * cambiando la variable activo que se encuentra en cada organización a false.
 */
import * as moment from 'moment';
import { AuthUsers } from '../../../auth/schemas/authUsers';

export async function verificarUltimoLogueo(done) {
    const usuarios: any = AuthUsers.find({ 'organizaciones.activo': true }).cursor({ batchSize: 100 });
    const fLimite = moment().subtract(1, 'months').toDate();
    const fSinLogin = moment().subtract(2, 'months').toDate();
    const esMenor = (fecha) => (fecha && fecha < fLimite);
    for await (const user of usuarios) {
        for (const org of user.organizaciones) {
            const lastUpdate = user.updatedAt || user.createdAt;
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
